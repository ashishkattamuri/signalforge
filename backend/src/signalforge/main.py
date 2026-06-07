from contextlib import asynccontextmanager
from datetime import date, timedelta

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .database import init_db, get_session
from .models import (
    Week, WeekMode, Priority, StaffDimension, DailyEntry, WeeklySynthesis,
    EvidenceBullet, LLMPromptLog, AppSettings, PriorityLevel, PriorityCategory, DayOfWeek,
    EntryStatus, EntrySource, SignalType,
)
from .llm_client import (
    LLMClient, build_prompt,
    IMPACT_EXTRACTION, SIGNAL_CLASSIFICATION, REFLECTION_COACH,
    PRIORITY_ALIGNMENT, WEEKLY_SYNTHESIS, EVIDENCE_BULLETS, WEEK_MODE,
)
from pydantic import BaseModel
from typing import Optional
import json
import re

from .database import engine as _engine


def _split_synthesis(text: str) -> tuple[str, str]:
    """Split LLM synthesis output into (what_landed, what_drifted).

    Handles multiple formats the LLM might emit:
      WHAT_LANDED:\n...\nWHAT_DRIFTED:\n...   ← preferred prompt format
      **What Landed**\n...\n**What Drifted**    ← markdown bold headers
      ## What Landed\n...\n## What Drifted      ← markdown h2 headers
      1. "What Landed" ...\n2. "What Drifted"   ← numbered list fallback
    """
    # Try each separator pattern for "What Drifted"
    drifted_patterns = [
        r'WHAT_DRIFTED\s*:\s*',
        r'\*\*What Drifted\*\*\s*',
        r'##\s*What Drifted\s*',
        r'2\.\s*["“]?What Drifted["”]?\s*[—-]?\s*',
        r'What Drifted[:\s]+',
    ]
    for pattern in drifted_patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            raw_landed = text[:m.start()].strip()
            what_drifted = text[m.end():].strip()
            # Strip "What Landed" prefix from the landed section
            landed_patterns = [
                r'WHAT_LANDED\s*:\s*',
                r'\*\*What Landed\*\*\s*',
                r'##\s*What Landed\s*',
                r'1\.\s*["“]?What Landed["”]?\s*[—-]?\s*',
                r'What Landed[:\s]+',
                r"Here's a synthesis[^:]*:\s*",  # strip LLM preamble
            ]
            what_landed = raw_landed
            for lp in landed_patterns:
                what_landed = re.sub(lp, '', what_landed, flags=re.IGNORECASE).strip()
            return what_landed, what_drifted

    # No recognisable separator — return full text as landed, empty drifted
    return text.strip(), ""


def _parse_bullets(text: str) -> list[str]:
    """Parse numbered list from LLM output into individual bullet strings."""
    bullets = re.findall(r'^\d+[.)]\s*(.+?)(?=\n\d+[.)]|\Z)', text.strip(), re.MULTILINE | re.DOTALL)
    if bullets:
        return [b.strip() for b in bullets if b.strip()]
    # Fallback: split by newlines, strip bullet markers
    lines = [re.sub(r'^[•\-*]\s*', '', l).strip() for l in text.strip().split('\n') if l.strip()]
    return [l for l in lines if len(l) > 20]


def _enrich_entry_bg(entry_id: int) -> None:
    """Run LLM enrichment for a saved entry in a background thread."""
    with Session(_engine) as session:
        entry = session.get(DailyEntry, entry_id)
        if not entry:
            return
        if not llm.is_available():
            return
        try:
            enriched = llm.generate(build_prompt(IMPACT_EXTRACTION, task=entry.task))
            sig_raw = llm.generate(build_prompt(SIGNAL_CLASSIFICATION, task=entry.task)).lower().strip()
            reflection = llm.generate(build_prompt(REFLECTION_COACH, task=entry.task))

            entry.enriched_task = enriched
            entry.signal_type = SignalType(sig_raw) if sig_raw in SignalType.__members__ else None
            entry.reflection = reflection
            session.add(entry)

            for ptype, prompt, response in [
                ("impact_extraction", IMPACT_EXTRACTION.format(task=entry.task), enriched),
                ("signal_classification", SIGNAL_CLASSIFICATION.format(task=entry.task), sig_raw),
                ("reflection_coach", REFLECTION_COACH.format(task=entry.task), reflection),
            ]:
                session.add(LLMPromptLog(
                    entry_id=entry.id, prompt_type=ptype,
                    prompt_text=prompt, response_text=response, model=llm.model,
                ))
            session.commit()
        except RuntimeError:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="SignalForge API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "tauri://localhost",        # Tauri production webview
        "http://tauri.localhost",   # Tauri on some platforms
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

llm = LLMClient()


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "llm_available": llm.is_available()}


# ── App Settings ─────────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    onboarded: Optional[bool] = None
    selected_model: Optional[str] = None
    profile_name: Optional[str] = None
    current_level: Optional[str] = None
    target_level: Optional[str] = None
    org_context: Optional[str] = None


def _get_or_create_settings(session: Session) -> AppSettings:
    settings = session.exec(select(AppSettings)).first()
    if not settings:
        settings = AppSettings()
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


@app.get("/api/settings")
def get_settings(session: Session = Depends(get_session)):
    return _get_or_create_settings(session)


@app.patch("/api/settings")
def update_settings(body: SettingsUpdate, session: Session = Depends(get_session)):
    settings = _get_or_create_settings(session)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(settings, field, value)
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings


# ── Weeks ─────────────────────────────────────────────────────────────────────

def _monday_of_week(d: date) -> date:
    return d - timedelta(days=d.weekday())


@app.get("/api/weeks/current")
def get_current_week(session: Session = Depends(get_session)):
    start = _monday_of_week(date.today())
    week = session.exec(select(Week).where(Week.week_start == start)).first()
    if not week:
        week = Week(week_start=start)
        session.add(week)
        session.commit()
        session.refresh(week)
    return week


@app.get("/api/weeks/{week_id}")
def get_week(week_id: int, session: Session = Depends(get_session)):
    week = session.get(Week, week_id)
    if not week:
        raise HTTPException(404, "Week not found")
    return week


class WeekUpdate(BaseModel):
    mode: Optional[WeekMode] = None
    notes: Optional[str] = None
    focus_quote: Optional[str] = None
    target_level: Optional[str] = None


@app.patch("/api/weeks/{week_id}")
def update_week(week_id: int, body: WeekUpdate, session: Session = Depends(get_session)):
    week = session.get(Week, week_id)
    if not week:
        raise HTTPException(404, "Week not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(week, field, value)
    if body.mode is not None:
        week.mode = body.mode
    if body.notes is not None:
        week.notes = body.notes
    session.add(week)
    session.commit()
    session.refresh(week)
    return week


# ── Priorities ────────────────────────────────────────────────────────────────

@app.get("/api/weeks/{week_id}/priorities")
def get_priorities(week_id: int, session: Session = Depends(get_session)):
    return session.exec(select(Priority).where(Priority.week_id == week_id)).all()


class PriorityCreate(BaseModel):
    level: PriorityLevel
    category: PriorityCategory
    text: str


@app.post("/api/weeks/{week_id}/priorities", status_code=201)
def create_priority(week_id: int, body: PriorityCreate, session: Session = Depends(get_session)):
    p = Priority(week_id=week_id, **body.model_dump())
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


@app.put("/api/priorities/{priority_id}")
def update_priority(priority_id: int, body: PriorityCreate, session: Session = Depends(get_session)):
    p = session.get(Priority, priority_id)
    if not p:
        raise HTTPException(404, "Priority not found")
    p.level = body.level
    p.category = body.category
    p.text = body.text
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


@app.delete("/api/priorities/{priority_id}", status_code=204)
def delete_priority(priority_id: int, session: Session = Depends(get_session)):
    p = session.get(Priority, priority_id)
    if not p:
        raise HTTPException(404, "Priority not found")
    session.delete(p)
    session.commit()


# ── Staff Dimensions ──────────────────────────────────────────────────────────

@app.get("/api/weeks/{week_id}/dimensions")
def get_dimensions(week_id: int, session: Session = Depends(get_session)):
    return session.exec(select(StaffDimension).where(StaffDimension.week_id == week_id)).all()


class DimensionUpsert(BaseModel):
    dimension: int
    evidence: Optional[str] = None
    gap: Optional[str] = None
    rating: Optional[int] = None
    current_level: Optional[str] = None


@app.put("/api/weeks/{week_id}/dimensions/{dim_number}")
def upsert_dimension(
    week_id: int, dim_number: int, body: DimensionUpsert,
    session: Session = Depends(get_session)
):
    existing = session.exec(
        select(StaffDimension)
        .where(StaffDimension.week_id == week_id, StaffDimension.dimension == dim_number)
    ).first()
    if existing:
        for field, value in body.model_dump(exclude={'dimension'}, exclude_none=True).items():
            setattr(existing, field, value)
        session.add(existing)
    else:
        existing = StaffDimension(week_id=week_id, dimension=dim_number,
                                  evidence=body.evidence, gap=body.gap,
                                  rating=body.rating, current_level=body.current_level)
        session.add(existing)
    session.commit()
    session.refresh(existing)
    return existing


# ── Daily Entries ─────────────────────────────────────────────────────────────

@app.get("/api/weeks/{week_id}/entries")
def get_entries(week_id: int, session: Session = Depends(get_session)):
    return session.exec(select(DailyEntry).where(DailyEntry.week_id == week_id)).all()


@app.get("/api/weeks/{week_id}/entries/{day}")
def get_entries_for_day(week_id: int, day: DayOfWeek, session: Session = Depends(get_session)):
    return session.exec(
        select(DailyEntry).where(DailyEntry.week_id == week_id, DailyEntry.day == day)
    ).all()


class EntryCreate(BaseModel):
    day: DayOfWeek
    task: str
    source: EntrySource = EntrySource.manual
    unplanned: bool = False
    estimate_mins: Optional[int] = None
    status: EntryStatus = EntryStatus.in_progress
    important: bool = False
    urgent: bool = False


class EntryUpdate(BaseModel):
    task: Optional[str] = None
    source: Optional[EntrySource] = None
    unplanned: Optional[bool] = None
    estimate_mins: Optional[int] = None
    status: Optional[EntryStatus] = None
    important: Optional[bool] = None
    urgent: Optional[bool] = None
    signal_type: Optional[SignalType] = None
    reflection: Optional[str] = None
    enriched_task: Optional[str] = None


@app.post("/api/weeks/{week_id}/entries", status_code=201)
def create_entry(
    week_id: int, body: EntryCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    entry = DailyEntry(week_id=week_id, **body.model_dump())
    session.add(entry)
    session.commit()
    session.refresh(entry)
    # Enrich in background — entry is returned immediately
    background_tasks.add_task(_enrich_entry_bg, entry.id)
    return entry


@app.patch("/api/entries/{entry_id}")
def update_entry(entry_id: int, body: EntryUpdate, session: Session = Depends(get_session)):
    entry = session.get(DailyEntry, entry_id)
    if not entry:
        raise HTTPException(404, "Entry not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(entry, field, value)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@app.delete("/api/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(DailyEntry, entry_id)
    if not entry:
        raise HTTPException(404, "Entry not found")
    session.delete(entry)
    session.commit()


# ── Weekly Synthesis ──────────────────────────────────────────────────────────

@app.get("/api/weeks/{week_id}/synthesis")
def get_synthesis(week_id: int, session: Session = Depends(get_session)):
    s = session.exec(select(WeeklySynthesis).where(WeeklySynthesis.week_id == week_id)).first()
    return s or {}


@app.post("/api/weeks/{week_id}/synthesis/generate")
def generate_synthesis(week_id: int, session: Session = Depends(get_session)):
    if not llm.is_available():
        raise HTTPException(503, "LLM not available")

    entries = session.exec(select(DailyEntry).where(DailyEntry.week_id == week_id)).all()
    priorities = session.exec(select(Priority).where(Priority.week_id == week_id)).all()

    entries_text = "\n".join(
        f"- [{e.day.value}] {e.enriched_task or e.task} (status: {e.status.value}, signal: {e.signal_type.value if e.signal_type else 'unknown'})"
        for e in entries
    )
    priorities_text = "\n".join(
        f"  {p.level.value.upper()} ({p.category.value}): {p.text}" for p in priorities
    )

    synthesis_text = llm.generate(
        build_prompt(WEEKLY_SYNTHESIS, entries=entries_text, priorities=priorities_text)
    )
    bullets_text = llm.generate(build_prompt(EVIDENCE_BULLETS, entries=entries_text))

    what_landed, what_drifted = _split_synthesis(synthesis_text)

    week = session.get(Week, week_id)

    existing = session.exec(select(WeeklySynthesis).where(WeeklySynthesis.week_id == week_id)).first()
    if existing:
        existing.what_landed = what_landed
        existing.what_drifted = what_drifted
        existing.evidence_bullets = bullets_text
        session.add(existing)
    else:
        session.add(WeeklySynthesis(
            week_id=week_id,
            what_landed=what_landed,
            what_drifted=what_drifted,
            evidence_bullets=bullets_text,
        ))

    # Replace structured bullets for this week
    old_bullets = session.exec(select(EvidenceBullet).where(EvidenceBullet.week_id == week_id)).all()
    for b in old_bullets:
        session.delete(b)
    for text in _parse_bullets(bullets_text):
        session.add(EvidenceBullet(week_id=week_id, week_start=week.week_start, text=text))

    session.commit()

    return {"what_landed": what_landed, "what_drifted": what_drifted, "evidence_bullets": bullets_text}


# ── Markdown Export ───────────────────────────────────────────────────────────

@app.get("/api/weeks/{week_id}/export")
def export_week(week_id: int, session: Session = Depends(get_session)):
    week = session.get(Week, week_id)
    if not week:
        raise HTTPException(404, "Week not found")

    entries = session.exec(select(DailyEntry).where(DailyEntry.week_id == week_id)).all()
    priorities = session.exec(select(Priority).where(Priority.week_id == week_id)).all()
    synthesis = session.exec(select(WeeklySynthesis).where(WeeklySynthesis.week_id == week_id)).first()

    lines = [f"# SignalForge Weekly Summary — {week.week_start}", ""]

    if priorities:
        lines += ["## Priorities", ""]
        for cat in ("org", "team", "manager", "personal"):
            cat_items = [p for p in priorities if p.category.value == cat]
            if cat_items:
                lines.append(f"**{cat.capitalize()}**")
                for p in cat_items:
                    lines.append(f"  - {p.level.value.upper()}: {p.text}")
                lines.append("")

    for day in ("monday", "tuesday", "wednesday", "thursday", "friday"):
        day_entries = [e for e in entries if e.day.value == day]
        if day_entries:
            total_mins = sum(e.estimate_mins or 0 for e in day_entries)
            lines += [f"## {day.capitalize()}", ""]
            for e in day_entries:
                task_text = e.enriched_task or e.task
                flags = []
                if e.unplanned:
                    flags.append("⚡ unplanned")
                if e.signal_type:
                    flags.append(e.signal_type.value)
                flag_str = f" _({', '.join(flags)})_" if flags else ""
                status_icon = {"complete": "✅", "in_progress": "🟡", "blocked": "🟠", "incomplete": "🔴"}.get(e.status.value, "")
                lines.append(f"- {status_icon} {task_text}{flag_str}")
                if e.reflection:
                    lines.append(f"  > {e.reflection}")
            lines.append(f"\n_Total: {total_mins // 60}h {total_mins % 60}m_")
            lines.append("")

    if synthesis:
        lines += ["## Weekly Synthesis", ""]
        if synthesis.what_landed:
            lines += ["**What Landed**", synthesis.what_landed, ""]
        if synthesis.what_drifted:
            lines += ["**What Drifted**", synthesis.what_drifted, ""]
        if synthesis.evidence_bullets:
            lines += ["**Evidence Bank**", synthesis.evidence_bullets, ""]

    return {"markdown": "\n".join(lines), "week_start": str(week.week_start)}


# ── Week list & navigation ────────────────────────────────────────────────────

@app.get("/api/weeks")
def list_weeks(session: Session = Depends(get_session)):
    weeks = session.exec(select(Week).order_by(Week.week_start.desc())).all()  # type: ignore[attr-defined]
    return weeks


@app.get("/api/weeks/by-date/{iso_date}")
def get_or_create_week_by_date(iso_date: str, session: Session = Depends(get_session)):
    """Return the week containing iso_date, creating it if needed."""
    try:
        d = date.fromisoformat(iso_date)
    except ValueError:
        raise HTTPException(400, "Invalid date format, use YYYY-MM-DD")
    start = d - timedelta(days=d.weekday())
    week = session.exec(select(Week).where(Week.week_start == start)).first()
    if not week:
        week = Week(week_start=start)
        session.add(week)
        session.commit()
        session.refresh(week)
    return week


# ── Alignment scoring ─────────────────────────────────────────────────────────

@app.get("/api/weeks/{week_id}/alignment")
def get_alignment(week_id: int, session: Session = Depends(get_session)):
    entries = session.exec(select(DailyEntry).where(DailyEntry.week_id == week_id)).all()

    total = len(entries)
    total_mins = sum(e.estimate_mins or 0 for e in entries)
    unplanned = [e for e in entries if e.unplanned]
    unplanned_mins = sum(e.estimate_mins or 0 for e in unplanned)
    unplanned_pct = round(unplanned_mins / total_mins * 100) if total_mins else 0

    important = [e for e in entries if e.important]
    important_complete = [e for e in important if e.status == EntryStatus.complete]
    focus_score = round(len(important_complete) / len(important) * 100) if important else None

    plan_score = 100 - unplanned_pct
    overall = round(focus_score * 0.6 + plan_score * 0.4) if focus_score is not None else plan_score

    by_signal: dict[str, int] = {}
    for e in entries:
        if e.signal_type:
            by_signal[e.signal_type.value] = by_signal.get(e.signal_type.value, 0) + (e.estimate_mins or 0)

    by_status: dict[str, int] = {}
    for e in entries:
        by_status[e.status.value] = by_status.get(e.status.value, 0) + 1

    return {
        "total_entries": total,
        "total_mins": total_mins,
        "unplanned_pct": unplanned_pct,
        "unplanned_mins": unplanned_mins,
        "focus_score": focus_score,
        "plan_score": plan_score,
        "overall_score": overall,
        "by_signal_mins": by_signal,
        "by_status_count": by_status,
    }


# ── Evidence bank ─────────────────────────────────────────────────────────────

@app.get("/api/evidence-bank")
def get_evidence_bank(starred_only: bool = False, session: Session = Depends(get_session)):
    q = select(EvidenceBullet).order_by(EvidenceBullet.week_start.desc())  # type: ignore[attr-defined]
    if starred_only:
        q = q.where(EvidenceBullet.starred == True)  # noqa: E712
    return session.exec(q).all()


@app.patch("/api/evidence-bank/{bullet_id}/star")
def toggle_star(bullet_id: int, session: Session = Depends(get_session)):
    b = session.get(EvidenceBullet, bullet_id)
    if not b:
        raise HTTPException(404, "Bullet not found")
    b.starred = not b.starred
    session.add(b)
    session.commit()
    session.refresh(b)
    return b


# ── Promotion packet export ───────────────────────────────────────────────────

@app.get("/api/promotion-packet")
def export_promotion_packet(session: Session = Depends(get_session)):
    bullets = session.exec(
        select(EvidenceBullet)
        .where(EvidenceBullet.starred == True)  # noqa: E712
        .order_by(EvidenceBullet.week_start.desc())  # type: ignore[attr-defined]
    ).all()

    if not bullets:
        return {"markdown": "# Promotion Packet\n\n_No starred bullets yet. Star bullets in the Evidence Bank to build your packet._", "count": 0}

    lines = ["# Promotion Packet — SignalForge", ""]
    current_week = None
    for b in bullets:
        if b.week_start != current_week:
            current_week = b.week_start
            lines += [f"## Week of {current_week}", ""]
        lines.append(f"- {b.text}")
    lines.append("")

    return {"markdown": "\n".join(lines), "count": len(bullets)}


# ── Trends ────────────────────────────────────────────────────────────────────

@app.get("/api/trends")
def get_trends(session: Session = Depends(get_session)):
    weeks = session.exec(select(Week).order_by(Week.week_start.desc())).all()  # type: ignore[attr-defined]
    result = []
    for w in weeks:
        entries = session.exec(select(DailyEntry).where(DailyEntry.week_id == w.id)).all()
        if not entries:
            continue
        total_mins = sum(e.estimate_mins or 0 for e in entries)
        unplanned_mins = sum(e.estimate_mins or 0 for e in entries if e.unplanned)
        enriched = sum(1 for e in entries if e.enriched_task)
        complete = sum(1 for e in entries if e.status == EntryStatus.complete)
        signal_counts: dict[str, int] = {}
        for e in entries:
            if e.signal_type:
                signal_counts[e.signal_type.value] = signal_counts.get(e.signal_type.value, 0) + 1
        top_signal = max(signal_counts, key=signal_counts.get) if signal_counts else None  # type: ignore[arg-type]
        result.append({
            "week_id": w.id,
            "week_start": str(w.week_start),
            "mode": w.mode.value if w.mode else None,
            "total_entries": len(entries),
            "total_hrs": round(total_mins / 60, 1),
            "unplanned_pct": round(unplanned_mins / total_mins * 100) if total_mins else 0,
            "enriched_pct": round(enriched / len(entries) * 100),
            "complete_pct": round(complete / len(entries) * 100),
            "top_signal": top_signal,
        })
    return result
