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
  focus_quote: string | null
  target_level: string | null
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
  rating: number | null
  current_level: string | null
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

export interface EvidenceBullet {
  id: number
  week_id: number
  week_start: string
  text: string
  starred: boolean
}

export interface AlignmentStats {
  total_entries: number
  total_mins: number
  unplanned_pct: number
  unplanned_mins: number
  focus_score: number | null
  plan_score: number
  overall_score: number
  by_signal_mins: Record<string, number>
  by_status_count: Record<string, number>
}

export interface AppSettings {
  id: number
  onboarded: boolean
  selected_model: string
  profile_name: string | null
  current_level: string | null
  target_level: string | null
  org_context: string | null
}

export interface WeekTrend {
  week_id: number
  week_start: string
  mode: WeekMode | null
  total_entries: number
  total_hrs: number
  unplanned_pct: number
  enriched_pct: number
  complete_pct: number
  top_signal: SignalType | null
}
