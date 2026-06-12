# SignalForge

An offline-first engineering work OS that transforms raw daily work into structured, high-signal impact evidence using a local LLM.

## What it does

SignalForge closes the gap between *doing work* and *articulating impact*. You log your daily tasks, and the system uses a local LLM to enrich each entry with impact framing, signal classification, and reflection prompts — turning "reviewed a PR" into promotion-ready evidence.

**Core loop:** Capture → Enrich (local LLM) → Reflect → Synthesize → Export

## Features

- **Weekly work capture** — log tasks by day with time estimates, status, and Eisenhower matrix flags
- **LLM enrichment** — each entry is automatically rewritten for impact, classified by signal type, and paired with a coaching question
- **Staff Signal Dimensions** — track evidence across 8 dimensions (Technical Scope, Ownership, Cross-team Influence, Ambiguity Navigation, Risk Reduction, Execution Velocity, Mentorship, Strategic Alignment)
- **Priority alignment** — map work against Org / Team / Manager / Personal priorities at P0/P1/P2 level
- **Weekly synthesis** — LLM-generated "What Landed / What Drifted" summary and promotion-ready evidence bullets
- **Markdown export** — one-click export of the full week summary

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Database | SQLite (local, `~/.signalforge/data.db`) |
| LLM Runtime | [Ollama](https://ollama.com) (`llama3.1:8b`) |
| Frontend | React + Vite + Tailwind CSS v4 |

All data stays local. No cloud, no telemetry.

## Getting started

### Prerequisites

- Python 3.12+, [`uv`](https://github.com/astral-sh/uv)
- Node 18+, [`pnpm`](https://pnpm.io)
- [Ollama](https://ollama.com) with `llama3.1:8b` pulled

```bash
ollama pull llama3.1:8b
```

### Run the backend

```bash
cd backend
uv run python main.py
# API available at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

### Run the frontend

```bash
cd frontend
pnpm install
pnpm dev
# App available at http://localhost:5173
```

### macOS desktop app

SignalForge also ships as a native macOS app (Tauri) with the backend and Ollama bundled as sidecars — double-click, no terminal. First launch includes an onboarding flow with a model picker (sizes shown upfront, downloaded once via Ollama).

```bash
./scripts/prepare-binaries.sh        # compile backend (PyInstaller) + stage Ollama
cd frontend && pnpm tauri build      # → SignalForge.app + .dmg
```

## MCP server — connect your coding agent

SignalForge exposes a local [MCP](https://modelcontextprotocol.io) server at `http://localhost:8000/mcp/`, so agents like **Claude Code** and **Windsurf** can push work into your week and read your priorities — nothing leaves your machine.

```bash
claude mcp add --transport http signalforge http://localhost:8000/mcp/
```

| Tool | What it does |
|---|---|
| `log_work` | Push entries into the daily grid — auto-enriched by the local LLM |
| `get_week_context` | Read declared P0/P1/P2 priorities + career profile |
| `get_week_summary` | Read the week's entries and synthesis |
| `generate_synthesis` | Trigger "What Landed / What Drifted" + evidence bullets |

Example: at the end of a Claude Code session, say *"push today's work to SignalForge"* — entries land tagged `mcp`, impact-framed, and signal-classified.

## Project structure

```
signalforge/
├── backend/
│   ├── main.py                  # dev entry point
│   ├── signalforge.spec         # PyInstaller spec (desktop sidecar build)
│   └── src/signalforge/
│       ├── main.py              # FastAPI app + all routes
│       ├── mcp_server.py        # MCP server + tools
│       ├── models.py            # SQLModel database models
│       ├── database.py          # SQLite engine + session
│       └── llm_client.py        # Ollama client + prompt templates
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts               # typed API client
│   │   ├── types.ts             # shared TypeScript types
│   │   ├── constants.ts         # UI metadata (statuses, signals, dimensions)
│   │   └── components/          # WeekHeader, DailyGrid, Onboarding, …
│   └── src-tauri/               # Tauri shell (Rust) + sidecar config
├── scripts/
│   └── prepare-binaries.sh      # stage sidecar binaries for desktop builds
├── CONTRIBUTING.md
└── README.md
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Local-first is non-negotiable — PRs adding telemetry or default cloud calls won't be accepted.

## License

[MIT](LICENSE)
