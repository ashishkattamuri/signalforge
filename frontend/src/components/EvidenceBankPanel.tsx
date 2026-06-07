import { useEffect, useState } from 'react'
import type { EvidenceBullet } from '../types'
import { getEvidenceBank, toggleStar, getPromotionPacket } from '../api'

export function EvidenceBankPanel() {
  const [bullets, setBullets] = useState<EvidenceBullet[]>([])
  const [filter, setFilter] = useState<'all' | 'starred'>('all')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)

  useEffect(() => {
    getEvidenceBank(false).then(setBullets).finally(() => setLoading(false))
  }, [])

  async function handleStar(id: number) {
    const updated = await toggleStar(id)
    setBullets(prev => prev.map(b => b.id === id ? updated : b))
  }

  async function handleExportPacket() {
    setExporting(true)
    const { markdown, count } = await getPromotionPacket()
    if (count === 0) {
      alert('Star some bullets first to build your promotion packet.')
      setExporting(false)
      return
    }
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signalforge-promotion-packet-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2000)
    setExporting(false)
  }

  const displayed = filter === 'starred' ? bullets.filter(b => b.starred) : bullets
  const starredCount = bullets.filter(b => b.starred).length

  // Group by week
  const byWeek: Record<string, EvidenceBullet[]> = {}
  for (const b of displayed) {
    if (!byWeek[b.week_start]) byWeek[b.week_start] = []
    byWeek[b.week_start].push(b)
  }
  const weeks = Object.keys(byWeek).sort((a, b) => b.localeCompare(a))

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Evidence Bank
          </h2>
          <span className="text-xs text-gray-400">
            {bullets.length} bullet{bullets.length !== 1 ? 's' : ''} across all weeks
            {starredCount > 0 && ` · ${starredCount} starred`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-gray-200 overflow-hidden text-xs">
            {(['all', 'starred'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 transition-colors ${filter === f ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {f === 'starred' ? `⭐ Starred (${starredCount})` : 'All'}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportPacket}
            disabled={exporting || starredCount === 0}
            className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 font-medium transition-colors"
            title={starredCount === 0 ? 'Star bullets to build your packet' : 'Export starred bullets as promotion packet'}
          >
            {exported ? '✓ Downloaded' : exporting ? 'Exporting…' : `Export Packet (${starredCount})`}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-8 text-sm text-gray-400 text-center">Loading evidence bank…</div>
      ) : bullets.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-gray-500 font-medium">No evidence bullets yet</p>
          <p className="text-xs text-gray-400 mt-1">Generate weekly synthesis to populate the evidence bank.</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="px-6 py-8 text-sm text-gray-400 text-center">
          No starred bullets yet — click ⭐ on any bullet to add it to your promotion packet.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {weeks.map(weekStart => (
            <div key={weekStart} className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Week of {new Date(weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="space-y-2">
                {byWeek[weekStart].map(bullet => (
                  <BulletRow key={bullet.id} bullet={bullet} onStar={handleStar} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BulletRow({ bullet, onStar }: { bullet: EvidenceBullet; onStar: (id: number) => Promise<void> }) {
  const [starring, setStarring] = useState(false)

  async function handleClick() {
    setStarring(true)
    await onStar(bullet.id)
    setStarring(false)
  }

  return (
    <div className={`flex items-start gap-3 group p-2 rounded-lg transition-colors ${bullet.starred ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
      <button
        onClick={handleClick}
        disabled={starring}
        className={`mt-0.5 text-base shrink-0 transition-all ${bullet.starred ? 'text-amber-400 scale-110' : 'text-gray-200 hover:text-amber-300 group-hover:text-gray-300'}`}
        title={bullet.starred ? 'Remove from promotion packet' : 'Add to promotion packet'}
      >
        ★
      </button>
      <p className="text-sm text-gray-700 leading-relaxed flex-1">{bullet.text}</p>
    </div>
  )
}
