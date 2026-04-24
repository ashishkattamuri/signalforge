import { useState } from 'react'
import type { Priority, PriorityCategory, PriorityLevel } from '../types'
import { createPriority, deletePriority } from '../api'

interface Props {
  weekId: number
  priorities: Priority[]
  onUpdated: (priorities: Priority[]) => void
}

const CATEGORIES: { key: PriorityCategory; label: string }[] = [
  { key: 'org', label: 'Org Direction' },
  { key: 'team', label: 'Team / Mission' },
  { key: 'manager', label: "Manager's Ask" },
]

const LEVELS: PriorityLevel[] = ['p0', 'p1', 'p2']

export function PriorityContextPanel({ weekId, priorities, onUpdated }: Props) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Priority Context
        </h2>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <div className="grid grid-cols-3 divide-x divide-gray-100 col-span-2">
          {CATEGORIES.map((cat) => (
            <PriorityColumn
              key={cat.key}
              weekId={weekId}
              category={cat}
              priorities={priorities.filter((p) => p.category === cat.key)}
              allPriorities={priorities}
              onUpdated={onUpdated}
            />
          ))}
        </div>
        <WeekFocusColumn
          weekId={weekId}
          priorities={priorities.filter((p) => p.category === 'personal')}
          allPriorities={priorities}
          onUpdated={onUpdated}
        />
      </div>
    </div>
  )
}

function PriorityColumn({
  weekId, category, priorities, allPriorities, onUpdated,
}: {
  weekId: number
  category: { key: PriorityCategory; label: string }
  priorities: Priority[]
  allPriorities: Priority[]
  onUpdated: (p: Priority[]) => void
}) {
  const byLevel = Object.fromEntries(LEVELS.map(l => [l, priorities.filter(p => p.level === l)]))

  return (
    <div className="p-4">
      <p className="text-xs font-semibold text-gray-500 mb-3">{category.label}</p>
      {LEVELS.map((level) => (
        <PriorityLevelGroup
          key={level}
          weekId={weekId}
          level={level}
          category={category.key}
          items={byLevel[level] ?? []}
          allPriorities={allPriorities}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  )
}

function WeekFocusColumn({
  weekId, priorities, allPriorities, onUpdated,
}: {
  weekId: number
  priorities: Priority[]
  allPriorities: Priority[]
  onUpdated: (p: Priority[]) => void
}) {
  const byLevel = Object.fromEntries(LEVELS.map(l => [l, priorities.filter(p => p.level === l)]))

  return (
    <div className="p-4">
      <p className="text-xs font-semibold text-gray-500 mb-1">This Week's Focus</p>
      <p className="text-xs text-gray-400 italic mb-3">"Is this the highest-leverage thing right now?"</p>
      {LEVELS.map((level) => (
        <PriorityLevelGroup
          key={level}
          weekId={weekId}
          level={level}
          category="personal"
          items={byLevel[level] ?? []}
          allPriorities={allPriorities}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  )
}

function PriorityLevelGroup({
  weekId, level, category, items, allPriorities, onUpdated,
}: {
  weekId: number
  level: PriorityLevel
  category: PriorityCategory
  items: Priority[]
  allPriorities: Priority[]
  onUpdated: (p: Priority[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')

  const levelColors: Record<PriorityLevel, string> = {
    p0: 'text-red-600 font-bold',
    p1: 'text-orange-500 font-semibold',
    p2: 'text-gray-500',
  }

  async function add() {
    if (!text.trim()) { setAdding(false); return }
    const created = await createPriority(weekId, { level, category, text: text.trim() })
    onUpdated([...allPriorities, created])
    setText('')
    setAdding(false)
  }

  async function remove(id: number) {
    await deletePriority(id)
    onUpdated(allPriorities.filter(p => p.id !== id))
  }

  return (
    <div className="mb-2">
      <p className={`text-xs uppercase tracking-wide mb-1 ${levelColors[level]}`}>{level.toUpperCase()}</p>
      {items.map((p) => (
        <div key={p.id} className="flex items-start gap-1 group">
          <span className="text-xs text-gray-700 flex-1 leading-relaxed">{p.text}</span>
          <button
            onClick={() => remove(p.id)}
            className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs mt-0.5 transition-opacity"
          >×</button>
        </div>
      ))}
      {adding ? (
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false) }}
          placeholder="Add item..."
          className="text-xs w-full border-b border-blue-300 outline-none py-0.5 text-gray-700 bg-transparent"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-xs text-gray-300 hover:text-blue-500 transition-colors mt-0.5"
        >
          + add
        </button>
      )}
    </div>
  )
}
