import { useEffect, useState, useCallback } from 'react'
import type { Week, Priority, StaffDimension, DailyEntry, WeeklySynthesis } from './types'
import {
  getCurrentWeek, getPriorities, getDimensions, getEntries, getSynthesis, listWeeks,
  getSettings, updateSettings,
} from './api'
import { WeekHeader } from './components/WeekHeader'
import { StaffDimensionsPanel } from './components/StaffDimensionsPanel'
import { PriorityContextPanel } from './components/PriorityContextPanel'
import { AlignmentPanel } from './components/AlignmentPanel'
import { DailyGrid } from './components/DailyGrid'
import { WeeklySynthesisPanel } from './components/WeeklySynthesisPanel'
import { EvidenceBankPanel } from './components/EvidenceBankPanel'
import { TrendsPanel } from './components/TrendsPanel'
import { WorkOSView } from './components/WorkOSView'
import { Sidebar } from './components/Sidebar'
import type { AppView } from './components/Sidebar'
import { StartupScreen } from './components/StartupScreen'
import { Onboarding } from './components/Onboarding'
import type { Profile } from './components/Onboarding'

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
const HEALTH_URL = 'http://localhost:8000/api/health'
const POLL_INTERVAL_MS = 600
const BACKEND_TIMEOUT_MS = 40_000

interface StartupEvent {
  stage: 'starting_backend' | 'checking_ollama' | 'pulling_model' | 'ready' | 'error'
  message: string
  progress: number | null
}

// Poll the backend health endpoint until it responds or timeout elapses.
// Returns true when ready, false on timeout.
async function waitForBackend(): Promise<boolean> {
  const deadline = Date.now() + BACKEND_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(1500) })
      if (res.ok) return true
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
  return false
}

export default function App() {
  const [week, setWeek] = useState<Week | null>(null)
  const [allWeeks, setAllWeeks] = useState<Week[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [dimensions, setDimensions] = useState<StaffDimension[]>([])
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [synthesis, setSynthesis] = useState<WeeklySynthesis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startup, setStartup] = useState<StartupEvent | null>(
    IS_TAURI ? { stage: 'starting_backend', message: 'Starting SignalForge backend…', progress: null } : null
  )
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [view, setView] = useState<AppView>('journal')

  async function loadWeekData(w: Week) {
    const [p, d, e, s] = await Promise.all([
      getPriorities(w.id),
      getDimensions(w.id),
      getEntries(w.id),
      getSynthesis(w.id),
    ])
    setPriorities(p)
    setDimensions(d)
    setEntries(e)
    setSynthesis('week_id' in s ? s as WeeklySynthesis : null)
  }

  async function init() {
    try {
      const [w, weeks, settings] = await Promise.all([getCurrentWeek(), listWeeks(), getSettings()])
      const merged = weeks.find(x => x.id === w.id) ? weeks : [w, ...weeks]
      setAllWeeks(merged)
      setWeek(w)
      await loadWeekData(w)
      if (!settings.onboarded) setShowOnboarding(true)
    } catch {
      setError('Cannot reach SignalForge backend. Make sure the server is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOnboardingComplete(profile: Profile, model: string) {
    await updateSettings({
      onboarded: true,
      selected_model: model,
      profile_name: profile.name || undefined,
      current_level: profile.currentLevel || undefined,
      target_level: profile.targetLevel || undefined,
      org_context: profile.orgContext || undefined,
    })
    setShowOnboarding(false)
  }

  useEffect(() => {
    if (!IS_TAURI) {
      // Browser / dev mode — backend assumed already running
      init()
      return
    }

    // Tauri mode — Rust has already spawned the sidecar; we just poll until ready
    async function waitAndInit() {
      setStartup({ stage: 'starting_backend', message: 'Starting SignalForge backend…', progress: null })

      const ready = await waitForBackend()

      if (!ready) {
        setStartup({
          stage: 'error',
          message: 'Backend failed to start after 40 seconds. Try relaunching SignalForge.',
          progress: null,
        })
        return
      }

      setStartup({ stage: 'ready', message: 'Ready', progress: 100 })
      init()
    }

    waitAndInit()
  }, [])

  const handleWeekChange = useCallback(async (w: Week) => {
    setWeek(w)
    setAllWeeks(prev =>
      prev.find(x => x.id === w.id) ? prev.map(x => (x.id === w.id ? w : x)) : [w, ...prev]
    )
    await loadWeekData(w)
  }, [])

  const updateDimension = useCallback((d: StaffDimension) => {
    setDimensions(prev => {
      const idx = prev.findIndex(x => x.dimension === d.dimension)
      return idx >= 0 ? prev.map(x => (x.dimension === d.dimension ? d : x)) : [...prev, d]
    })
  }, [])

  if (IS_TAURI && startup && startup.stage !== 'ready') {
    return <StartupScreen event={startup} />
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl mb-2">⚡</div>
          <p className="text-sm text-gray-500">Loading SignalForge...</p>
        </div>
      </div>
    )
  }

  if (error || !week) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-gray-700 font-medium mb-2">Backend not reachable</p>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="text-xs text-gray-400 mt-4 font-mono">cd backend && uv run python main.py</p>
        </div>
      </div>
    )
  }

  const totalMins = entries.reduce((s, e) => s + (e.estimate_mins ?? 0), 0)
  const unplannedCount = entries.filter(e => e.unplanned).length
  const enrichedCount = entries.filter(e => e.enriched_task).length

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar view={view} onChange={setView} onOpenSettings={() => setShowOnboarding(true)} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-screen-xl mx-auto">
          {view === 'journal' ? (
            <>
              <WeekHeader
                week={week}
                allWeeks={allWeeks}
                entryCount={entries.length}
                unplannedCount={unplannedCount}
                totalMins={totalMins}
                enrichedCount={enrichedCount}
                onWeekUpdated={setWeek}
                onWeekChange={handleWeekChange}
              />
              <StaffDimensionsPanel
                week={week}
                dimensions={dimensions}
                onUpdated={updateDimension}
                onWeekUpdated={setWeek}
              />
              <PriorityContextPanel
                weekId={week.id}
                priorities={priorities}
                onUpdated={setPriorities}
              />
              <AlignmentPanel weekId={week.id} />
              <DailyGrid
                weekId={week.id}
                entries={entries}
                onUpdated={setEntries}
              />
              <WeeklySynthesisPanel
                weekId={week.id}
                synthesis={synthesis}
                onUpdated={setSynthesis}
              />
              <EvidenceBankPanel />
              <TrendsPanel />
            </>
          ) : (
            <WorkOSView />
          )}
        </div>
      </main>
    </div>
  )
}
