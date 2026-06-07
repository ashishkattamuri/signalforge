import { useState } from 'react'
import type { DailyEntry, DayOfWeek, EntryStatus, EntrySource, SignalType } from '../types'
import {
  DAYS, STATUS_META, SIGNAL_META,
  deriveEntryPriority, ENTRY_PRIORITY_META, formatMins,
} from '../constants'
import { createEntry, updateEntry, deleteEntry } from '../api'

interface Props {
  weekId: number
  entries: DailyEntry[]
  onUpdated: (entries: DailyEntry[]) => void
}

const ALL_SIGNALS = Object.keys(SIGNAL_META) as SignalType[]
export function DailyGrid({ weekId, entries, onUpdated }: Props) {
  const [activeSignals, setActiveSignals] = useState<SignalType[]>([...ALL_SIGNALS])

  function toggleSignal(sig: SignalType) {
    setActiveSignals(prev =>
      prev.includes(sig) ? prev.filter(s => s !== sig) : [...prev, sig]
    )
  }

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Section header */}
      <div className="px-8 pt-6 pb-0">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Daily capture</h2>
          <span className="text-xs text-gray-400 font-mono tracking-wide">
            / to search · ⌘K to log · j/k to move
          </span>
        </div>

        {/* Signal filter bar */}
        <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-gray-100">
          <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase mr-1">
            Signals
          </span>
          {ALL_SIGNALS.map(sig => (
            <button
              key={sig}
              onClick={() => toggleSignal(sig)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors ${
                activeSignals.includes(sig)
                  ? `${SIGNAL_META[sig].color} border-current`
                  : 'text-gray-300 border-gray-200 hover:border-gray-300'
              }`}
            >
              {sig}
              {activeSignals.includes(sig) && <span className="opacity-60 text-xs">×</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Day sections */}
      <div>
        {DAYS.map(day => (
          <DaySection
            key={day}
            weekId={weekId}
            day={day}
            entries={entries.filter(e => e.day === day)}
            allEntries={entries}
            activeSignals={activeSignals}
            onUpdated={onUpdated}
          />
        ))}
      </div>
    </div>
  )
}

function DaySection({ weekId, day, entries, allEntries, activeSignals, onUpdated }: {
  weekId: number
  day: DayOfWeek
  entries: DailyEntry[]
  allEntries: DailyEntry[]
  activeSignals: SignalType[]
  onUpdated: (entries: DailyEntry[]) => void
}) {
  const [addOpen, setAddOpen] = useState(false)

  const totalMins = entries.reduce((s, e) => s + (e.estimate_mins ?? 0), 0)
  const unplannedCount = entries.filter(e => e.unplanned).length
  const unplannedPct = entries.length ? Math.round((unplannedCount / entries.length) * 100) : 0

  const visible = entries.filter(e =>
    !e.signal_type || activeSignals.includes(e.signal_type)
  )

  const dayLabel = day.charAt(0).toUpperCase() + day.slice(1)

  async function addEntry(fields: Parameters<typeof createEntry>[1]) {
    const created = await createEntry(weekId, fields)
    onUpdated([...allEntries, created])
    setAddOpen(false)
  }

  async function removeEntry(id: number) {
    await deleteEntry(id)
    onUpdated(allEntries.filter(e => e.id !== id))
  }

  async function patchEntry(id: number, patch: Partial<DailyEntry>) {
    const updated = await updateEntry(id, patch)
    onUpdated(allEntries.map(e => (e.id === id ? updated : e)))
  }

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* Day header */}
      <div className="flex items-end justify-between px-8 pt-6 pb-3">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 leading-none">{dayLabel}</h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          {totalMins > 0 && <span className="font-medium text-gray-600">{formatMins(totalMins)}</span>}
          <span className={unplannedPct > 40 ? 'text-orange-500 font-medium' : ''}>
            {unplannedPct}% unplanned
          </span>
        </div>
      </div>

      {/* Entry rows */}
      <div className="px-8">
        {visible.map(entry => (
          <EntryRow
            key={entry.id}
            entry={entry}
            onPatch={patch => patchEntry(entry.id, patch)}
            onDelete={() => removeEntry(entry.id)}
          />
        ))}

        {/* Add form or trigger */}
        {addOpen ? (
          <AddForm
            day={day}
            onSave={addEntry}
            onCancel={() => setAddOpen(false)}
          />
        ) : (
          <button
            onClick={() => setAddOpen(true)}
            className="w-full flex items-center justify-between py-2.5 text-xs text-gray-300 hover:text-gray-500 transition-colors group"
          >
            <span className="group-hover:text-blue-500">+ add row...</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">click to expand</span>
          </button>
        )}
      </div>
    </div>
  )
}

function EntryRow({ entry, onPatch, onDelete }: {
  entry: DailyEntry
  onPatch: (patch: Partial<DailyEntry>) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const priority = deriveEntryPriority(entry.important, entry.urgent)
  const priorityMeta = ENTRY_PRIORITY_META[priority]
  const statusMeta = STATUS_META[entry.status]
  const signalMeta = entry.signal_type ? SIGNAL_META[entry.signal_type] : null

  return (
    <div className="group">
      <div className="flex items-center gap-3 py-2.5 border-b border-gray-50">
        {/* Time */}
        <span className="text-xs text-gray-400 tabular-nums w-14 shrink-0 text-right">
          {formatMins(entry.estimate_mins)}
        </span>

        {/* Priority badge */}
        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold tabular-nums shrink-0 ${priorityMeta.color}`}>
          {priorityMeta.label}
        </span>

        {/* Task text — click to edit */}
        <div className="flex-1 min-w-0">
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={e => {
              const val = e.currentTarget.textContent?.trim() ?? ''
              if (val && val !== entry.task) onPatch({ task: val })
            }}
            className="text-sm text-gray-800 outline-none cursor-text block"
          >
            {entry.task}
          </span>
          {/* LLM enrichment — kept as-is per user request */}
          {entry.enriched_task && entry.enriched_task !== entry.task && (
            <span
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-blue-500 cursor-pointer block mt-0.5"
            >
              ✦ {entry.enriched_task}
            </span>
          )}
          {expanded && entry.reflection && (
            <p className="text-xs text-gray-400 italic mt-1 pl-3 border-l-2 border-blue-100">
              {entry.reflection}
            </p>
          )}
        </div>

        {/* Right side: status + signal + unplanned + delete */}
        <div className="flex items-center gap-1.5 shrink-0">
          {entry.unplanned && (
            <span className="text-xs text-orange-500 font-medium px-1.5 py-0.5 bg-orange-50 rounded border border-orange-200">
              unplanned
            </span>
          )}

          {/* Status dropdown */}
          <select
            value={entry.status}
            onChange={e => onPatch({ status: e.target.value as EntryStatus })}
            className={`text-xs rounded px-2 py-0.5 border cursor-pointer outline-none ${statusMeta.color}`}
          >
            {(Object.keys(STATUS_META) as EntryStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_META[s].icon} {STATUS_META[s].label}</option>
            ))}
          </select>

          {/* Signal badge */}
          {signalMeta ? (
            <span className={`text-xs px-2 py-0.5 rounded border border-current font-medium ${signalMeta.color}`}>
              {entry.signal_type}
            </span>
          ) : (
            <span className="text-xs text-gray-300 w-16">—</span>
          )}

          <button
            onClick={onDelete}
            className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm ml-1"
          >×</button>
        </div>
      </div>
    </div>
  )
}

function AddForm({ day, onSave, onCancel }: {
  day: DayOfWeek
  onSave: (fields: Parameters<typeof createEntry>[1]) => Promise<void>
  onCancel: () => void
}) {
  const [task, setTask] = useState('')
  const [mins, setMins] = useState('')
  const [status, setStatus] = useState<EntryStatus>('in_progress')
  const [source] = useState<EntrySource>('manual')
  const [signal, setSignal] = useState<SignalType | ''>('')
  const [important, setImportant] = useState(false)
  const [urgent, setUrgent] = useState(false)
  const [unplanned, setUnplanned] = useState(false)
  const [saving, setSaving] = useState(false)

  const derivedPriority = deriveEntryPriority(important, urgent)
  const priorityMeta = ENTRY_PRIORITY_META[derivedPriority]

  async function submit() {
    if (!task.trim()) return
    setSaving(true)
    await onSave({
      day,
      task: task.trim(),
      source,
      estimate_mins: mins ? parseInt(mins) : undefined,
      status,
      important,
      urgent,
      unplanned,
    })
  }

  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-4 my-2">
      {/* Main input row */}
      <div className="flex items-center gap-2 mb-3">
        {/* Mins */}
        <input
          type="number"
          value={mins}
          onChange={e => setMins(e.target.value)}
          placeholder="min"
          className="w-14 text-xs text-center bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-300 text-gray-600"
          min={0}
        />

        {/* Priority badge (derived, display only) */}
        <span className={`text-xs px-2 py-1.5 rounded font-semibold border shrink-0 ${priorityMeta.color}`}>
          {priorityMeta.label}
        </span>

        {/* Task input */}
        <input
          autoFocus
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); if (e.key === 'Escape') onCancel() }}
          placeholder="What's the task?"
          className="flex-1 text-sm text-gray-800 bg-white border border-gray-200 rounded px-3 py-1.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
        />

        {/* Status */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value as EntryStatus)}
          className="text-xs bg-white border border-gray-200 rounded px-2 py-1.5 outline-none text-gray-600 cursor-pointer"
        >
          {(Object.keys(STATUS_META) as EntryStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>

        {/* Signal */}
        <select
          value={signal}
          onChange={e => setSignal(e.target.value as SignalType | '')}
          className="text-xs bg-white border border-gray-200 rounded px-2 py-1.5 outline-none text-gray-500 cursor-pointer"
        >
          <option value="">— signal —</option>
          {ALL_SIGNALS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Eisenhower row + hint */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={important} onChange={e => setImportant(e.target.checked)} className="accent-blue-500 w-3.5 h-3.5" />
            Important
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)} className="accent-red-500 w-3.5 h-3.5" />
            Urgent
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={unplanned} onChange={e => setUnplanned(e.target.checked)} className="accent-orange-400 w-3.5 h-3.5" />
            Unplanned
          </label>
          <span className="text-gray-400">
            → <span className={`font-semibold ${priorityMeta.color.split(' ')[1]}`}>{derivedPriority.toUpperCase()}</span>
            {' '}{priorityMeta.hint}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors">
            cancel
          </button>
          <button
            onClick={submit}
            disabled={!task.trim() || saving}
            className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 font-medium transition-colors flex items-center gap-1.5"
          >
            {saving ? 'Saving…' : <><span>save</span><kbd className="text-xs opacity-70 font-mono">⌘↵</kbd></>}
          </button>
        </div>
      </div>
    </div>
  )
}
