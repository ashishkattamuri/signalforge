import { useEffect, useState } from 'react'
import type { WeekTrend } from '../types'
import { MODE_META, SIGNAL_META } from '../constants'
import { getTrends } from '../api'

export function TrendsPanel() {
  const [trends, setTrends] = useState<WeekTrend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTrends().then(setTrends).finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (trends.length < 2) return null  // not useful with only one week

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Week-over-Week Trends
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
              <th className="text-left px-6 py-2">Week</th>
              <th className="text-left px-3 py-2">Mode</th>
              <th className="text-right px-3 py-2">Entries</th>
              <th className="text-right px-3 py-2">Hrs logged</th>
              <th className="text-right px-3 py-2">Unplanned</th>
              <th className="text-right px-3 py-2">Enriched</th>
              <th className="text-right px-3 py-2">Complete</th>
              <th className="text-left px-6 py-2">Top signal</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((t, i) => (
              <TrendRow key={t.week_id} trend={t} isLatest={i === 0} prev={trends[i + 1]} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TrendRow({ trend, isLatest, prev }: { trend: WeekTrend; isLatest: boolean; prev?: WeekTrend }) {
  const modeMeta = trend.mode ? MODE_META[trend.mode] : null

  function delta(curr: number, prev: number | undefined, higherIsBetter = true) {
    if (prev === undefined) return null
    const diff = curr - prev
    if (Math.abs(diff) < 2) return null
    const up = diff > 0
    const good = higherIsBetter ? up : !up
    return (
      <span className={`text-xs ml-1 ${good ? 'text-emerald-500' : 'text-red-400'}`}>
        {up ? '▲' : '▼'}{Math.abs(diff)}
      </span>
    )
  }

  const weekLabel = new Date(trend.week_start + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })

  return (
    <tr className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isLatest ? 'font-medium' : ''}`}>
      <td className="px-6 py-2.5 text-gray-700">
        {weekLabel}
        {isLatest && <span className="ml-2 text-xs text-blue-500 font-normal">current</span>}
      </td>
      <td className="px-3 py-2.5">
        {modeMeta ? (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${modeMeta.color}`}>
            {modeMeta.label}
          </span>
        ) : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">{trend.total_entries}</td>
      <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
        {trend.total_hrs}h
        {delta(trend.total_hrs, prev?.total_hrs)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        <span className={trend.unplanned_pct > 40 ? 'text-orange-500 font-medium' : 'text-gray-600'}>
          {trend.unplanned_pct}%
        </span>
        {delta(trend.unplanned_pct, prev?.unplanned_pct, false)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        <span className={trend.enriched_pct >= 80 ? 'text-emerald-600' : 'text-gray-500'}>
          {trend.enriched_pct}%
        </span>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        <span className={trend.complete_pct >= 70 ? 'text-emerald-600' : trend.complete_pct < 40 ? 'text-red-400' : 'text-gray-600'}>
          {trend.complete_pct}%
        </span>
        {delta(trend.complete_pct, prev?.complete_pct)}
      </td>
      <td className="px-6 py-2.5">
        {trend.top_signal ? (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SIGNAL_META[trend.top_signal]?.color ?? 'bg-gray-100 text-gray-600'}`}>
            {trend.top_signal}
          </span>
        ) : <span className="text-gray-300">—</span>}
      </td>
    </tr>
  )
}
