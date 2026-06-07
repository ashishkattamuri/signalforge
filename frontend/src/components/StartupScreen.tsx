interface StartupEvent {
  stage: 'starting_backend' | 'checking_ollama' | 'pulling_model' | 'ready' | 'error'
  message: string
  progress: number | null
}

export function StartupScreen({ event }: { event: StartupEvent }) {
  const isError = event.stage === 'error'
  const isPulling = event.stage === 'pulling_model'

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <div className="text-3xl mb-4">⚡</div>
        <p className="text-sm font-semibold text-gray-700 mb-1">SignalForge</p>
        <p className={`text-sm mb-4 ${isError ? 'text-red-500' : 'text-gray-500'}`}>
          {event.message}
        </p>

        {isPulling && event.progress !== null && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${event.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{Math.round(event.progress)}%</p>
          </div>
        )}

        {!isPulling && !isError && (
          <div className="flex justify-center gap-1 mt-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-xs text-gray-400 mt-3 font-mono">
            Install Ollama from ollama.com, then relaunch SignalForge.
          </p>
        )}
      </div>
    </div>
  )
}
