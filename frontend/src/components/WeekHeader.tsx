import { useState } from 'react'
import type { Week, WeekMode } from '../types'
import { MODE_META } from '../constants'
import { updateWeek } from '../api'

interface Props {
  week: Week
  entryCount: number
  unplannedCount: number
  totalMins: number
  enrichedCount: number
  onWeekUpdated: (w: Week) => void
}

export function WeekHeader({ week, entryCount, unplannedCount, totalMins, enrichedCount, onWeekUpdated }: Props) {
  const [saving, setSaving] = useState(false)

  const totalHrs = (totalMins / 60).toFixed(1)
  const unplannedPct = entryCount ? Math.round((unplannedCount / entryCount) * 100) : 0
  const modeMeta = week.mode ? MODE_META[week.mode] : null

  const weekLabel = new Date(week.week_start + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  async function cycleMode() {
    const modes: (WeekMode | null)[] = ['focus', 'drift', 'recovery', null]
    const current = modes.indexOf(week.mode as WeekMode | null)
    const next = modes[(current + 1) % modes.length]
    setSaving(true)
    const updated = await updateWeek(week.id, { mode: next ?? undefined })
    onWeekUpdated(updated)
    setSaving(false)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Week of</p>
          <h1 className="text-xl font-semibold text-gray-900">{weekLabel}</h1>
        </div>
        <button
          onClick={cycleMode}
          disabled={saving}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-opacity ${
            modeMeta
              ? `${modeMeta.color} border-current opacity-90 hover:opacity-100`
              : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
          }`}
        >
          {modeMeta ? `${modeMeta.label} week` : 'Set mode'}
        </button>
      </div>

      <div className="flex gap-6 text-sm">
        <Stat label="Logged" value={`${totalHrs}h`} />
        <Stat label="Unplanned" value={`${unplannedPct}%`} alert={unplannedPct > 40} />
        <Stat label="Enriched" value={`${enrichedCount} / ${entryCount}`} />
      </div>
    </div>
  )
}

function Stat({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="text-center">
      <p className={`font-semibold ${alert ? 'text-orange-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}
