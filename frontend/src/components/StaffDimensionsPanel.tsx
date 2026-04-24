import { useState } from 'react'
import type { StaffDimension } from '../types'
import { STAFF_DIMENSIONS } from '../constants'
import { upsertDimension } from '../api'

interface Props {
  weekId: number
  dimensions: StaffDimension[]
  onUpdated: (d: StaffDimension) => void
}

export function StaffDimensionsPanel({ weekId, dimensions, onUpdated }: Props) {
  const dimMap = Object.fromEntries(dimensions.map(d => [d.dimension, d]))

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Staff Signal Dimensions
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2 w-8 text-gray-400 font-medium">#</th>
              <th className="text-left px-4 py-2 w-48 text-gray-500 font-medium">Dimension</th>
              <th className="text-left px-4 py-2 text-gray-500 font-medium">Evidence this week</th>
              <th className="text-left px-4 py-2 w-72 text-gray-500 font-medium">Gap to close</th>
            </tr>
          </thead>
          <tbody>
            {STAFF_DIMENSIONS.map((dim) => (
              <DimensionRow
                key={dim.n}
                weekId={weekId}
                meta={dim}
                data={dimMap[dim.n]}
                onUpdated={onUpdated}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DimensionRow({
  weekId, meta, data, onUpdated,
}: {
  weekId: number
  meta: (typeof STAFF_DIMENSIONS)[number]
  data: StaffDimension | undefined
  onUpdated: (d: StaffDimension) => void
}) {
  const [evidence, setEvidence] = useState(data?.evidence ?? '')
  const [gap, setGap] = useState(data?.gap ?? '')
  const [saving, setSaving] = useState(false)

  async function save(field: 'evidence' | 'gap', value: string) {
    setSaving(true)
    const updated = await upsertDimension(weekId, meta.n, {
      dimension: meta.n,
      evidence: field === 'evidence' ? value : evidence || undefined,
      gap: field === 'gap' ? value : gap || undefined,
    })
    onUpdated(updated)
    setSaving(false)
  }

  const hasContent = evidence || gap

  return (
    <tr className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${saving ? 'opacity-60' : ''}`}>
      <td className="px-4 py-2 text-gray-300 text-xs font-mono">{meta.n}</td>
      <td className="px-4 py-2">
        <p className="font-medium text-gray-700 text-xs">{meta.label}</p>
        {!hasContent && (
          <p className="text-gray-400 text-xs mt-0.5">{meta.prompt}</p>
        )}
      </td>
      <td className="px-4 py-2">
        <textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          onBlur={(e) => save('evidence', e.target.value)}
          placeholder={meta.prompt}
          rows={1}
          className="w-full text-xs text-gray-700 bg-transparent resize-none outline-none placeholder-gray-300 focus:placeholder-gray-400 leading-relaxed min-h-[1.5rem]"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
      </td>
      <td className="px-4 py-2">
        <textarea
          value={gap}
          onChange={(e) => setGap(e.target.value)}
          onBlur={(e) => save('gap', e.target.value)}
          placeholder="What's missing?"
          rows={1}
          className="w-full text-xs text-gray-500 bg-transparent resize-none outline-none placeholder-gray-300 focus:placeholder-gray-400 leading-relaxed min-h-[1.5rem]"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
      </td>
    </tr>
  )
}
