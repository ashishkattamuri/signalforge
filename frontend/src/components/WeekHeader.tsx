import { useState } from 'react'
import type { Week } from '../types'
import { isoWeekNumber, formatMins } from '../constants'
import { updateWeek } from '../api'
import { WeekNav } from './WeekNav'

interface Props {
  week: Week
  allWeeks: Week[]
  entryCount: number
  unplannedCount: number
  totalMins: number
  enrichedCount: number
  onWeekUpdated: (w: Week) => void
  onWeekChange: (w: Week) => void
  onOpenSettings?: () => void
}

export function WeekHeader({
  week, allWeeks, entryCount, unplannedCount, totalMins, enrichedCount,
  onWeekUpdated, onWeekChange, onOpenSettings,
}: Props) {
  const [editingQuote, setEditingQuote] = useState(false)
  const [quoteVal, setQuoteVal] = useState(week.focus_quote ?? '')

  const weekNum = isoWeekNumber(week.week_start)
  const year = week.week_start.slice(0, 4)
  const weekDate = new Date(week.week_start + 'T00:00:00')
  const dateLabel = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const unplannedPct = entryCount ? Math.round((unplannedCount / entryCount) * 100) : 0
  const enrichedPct = entryCount ? Math.round((enrichedCount / entryCount) * 100) : 0

  async function saveQuote() {
    setEditingQuote(false)
    const updated = await updateWeek(week.id, { focus_quote: quoteVal || null })
    onWeekUpdated(updated)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-6">
      {/* Top row: meta + nav */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
          SignalForge · W{weekNum} · {year}
        </p>
        <div className="flex items-center gap-3">
          <WeekNav week={week} allWeeks={allWeeks} onWeekChange={onWeekChange} />
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Setup & settings"
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main row: title + stats */}
      <div className="flex items-end justify-between gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            Week of {dateLabel}
          </h1>

          {/* Editable focus quote */}
          <div className="mt-2">
            {editingQuote ? (
              <input
                autoFocus
                value={quoteVal}
                onChange={e => setQuoteVal(e.target.value)}
                onBlur={saveQuote}
                onKeyDown={e => { if (e.key === 'Enter') saveQuote(); if (e.key === 'Escape') { setEditingQuote(false); setQuoteVal(week.focus_quote ?? '') } }}
                placeholder="Set your week's focus or north star..."
                className="text-sm italic text-gray-500 bg-transparent border-b border-blue-300 outline-none w-full max-w-lg py-0.5"
              />
            ) : (
              <p
                onClick={() => { setEditingQuote(true); setQuoteVal(week.focus_quote ?? '') }}
                className="text-sm italic text-gray-500 cursor-text hover:text-gray-700 transition-colors"
              >
                {week.focus_quote
                  ? `"${week.focus_quote}"`
                  : <span className="text-gray-300 not-italic">Click to add a focus statement for this week...</span>
                }
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-end gap-8 shrink-0">
          <StatBlock value={formatMins(totalMins)} label="logged" />
          <StatBlock value={`${unplannedPct}%`} label="unplanned" alert={unplannedPct > 40} />
          <StatBlock value={`${enrichedPct}%`} label="enriched" good={enrichedPct >= 80} />
        </div>
      </div>
    </div>
  )
}

function StatBlock({ value, label, alert = false, good = false }: {
  value: string; label: string; alert?: boolean; good?: boolean
}) {
  return (
    <div className="text-right">
      <p className={`text-3xl font-bold tabular-nums leading-none ${alert ? 'text-orange-500' : good ? 'text-emerald-600' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400 mt-1 tracking-wide">{label}</p>
    </div>
  )
}
