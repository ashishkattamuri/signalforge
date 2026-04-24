import type { DayOfWeek, SignalType, EntryStatus, WeekMode } from './types'

export const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

export const STAFF_DIMENSIONS = [
  { n: 1, label: 'Technical Scope', prompt: 'What did you solve that others couldn\'t?' },
  { n: 2, label: 'Ownership & Initiative', prompt: 'Did you drive something end-to-end unprompted?' },
  { n: 3, label: 'Cross-team Influence', prompt: 'Did you unblock, align, or shape decisions across teams?' },
  { n: 4, label: 'Ambiguity Navigation', prompt: 'Did you create clarity where none existed?' },
  { n: 5, label: 'Risk Reduction', prompt: 'Did you prevent failure, data loss, or toil?' },
  { n: 6, label: 'Execution Velocity', prompt: 'Did you ship high-quality work with appropriate urgency?' },
  { n: 7, label: 'Mentorship & Leverage', prompt: 'Did you multiply others\' output?' },
  { n: 8, label: 'Strategic Alignment', prompt: 'Was your work on the right thing at the right time?' },
]

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
