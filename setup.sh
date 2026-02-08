#!/bin/bash
# ──────────────────────────────────────────────
# PageForge – Automatisches Setup
# Führe dieses Script einmalig nach dem Klonen aus:
#   chmod +x setup.sh && ./setup.sh
# ──────────────────────────────────────────────

set -e

echo ""
echo "  ⚒️  PageForge – Setup"
echo "  ──────────────────────────────────────"
echo ""

# Ins Script-Verzeichnis wechseln
cd "$(dirname "$0")"

# 1. Python prüfen
echo "  [1/4] Python prüfen..."
if command -v python3 &>/dev/null; then
    PY=$(python3 --version 2>&1)
    echo "         ✅ $PY"
else
    echo "         ❌ Python 3 nicht gefunden!"
    echo "         Bitte installiere Python 3: https://www.python.org/downloads/"
    exit 1
fi

# 2. Virtual Environment erstellen
echo "  [2/4] Virtual Environment erstellen..."
if [ -d "venv" ]; then
    echo "         ✅ venv existiert bereits"
else
    python3 -m venv venv
    echo "         ✅ venv erstellt"
fi

# 3. venv aktivieren
echo "  [3/4] Virtual Environment aktivieren..."
source venv/bin/activate
echo "         ✅ Aktiviert"

# 4. start.command ausführbar machen (macOS)
echo "  [4/4] Berechtigungen setzen..."
chmod +x start.command 2>/dev/null || true
chmod +x setup.sh 2>/dev/null || true
echo "         ✅ Fertig"

echo ""
echo "  ──────────────────────────────────────"
echo "  ✅ Setup abgeschlossen!"
echo ""
echo "  Starten mit:"
echo "    source venv/bin/activate"
echo "    python3 server.py"
echo ""
echo "  Oder unter macOS: Doppelklick auf start.command"
echo "  ──────────────────────────────────────"
echo ""

# Fragen ob direkt starten
read -p "  Jetzt starten? (j/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Jj]$ ]]; then
    python3 server.py
fi
