import { ConnectionsPanel } from './ConnectionsPanel'

export function WorkOSView() {
  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">
          SignalForge · Agentic WorkOS
        </p>
        <h1 className="text-4xl font-bold text-gray-900 leading-tight">WorkOS</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-2xl">
          Connect your work tools — JIRA, Grafana, PagerDuty, GitHub and more — then drive
          questions and investigations across them. Everything you investigate can become
          career evidence in your journal.
        </p>
      </div>

      <ConnectionsPanel />

      {/* Brain setup */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Reasoning brain
          </h2>
        </div>
        <div className="px-6 py-4 text-sm text-gray-600 space-y-2">
          <p>
            Your coding agent drives the investigations. Register SignalForge once and every
            connection above becomes available to it:
          </p>
          <pre className="bg-gray-900 text-gray-200 rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto">
claude mcp add --transport http signalforge http://localhost:8000/mcp/</pre>
          <p className="text-xs text-gray-400">
            Then ask things like <em>"check my PagerDuty incidents from this week and summarize the themes"</em> —
            the agent discovers your connections and calls them through SignalForge.
          </p>
        </div>
      </div>

      {/* Orchestration — coming next */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Orchestration
          </h2>
        </div>
        <div className="px-6 py-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              ['🌐', 'Browser connection', 'Reach SSO-walled dashboards and tools without APIs through your own Chrome.'],
              ['💬', 'Ask', 'Ask questions across your tools right here, powered by your local model.'],
              ['📋', 'Saved workflows', 'Investigations you repeat become one-click runbooks.'],
            ].map(([icon, title, body]) => (
              <div key={title} className="rounded-xl border border-dashed border-gray-200 p-4">
                <p className="text-xl mb-2">{icon}</p>
                <p className="text-sm font-semibold text-gray-700">{title}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{body}</p>
                <span className="inline-block mt-2 text-[10px] uppercase tracking-widest text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">
                  Coming soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
