import { useState, useEffect } from 'react'

// ── Model catalogue ──────────────────────────────────────────────────────────

interface ModelMeta {
  id: string
  name: string
  sizeGb: number
  description: string
  tag?: string
  tagColor?: string
}

const MODELS: ModelMeta[] = [
  {
    id: 'llama3.1:8b',
    name: 'Llama 3.1 8B',
    sizeGb: 4.7,
    description: 'Best balance of quality and speed for journaling and synthesis.',
    tag: 'Recommended',
    tagColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 3B',
    sizeGb: 2.0,
    description: 'Fast and lightweight — great for quick enrichment on older hardware.',
    tag: 'Lightest',
    tagColor: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'mistral:7b',
    name: 'Mistral 7B',
    sizeGb: 4.1,
    description: 'Strong instruction following, solid alternative to Llama.',
  },
  {
    id: 'qwen2.5:7b',
    name: 'Qwen 2.5 7B',
    sizeGb: 4.4,
    description: 'Strongest reasoning — ideal as SignalForge grows into agentic workflows.',
    tag: 'Best for agents',
    tagColor: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'gemma2:9b',
    name: 'Gemma 2 9B',
    sizeGb: 5.5,
    description: "Google's model — excellent at structured output and long-form synthesis.",
  },
]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Profile {
  name: string
  currentLevel: string
  targetLevel: string
  orgContext: string
}

// ── Step shell ───────────────────────────────────────────────────────────────

function StepShell({
  step, total, title, subtitle, children, onSkip, onNext, nextLabel = 'Continue', nextDisabled = false,
}: {
  step: number
  total: number
  title: string
  subtitle?: string
  children: React.ReactNode
  onSkip: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-8 justify-center">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step - 1
                  ? 'w-6 bg-gray-800'
                  : i < step - 1
                  ? 'w-1.5 bg-gray-400'
                  : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mb-6">{subtitle}</p>}

          <div className="mt-4">{children}</div>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={onSkip}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip
            </button>
            {onNext && (
              <button
                onClick={onNext}
                disabled={nextDisabled}
                className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-30 transition-colors"
              >
                {nextLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Step 1: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <StepShell step={1} total={5} title="Welcome to SignalForge" onSkip={onSkip} onNext={onNext} nextLabel="Get started">
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>
          SignalForge is a <strong className="text-gray-900">local-first engineering work OS</strong> — not a to-do app
          or journal. It turns your raw daily work into structured, high-signal evidence for performance reviews,
          promotions, and career growth.
        </p>
        <p>
          Everything runs on your machine. No data ever leaves. A local LLM enriches your entries into impact language,
          classifies signals, and synthesises your week.
        </p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {[
            ['⚡', 'Daily capture', 'Log what you worked on. AI frames it as impact.'],
            ['📡', 'Signal dimensions', '8 lenses Staff engineers are evaluated on.'],
            ['🎯', 'Priority alignment', 'Are you working on the highest-leverage thing?'],
            ['🤖', 'Agentic workflows', 'Coming soon — connect Jira, GitHub, Grafana and more.'],
          ].map(([icon, heading, body]) => (
            <div key={heading} className="bg-gray-50 rounded-xl p-3">
              <p className="text-base mb-1">{icon}</p>
              <p className="text-xs font-semibold text-gray-800 mb-0.5">{heading}</p>
              <p className="text-xs text-gray-500">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </StepShell>
  )
}

// ── Step 2: Local AI ─────────────────────────────────────────────────────────

type OllamaStatus = 'checking' | 'running' | 'not_found'
type DownloadState = 'idle' | 'downloading' | 'done' | 'error'

function StepLocalAI({
  onNext, onSkip, onModelSelected,
}: {
  onNext: () => void
  onSkip: () => void
  onModelSelected: (model: string) => void
}) {
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>('checking')
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [selected, setSelected] = useState('llama3.1:8b')
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [downloadPct, setDownloadPct] = useState(0)
  const [downloadError, setDownloadError] = useState('')

  async function checkOllama() {
    setOllamaStatus('checking')
    try {
      const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const names: string[] = (data.models ?? []).map((m: { name: string }) => m.name.split(':')[0] + ':' + m.name.split(':')[1])
      setInstalledModels(names)
      setOllamaStatus('running')
    } catch {
      setOllamaStatus('not_found')
    }
  }

  useEffect(() => { checkOllama() }, [])

  async function downloadModel() {
    setDownloadState('downloading')
    setDownloadPct(0)
    setDownloadError('')
    try {
      const res = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selected, stream: true }),
      })
      if (!res.ok || !res.body) throw new Error('Pull request failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const json = JSON.parse(line)
            if (json.completed && json.total) {
              setDownloadPct(Math.round((json.completed / json.total) * 100))
            }
            if (json.status === 'success') {
              setDownloadState('done')
              setInstalledModels(prev => [...new Set([...prev, selected])])
            }
          } catch { /* non-json line */ }
        }
      }
      setDownloadState('done')
    } catch (e) {
      setDownloadError(String(e))
      setDownloadState('error')
    }
  }

  const isInstalled = (id: string) => installedModels.some(m => m === id || m.startsWith(id.split(':')[0]))
  const selectedMeta = MODELS.find(m => m.id === selected)!
  const selectedInstalled = isInstalled(selected)
  const canProceed = ollamaStatus === 'running' && (selectedInstalled || downloadState === 'done')

  return (
    <StepShell
      step={2} total={5}
      title="Local AI setup"
      subtitle="SignalForge uses a local LLM — your data never leaves your machine."
      onSkip={onSkip}
      onNext={() => { onModelSelected(selected); onNext() }}
      nextLabel="Continue"
      nextDisabled={!canProceed}
    >
      <div className="space-y-5">
        {/* Ollama status */}
        <div className={`flex items-start gap-3 rounded-xl p-4 text-sm ${
          ollamaStatus === 'checking' ? 'bg-gray-50' :
          ollamaStatus === 'running' ? 'bg-emerald-50' : 'bg-red-50'
        }`}>
          <span className="text-base mt-0.5">
            {ollamaStatus === 'checking' ? '⏳' : ollamaStatus === 'running' ? '✅' : '❌'}
          </span>
          <div>
            {ollamaStatus === 'checking' && <p className="text-gray-500">Checking for Ollama…</p>}
            {ollamaStatus === 'running' && (
              <>
                <p className="font-medium text-emerald-800">Ollama is running</p>
                {installedModels.length > 0 && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Already installed: {installedModels.join(', ')}
                  </p>
                )}
              </>
            )}
            {ollamaStatus === 'not_found' && (
              <>
                <p className="font-medium text-red-800">Ollama not found</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Install Ollama from{' '}
                  <a href="https://ollama.com" className="underline">ollama.com</a>
                  , then{' '}
                  <button onClick={checkOllama} className="underline font-medium">check again</button>.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Download notice */}
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl p-3">
          <span className="mt-0.5">⚠️</span>
          <p>
            Models are downloaded to your machine (~2–6 GB depending on your choice).
            This happens once and may take 5–20 minutes. Make sure you have enough disk space
            and a stable connection before downloading.
          </p>
        </div>

        {/* Model list */}
        {ollamaStatus === 'running' && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Choose a model</p>
            {MODELS.map(model => {
              const installed = isInstalled(model.id)
              return (
                <button
                  key={model.id}
                  onClick={() => { setSelected(model.id); setDownloadState('idle') }}
                  className={`w-full text-left rounded-xl border p-4 transition-colors ${
                    selected === model.id
                      ? 'border-gray-800 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                        selected === model.id ? 'border-gray-800' : 'border-gray-300'
                      }`}>
                        {selected === model.id && <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{model.name}</span>
                          {model.tag && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${model.tagColor}`}>
                              {model.tag}
                            </span>
                          )}
                          {installed && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                              ✓ Installed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{model.description}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-gray-400 shrink-0 mt-0.5 tabular-nums">
                      {model.sizeGb} GB
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Download / status */}
        {ollamaStatus === 'running' && !selectedInstalled && (
          <div className="space-y-2">
            {downloadState === 'idle' && (
              <button
                onClick={downloadModel}
                className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Download {selectedMeta.name} ({selectedMeta.sizeGb} GB)
              </button>
            )}
            {downloadState === 'downloading' && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Downloading {selectedMeta.name}…</span>
                  <span>{downloadPct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-gray-800 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${downloadPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">This may take several minutes. Keep SignalForge open.</p>
              </div>
            )}
            {downloadState === 'done' && (
              <p className="text-sm text-emerald-600 font-medium text-center">✓ {selectedMeta.name} downloaded</p>
            )}
            {downloadState === 'error' && (
              <div className="text-xs text-red-600 bg-red-50 rounded-lg p-3">
                <p className="font-medium mb-0.5">Download failed</p>
                <p className="text-red-500">{downloadError}</p>
                <button onClick={downloadModel} className="mt-2 underline font-medium">Try again</button>
              </div>
            )}
          </div>
        )}

        {ollamaStatus === 'running' && selectedInstalled && (
          <p className="text-sm text-emerald-600 font-medium text-center">
            ✓ {selectedMeta.name} is already installed — ready to go
          </p>
        )}
      </div>
    </StepShell>
  )
}

// ── Step 3: Profile ──────────────────────────────────────────────────────────

function StepProfile({
  onNext, onSkip, onSave,
}: {
  onNext: () => void
  onSkip: () => void
  onSave: (profile: { name: string; currentLevel: string; targetLevel: string; orgContext: string }) => void
}) {
  const [name, setName] = useState('')
  const [currentLevel, setCurrentLevel] = useState('')
  const [targetLevel, setTargetLevel] = useState('')
  const [orgContext, setOrgContext] = useState('')

  return (
    <StepShell
      step={3} total={5}
      title="Your profile"
      subtitle="Helps SignalForge frame evidence in the right context. All fields optional."
      onSkip={onSkip}
      onNext={() => { onSave({ name, currentLevel, targetLevel, orgContext }); onNext() }}
      nextLabel="Continue"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              Your name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 text-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              Current level
            </label>
            <input
              value={currentLevel}
              onChange={e => setCurrentLevel(e.target.value)}
              placeholder="e.g. Senior Engineer, L5"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 text-gray-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
            Target level
          </label>
          <input
            value={targetLevel}
            onChange={e => setTargetLevel(e.target.value)}
            placeholder="e.g. Staff Engineer, L6"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 text-gray-800"
          />
          <p className="text-xs text-gray-400 mt-1">
            Pre-fills the target on your signal dimension cards each week.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
            Org / team context <span className="text-gray-300 font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            value={orgContext}
            onChange={e => setOrgContext(e.target.value)}
            placeholder="e.g. Platform team at Acme, focused on reliability and developer tooling. Manager cares most about reducing incidents and shipping the new deployment pipeline."
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 text-gray-800 resize-none leading-relaxed"
          />
          <p className="text-xs text-gray-400 mt-1">
            Gives the AI context when generating priorities and synthesis.
          </p>
        </div>
      </div>
    </StepShell>
  )
}

// ── Step 4: Feature tour ─────────────────────────────────────────────────────

const TOUR_CARDS = [
  {
    icon: '📡',
    title: 'Signal Dimensions',
    body: '8 dimensions Staff engineers are evaluated on — Technical Scope, Ownership, Cross-team Influence, and more. Add evidence weekly. The AI helps frame what you did as impact.',
  },
  {
    icon: '⚡',
    title: 'Daily Capture',
    body: 'Log tasks as you go. Mark them Important/Urgent (Eisenhower matrix), flag anything unplanned, and estimate time. The local LLM enriches each entry into impact language and tags it with a signal type.',
  },
  {
    icon: '🎯',
    title: 'Priority Context',
    body: "Record your org's P0/P1/P2 priorities, your manager's asks, and your own goals. The alignment panel scores whether your actual time matched your stated priorities.",
  },
  {
    icon: '📝',
    title: 'Weekly Synthesis',
    body: 'At the end of each week, SignalForge generates "What Landed" and "What Drifted" — plus promotion-ready evidence bullets. Export to Markdown for your 1:1s or performance packets.',
  },
]

function StepTour({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [card, setCard] = useState(0)
  const current = TOUR_CARDS[card]
  const isLast = card === TOUR_CARDS.length - 1

  return (
    <StepShell
      step={4} total={5}
      title="How it works"
      subtitle="A quick look at each section — skip anytime."
      onSkip={onSkip}
      onNext={isLast ? onNext : undefined}
      nextLabel="Done with tour"
    >
      <div className="space-y-6">
        {/* Card */}
        <div className="bg-gray-50 rounded-2xl p-6 min-h-[160px]">
          <p className="text-3xl mb-3">{current.icon}</p>
          <h3 className="text-base font-bold text-gray-900 mb-2">{current.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{current.body}</p>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCard(c => Math.max(0, c - 1))}
            disabled={card === 0}
            className="text-sm text-gray-400 hover:text-gray-700 disabled:opacity-0 transition-colors px-2 py-1"
          >
            ← Previous
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {TOUR_CARDS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCard(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === card ? 'bg-gray-800' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => isLast ? onNext() : setCard(c => c + 1)}
            className="text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors px-2 py-1"
          >
            {isLast ? 'Finish →' : 'Next →'}
          </button>
        </div>
      </div>
    </StepShell>
  )
}

// ── Step 5: Done ─────────────────────────────────────────────────────────────

function StepDone({
  model, onFinish,
}: {
  model: string
  onFinish: () => void
}) {
  const modelMeta = MODELS.find(m => m.id === model)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-1.5 mb-8 justify-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-800" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set</h2>
          <p className="text-sm text-gray-500 mb-6">
            SignalForge is ready. Start by logging what you worked on today.
          </p>

          {modelMeta && (
            <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-6">
              <span>🤖</span>
              <span>Local AI: <strong className="text-gray-700">{modelMeta.name}</strong></span>
            </div>
          )}

          <div className="block">
            <button
              onClick={onFinish}
              className="px-8 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              Open SignalForge →
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            You can revisit this setup anytime from the settings menu.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Onboarding orchestrator ─────────────────────────────────────────────

export function Onboarding({ onComplete }: { onComplete: (profile: Profile, model: string) => void }) {
  const [step, setStep] = useState(1)
  const [selectedModel, setSelectedModel] = useState('llama3.1:8b')
  const [profile, setProfile] = useState<Profile>({ name: '', currentLevel: '', targetLevel: '', orgContext: '' })

  const skip = () => setStep(s => s + 1)
  const next = () => setStep(s => s + 1)

  const finish = () => {
    onComplete(profile, selectedModel)
  }

  if (step === 1) return <StepWelcome onNext={next} onSkip={skip} />
  if (step === 2) return <StepLocalAI onNext={next} onSkip={skip} onModelSelected={setSelectedModel} />
  if (step === 3) return <StepProfile onNext={next} onSkip={skip} onSave={setProfile} />
  if (step === 4) return <StepTour onNext={next} onSkip={skip} />
  return <StepDone model={selectedModel} onFinish={finish} />
}
