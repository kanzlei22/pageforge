# ⚒️ PageForge

**Lokaler HTML-Seitendesigner für A4-Druckdokumente.**

Erstelle einzelne Seiten im HTML/CSS-Editor, verwalte sie in einer Bibliothek und bündele sie zu Collections (Bücher, Workbooks, Handbücher) – mit PDF-Export und automatischer Seitennummerierung.

## Schnellstart

### macOS / Linux

```bash
git clone https://github.com/kanzlei22/pageforge.git
cd pageforge
chmod +x setup.sh && ./setup.sh
```

### Windows

```cmd
git clone https://github.com/kanzlei22/pageforge.git
cd pageforge
setup.bat
```

Das Setup erstellt ein Python Virtual Environment und startet PageForge.

## Täglicher Start

```bash
# macOS/Linux:
cd pageforge && source venv/bin/activate && python3 server.py

# Oder Doppelklick auf: start.command (macOS) / start.bat (Windows)
```

Browser öffnet sich automatisch auf **http://localhost:8420**.

## Features

- **Editor** – WYSIWYG HTML/CSS-Editor mit Live-Vorschau im A4-Format
- **Bibliothek** – Alle Seiten durchsuchen, filtern nach Kategorie/Status/Tags
- **Collections** – Seiten zu Büchern bündeln mit Kapiteln und Einzelseiten
- **PDF-Export** – Drucken mit automatischen Platzhaltern (Seitenzahl, Kapitel, Datum)
- **Templates** – CSS-Stile und Seitenvorlagen wiederverwenden
- **Bildmanager** – Bilder als Base64 direkt in Seiten einbetten
- **Datensicherung** – Auto-Backup, JSON-Export, File System Access API

## Dokumentation

📖 **[Benutzerhandbuch](docs/ANLEITUNG.md)** – Ausführliche Anleitung mit Schritt-für-Schritt Test-Workflow

## Voraussetzungen

- Python 3.8+
- Moderner Browser (Chrome, Edge, Safari, Firefox)
- Keine externen Python-Pakete erforderlich
