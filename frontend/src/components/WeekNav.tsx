import { useState } from 'react'
import type { Week } from '../types'
import { getWeekByDate } from '../api'

interface Props {
  week: Week
  allWeeks: Week[]
  onWeekChange: (w: Week) => void
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function WeekNav({ week, allWeeks, onWeekChange }: Props) {
  const [loading, setLoading] = useState(false)

  async function navigate(isoDate: string) {
    setLoading(true)
    const w = await getWeekByDate(isoDate)
    onWeekChange(w)
    setLoading(false)
  }

  const todayWeekStart = (() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1))
    return d.toISOString().slice(0, 10)
  })()
  const isCurrentWeek = week.week_start === todayWeekStart

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => navigate(addDays(week.week_start, -7))}
        disabled={loading}
        className="px-2 py-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded text-sm transition-colors disabled:opacity-40"
        title="Previous week"
      >
        ‹
      </button>

      {/* Week dropdown */}
      <select
        value={week.id}
        onChange={(e) => {
          const selected = allWeeks.find(w => w.id === parseInt(e.target.value))
          if (selected) onWeekChange(selected)
        }}
        className="text-xs text-gray-600 bg-transparent border-none outline-none cursor-pointer py-1 px-1"
      >
        {allWeeks.map(w => (
          <option key={w.id} value={w.id}>
            {new Date(w.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {w.week_start === todayWeekStart ? ' (this week)' : ''}
          </option>
        ))}
      </select>

      <button
        onClick={() => navigate(addDays(week.week_start, 7))}
        disabled={loading || isCurrentWeek}
        className="px-2 py-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded text-sm transition-colors disabled:opacity-30"
        title="Next week"
      >
        ›
      </button>

      {!isCurrentWeek && (
        <button
          onClick={() => navigate(todayWeekStart)}
          className="ml-2 text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
        >
          Today
        </button>
      )}
    </div>
  )
}
