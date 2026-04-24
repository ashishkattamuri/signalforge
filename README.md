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

## Project structure

```
signalforge/
├── backend/
│   ├── main.py                  # entry point
│   └── src/signalforge/
│       ├── main.py              # FastAPI app + all routes
│       ├── models.py            # SQLModel database models
│       ├── database.py          # SQLite engine + session
│       └── llm_client.py        # Ollama client + prompt templates
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── api.ts               # typed API client
│       ├── types.ts             # shared TypeScript types
│       ├── constants.ts         # UI metadata (statuses, signals, dimensions)
│       └── components/
│           ├── WeekHeader.tsx
│           ├── StaffDimensionsPanel.tsx
│           ├── PriorityContextPanel.tsx
│           ├── DailyGrid.tsx
│           └── WeeklySynthesisPanel.tsx
└── README.md
```
