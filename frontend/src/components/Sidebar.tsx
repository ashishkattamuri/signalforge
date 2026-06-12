export type AppView = 'journal' | 'workos'

const NAV_ITEMS: { id: AppView; icon: string; label: string; hint: string }[] = [
  { id: 'journal', icon: '⚡', label: 'Work Journal', hint: 'Capture, reflect, synthesize' },
  { id: 'workos', icon: '🛠', label: 'WorkOS', hint: 'Connections & orchestration' },
]

export function Sidebar({
  view, onChange, onOpenSettings,
}: {
  view: AppView
  onChange: (v: AppView) => void
  onOpenSettings: () => void
}) {
  return (
    <aside className="w-52 shrink-0 bg-gray-900 text-gray-300 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <p className="text-sm font-bold text-white tracking-tight">SignalForge</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Engineering Work OS</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
              view === item.id
                ? 'bg-gray-800 text-white'
                : 'hover:bg-gray-800/50 hover:text-gray-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span className="text-base">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </span>
            <span className={`block text-[10px] mt-0.5 ml-7 ${view === item.id ? 'text-gray-400' : 'text-gray-600'}`}>
              {item.hint}
            </span>
          </button>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-gray-800">
        <button
          onClick={onOpenSettings}
          className="w-full text-left rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-800/50 hover:text-gray-200 transition-colors flex items-center gap-2.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  )
}
