import { useEffect, useState } from 'react'
import type { AlignmentStats } from '../types'
import { SIGNAL_META } from '../constants'
import { getAlignment } from '../api'

interface Props {
  weekId: number
}

export function AlignmentPanel({ weekId }: Props) {
  const [stats, setStats] = useState<AlignmentStats | null>(null)

  useEffect(() => {
    getAlignment(weekId).then(setStats).catch(() => setStats(null))
  }, [weekId])

  if (!stats || stats.total_entries === 0) return null

  const score = stats.overall_score
  const scoreColor =
    score >= 75 ? 'text-emerald-600' :
    score >= 50 ? 'text-amber-500' :
    'text-red-500'

  const scoreRing =
    score >= 75 ? 'border-emerald-400' :
    score >= 50 ? 'border-amber-400' :
    'border-red-400'

  const totalSignalMins = Object.values(stats.by_signal_mins).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Priority Alignment
        </h2>
      </div>

      <div className="px-6 py-4 flex items-start gap-8">
        {/* Alignment score ring */}
        <div className="flex flex-col items-center shrink-0">
          <div className={`w-16 h-16 rounded-full border-4 ${scoreRing} flex items-center justify-center`}>
            <span className={`text-xl font-bold ${scoreColor}`}>{score}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">Alignment<br />score</p>
          {stats.focus_score !== null && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Focus: <span className="font-medium text-gray-600">{stats.focus_score}%</span>
            </p>
          )}
        </div>

        {/* Stat cards */}
        <div className="flex gap-4 flex-wrap">
          <StatCard
            label="Unplanned"
            value={`${stats.unplanned_pct}%`}
            sub={`${Math.round(stats.unplanned_mins / 60 * 10) / 10}h of ${Math.round(stats.total_mins / 60 * 10) / 10}h`}
            alert={stats.unplanned_pct > 40}
          />
          <StatCard
            label="Planned"
            value={`${stats.plan_score}%`}
            sub="of time on planned work"
            good={stats.plan_score >= 70}
          />
          {stats.focus_score !== null && (
            <StatCard
              label="Important tasks done"
              value={`${stats.focus_score}%`}
              sub="of flagged-important entries"
              good={stats.focus_score >= 70}
              alert={stats.focus_score < 40}
            />
          )}
        </div>

        {/* Signal type bar */}
        {totalSignalMins > 0 && (
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-2 font-medium">Time by signal type</p>
            <div className="flex h-5 rounded overflow-hidden gap-px">
              {Object.entries(stats.by_signal_mins)
                .sort(([, a], [, b]) => b - a)
                .map(([sig, mins]) => {
                  const pct = Math.round((mins / totalSignalMins) * 100)
                  if (pct < 3) return null
                  const color = SIGNAL_META[sig as keyof typeof SIGNAL_META]?.color ?? 'bg-gray-200'
                  return (
                    <div
                      key={sig}
                      className={`${color} flex items-center justify-center`}
                      style={{ width: `${pct}%` }}
                      title={`${sig}: ${pct}% (${Math.round(mins / 60 * 10) / 10}h)`}
                    >
                      {pct >= 10 && <span className="text-xs font-medium opacity-80 truncate px-1">{sig}</span>}
                    </div>
                  )
                })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {Object.entries(stats.by_signal_mins)
                .sort(([, a], [, b]) => b - a)
                .map(([sig, mins]) => {
                  const pct = Math.round((mins / totalSignalMins) * 100)
                  const color = SIGNAL_META[sig as keyof typeof SIGNAL_META]?.color ?? 'bg-gray-200'
                  return (
                    <span key={sig} className="flex items-center gap-1 text-xs text-gray-500">
                      <span className={`inline-block w-2 h-2 rounded-sm ${color.replace('text-', 'bg-').split(' ')[0]}`} />
                      {sig} {pct}%
                    </span>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, alert = false, good = false }: {
  label: string; value: string; sub: string; alert?: boolean; good?: boolean
}) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3 min-w-[120px]">
      <p className={`text-lg font-bold ${alert ? 'text-orange-500' : good ? 'text-emerald-600' : 'text-gray-800'}`}>
        {value}
      </p>
      <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}
