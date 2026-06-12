"""SignalForge MCP server — lets MCP clients (Claude Code, Windsurf) read and
write work data. Mounted at /mcp on the existing FastAPI backend (PACKAGING.md v1.3)."""

import threading
from datetime import date, timedelta
from typing import Optional

from pydantic import BaseModel, Field
from sqlmodel import Session, select

from mcp.server.fastmcp import FastMCP

from .database import engine
from .models import (
    Week, Priority, DailyEntry, WeeklySynthesis, AppSettings, Connection,
    DayOfWeek, EntrySource, EntryStatus,
)
from . import connections as conn_layer

mcp = FastMCP(
    "SignalForge",
    instructions=(
        "SignalForge is a local engineering work OS that turns daily work into "
        "promotion-ready impact evidence. Use log_work to push completed work or "
        "brainstormed activities into the user's daily grid; use get_week_context "
        "first to frame entries against their declared priorities."
    ),
    stateless_http=True,
    streamable_http_path="/",
)

WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"]


def _today_workday() -> str:
    """Today's day name, clamped to friday on weekends."""
    idx = min(date.today().weekday(), 4)
    return WEEKDAYS[idx]


def _current_week(session: Session) -> Week:
    start = date.today() - timedelta(days=date.today().weekday())
    week = session.exec(select(Week).where(Week.week_start == start)).first()
    if not week:
        week = Week(week_start=start)
        session.add(week)
        session.commit()
        session.refresh(week)
    return week


class WorkItem(BaseModel):
    task: str = Field(description="What was done, one task per item. Concrete and specific.")
    day: Optional[str] = Field(
        default=None,
        description="monday–friday. Defaults to today (weekends map to friday).",
    )
    estimate_mins: Optional[int] = Field(default=None, description="Time spent in minutes.")
    status: str = Field(
        default="complete",
        description="complete | in_progress | blocked | incomplete",
    )
    unplanned: bool = Field(default=False, description="True if not part of the weekly plan.")
    important: bool = Field(default=False, description="Eisenhower: important to goals.")
    urgent: bool = Field(default=False, description="Eisenhower: time-sensitive.")


@mcp.tool()
def log_work(items: list[WorkItem]) -> dict:
    """Push one or more work entries into the user's SignalForge daily grid.

    Entries are tagged source=mcp and automatically enriched by the local LLM
    (impact framing, signal classification, reflection prompt). Call
    get_week_context first to align entries with the user's declared priorities.
    """
    from .main import _enrich_entry_bg

    created = []
    with Session(engine) as session:
        week = _current_week(session)
        for item in items:
            day = item.day if item.day in WEEKDAYS else _today_workday()
            try:
                status = EntryStatus(item.status)
            except ValueError:
                status = EntryStatus.complete
            entry = DailyEntry(
                week_id=week.id,
                day=DayOfWeek(day),
                task=item.task,
                source=EntrySource.mcp,
                unplanned=item.unplanned,
                estimate_mins=item.estimate_mins,
                status=status,
                important=item.important,
                urgent=item.urgent,
            )
            session.add(entry)
            session.commit()
            session.refresh(entry)
            created.append({"id": entry.id, "day": day, "task": entry.task})

    for c in created:
        threading.Thread(target=_enrich_entry_bg, args=(c["id"],), daemon=True).start()

    return {
        "created": created,
        "week_start": str(date.today() - timedelta(days=date.today().weekday())),
        "note": "Entries are being enriched by the local LLM in the background.",
    }


@mcp.tool()
def get_week_context() -> dict:
    """Get the user's current week context: declared P0/P1/P2 priorities by
    category (org/team/manager/personal), week focus statement, and career
    profile. Use this to frame log_work entries against stated priorities."""
    with Session(engine) as session:
        week = _current_week(session)
        priorities = session.exec(select(Priority).where(Priority.week_id == week.id)).all()
        settings = session.exec(select(AppSettings)).first()

        prios: dict[str, list[dict]] = {}
        for p in priorities:
            prios.setdefault(p.category.value, []).append(
                {"level": p.level.value, "text": p.text}
            )

        return {
            "week_start": str(week.week_start),
            "focus_quote": week.focus_quote,
            "mode": week.mode.value if week.mode else None,
            "priorities": prios,
            "profile": {
                "current_level": settings.current_level if settings else None,
                "target_level": settings.target_level if settings else None,
                "org_context": settings.org_context if settings else None,
            },
        }


@mcp.tool()
def get_week_summary(week_start: Optional[str] = None) -> dict:
    """Get all entries and the synthesis for a week. week_start is an ISO date
    (YYYY-MM-DD, a Monday); omit it for the current week."""
    with Session(engine) as session:
        if week_start:
            try:
                d = date.fromisoformat(week_start)
            except ValueError:
                return {"error": "week_start must be YYYY-MM-DD"}
            start = d - timedelta(days=d.weekday())
            week = session.exec(select(Week).where(Week.week_start == start)).first()
            if not week:
                return {"error": f"No week found starting {start}"}
        else:
            week = _current_week(session)

        entries = session.exec(select(DailyEntry).where(DailyEntry.week_id == week.id)).all()
        synthesis = session.exec(
            select(WeeklySynthesis).where(WeeklySynthesis.week_id == week.id)
        ).first()

        return {
            "week_start": str(week.week_start),
            "entries": [
                {
                    "day": e.day.value,
                    "task": e.task,
                    "enriched_task": e.enriched_task,
                    "source": e.source.value,
                    "status": e.status.value,
                    "signal_type": e.signal_type.value if e.signal_type else None,
                    "estimate_mins": e.estimate_mins,
                    "unplanned": e.unplanned,
                }
                for e in entries
            ],
            "synthesis": {
                "what_landed": synthesis.what_landed,
                "what_drifted": synthesis.what_drifted,
            } if synthesis else None,
        }


def _get_connection(name: str) -> Optional[Connection]:
    with Session(engine) as session:
        return session.exec(
            select(Connection).where(Connection.name == name, Connection.enabled == True)  # noqa: E712
        ).first()


@mcp.tool()
def list_connections() -> dict:
    """List the user's connected work tools (JIRA, Grafana, PagerDuty, GitHub, …).
    Use list_connection_tools to discover what each connection can do."""
    with Session(engine) as session:
        conns = session.exec(select(Connection)).all()
        return {
            "connections": [
                {"name": c.name, "kind": c.kind.value, "description": c.description, "enabled": c.enabled}
                for c in conns
            ]
        }


@mcp.tool()
async def list_connection_tools(connection: str) -> dict:
    """Discover the tools a connected work tool exposes. Returns name,
    description, and input schema for each tool."""
    conn = _get_connection(connection)
    if not conn:
        return {"error": f"No enabled connection named '{connection}'. Use list_connections."}
    try:
        return {"connection": connection, "tools": await conn_layer.list_tools(conn)}
    except Exception as e:
        return {"error": f"Could not reach '{connection}': {conn_layer.leaf_error(e)}"}


@mcp.tool()
async def call_connection_tool(connection: str, tool: str, arguments: Optional[dict] = None) -> dict:
    """Call a tool on a connected work tool — e.g. search JIRA issues, query
    Grafana, list PagerDuty incidents. Use list_connection_tools first to see
    available tools and their input schemas."""
    conn = _get_connection(connection)
    if not conn:
        return {"error": f"No enabled connection named '{connection}'. Use list_connections."}
    try:
        return await conn_layer.call_tool(conn, tool, arguments or {})
    except Exception as e:
        return {"error": f"Tool call on '{connection}' failed: {conn_layer.leaf_error(e)}"}


@mcp.tool()
def generate_synthesis() -> dict:
    """Generate the weekly synthesis for the current week: 'What Landed',
    'What Drifted', and promotion-ready evidence bullets. Uses the local LLM —
    takes 30-90 seconds."""
    from .main import generate_synthesis as _generate

    with Session(engine) as session:
        week = _current_week(session)
        try:
            return _generate(week.id, session)
        except Exception as e:
            return {"error": str(e)}
