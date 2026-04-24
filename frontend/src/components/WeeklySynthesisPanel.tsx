import { useState } from 'react'
import type { WeeklySynthesis } from '../types'
import { generateSynthesis, exportWeek } from '../api'

interface Props {
  weekId: number
  synthesis: WeeklySynthesis | null
  onUpdated: (s: WeeklySynthesis) => void
}

export function WeeklySynthesisPanel({ weekId, synthesis, onUpdated }: Props) {
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setGenerating(true)
    setError(null)
    try {
      const result = await generateSynthesis(weekId)
      onUpdated(result)
    } catch (e) {
      setError('LLM unavailable — make sure Ollama is running and llama3.1:8b is pulled.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const { markdown, week_start } = await exportWeek(weekId)
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `signalforge-${week_start}.md`
      a.click()
      URL.revokeObjectURL(url)
      setExported(true)
      setTimeout(() => setExported(false), 2000)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="bg-white">
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Weekly Synthesis
        </h2>
        <div className="flex gap-2">
          <button
            onClick={generate}
            disabled={generating}
            className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {generating ? 'Generating...' : '✦ Generate with LLM'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="text-xs px-3 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {exported ? '✓ Downloaded' : exporting ? 'Exporting...' : 'Export Markdown'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 divide-x divide-gray-100">
        <SynthesisCard
          title="What Landed"
          subtitle="Impact wins this week"
          content={synthesis?.what_landed ?? null}
          emptyPrompt="Generate synthesis above to see impact wins, or add your own notes."
          color="emerald"
        />
        <SynthesisCard
          title="What Drifted"
          subtitle="Gaps and misalignment"
          content={synthesis?.what_drifted ?? null}
          emptyPrompt="Generate synthesis to surface priority mismatches and reactive work."
          color="orange"
        />
      </div>

      {synthesis?.evidence_bullets && (
        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Evidence Bank — Promotion-Ready Bullets
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {synthesis.evidence_bullets}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function SynthesisCard({
  title, subtitle, content, emptyPrompt, color,
}: {
  title: string
  subtitle: string
  content: string | null
  emptyPrompt: string
  color: 'emerald' | 'orange'
}) {
  const accent = color === 'emerald' ? 'text-emerald-600' : 'text-orange-500'

  return (
    <div className="p-6">
      <p className={`text-sm font-semibold ${accent} mb-0.5`}>{title}</p>
      <p className="text-xs text-gray-400 mb-3">{subtitle}</p>
      {content ? (
        <p className="text-sm text-gray-700 leading-relaxed">{content}</p>
      ) : (
        <p className="text-sm text-gray-300 italic">{emptyPrompt}</p>
      )}
    </div>
  )
}
