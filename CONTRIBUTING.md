# Contributing to SignalForge

Thanks for your interest in SignalForge — an offline-first engineering work OS powered by a local LLM. Contributions of all kinds are welcome: bug reports, feature ideas, docs, and code.

## Ground rules

- **Local-first is non-negotiable.** All user data stays on the machine. PRs that add telemetry, cloud calls, or remote storage as a default will not be accepted. (Opt-in, end-to-end-encrypted sync is on the long-term roadmap.)
- **Keep the LLM behind the abstraction.** All model interaction goes through `LLMClient` (`backend/src/signalforge/llm_client.py`). No direct Ollama calls from routes or components.
- **Small, focused PRs.** One concern per PR, with a clear description of *why*.

## Development setup

### Prerequisites

- Python 3.12+ and [`uv`](https://github.com/astral-sh/uv)
- Node 18+ and [`pnpm`](https://pnpm.io)
- [Ollama](https://ollama.com) running locally, with a model pulled:
  ```bash
  ollama pull llama3.1:8b
  ```
- Rust toolchain (only needed for the desktop app: `rustup`, Rust 1.88+)

### Run the web app (fastest dev loop)

```bash
# Terminal 1 — backend (FastAPI on :8000)
cd backend
uv sync
uv run python main.py

# Terminal 2 — frontend (Vite on :5173)
cd frontend
pnpm install
pnpm dev
```

Open http://localhost:5173. Interactive API docs live at http://localhost:8000/docs.

### Build the macOS desktop app

```bash
./scripts/prepare-binaries.sh        # compiles backend via PyInstaller, stages Ollama binary
cd frontend && pnpm tauri build      # produces SignalForge.app + .dmg
```

Before testing a packaged build, make sure nothing else is holding port 8000 (`lsof -i :8000`) — a leftover dev server will mask the bundled backend.

### MCP server

The backend exposes an MCP endpoint at `http://localhost:8000/mcp/` (tools: `log_work`, `get_week_context`, `get_week_summary`, `generate_synthesis`). To develop against it with Claude Code:

```bash
claude mcp add --transport http signalforge http://localhost:8000/mcp/
```

## Project layout

| Path | What lives there |
|---|---|
| `backend/src/signalforge/main.py` | FastAPI app + all REST routes |
| `backend/src/signalforge/mcp_server.py` | MCP server + tools |
| `backend/src/signalforge/models.py` | SQLModel tables (SQLite at `~/.signalforge/data.db`) |
| `backend/src/signalforge/llm_client.py` | Ollama client + prompt templates |
| `frontend/src/` | React app (Vite + Tailwind) |
| `frontend/src-tauri/` | Tauri shell (Rust) + sidecar config |
| `scripts/prepare-binaries.sh` | Stages sidecar binaries for desktop builds |

## Submitting changes

1. Fork and create a feature branch.
2. Make your change. New backend imports may need PyInstaller `hiddenimports` in `backend/signalforge.spec` — the app source ships as data, so imports aren't auto-detected.
3. Verify the web app works end to end (backend + frontend), and the TypeScript compiles: `cd frontend && pnpm tsc --noEmit`.
4. Open a PR describing what changed and why.

## Reporting bugs / proposing features

Open a GitHub issue. For bugs, include: OS, how you run SignalForge (web dev mode vs. packaged app), the Ollama model in use, and steps to reproduce.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
