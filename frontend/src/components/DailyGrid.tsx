import { useState, useRef, useEffect } from 'react'
import type { DailyEntry, DayOfWeek, EntryStatus, EntrySource } from '../types'
import { DAYS, STATUS_META, SIGNAL_META } from '../constants'
import { createEntry, updateEntry, deleteEntry } from '../api'

interface Props {
  weekId: number
  entries: DailyEntry[]
  onUpdated: (entries: DailyEntry[]) => void
}

export function DailyGrid({ weekId, entries, onUpdated }: Props) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Daily Work Capture
        </h2>
      </div>
      <div className="divide-y divide-gray-100">
        {DAYS.map((day) => (
          <DaySection
            key={day}
            weekId={weekId}
            day={day}
            entries={entries.filter((e) => e.day === day)}
            allEntries={entries}
            onUpdated={onUpdated}
          />
        ))}
      </div>
    </div>
  )
}

const COL_GRID = 'grid grid-cols-[1fr_80px_64px_96px_72px_60px_110px]'

function DaySection({
  weekId, day, entries, allEntries, onUpdated,
}: {
  weekId: number
  day: DayOfWeek
  entries: DailyEntry[]
  allEntries: DailyEntry[]
  onUpdated: (entries: DailyEntry[]) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const totalMins = entries.reduce((s, e) => s + (e.estimate_mins ?? 0), 0)
  const unplannedCount = entries.filter((e) => e.unplanned).length

  async function addEntry(fields: {
    task: string; source: EntrySource; estimate_mins?: number;
    important: boolean; urgent: boolean; unplanned: boolean
  }) {
    const created = await createEntry(weekId, { day, ...fields })
    onUpdated([...allEntries, created])
  }

  async function removeEntry(id: number) {
    await deleteEntry(id)
    onUpdated(allEntries.filter((e) => e.id !== id))
  }

  async function patchEntry(id: number, patch: Partial<DailyEntry>) {
    const updated = await updateEntry(id, patch)
    onUpdated(allEntries.map((e) => (e.id === id ? updated : e)))
  }

  const dayLabel = day.charAt(0).toUpperCase() + day.slice(1)
  const isEmpty = entries.length === 0

  return (
    <div>
      {/* Day header */}
      <div
        className="flex items-center gap-3 px-6 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors select-none border-b border-gray-100"
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="text-sm font-semibold text-gray-800 w-24">{dayLabel}</span>
        <span className="text-xs text-gray-400 tabular-nums">
          {totalMins > 0 ? `${(totalMins / 60).toFixed(1)}h logged` : 'nothing logged yet'}
        </span>
        {unplannedCount > 0 && (
          <span className="text-xs text-orange-500 font-medium">⚡ {unplannedCount} unplanned</span>
        )}
        {entries.filter(e => e.status === 'complete').length > 0 && (
          <span className="text-xs text-emerald-500">
            ✓ {entries.filter(e => e.status === 'complete').length}/{entries.length} done
          </span>
        )}
        <span className="ml-auto text-gray-300 text-xs">{collapsed ? '▶' : '▼'}</span>
      </div>

      {!collapsed && (
        <div className="bg-white">
          {isEmpty ? (
            <div className="px-6 py-3 text-xs text-gray-400 italic">
              No entries yet — add your first task below
            </div>
          ) : (
            <>
              {/* Column headers — only show when there are entries */}
              <div className={`${COL_GRID} gap-x-2 px-6 pt-2 pb-1 text-xs text-gray-400 font-medium`}>
                <span>Task / Activity</span>
                <span className="text-right pr-2">Est (min)</span>
                <span className="text-center">Unplanned</span>
                <span>Status</span>
                <span className="text-center">Important</span>
                <span className="text-center">Urgent</span>
                <span>Signal</span>
              </div>
              {entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onPatch={(patch) => patchEntry(entry.id, patch)}
                  onDelete={() => removeEntry(entry.id)}
                />
              ))}
            </>
          )}

          {/* Add entry form — always visible, always aligned with columns */}
          <AddEntryRow onAdd={addEntry} hasExisting={!isEmpty} />

          {/* Day footer */}
          {!isEmpty && (
            <div className="px-6 py-1.5 text-xs text-gray-400 bg-gray-50 border-t border-gray-100 flex gap-4">
              <span>{(totalMins / 60).toFixed(1)} hrs total</span>
              <span>{entries.filter((e) => e.status === 'complete').length}/{entries.length} complete</span>
              {unplannedCount > 0 && <span className="text-orange-400">{unplannedCount} unplanned</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EntryRow({
  entry, onPatch, onDelete,
}: {
  entry: DailyEntry
  onPatch: (patch: Partial<DailyEntry>) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const statusMeta = STATUS_META[entry.status]
  const signalMeta = entry.signal_type ? SIGNAL_META[entry.signal_type] : null

  return (
    <div className="group border-b border-gray-50 last:border-0">
      <div className={`${COL_GRID} gap-x-2 px-6 py-2 items-start hover:bg-blue-50/20 transition-colors`}>
        {/* Task */}
        <div>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p
                className="text-sm text-gray-800 cursor-text leading-snug"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const val = e.currentTarget.textContent?.trim() ?? ''
                  if (val && val !== entry.task) onPatch({ task: val })
                }}
              >
                {entry.task}
              </p>
              {entry.enriched_task && entry.enriched_task !== entry.task && (
                <p
                  className="text-xs text-blue-600 mt-0.5 cursor-pointer"
                  onClick={() => setExpanded((v) => !v)}
                >
                  ✦ {entry.enriched_task}
                </p>
              )}
              {expanded && entry.reflection && (
                <div className="mt-1.5 pl-2 border-l-2 border-blue-200">
                  <p className="text-xs text-gray-500 italic">{entry.reflection}</p>
                </div>
              )}
            </div>
            <button
              onClick={onDelete}
              className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs mt-0.5 shrink-0"
            >×</button>
          </div>
        </div>

        {/* Est mins */}
        <div>
          <input
            type="number"
            value={entry.estimate_mins ?? ''}
            onChange={(e) => onPatch({ estimate_mins: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="—"
            className="w-full text-xs text-gray-600 bg-transparent outline-none text-right pr-1"
            min={0}
          />
        </div>

        {/* Unplanned */}
        <div className="flex justify-center pt-0.5">
          <input
            type="checkbox"
            checked={entry.unplanned}
            onChange={(e) => onPatch({ unplanned: e.target.checked })}
            className="accent-orange-400 w-3.5 h-3.5"
          />
        </div>

        {/* Status */}
        <div>
          <select
            value={entry.status}
            onChange={(e) => onPatch({ status: e.target.value as EntryStatus })}
            className={`text-xs rounded px-1.5 py-0.5 border w-full cursor-pointer outline-none ${statusMeta.color}`}
          >
            {(Object.keys(STATUS_META) as EntryStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_META[s].icon} {STATUS_META[s].label}</option>
            ))}
          </select>
        </div>

        {/* Important */}
        <div className="flex justify-center pt-0.5">
          <input
            type="checkbox"
            checked={entry.important}
            onChange={(e) => onPatch({ important: e.target.checked })}
            className="accent-blue-500 w-3.5 h-3.5"
          />
        </div>

        {/* Urgent */}
        <div className="flex justify-center pt-0.5">
          <input
            type="checkbox"
            checked={entry.urgent}
            onChange={(e) => onPatch({ urgent: e.target.checked })}
            className="accent-red-500 w-3.5 h-3.5"
          />
        </div>

        {/* Signal type */}
        <div>
          {signalMeta ? (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${signalMeta.color}`}>
              {entry.signal_type}
            </span>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </div>
      </div>
    </div>
  )
}

function AddEntryRow({
  onAdd,
  hasExisting,
}: {
  onAdd: (fields: { task: string; source: EntrySource; estimate_mins?: number; important: boolean; urgent: boolean; unplanned: boolean }) => Promise<void>
  hasExisting: boolean
}) {
  const [task, setTask] = useState('')
  const [source, setSource] = useState<EntrySource>('manual')
  const [estimateMins, setEstimateMins] = useState<string>('')
  const [important, setImportant] = useState(false)
  const [urgent, setUrgent] = useState(false)
  const [unplanned, setUnplanned] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit() {
    const trimmed = task.trim()
    if (!trimmed) return
    setSaving(true)
    await onAdd({
      task: trimmed,
      source,
      estimate_mins: estimateMins ? parseInt(estimateMins) : undefined,
      important,
      urgent,
      unplanned,
    })
    setTask('')
    setEstimateMins('')
    setImportant(false)
    setUrgent(false)
    setUnplanned(false)
    setSaving(false)
    inputRef.current?.focus()
  }

  return (
    <div className={`border-t border-dashed border-gray-200 ${hasExisting ? 'mt-1' : ''}`}>
      {/* Hint label */}
      <div className="px-6 pt-2 pb-1">
        <span className="text-xs font-medium text-blue-500 uppercase tracking-wide">
          + Add entry
        </span>
        <span className="text-xs text-gray-400 ml-2">
          — what did you work on? (press Enter to save)
        </span>
      </div>

      {/* Grid-aligned input row */}
      <div className={`${COL_GRID} gap-x-2 px-6 pb-3 items-center`}>
        {/* Task input */}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder="Describe the task or activity..."
            disabled={saving}
            className="flex-1 text-sm text-gray-700 placeholder-gray-300 bg-white border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as EntrySource)}
            className="text-xs text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-1.5 outline-none cursor-pointer"
            title="Source"
          >
            <option value="manual">manual</option>
            <option value="meeting">meeting</option>
            <option value="git">git</option>
            <option value="pr">pr</option>
            <option value="mcp">mcp</option>
          </select>
        </div>

        {/* Est mins */}
        <div>
          <input
            type="number"
            value={estimateMins}
            onChange={(e) => setEstimateMins(e.target.value)}
            placeholder="0"
            min={0}
            className="w-full text-xs text-gray-600 bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400 text-right"
            title="Estimated minutes"
          />
        </div>

        {/* Unplanned */}
        <div className="flex flex-col items-center gap-0.5">
          <input
            type="checkbox"
            checked={unplanned}
            onChange={(e) => setUnplanned(e.target.checked)}
            className="accent-orange-400 w-4 h-4 cursor-pointer"
            title="Unplanned — this wasn't in the weekly plan"
          />
          <span className="text-xs text-gray-400">⚡</span>
        </div>

        {/* Status placeholder — always "In Progress" on creation */}
        <div>
          <span className="text-xs text-gray-300 italic px-1">in progress</span>
        </div>

        {/* Important */}
        <div className="flex flex-col items-center gap-0.5">
          <input
            type="checkbox"
            checked={important}
            onChange={(e) => setImportant(e.target.checked)}
            className="accent-blue-500 w-4 h-4 cursor-pointer"
            title="Important — contributes to goals"
          />
          <span className="text-xs text-gray-400">imp</span>
        </div>

        {/* Urgent */}
        <div className="flex flex-col items-center gap-0.5">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
            className="accent-red-500 w-4 h-4 cursor-pointer"
            title="Urgent — time-sensitive"
          />
          <span className="text-xs text-gray-400">urg</span>
        </div>

        {/* Submit */}
        <div>
          <button
            onClick={submit}
            disabled={!task.trim() || saving}
            className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors w-full"
          >
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
