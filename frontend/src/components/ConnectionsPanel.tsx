import { useEffect, useState } from 'react'
import type { Connection, ConnectionKind, ConnectionTestResult } from '../types'
import {
  getConnections, createConnection, updateConnection, deleteConnection, testConnection,
  authorizeConnection, authorizeStatus,
} from '../api'

const EMPTY_FORM = {
  name: '', kind: 'mcp_http' as ConnectionKind, description: '',
  url: '', headers: '', command: '', args: '', env: '',
}

interface CatalogEntry {
  id: string
  icon: string
  label: string
  setupHint: string
  form: typeof EMPTY_FORM
  oneClick?: boolean  // config is complete — clicking connects + starts OAuth sign-in
}

// Pre-filled templates — placeholders in CAPS must be replaced before saving.
// The Test button validates the config against the live server.
const CATALOG: CatalogEntry[] = [
  {
    id: 'github', icon: '🐙', label: 'GitHub',
    setupHint: "GitHub's server doesn't support web sign-in for third-party apps — paste a PAT from github.com/settings/tokens instead.",
    form: {
      name: 'github', kind: 'mcp_http', description: 'PRs, issues, repos, code search',
      url: 'https://api.githubcopilot.com/mcp/',
      headers: '{"Authorization": "Bearer YOUR_GITHUB_PAT"}',
      command: '', args: '', env: '',
    },
  },
  {
    id: 'jira', icon: '🟦', label: 'JIRA / Confluence',
    oneClick: true,
    setupHint: 'After adding, click Sign in — your browser opens Atlassian to authorize.',
    form: {
      name: 'jira', kind: 'mcp_sse', description: 'Tickets, sprints, Confluence pages',
      url: 'https://mcp.atlassian.com/v1/sse',
      headers: '', command: '', args: '', env: '',
    },
  },
  {
    id: 'grafana', icon: '📈', label: 'Grafana',
    setupHint: 'Install mcp-grafana (github.com/grafana/mcp-grafana); service account token from Grafana admin',
    form: {
      name: 'grafana', kind: 'mcp_stdio', description: 'Dashboards, metrics, alerts',
      url: '', headers: '',
      command: 'mcp-grafana', args: '',
      env: '{"GRAFANA_URL": "https://YOUR-GRAFANA.example.com", "GRAFANA_API_KEY": "YOUR_KEY"}',
    },
  },
  {
    id: 'pagerduty', icon: '🚨', label: 'PagerDuty',
    setupHint: 'User API token from PagerDuty → My Profile → User Settings',
    form: {
      name: 'pagerduty', kind: 'mcp_stdio', description: 'Incidents, on-call, services',
      url: '', headers: '',
      command: 'uvx', args: '["pagerduty-mcp-server"]',
      env: '{"PAGERDUTY_API_TOKEN": "YOUR_TOKEN"}',
    },
  },
  {
    id: 'sentry', icon: '🛡', label: 'Sentry',
    setupHint: 'Auth token from sentry.io → Settings → Auth Tokens',
    form: {
      name: 'sentry', kind: 'mcp_stdio', description: 'Errors, issues, releases',
      url: '', headers: '',
      command: 'npx', args: '["-y", "@sentry/mcp-server"]',
      env: '{"SENTRY_AUTH_TOKEN": "YOUR_TOKEN", "SENTRY_HOST": "https://YOUR-ORG.sentry.io"}',
    },
  },
  {
    id: 'slack', icon: '💬', label: 'Slack',
    setupHint: 'Bot token (xoxb-…) from api.slack.com/apps → OAuth & Permissions',
    form: {
      name: 'slack', kind: 'mcp_stdio', description: 'Channels, messages, search',
      url: '', headers: '',
      command: 'npx', args: '["-y", "@modelcontextprotocol/server-slack"]',
      env: '{"SLACK_BOT_TOKEN": "xoxb-YOUR-TOKEN", "SLACK_TEAM_ID": "YOUR_TEAM_ID"}',
    },
  },
]

export function ConnectionsPanel() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<number, ConnectionTestResult | 'testing'>>({})

  useEffect(() => {
    getConnections().then(setConnections).catch(() => {})
  }, [])

  const set = (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleAdd() {
    if (!form.name.trim()) { setFormError('Name is required'); return }
    if (form.kind !== 'mcp_stdio' && !form.url.trim()) { setFormError('Server URL is required'); return }
    if (form.kind === 'mcp_stdio' && !form.command.trim()) { setFormError('Command is required'); return }
    for (const [field, label] of [['headers', 'Headers'], ['args', 'Arguments'], ['env', 'Environment']] as const) {
      if (form[field].trim()) {
        try { JSON.parse(form[field]) } catch { setFormError(`${label} must be valid JSON`); return }
      }
    }
    setSaving(true)
    setFormError('')
    try {
      const created = await createConnection({
        name: form.name.trim(),
        kind: form.kind,
        description: form.description.trim() || null,
        url: form.url.trim() || null,
        headers: form.headers.trim() || null,
        command: form.command.trim() || null,
        args: form.args.trim() || null,
        env: form.env.trim() || null,
        enabled: true,
      })
      setConnections(prev => [...prev, created])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (e) {
      setFormError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const [signingIn, setSigningIn] = useState<number | null>(null)
  const [signInError, setSignInError] = useState<Record<number, string>>({})

  async function handleSignIn(id: number) {
    setSigningIn(id)
    setSignInError(prev => ({ ...prev, [id]: '' }))
    try {
      const res = await authorizeConnection(id)
      if (!res.ok) {
        setSignInError(prev => ({ ...prev, [id]: res.error ?? 'Authorization failed' }))
        setSigningIn(null)
        return
      }
      // Backend opened the browser; poll until the flow completes
      const deadline = Date.now() + 300_000
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 2000))
        const status = await authorizeStatus(id)
        if (status.status === 'success') {
          const fresh = await getConnections()
          setConnections(fresh)
          setTestResults(prev => ({
            ...prev,
            [id]: { ok: true, tool_count: status.tool_count, tools: [] },
          }))
          setSigningIn(null)
          return
        }
        if (status.status === 'error') {
          setSignInError(prev => ({ ...prev, [id]: status.error ?? 'Authorization failed' }))
          setSigningIn(null)
          return
        }
      }
      setSignInError(prev => ({ ...prev, [id]: 'Timed out waiting for authorization' }))
    } catch (e) {
      setSignInError(prev => ({ ...prev, [id]: String(e) }))
    } finally {
      setSigningIn(null)
    }
  }

  async function handlePresetClick(entry: CatalogEntry) {
    if (!entry.oneClick) {
      setForm({ ...entry.form })
      setActivePreset(entry.id)
      setFormError('')
      return
    }
    setFormError('')
    const existing = connections.find(c => c.name === entry.form.name)
    if (existing) {
      setShowForm(false)
      handleSignIn(existing.id)
      return
    }
    try {
      const created = await createConnection({
        name: entry.form.name,
        kind: entry.form.kind,
        description: entry.form.description || null,
        url: entry.form.url || null,
        headers: entry.form.headers || null,
        command: entry.form.command || null,
        args: entry.form.args || null,
        env: entry.form.env || null,
        enabled: true,
      })
      setConnections(prev => [...prev, created])
      setShowForm(false)
      handleSignIn(created.id)
    } catch (e) {
      setFormError(String(e))
    }
  }

  async function handleTest(id: number) {
    setTestResults(prev => ({ ...prev, [id]: 'testing' }))
    try {
      const result = await testConnection(id)
      setTestResults(prev => ({ ...prev, [id]: result }))
    } catch (e) {
      setTestResults(prev => ({ ...prev, [id]: { ok: false, error: String(e) } }))
    }
  }

  async function handleToggle(c: Connection) {
    const updated = await updateConnection(c.id, { enabled: !c.enabled })
    setConnections(prev => prev.map(x => (x.id === c.id ? updated : x)))
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this connection?')) return
    await deleteConnection(id)
    setConnections(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Connections
          </h2>
          <span className="text-xs text-gray-400">
            Connect your work tools — ask questions across them from Claude Code or Windsurf
          </span>
        </div>
        <button
          onClick={() => { setShowForm(s => !s); setFormError('') }}
          className="text-xs px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-gray-700 font-medium transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add connection'}
        </button>
      </div>

      {showForm && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          {/* Catalog presets */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Pick a tool — or configure a custom one below
            </p>
            <div className="flex flex-wrap gap-2">
              {CATALOG.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => handlePresetClick(entry)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    activePreset === entry.id
                      ? 'border-gray-800 bg-white font-medium'
                      : 'border-gray-200 bg-white hover:border-gray-400'
                  }`}
                >
                  <span>{entry.icon}</span>
                  <span className="text-gray-700">{entry.label}</span>
                  {entry.oneClick && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                      Sign in →
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={() => { setForm(EMPTY_FORM); setActivePreset(null); setFormError('') }}
                className={`rounded-lg border border-dashed px-3 py-2 text-sm transition-colors ${
                  activePreset === null ? 'border-gray-800 text-gray-800' : 'border-gray-300 text-gray-400 hover:border-gray-400'
                }`}
              >
                Custom
              </button>
            </div>
            {activePreset && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                Replace the <span className="font-mono">YOUR_…</span> placeholders below, then Add and Test.{' '}
                {CATALOG.find(e => e.id === activePreset)?.setupHint}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <input
              value={form.name} onChange={set('name')} placeholder="Name (e.g. jira, grafana)"
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400"
            />
            <select
              value={form.kind} onChange={set('kind')}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white"
            >
              <option value="mcp_http">Remote server (HTTP)</option>
              <option value="mcp_sse">Remote server (SSE, legacy)</option>
              <option value="mcp_stdio">Local command (stdio)</option>
            </select>
            <input
              value={form.description} onChange={set('description')} placeholder="Description (optional)"
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400"
            />
          </div>

          {form.kind !== 'mcp_stdio' ? (
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.url} onChange={set('url')} placeholder="Server URL (e.g. https://mcp.atlassian.com/v1/mcp)"
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 font-mono"
              />
              <input
                value={form.headers} onChange={set('headers')}
                placeholder='Headers JSON (e.g. {"Authorization": "Bearer …"})'
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 font-mono"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <input
                value={form.command} onChange={set('command')} placeholder="Command (e.g. npx)"
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 font-mono"
              />
              <input
                value={form.args} onChange={set('args')}
                placeholder='Args JSON (e.g. ["-y", "@modelcontextprotocol/server-github"])'
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 font-mono"
              />
              <input
                value={form.env} onChange={set('env')}
                placeholder='Env JSON (e.g. {"GITHUB_TOKEN": "…"})'
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 font-mono"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-red-500">{formError}</p>
            <button
              onClick={handleAdd} disabled={saving}
              className="text-xs px-4 py-2 rounded bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 font-medium transition-colors"
            >
              {saving ? 'Adding…' : 'Add connection'}
            </button>
          </div>
        </div>
      )}

      {connections.length === 0 && !showForm ? (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-gray-400">
            No connections yet. Add JIRA, Grafana, PagerDuty, GitHub and more — then ask questions
            across them from your coding agent.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {connections.map(c => {
            const result = testResults[c.id]
            return (
              <div key={c.id} className="px-6 py-3 flex items-center gap-4">
                <button
                  onClick={() => handleToggle(c)}
                  title={c.enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                  className={`w-2 h-2 rounded-full shrink-0 ${c.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
                      {c.kind === 'mcp_http' ? 'http' : c.kind === 'mcp_sse' ? 'sse' : 'stdio'}
                    </span>
                    {c.oauth_tokens && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                        ✓ Authorized
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {c.description || c.url || c.command}
                  </p>
                  {result && result !== 'testing' && (
                    <p className={`text-xs mt-0.5 ${result.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                      {result.ok
                        ? `✓ Connected — ${result.tool_count} tools${(result.tools?.length ?? 0) > 0 ? `: ${(result.tools ?? []).slice(0, 6).join(', ')}${(result.tools?.length ?? 0) > 6 ? '…' : ''}` : ''}`
                        : `✗ ${result.error}`}
                    </p>
                  )}
                  {signInError[c.id] && (
                    <p className="text-xs mt-0.5 text-red-500">✗ {signInError[c.id]}</p>
                  )}
                </div>
                {c.kind !== 'mcp_stdio' && (
                  <button
                    onClick={() => handleSignIn(c.id)}
                    disabled={signingIn === c.id}
                    className="text-xs px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 font-medium transition-colors"
                  >
                    {signingIn === c.id ? 'Waiting for browser…' : c.oauth_tokens ? 'Re-authorize' : 'Sign in'}
                  </button>
                )}
                <button
                  onClick={() => handleTest(c.id)}
                  disabled={result === 'testing'}
                  className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  {result === 'testing' ? 'Testing…' : 'Test'}
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                  title="Remove connection"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
