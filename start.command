#!/bin/bash
# ──────────────────────────────────────
# PageForge Launcher (macOS)
# Doppelklick zum Starten
# ──────────────────────────────────────

PORT=8420
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ⚒️  PageForge - HTML Page Designer"
echo "  ──────────────────────────────────"
echo "  http://localhost:$PORT"
echo ""

# Alten Server stoppen falls noch aktiv
lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null
sleep 0.3

# venv aktivieren falls vorhanden
if [ -f "$DIR/venv/bin/activate" ]; then
    source "$DIR/venv/bin/activate"
    echo "  venv: aktiviert"
fi

# Browser öffnen
(sleep 1.5 && open "http://localhost:$PORT") &

# Server starten
cd "$DIR"
python3 server.py
