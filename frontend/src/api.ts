import type {
  Week, Priority, StaffDimension, DailyEntry, WeeklySynthesis,
  PriorityLevel, PriorityCategory, DayOfWeek, EntrySource, EntryStatus,
} from './types'

// In Tauri there is no proxy — use absolute URL. In Vite dev, relative URL is proxied.
const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
const BASE = IS_TAURI ? 'http://localhost:8000/api' : '/api'

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
export const upsertDimension = (weekId: number, dim: number, body: { dimension: number; evidence?: string; gap?: string; rating?: number; current_level?: string }) =>
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

// Week list & navigation
export const listWeeks = () => req<Week[]>('/weeks')
export const getWeekByDate = (isoDate: string) => req<Week>(`/weeks/by-date/${isoDate}`)

// Alignment
export const getAlignment = (weekId: number) =>
  req<import('./types').AlignmentStats>(`/weeks/${weekId}/alignment`)

// Evidence bank
export const getEvidenceBank = (starredOnly = false) =>
  req<import('./types').EvidenceBullet[]>(`/evidence-bank${starredOnly ? '?starred_only=true' : ''}`)
export const toggleStar = (bulletId: number) =>
  req<import('./types').EvidenceBullet>(`/evidence-bank/${bulletId}/star`, { method: 'PATCH' })

// Promotion packet
export const getPromotionPacket = () =>
  req<{ markdown: string; count: number }>('/promotion-packet')

// Trends
export const getTrends = () =>
  req<import('./types').WeekTrend[]>('/trends')

// Health
export const getHealth = () =>
  req<{ status: string; llm_available: boolean }>('/health')

// App settings
export const getSettings = () =>
  req<import('./types').AppSettings>('/settings')
export const updateSettings = (body: Partial<import('./types').AppSettings>) =>
  req<import('./types').AppSettings>('/settings', { method: 'PATCH', body: JSON.stringify(body) })

// Connections (agentic WorkOS)
export const getConnections = () =>
  req<import('./types').Connection[]>('/connections')
export const createConnection = (body: Partial<import('./types').Connection> & { name: string; kind: import('./types').ConnectionKind }) =>
  req<import('./types').Connection>('/connections', { method: 'POST', body: JSON.stringify(body) })
export const updateConnection = (id: number, body: Partial<import('./types').Connection>) =>
  req<import('./types').Connection>(`/connections/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteConnection = (id: number) =>
  req<void>(`/connections/${id}`, { method: 'DELETE' })
export const testConnection = (id: number) =>
  req<import('./types').ConnectionTestResult>(`/connections/${id}/test`, { method: 'POST' })
export const authorizeConnection = (id: number) =>
  req<{ ok: boolean; auth_url?: string; error?: string }>(`/connections/${id}/authorize`, { method: 'POST' })
export const authorizeStatus = (id: number) =>
  req<{ status: 'none' | 'pending' | 'success' | 'error'; error?: string; tool_count?: number }>(`/connections/${id}/authorize/status`)
