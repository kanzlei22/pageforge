# PageForge – Entwickler-Übergabeprompt

> **Dieses Dokument** ist der komplette Kontext für die Weiterentwicklung von PageForge. Kopiere es in einen neuen Chat mit einem KI-Assistenten (Claude, ChatGPT etc.) oder nutze es als Referenz für manuelle Entwicklung.

---

## Projekt-Übersicht

**PageForge** ist ein lokaler, browserbasierter HTML-Seitendesigner für A4-Druckdokumente. Benutzer erstellen einzelne HTML/CSS-Seiten, verwalten sie in einer Bibliothek und bündeln sie zu Collections (Bücher, Workbooks, Handbücher) mit PDF-Export und automatischer Seitennummerierung.

**Repository:** https://github.com/kanzlei22/pageforge
**Version:** v6.1
**Stand:** Februar 2026

---

## Technische Basis

- **Rein clientseitig** – Kein Backend, kein Build-System, kein Node.js, kein Framework
- **Vanilla JavaScript** (ES6+ Module Pattern mit IIFEs)
- **Vanilla CSS** (CSS Custom Properties für Theming)
- **IndexedDB** für Datenpersistenz im Browser
- **localStorage** für Auto-Backup und Recovery
- **File System Access API** (optional, Chromium-only) für Datei-Verknüpfung
- **Python 3 SimpleHTTPServer** als lokaler Entwicklungsserver (nur Dateien ausliefern, kein Backend)
- **Keine externen Abhängigkeiten** – alles selbstgebaut, keine npm-Pakete

### Warum kein Framework?

PageForge ist bewusst ohne React/Vue/Svelte gebaut. Alles ist in wenigen Dateien, direkt lesbar, kein Transpiling nötig. Der Server ist ein 50-Zeilen Python-Script. Das macht das Projekt extrem portabel und wartbar.

---

## Verzeichnisstruktur

```
pageforge/
├── index.html              (68 Zeilen)    Haupt-HTML, Tab-Struktur, Modals
├── server.py               (49 Zeilen)    Python-Dev-Server mit No-Cache-Headers
├── setup.sh                                Automatisches Setup macOS/Linux
├── setup.bat                               Automatisches Setup Windows
├── start.command                           macOS Doppelklick-Launcher
├── start.bat                               Windows Doppelklick-Launcher
├── .gitignore                              venv, __pycache__, .DS_Store
├── README.md                               Projekt-README
├── SETUP.md                                Kurz-Setup-Anleitung (alt)
│
├── css/
│   └── app.css             (350 Zeilen)    Gesamtes Styling, CSS Custom Properties
│
├── js/
│   ├── app.js              (234 Zeilen)    Bootstrap, Tab-Routing, Settings-Menü
│   │
│   ├── core/
│   │   ├── db.js           (345 Zeilen)    IndexedDB-Layer, Backup, Import/Export
│   │   ├── events.js       (49 Zeilen)     Pub/Sub Event-System
│   │   └── placeholders.js (72 Zeilen)     {{variable}} System
│   │
│   └── modules/
│       ├── editor.js       (635 Zeilen)    HTML-Editor, Live-Vorschau, Bilder, CSS-Swap
│       ├── library.js      (259 Zeilen)    Bibliothek, Grid/Liste, Tag-Cloud, Zoom
│       ├── collections.js  (719 Zeilen)    Collections, Kapitel, Drag&Drop, PDF-Export
│       └── css-templates.js(327 Zeilen)    CSS-Stile und Seitenvorlagen verwalten
│
└── docs/
    ├── ANLEITUNG.md        (457 Zeilen)    Benutzerhandbuch (deutsch)
    └── DEVELOPER-HANDOVER.md               Dieses Dokument
```

**Gesamt: ~3.250 Zeilen Code** (ohne Docs)

---

## Architektur

### Lade-Reihenfolge (index.html)

```
1. css/app.css
2. js/core/events.js        → PageForgeEvents (Pub/Sub)
3. js/core/db.js             → PageForgeDB (IndexedDB)
4. js/core/placeholders.js   → PageForgePlaceholders ({{variablen}})
5. js/modules/editor.js      → PageForgeEditor
6. js/modules/library.js     → PageForgeLibrary
7. js/modules/collections.js → PageForgeCollections
8. js/modules/css-templates.js → PageForgeCssTemplates
9. js/app.js                 → PageForge (Bootstrap)
```

Jedes Modul ist eine **IIFE** (Immediately Invoked Function Expression), die ein Objekt mit öffentlichen Methoden zurückgibt. Alle sind globale Variablen auf `window`.

### Module Pattern

```javascript
const PageForgeModulName = (() => {
  // Private Variablen und Funktionen

  function init() {
    buildUI();    // HTML ins DOM schreiben
    bindEvents(); // Event-Listener setzen
  }

  function buildUI() {
    document.getElementById('tab-xyz').innerHTML = `...`;
  }

  // Öffentliche API
  return { init, refresh };
})();
```

### Event-System

Module kommunizieren über `PageForgeEvents` (Pub/Sub):

```javascript
// Senden
PageForgeEvents.emit(PageForgeEvents.EVENTS.SNIPPET_SAVED, { snippet });

// Empfangen
PageForgeEvents.on(PageForgeEvents.EVENTS.SNIPPET_SAVED, data => { ... });
```

**Registrierte Events:**

| Event | Auslöser | Empfänger |
|-------|----------|-----------|
| `snippet:saved` | Editor speichert | Library, Collections |
| `snippet:deleted` | Library löscht | Collections (entfernt aus Kapiteln) |
| `snippet:edit` | Library Klick | Editor (lädt Seite) |
| `collection:saved` | Collections speichert | – |
| `css:templateChanged` | CSS-Templates Editor | Editor (Dropdown aktualisieren) |
| `tab:changed` | Tab-Wechsel | Alle Module (Refresh) |
| `ui:toast` | Überall | App (zeigt Toast-Nachricht) |
| `library:refresh` | Diverse | Library (neu rendern) |
| `category:added` | Settings | Editor, Library |

### Daten-Flow

```
User erstellt Seite im Editor
  → saveSnippet() schreibt in IndexedDB
  → Event SNIPPET_SAVED wird emitiert
  → Library rendert neu (zeigt neue Seite)
  → Auto-Backup aktualisiert localStorage

User fügt Seite zu Collection hinzu
  → Collection referenziert snippetId
  → saveCollection() schreibt in IndexedDB

User exportiert PDF
  → Collections lädt alle Snippets per ID
  → Platzhalter werden aufgelöst
  → HTML wird in neuem Fenster zusammengesetzt
  → Browser-Druckdialog öffnet sich
```

---

## Datenmodell

### IndexedDB: `PageForgeDB` (Version 3)

**7 Object Stores:**

#### `snippets` (Seiten)
```javascript
{
  id: "snip_1707056529_abc123",     // Auto-generiert
  title: "Kapitel 1: Grundlagen",
  htmlContent: "<!DOCTYPE html>...", // Vollständiges HTML inkl. CSS
  originalCss: "body { ... }",      // Extrahiertes CSS (für CSS-Swap)
  category: "content",              // Kategorie-ID
  status: "draft",                  // "draft" | "review" | "final"
  tags: ["workshop", "modul-1"],    // Array von Strings
  version: 2,                       // Aktuelle Versionsnummer
  versions: [                       // Versionsverlauf
    { version: 1, htmlContent: "...", originalCss: "...", status: "draft", savedAt: "2026-02-08T..." }
  ],
  createdAt: "2026-02-08T14:30:00Z",
  updatedAt: "2026-02-08T15:45:00Z"
}
```

#### `collections` (Bücher/Handbücher)
```javascript
{
  id: "col_1707056529_xyz789",
  name: "Workshop-Handbuch 2025",
  description: "...",
  author: "Robert Hoffmann",
  masterCss: "body { font-family: ... }",  // Globales CSS für alle Seiten
  items: [                                  // Geordnete Liste (v5+ Datenmodell)
    { type: "page", snippetId: "snip_..." },                        // Einzelseite
    { type: "chapter", name: "Kapitel 1", snippetIds: ["snip_..."] }, // Kapitel
    { type: "chapter", name: "Kapitel 2", snippetIds: ["snip_..."] },
    { type: "page", snippetId: "snip_..." }                         // Einzelseite
  ],
  createdAt: "...",
  updatedAt: "..."
}
```

**Migration:** Alte Collections mit `chapters[]` werden automatisch zu `items[]` migriert (Funktion `migrateToItems()` in collections.js).

#### `cssTemplates` (CSS-Stile)
```javascript
{
  id: "workshop-style",
  name: "Workshop Style",
  description: "Professionell für Workshops",
  css: "body { ... } h1 { ... }",
  isDefault: true  // Vordefiniert (nicht löschbar)
}
```

#### `pageTemplates` (Seitenvorlagen)
```javascript
{
  id: "tpl-cover",
  name: "Deckblatt",
  description: "Titelseite mit Platzhaltern",
  category: "cover",
  htmlContent: "<!DOCTYPE html>...",
  isDefault: true
}
```

#### `images` (Hochgeladene Bilder)
```javascript
{
  id: "img_...",
  name: "logo.png",
  data: "data:image/png;base64,...",  // Base64-encoded
  size: 45231,
  type: "image/png",
  createdAt: "..."
}
```

#### `categories` (Seitenkategorien)
```javascript
{
  id: "content",
  name: "Inhaltsseite",
  icon: "📖",
  isDefault: true
}
```

#### `tags` (derzeit nicht aktiv als eigenständiger Store – Tags werden inline in Snippets gespeichert)

---

## Schlüssel-Implementierungen

### Preview-Thumbnails (CSS Zoom)

Thumbnails zeigen A4-Seiten (794×1123px) verkleinert. Die Lösung nach mehreren Iterationen:

```javascript
// Iframe ist 100% der Container-Größe
// Content wird per CSS zoom verkleinert
const zoomCss = `<style>html{zoom:${scale};overflow:hidden!important}body{overflow:hidden!important;width:794px;margin:0}</style>`;
// Zoom wird VOR dem Schreiben in den HTML-String injiziert
```

**Warum nicht `transform: scale()`?** Transform verkleinert nur visuell, die Layout-Box bleibt 794×1123px. Kein CSS-Containment (`overflow:hidden`, `clip-path`, `contain:strict`) kann den visuell transformierten Iframe zuverlässig clippen. CSS `zoom` hingegen verkleinert Layout und Visuelles gleichermaßen.

### Drag & Drop in Collections

Zwei Ebenen:
1. **Seitenleiste:** Kapitel und Einzelseiten umsortieren (Array-Index-basiert)
2. **Hauptbereich:** Seiten innerhalb eines Kapitels umsortieren

Implementierung nutzt native HTML5 Drag & Drop API mit `dragstart`, `dragover`, `drop`, `dragend` Events. Drop-Position wird per Mausposition relativ zur Element-Mitte berechnet (obere Hälfte = davor einfügen, untere Hälfte = danach).

### PDF-Export

Collections → PDF-Export öffnet ein neues Browserfenster mit allen Seiten als verkettetes HTML. Jede Seite ist ein `<div>` mit `page-break-after: always`. Platzhalter werden per `PageForgePlaceholders.resolve()` aufgelöst. Der Benutzer druckt dann über den Browser-Druckdialog als PDF.

### Auto-Backup

`PageForgeDB` schreibt regelmäßig einen JSON-Snapshot aller Stores in `localStorage` (Key: `pageforge_autobackup`). Beim Start prüft die App ob IndexedDB leer ist aber ein Backup existiert → automatische Recovery.

### File System Access API

Optional (nur Chromium): Benutzer kann eine `.json`-Datei verknüpfen. Änderungen werden automatisch in diese Datei geschrieben. Ermöglicht Cloud-Sync über iCloud/Dropbox.

---

## CSS-Architektur

### Custom Properties (Dark Theme)

```css
:root {
  --bg1: #0f1117;    /* Hintergrund dunkel */
  --bg2: #1a1d27;    /* Karten-Hintergrund */
  --bg3: #252832;    /* Eingabefelder */
  --tx1: #e8e8ed;    /* Primärtext */
  --tx2: #9ca3af;    /* Sekundärtext */
  --tx3: #6b7280;    /* Tertiärtext */
  --acc: #f5a623;    /* Akzentfarbe (Gold) */
  --acc-g: rgba(245,166,35,.12); /* Akzent-Glow */
  --brd: #2a2d37;    /* Borders */
  --r-sm/md/lg:      /* Border-Radius Stufen */
  --s-sm/md/lg:      /* Box-Shadow Stufen */
  --fast/med:        /* Transition-Dauern */
}
```

### Namenskonventionen

- `lib-*` – Library-Modul (Bibliothek)
- `lc-*` – Library Card (Grid-Ansicht)
- `lli-*` – Library List Item (Listen-Ansicht)
- `col-*` – Collections-Modul
- `cp-*` – Collection Page (Seite in Collection)
- `ch-*` – Chapter/Sidebar (Seitenleiste)
- `mp-*` – Modal Page (Seiten-Picker)
- `tpl-*` – Template
- `tc-*` – Tag Cloud
- `tb2` – Toolbar Button (zweite Generation)
- `set-*` – Settings
- `abtn` – Action Button (klein)

---

## Bekannte Limitierungen / Offene Punkte

### Noch nicht implementiert

1. **Multi-Page-Splitting:** HTML-Dokumente die länger als eine A4-Seite sind, werden nicht automatisch auf mehrere Seiten aufgeteilt. Derzeit zeigt die Vorschau nur die erste Seite.

2. **Undo/Redo im Editor:** Kein Verlauf für Code-Änderungen (nur über Versionierung).

3. **Echtzeit-Kollaboration:** Nicht vorgesehen (lokale App).

4. **Responsive Design:** Die App ist für Desktop-Browser optimiert (min. ~1024px Breite). Mobile nicht unterstützt.

5. **Internationalisierung:** UI ist komplett auf Deutsch. Kein i18n-System vorhanden.

### Bekannte Eigenheiten

- **Bilder als Base64:** Bilder werden als Base64-Strings direkt im HTML gespeichert. Bei vielen großen Bildern kann die IndexedDB wachsen. Es gibt kein automatisches Komprimieren.

- **CSS-Extraktion:** Beim Laden einer Seite im Editor wird CSS aus `<style>`-Tags extrahiert und separat gespeichert (`originalCss`). Bei CSS-Swap wird nur dieses CSS ersetzt. Inline-Styles werden nicht erfasst.

- **Browser-Kompatibilität:** File System Access API funktioniert nur in Chromium-Browsern. Alle anderen Features funktionieren in allen modernen Browsern.

- **IndexedDB-Limit:** Browser haben ein Speicherlimit für IndexedDB (meist 50% des freien Speicherplatzes). Bei extremer Nutzung (tausende Seiten mit großen Bildern) könnte das relevant werden.

---

## Entwicklungs-Workflow

### Dateien ändern

1. Datei bearbeiten (jeder Texteditor)
2. Im Browser `Cmd+Shift+R` / `Ctrl+Shift+R` (Hard Refresh)
3. Kein Build-Schritt nötig – der Server liefert No-Cache-Headers

### Cache-Busting

In `index.html` haben alle `<script>` und `<link>` Tags einen `?v=6.1` Parameter. Bei größeren Änderungen diesen hochzählen:

```html
<script src="js/app.js?v=6.2"></script>
```

### Neues Modul hinzufügen

1. Datei erstellen: `js/modules/neues-modul.js`
2. IIFE-Pattern nutzen (siehe existierende Module)
3. In `index.html` einbinden (vor `app.js`)
4. Tab-Panel in `index.html` hinzufügen
5. In `app.js` → `init()` initialisieren
6. Tab in Navigation hinzufügen

### Neuen DB-Store hinzufügen

1. In `db.js`: `ALL_STORES` erweitern
2. `DB_VERSION` erhöhen
3. Im `onupgradeneeded`-Handler den neuen Store anlegen
4. Backup/Import/Export berücksichtigen die ALL_STORES-Liste automatisch

### Debugging

- `F12` → Console: Alle Module sind global zugänglich (`PageForgeDB`, `PageForgeEditor` etc.)
- `PageForgeDB.exportAll()` – Gibt alle Daten als JSON zurück
- `PageForgeDB.getAll('snippets')` – Alle Seiten auflisten
- `PageForgeEvents.emit('ui:toast', { message: 'Test', type: 'success' })` – Toast testen

---

## Versions-Geschichte

| Version | Änderungen |
|---------|------------|
| v1 | Grundgerüst: Editor mit HTML/CSS, einfache Vorschau |
| v2 | Bibliothek, Grid-Ansicht, Kategorien, Tags |
| v3 | Collections mit Kapiteln, PDF-Export, Platzhalter-System |
| v4 | Datenpersistenz: Auto-Backup, localStorage Recovery, File System Access API, Seitenvorlagen, Bildmanager, Master-CSS |
| v5 | Collections Refactor: items[]-Datenmodell (Kapitel + Einzelseiten), Sidebar Drag&Drop, Tag-Cloud, Zoom-Erweiterung |
| v6 | Preview-Fix (CSS Zoom statt Transform), Grid align-content Fix, Script-Stripping |
| v6.1 | Benutzerhandbuch, Setup-Scripts, Windows-Support, Git-Repository |

---

## Prompt für KI-Assistenten

Wenn du PageForge mit einem KI-Assistenten weiterentwickeln willst, kopiere folgenden Prompt in einen neuen Chat:

---

```
Ich entwickle PageForge weiter, einen lokalen HTML-Seitendesigner für A4-Druckdokumente.

Technischer Stack:
- Vanilla JS (ES6 IIFEs, kein Framework, kein Build)
- Vanilla CSS (Custom Properties, Dark Theme)
- IndexedDB für Persistenz, localStorage für Backup
- Python 3 SimpleHTTPServer (nur statische Dateien)
- Repository: https://github.com/kanzlei22/pageforge

Architektur:
- Jedes Modul ist eine IIFE auf window (PageForgeEditor, PageForgeLibrary, etc.)
- Module kommunizieren über PageForgeEvents (Pub/Sub)
- Daten in IndexedDB mit 7 Stores: snippets, collections, cssTemplates, pageTemplates, images, categories, tags
- Collections haben ein items[]-Array mit {type:'chapter'} und {type:'page'} Elementen
- Thumbnails nutzen CSS zoom innerhalb von Iframes (NICHT transform:scale)

4 Hauptmodule:
1. Editor (editor.js, 635 Zeilen) – HTML/CSS-Editor mit Live-Vorschau
2. Bibliothek (library.js, 259 Zeilen) – Grid/Listen-Ansicht, Tag-Cloud, Filter
3. Collections (collections.js, 719 Zeilen) – Kapitel + Einzelseiten, Drag&Drop, PDF-Export
4. Templates (css-templates.js, 327 Zeilen) – CSS-Stile und Seitenvorlagen

Wichtig:
- Kein npm, kein Bundler, kein Transpiling – alles muss im Browser direkt laufen
- UI ist komplett auf Deutsch
- Dark Theme mit Gold-Akzent (--acc: #f5a623)
- A4-Maße: 794px × 1123px (Bildschirm-Äquivalent)
- Cache-Busting über ?v=X.Y Parameter in index.html

Hier ist meine Aufgabe: [DEINE AUFGABE HIER BESCHREIBEN]

Bitte beachte den bestehenden Code-Stil (IIFE-Pattern, $() für getElementById, kompakter Code).
Falls du den aktuellen Code einer Datei brauchst, sage mir welche – ich kopiere den Inhalt hier rein.
```

---

## Kontakt / Ursprung

Entwickelt im Februar 2026 in Zusammenarbeit mit Claude (Anthropic) für Robert Hoffmann.
