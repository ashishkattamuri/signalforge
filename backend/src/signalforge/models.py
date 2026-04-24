from datetime import date
from enum import Enum
from typing import Optional
from sqlmodel import Field, SQLModel


class WeekMode(str, Enum):
    focus = "focus"
    drift = "drift"
    recovery = "recovery"


class EntryStatus(str, Enum):
    complete = "complete"
    in_progress = "in_progress"
    blocked = "blocked"
    incomplete = "incomplete"


class EntrySource(str, Enum):
    manual = "manual"
    git = "git"
    pr = "pr"
    meeting = "meeting"
    mcp = "mcp"


class SignalType(str, Enum):
    execution = "execution"
    ownership = "ownership"
    influence = "influence"
    risk = "risk"
    clarity = "clarity"
    leverage = "leverage"


class PriorityLevel(str, Enum):
    p0 = "p0"
    p1 = "p1"
    p2 = "p2"


class PriorityCategory(str, Enum):
    org = "org"
    team = "team"
    manager = "manager"
    personal = "personal"


class DayOfWeek(str, Enum):
    monday = "monday"
    tuesday = "tuesday"
    wednesday = "wednesday"
    thursday = "thursday"
    friday = "friday"


# ── Database tables ──────────────────────────────────────────────────────────

class Week(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    week_start: date = Field(index=True)
    mode: Optional[WeekMode] = None
    notes: Optional[str] = None


class Priority(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    week_id: int = Field(foreign_key="week.id")
    level: PriorityLevel
    category: PriorityCategory
    text: str


class StaffDimension(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    week_id: int = Field(foreign_key="week.id")
    dimension: int = Field(ge=1, le=8)
    evidence: Optional[str] = None
    gap: Optional[str] = None


class DailyEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    week_id: int = Field(foreign_key="week.id")
    day: DayOfWeek
    task: str
    source: EntrySource = EntrySource.manual
    unplanned: bool = False
    estimate_mins: Optional[int] = None
    status: EntryStatus = EntryStatus.in_progress
    important: bool = False
    urgent: bool = False
    signal_type: Optional[SignalType] = None
    reflection: Optional[str] = None
    enriched_task: Optional[str] = None


class WeeklySynthesis(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    week_id: int = Field(foreign_key="week.id", unique=True)
    what_landed: Optional[str] = None
    what_drifted: Optional[str] = None
    evidence_bullets: Optional[str] = None  # JSON array stored as string


class LLMPromptLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entry_id: Optional[int] = Field(default=None, foreign_key="dailyentry.id")
    week_id: Optional[int] = Field(default=None, foreign_key="week.id")
    prompt_type: str
    prompt_text: str
    response_text: str
    model: str
