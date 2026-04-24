export type WeekMode = 'focus' | 'drift' | 'recovery'
export type EntryStatus = 'complete' | 'in_progress' | 'blocked' | 'incomplete'
export type EntrySource = 'manual' | 'git' | 'pr' | 'meeting' | 'mcp'
export type SignalType = 'execution' | 'ownership' | 'influence' | 'risk' | 'clarity' | 'leverage'
export type PriorityLevel = 'p0' | 'p1' | 'p2'
export type PriorityCategory = 'org' | 'team' | 'manager' | 'personal'
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

export interface Week {
  id: number
  week_start: string
  mode: WeekMode | null
  notes: string | null
}

export interface Priority {
  id: number
  week_id: number
  level: PriorityLevel
  category: PriorityCategory
  text: string
}

export interface StaffDimension {
  id: number
  week_id: number
  dimension: number
  evidence: string | null
  gap: string | null
}

export interface DailyEntry {
  id: number
  week_id: number
  day: DayOfWeek
  task: string
  source: EntrySource
  unplanned: boolean
  estimate_mins: number | null
  status: EntryStatus
  important: boolean
  urgent: boolean
  signal_type: SignalType | null
  reflection: string | null
  enriched_task: string | null
}

export interface WeeklySynthesis {
  week_id: number
  what_landed: string | null
  what_drifted: string | null
  evidence_bullets: string | null
}
