#!/usr/bin/env bash
# prepare-binaries.sh — stages PyInstaller backend + Ollama binary for Tauri build
# Run this before `pnpm tauri build`
# Usage: ./scripts/prepare-binaries.sh [arch]
#   arch: aarch64 (default, Apple Silicon) | x86_64 (Intel)

set -euo pipefail

ARCH="${1:-aarch64}"
TARGET="${ARCH}-apple-darwin"
BINARIES_DIR="frontend/src-tauri/binaries"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "▶ Preparing binaries for $TARGET"
echo ""

# ── 1. Build FastAPI backend with PyInstaller ────────────────────────────────
echo "▶ Building backend with PyInstaller…"
cd "$ROOT_DIR/backend"
uv run pyinstaller signalforge.spec --clean --noconfirm
cd "$ROOT_DIR"

# PyInstaller --onefile produces a single binary directly in dist/
BACKEND_BIN="backend/dist/signalforge-backend"

if [ ! -f "$BACKEND_BIN" ]; then
  echo "✗ Backend binary not found at $BACKEND_BIN"
  exit 1
fi

# Stage the entire dist directory; Tauri will pick up the main exe
cp "$BACKEND_BIN" "$BINARIES_DIR/signalforge-backend-$TARGET"
chmod +x "$BINARIES_DIR/signalforge-backend-$TARGET"
echo "✓ Backend binary staged → $BINARIES_DIR/signalforge-backend-$TARGET"

# ── 2. Download Ollama binary ────────────────────────────────────────────────
echo ""
echo "▶ Checking Ollama binary…"

OLLAMA_DEST="$BINARIES_DIR/ollama-$TARGET"

if [ -f "$OLLAMA_DEST" ]; then
  echo "✓ Ollama already staged at $OLLAMA_DEST (delete to re-download)"
else
  echo "  Downloading Ollama for $ARCH…"

  if [ "$ARCH" = "aarch64" ]; then
    OLLAMA_URL="https://github.com/ollama/ollama/releases/latest/download/ollama-darwin-arm64"
  else
    OLLAMA_URL="https://github.com/ollama/ollama/releases/latest/download/ollama-darwin-amd64"
  fi

  curl -L --progress-bar "$OLLAMA_URL" -o "$OLLAMA_DEST"
  chmod +x "$OLLAMA_DEST"
  echo "✓ Ollama downloaded → $OLLAMA_DEST"
fi

# ── 3. Summary ───────────────────────────────────────────────────────────────
echo ""
echo "✓ All binaries ready:"
ls -lh "$BINARIES_DIR/"
echo ""
echo "Next: cd frontend && pnpm tauri build"
