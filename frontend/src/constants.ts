import type { DayOfWeek, SignalType, EntryStatus, WeekMode } from './types'

export const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

export const STAFF_DIMENSIONS = [
  { n: 1, label: 'Technical Scope',       quote: 'Solve problems no one else on the team can.',              prompt: 'What did you solve that others couldn\'t?' },
  { n: 2, label: 'Ownership & Initiative',quote: 'Drive multi-team work end-to-end without being asked.',    prompt: 'Did you drive something end-to-end unprompted?' },
  { n: 3, label: 'Cross-team Influence',  quote: 'Shape decisions across three or more teams.',              prompt: 'Did you unblock, align, or shape decisions across teams?' },
  { n: 4, label: 'Ambiguity Navigation',  quote: 'Create the plan when none exists.',                        prompt: 'Did you create clarity where none existed?' },
  { n: 5, label: 'Risk Reduction',        quote: 'Prevent failures the team didn\'t see coming.',            prompt: 'Did you prevent failure, data loss, or toil?' },
  { n: 6, label: 'Execution Velocity',    quote: 'Ship cleanly the first time at high cadence.',             prompt: 'Did you ship high-quality work with appropriate urgency?' },
  { n: 7, label: 'Mentorship & Leverage', quote: 'Multiply other engineers\' output, not just your own.',    prompt: 'Did you multiply others\' output?' },
  { n: 8, label: 'Strategic Alignment',   quote: 'Stay on the highest-leverage thing every week.',           prompt: 'Was your work on the right thing at the right time?' },
]

export type EntryPriority = 'p0' | 'p1' | 'p2' | 'p3'

export function deriveEntryPriority(important: boolean, urgent: boolean): EntryPriority {
  if (important && urgent) return 'p0'
  if (important) return 'p1'
  if (urgent) return 'p2'
  return 'p3'
}

export const ENTRY_PRIORITY_META: Record<EntryPriority, { label: string; color: string; hint: string }> = {
  p0: { label: 'P0', color: 'bg-red-100 text-red-700 border border-red-300',      hint: 'critical — do now' },
  p1: { label: 'P1', color: 'bg-amber-100 text-amber-700 border border-amber-300', hint: 'important — plan it' },
  p2: { label: 'P2', color: 'bg-blue-100 text-blue-700 border border-blue-300',    hint: 'urgent — delegate if possible' },
  p3: { label: 'P3', color: 'bg-gray-100 text-gray-500 border border-gray-200',    hint: 'drop / defer (neither — drift risk)' },
}

export function formatMins(mins: number | null | undefined): string {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

export function isoWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export const STATUS_META: Record<EntryStatus, { label: string; icon: string; color: string }> = {
  complete:    { label: 'Complete',     icon: '✅', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  in_progress: { label: 'In Progress',  icon: '🟡', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  blocked:     { label: 'Blocked',      icon: '🟠', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  incomplete:  { label: 'Incomplete',   icon: '🔴', color: 'bg-red-50 text-red-700 border-red-200' },
}

export const SIGNAL_META: Record<SignalType, { color: string }> = {
  execution:  { color: 'bg-blue-100 text-blue-700' },
  ownership:  { color: 'bg-purple-100 text-purple-700' },
  influence:  { color: 'bg-indigo-100 text-indigo-700' },
  risk:       { color: 'bg-red-100 text-red-700' },
  clarity:    { color: 'bg-teal-100 text-teal-700' },
  leverage:   { color: 'bg-pink-100 text-pink-700' },
}

export const MODE_META: Record<WeekMode, { label: string; color: string }> = {
  focus:    { label: 'Focus',    color: 'bg-emerald-100 text-emerald-800' },
  drift:    { label: 'Drift',    color: 'bg-amber-100 text-amber-800' },
  recovery: { label: 'Recovery', color: 'bg-red-100 text-red-800' },
}
