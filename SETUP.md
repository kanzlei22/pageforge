# PageForge – Setup

## Erster Start (einmalig)

1. **Terminal öffnen** (Spotlight → "Terminal" tippen)
2. Zum PageForge-Ordner navigieren:
   ```
   cd ~/Downloads/pageforge
   ```
   (oder wo auch immer der Ordner liegt)
3. Ausführbar machen:
   ```
   chmod +x start.command
   ```
4. Server starten:
   ```
   python3 server.py
   ```
5. Browser öffnet sich automatisch auf `http://localhost:8420`

## Danach: Schnellstart

**Option A – Terminal:**
```
cd ~/Downloads/pageforge && python3 server.py
```

**Option B – Doppelklick:**
`start.command` doppelklicken.
Falls macOS blockiert: Rechtsklick → "Öffnen" → "Öffnen" bestätigen.

## Wichtig

⚠️ **Nicht die index.html direkt im Browser öffnen!**
Das führt zu Datenverlust. Immer über `http://localhost:8420` arbeiten.

## Update

1. Server stoppen (Ctrl+C im Terminal)
2. Alten `pageforge/`-Ordner löschen
3. Neue ZIP entpacken
4. Server neu starten
5. Daten bleiben erhalten (gleicher Port = gleicher Browser-Speicher)
