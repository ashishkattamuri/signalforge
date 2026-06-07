import { useState } from 'react'
import type { StaffDimension, Week } from '../types'
import { STAFF_DIMENSIONS } from '../constants'
import { upsertDimension, updateWeek } from '../api'

interface Props {
  week: Week
  dimensions: StaffDimension[]
  onUpdated: (d: StaffDimension) => void
  onWeekUpdated: (w: Week) => void
}

export function StaffDimensionsPanel({ week, dimensions, onUpdated, onWeekUpdated }: Props) {
  const dimMap = Object.fromEntries(dimensions.map(d => [d.dimension, d]))

  async function handleTargetLevelSave(val: string) {
    const updated = await updateWeek(week.id, { target_level: val || null })
    onWeekUpdated(updated)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-6">
      {/* Section header */}
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-900">Signal</h2>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 tracking-wide font-mono">
            where you are · what next level asks · top work this week
          </span>
          {/* Target level config */}
          <TargetLevelInput value={week.target_level ?? ''} onSave={handleTargetLevelSave} />
        </div>
      </div>

      {/* 4×2 card grid */}
      <div className="grid grid-cols-4 gap-4">
        {STAFF_DIMENSIONS.map(meta => (
          <DimensionCard
            key={meta.n}
            weekId={week.id}
            meta={meta}
            data={dimMap[meta.n]}
            targetLevel={week.target_level ?? 'Staff'}
            onUpdated={onUpdated}
          />
        ))}
      </div>
    </div>
  )
}

function TargetLevelInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  return editing ? (
    <input
      autoFocus
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { setEditing(false); onSave(val) }}
      onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); onSave(val) } }}
      placeholder="Target level (e.g. Staff)"
      className="text-xs border-b border-blue-300 outline-none bg-transparent text-gray-600 py-0.5 w-36"
    />
  ) : (
    <button
      onClick={() => { setEditing(true); setVal(value) }}
      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      title="Set your target level"
    >
      Target: <span className="font-semibold text-amber-600">{value || 'set level'}</span>
    </button>
  )
}

function DimensionCard({ weekId, meta, data, targetLevel, onUpdated }: {
  weekId: number
  meta: typeof STAFF_DIMENSIONS[number]
  data: StaffDimension | undefined
  targetLevel: string
  onUpdated: (d: StaffDimension) => void
}) {
  const [editingEvidence, setEditingEvidence] = useState(false)
  const [evidenceVal, setEvidenceVal] = useState(data?.evidence ?? '')
  const [editingLevel, setEditingLevel] = useState(false)
  const [levelVal, setLevelVal] = useState(data?.current_level ?? '')
  const [saving, setSaving] = useState(false)

  const rating = data?.rating ?? 0
  const currentLevel = data?.current_level ?? null

  async function save(patch: { evidence?: string; current_level?: string; rating?: number }) {
    setSaving(true)
    const updated = await upsertDimension(weekId, meta.n, {
      dimension: meta.n,
      evidence: patch.evidence ?? data?.evidence ?? undefined,
      gap: data?.gap ?? undefined,
      rating: patch.rating ?? data?.rating ?? undefined,
      current_level: patch.current_level ?? data?.current_level ?? undefined,
    })
    onUpdated(updated)
    setSaving(false)
  }

  const evidenceBullets = (data?.evidence ?? '').split('\n').filter(l => l.trim())

  return (
    <div className={`border border-gray-200 rounded-xl p-4 flex flex-col gap-3 transition-opacity ${saving ? 'opacity-60' : ''}`}>
      {/* Card top: number + dot rating */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-mono tabular-nums">
          {String(meta.n).padStart(2, '0')}
        </span>
        <DotRating value={rating} onChange={r => save({ rating: r })} />
      </div>

      {/* Dimension name */}
      <h3 className="text-base font-bold text-gray-900 leading-snug">{meta.label}</h3>

      {/* Level progression */}
      <div className="flex items-center gap-1.5 text-xs">
        {editingLevel ? (
          <input
            autoFocus
            value={levelVal}
            onChange={e => setLevelVal(e.target.value)}
            onBlur={() => { setEditingLevel(false); save({ current_level: levelVal }) }}
            onKeyDown={e => { if (e.key === 'Enter') { setEditingLevel(false); save({ current_level: levelVal }) } }}
            placeholder="Current level"
            className="border-b border-blue-300 outline-none bg-transparent text-gray-600 py-0.5 w-20 text-xs"
          />
        ) : (
          <span
            onClick={() => { setEditingLevel(true); setLevelVal(currentLevel ?? '') }}
            className="text-gray-500 font-medium cursor-pointer hover:text-gray-700"
            title="Click to set your current level for this dimension"
          >
            {currentLevel ?? '—'}
          </span>
        )}
        <span className="text-gray-300">→</span>
        <span className="font-semibold text-amber-600">{targetLevel}</span>
      </div>

      {/* Dimension quote */}
      <p className="text-xs italic text-gray-500 leading-relaxed">"{meta.quote}"</p>

      {/* This week evidence */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1.5">
          This Week
        </p>
        {editingEvidence ? (
          <textarea
            autoFocus
            value={evidenceVal}
            onChange={e => setEvidenceVal(e.target.value)}
            onBlur={() => { setEditingEvidence(false); save({ evidence: evidenceVal }) }}
            placeholder={`${meta.prompt}\n\nOne bullet per line...`}
            rows={4}
            className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 outline-none focus:border-blue-300 resize-none leading-relaxed"
          />
        ) : evidenceBullets.length > 0 ? (
          <ul
            onClick={() => { setEditingEvidence(true); setEvidenceVal(data?.evidence ?? '') }}
            className="cursor-text space-y-1"
          >
            {evidenceBullets.map((b, i) => (
              <li key={i} className="text-xs text-gray-600 leading-relaxed flex gap-1.5">
                <span className="text-gray-300 shrink-0 mt-0.5">·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p
            onClick={() => { setEditingEvidence(true); setEvidenceVal('') }}
            className="text-xs text-gray-300 italic cursor-pointer hover:text-gray-400 transition-colors"
          >
            {meta.prompt}
          </p>
        )}
      </div>
    </div>
  )
}

function DotRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onClick={() => onChange(i === value ? 0 : i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i <= (hovered || value)
              ? 'bg-amber-400'
              : 'bg-gray-200 hover:bg-amber-200'
          }`}
          title={`Rate ${i}/5`}
        />
      ))}
    </div>
  )
}
