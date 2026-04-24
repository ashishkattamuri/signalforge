import { useEffect, useState } from 'react'
import type { Week, Priority, StaffDimension, DailyEntry, WeeklySynthesis } from './types'
import { getCurrentWeek, getPriorities, getDimensions, getEntries, getSynthesis } from './api'
import { WeekHeader } from './components/WeekHeader'
import { StaffDimensionsPanel } from './components/StaffDimensionsPanel'
import { PriorityContextPanel } from './components/PriorityContextPanel'
import { DailyGrid } from './components/DailyGrid'
import { WeeklySynthesisPanel } from './components/WeeklySynthesisPanel'

export default function App() {
  const [week, setWeek] = useState<Week | null>(null)
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [dimensions, setDimensions] = useState<StaffDimension[]>([])
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [synthesis, setSynthesis] = useState<WeeklySynthesis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const w = await getCurrentWeek()
        const [p, d, e, s] = await Promise.all([
          getPriorities(w.id),
          getDimensions(w.id),
          getEntries(w.id),
          getSynthesis(w.id),
        ])
        setWeek(w)
        setPriorities(p)
        setDimensions(d)
        setEntries(e)
        setSynthesis('week_id' in s ? s as WeeklySynthesis : null)
      } catch {
        setError('Cannot reach SignalForge backend. Make sure the server is running on port 8000.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
          <p className="text-xs text-gray-400 mt-4 font-mono">
            cd backend && uv run python main.py
          </p>
        </div>
      </div>
    )
  }

  const totalMins = entries.reduce((s, e) => s + (e.estimate_mins ?? 0), 0)
  const unplannedCount = entries.filter((e) => e.unplanned).length
  const enrichedCount = entries.filter((e) => e.enriched_task).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 shadow-sm">
        <div className="bg-gray-900 px-6 py-2 flex items-center gap-3">
          <span className="text-white font-semibold text-sm tracking-wide">⚡ SignalForge</span>
          <span className="text-gray-500 text-xs">engineering work OS</span>
        </div>
        <WeekHeader
          week={week}
          entryCount={entries.length}
          unplannedCount={unplannedCount}
          totalMins={totalMins}
          enrichedCount={enrichedCount}
          onWeekUpdated={setWeek}
        />
      </div>

      <div className="max-w-screen-2xl mx-auto">
        <StaffDimensionsPanel
          weekId={week.id}
          dimensions={dimensions}
          onUpdated={(d) => setDimensions((prev) => {
            const idx = prev.findIndex((x) => x.dimension === d.dimension)
            return idx >= 0 ? prev.map((x) => (x.dimension === d.dimension ? d : x)) : [...prev, d]
          })}
        />

        <PriorityContextPanel
          weekId={week.id}
          priorities={priorities}
          onUpdated={setPriorities}
        />

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
      </div>
    </div>
  )
}
