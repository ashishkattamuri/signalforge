import type {
  Week, Priority, StaffDimension, DailyEntry, WeeklySynthesis,
  PriorityLevel, PriorityCategory, DayOfWeek, EntrySource, EntryStatus,
} from './types'

const BASE = '/api'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

// Weeks
export const getCurrentWeek = () => req<Week>('/weeks/current')
export const getWeek = (id: number) => req<Week>(`/weeks/${id}`)
export const updateWeek = (id: number, body: Partial<Week>) =>
  req<Week>(`/weeks/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

// Priorities
export const getPriorities = (weekId: number) =>
  req<Priority[]>(`/weeks/${weekId}/priorities`)
export const createPriority = (weekId: number, body: { level: PriorityLevel; category: PriorityCategory; text: string }) =>
  req<Priority>(`/weeks/${weekId}/priorities`, { method: 'POST', body: JSON.stringify(body) })
export const updatePriority = (id: number, body: { level: PriorityLevel; category: PriorityCategory; text: string }) =>
  req<Priority>(`/priorities/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deletePriority = (id: number) =>
  req<void>(`/priorities/${id}`, { method: 'DELETE' })

// Staff Dimensions
export const getDimensions = (weekId: number) =>
  req<StaffDimension[]>(`/weeks/${weekId}/dimensions`)
export const upsertDimension = (weekId: number, dim: number, body: { dimension: number; evidence?: string; gap?: string }) =>
  req<StaffDimension>(`/weeks/${weekId}/dimensions/${dim}`, { method: 'PUT', body: JSON.stringify(body) })

// Daily Entries
export const getEntries = (weekId: number) =>
  req<DailyEntry[]>(`/weeks/${weekId}/entries`)
export const createEntry = (weekId: number, body: {
  day: DayOfWeek; task: string; source?: EntrySource; unplanned?: boolean;
  estimate_mins?: number; status?: EntryStatus; important?: boolean; urgent?: boolean
}) => req<DailyEntry>(`/weeks/${weekId}/entries`, { method: 'POST', body: JSON.stringify(body) })
export const updateEntry = (id: number, body: Partial<DailyEntry>) =>
  req<DailyEntry>(`/entries/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteEntry = (id: number) =>
  req<void>(`/entries/${id}`, { method: 'DELETE' })

// Weekly Synthesis
export const getSynthesis = (weekId: number) =>
  req<WeeklySynthesis | Record<string, never>>(`/weeks/${weekId}/synthesis`)
export const generateSynthesis = (weekId: number) =>
  req<WeeklySynthesis>(`/weeks/${weekId}/synthesis/generate`, { method: 'POST' })

// Export
export const exportWeek = (weekId: number) =>
  req<{ markdown: string; week_start: string }>(`/weeks/${weekId}/export`)

// Health
export const getHealth = () =>
  req<{ status: string; llm_available: boolean }>('/health')
