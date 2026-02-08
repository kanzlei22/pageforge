# PageForge – Benutzerhandbuch

> **PageForge** ist ein lokaler HTML-Seitendesigner für A4-Druckseiten. Du erstellst einzelne Seiten im HTML/CSS-Editor, verwaltest sie in einer Bibliothek und bündelst sie in Collections (Bücher, Workbooks, Handbücher) – inklusive PDF-Export mit automatischer Seitennummerierung.

---

## Teil 1: Installation

### Voraussetzungen

- **Python 3.8+** (auf macOS vorinstalliert, auf Windows: [python.org](https://www.python.org/downloads/))
- **Git** (auf macOS vorinstalliert, auf Windows: [git-scm.com](https://git-scm.com/downloads))
- Ein moderner Browser (Chrome, Edge, Safari, Firefox)

### Schritt-für-Schritt

Öffne das **Terminal** (macOS: Spotlight → „Terminal") oder die **Eingabeaufforderung** (Windows: `Win+R` → `cmd`).

```bash
# 1. Repository klonen
git clone https://github.com/kanzlei22/pageforge.git
cd pageforge

# 2. Python Virtual Environment erstellen (empfohlen)
python3 -m venv venv

# 3. Virtual Environment aktivieren
#    macOS / Linux:
source venv/bin/activate
#    Windows:
venv\Scripts\activate

# 4. Server starten
python3 server.py
```

Das war's. Der Browser öffnet sich automatisch auf `http://localhost:8420`.

> **Hinweis:** PageForge benötigt keine externen Python-Pakete – `server.py` nutzt nur die Standardbibliothek. Das `venv` dient als saubere Isolierung und verhindert Konflikte mit anderen Python-Projekten.

### Schnellstart für macOS

Alternativ: Doppelklick auf `start.command` im Finder. Beim ersten Mal musst du eventuell Rechtsklick → „Öffnen" wählen, um die Sicherheitswarnung zu bestätigen.

### Server beenden

`Ctrl+C` im Terminal drückt den Server. Deine Daten bleiben erhalten (im Browser gespeichert, siehe [Datensicherung](#datensicherung)).

### Updates installieren

```bash
cd pageforge
git pull
# Server neu starten:
python3 server.py
```

Nach einem Update: Im Browser `Cmd+Shift+R` (macOS) oder `Ctrl+Shift+R` (Windows) für einen Hard Refresh.

---

## Teil 2: Oberfläche im Überblick

PageForge hat vier Hauptbereiche, erreichbar über die **Tab-Leiste** oben:

| Tab | Funktion |
|-----|----------|
| ✏️ **Editor** | HTML-Seiten erstellen und bearbeiten |
| 📚 **Bibliothek** | Alle Seiten durchsuchen, filtern, verwalten |
| 📖 **Collectionen** | Seiten zu Büchern/Handbüchern bündeln, PDF-Export |
| 🎨 **Templates** | CSS-Stile und Seitenvorlagen verwalten |

Rechts oben: ⚙️ **Einstellungen** (Backup, Import/Export, Kategorien).

---

## Teil 3: Der Editor

Der Editor ist das Herzstück. Hier erstellst du einzelne A4-Seiten.

### Neue Seite erstellen

Beim Öffnen des Editors siehst du zwei Optionen:

- **📋 Aus Vorlage** – Wähle eine vorgefertigte Seitenvorlage (Deckblatt, Inhaltsverzeichnis, Workbookseite etc.)
- **{ } HTML Code einfügen** – Füge eigenen HTML/CSS-Code ein

### Vorschau

Links: der **HTML-Code-Editor** (aufklappbare Seitenleiste).
Rechts: die **Live-Vorschau** im A4-Format mit Zoom-Steuerung:

- **Einpassen** – Seite füllt den verfügbaren Platz
- **50% / 75% / 100%** – Feste Zoom-Stufen
- Bei 100% siehst du die Seite in Originalgröße (Druckformat)

### Toolbar-Funktionen

| Button | Funktion |
|--------|----------|
| **{ } Code** | HTML-Code-Editor öffnen/schließen. Code bearbeiten und mit „✓ Anwenden" übernehmen |
| **🎨 CSS** | CSS-Stil der Seite austauschen. Wähle einen vordefinierten Stil oder schreibe eigenes CSS |
| **🖼️ Bilder** | Bildmanager: Bilder hochladen, Base64-Tags kopieren, in HTML einfügen |
| **{{ }}** | Platzhalter einfügen (Seitenzahl, Kapitel, Datum etc.) |
| **🖨️ Drucken** | Seite direkt im Browser drucken |
| **💾 Speichern** | Seite in der Bibliothek speichern (`Cmd+S` / `Ctrl+S`) |
| **v+** | Neue Version erstellen (nach erstem Speichern sichtbar) |
| **➕** | Neue leere Seite beginnen |

### Metadaten beim Speichern

Beim ersten Speichern wirst du nach folgenden Informationen gefragt:

- **Titel** – Name der Seite (z.B. „Kapitel 3: Finanzierung")
- **Kategorie** – Typ der Seite (Deckblatt, Inhaltsseite, Workbookseite etc.)
- **Status** – Entwurf, Review oder Final
- **Tags** – Kommagetrennte Schlagwörter für die Suche (z.B. „finanzen, workshop, modul-3")

### Bilder einfügen

1. Klicke auf **🖼️ Bilder**
2. Lade ein Bild hoch (Drag & Drop oder Datei wählen)
3. Klicke auf **📋 Tag kopieren** – ein `<img>`-Tag mit Base64-Daten wird in die Zwischenablage kopiert
4. Füge den Tag im HTML-Code ein

> Bilder werden als Base64 direkt im HTML gespeichert. Keine externen Dateien nötig.

### Platzhalter

Platzhalter sind dynamische Variablen, die erst beim PDF-Export aufgelöst werden:

| Platzhalter | Wird ersetzt durch |
|-------------|-------------------|
| `{{seitentitel}}` | Titel der aktuellen Seite |
| `{{seitenzahl}}` | Aktuelle Seitennummer |
| `{{gesamtseiten}}` | Gesamtzahl aller Seiten |
| `{{kapitel}}` | Name des aktuellen Kapitels |
| `{{kapitelnr}}` | Nummer des Kapitels (1, 2, 3…) |
| `{{collection}}` | Name der Collection |
| `{{autor}}` | Autorname (aus Collection) |
| `{{datum}}` | Heutiges Datum |

Im Editor werden Platzhalter als blaue Badges angezeigt. Im PDF werden sie durch die echten Werte ersetzt.

---

## Teil 4: Die Bibliothek

Die Bibliothek zeigt alle gespeicherten Seiten als Thumbnail-Vorschau.

### Ansichten

- **Rasteransicht** (Standard) – Karten mit Vorschau-Thumbnails
- **Listenansicht** – Kompakte Liste mit kleinen Vorschauen

Wechsel über die Icons rechts neben dem Größenregler.

### Größenregler

Der **Größe**-Slider (120–700px) steuert die Thumbnail-Größe. In der Listenansicht sind die Vorschauen 80% der Grid-Größe – bei Maximum gut lesbar.

### Filtern und Suchen

- **Suchfeld** – Durchsucht Titel, Tags und HTML-Inhalt
- **Kategorie-Filter** – Nur Seiten einer bestimmten Kategorie anzeigen
- **Status-Filter** – Nach Entwurf, Review oder Final filtern
- **Tag-Cloud** – Unter den Filtern erscheinen alle verwendeten Tags als klickbare Chips. Klick filtert, erneuter Klick hebt den Filter auf.

### Aktionen pro Seite

- **Klick auf Karte** → Seite im Editor öffnen
- **📋** → Seite duplizieren
- **🗑️** → Seite löschen (mit Bestätigung)

---

## Teil 5: Collections

Collections bündeln einzelne Seiten zu einem Gesamtdokument – ideal für Bücher, Handbücher, Workbooks oder Kursunterlagen.

### Collection erstellen

1. Wechsle zum Tab **Collectionen**
2. Klicke **➕ Neue Collection**
3. Gib einen Namen ein (z.B. „Workshop-Handbuch 2025")
4. Ein leeres erstes Kapitel wird automatisch angelegt

### Struktur: Kapitel und Einzelseiten

Eine Collection besteht aus einer geordneten Liste von **Elementen**. Es gibt zwei Typen:

- **📖 Kapitel** – Enthalten mehrere Seiten (z.B. „Kapitel 1: Grundlagen" mit 5 Seiten)
- **📄 Einzelseiten** – Stehen für sich allein (z.B. Titelseite, Inhaltsverzeichnis, Glossar)

In der **Seitenleiste** links siehst du die Struktur:

```
📄 Titelseite                    ← Einzelseite
📄 Inhaltsverzeichnis            ← Einzelseite
📖 Kapitel 1: Grundlagen (5)     ← Kapitel mit 5 Seiten
📖 Kapitel 2: Praxis (3)         ← Kapitel mit 3 Seiten
📄 Glossar                       ← Einzelseite
```

### Elemente hinzufügen

- **📖 Neues Kapitel** – Fügt ein leeres Kapitel hinzu
- **📄 Einzelseite einfügen** – Öffnet den Seiten-Picker, um eine Seite aus der Bibliothek als Standalone-Seite einzufügen

### Seiten zu einem Kapitel hinzufügen

1. Wähle ein Kapitel in der Seitenleiste
2. Klicke **Seiten hinzufügen**
3. Im Picker: Seiten auswählen (Mehrfachauswahl möglich)
4. **Hinzufügen** klicken

### Reihenfolge ändern (Drag & Drop)

**Seitenleiste:** Ziehe Kapitel und Einzelseiten per Drag & Drop an die gewünschte Position. Der Drag-Handle (⠿) erscheint beim Hovern.

**Hauptbereich:** Innerhalb eines Kapitels kannst du die Seitenreihenfolge ebenfalls per Drag & Drop ändern.

### Seitennummerierung

Die Seitennummern laufen durchgängig über alle Elemente. Wenn du die Reihenfolge änderst, aktualisieren sich die Nummern automatisch.

### Master-CSS

Klicke auf **🎨 Master CSS** um ein globales Stylesheet für die gesamte Collection zu definieren. Dieses CSS wird beim PDF-Export jeder Seite hinzugefügt.

### PDF-Export

1. Klicke **🖨️ PDF / Druck**
2. Ein neues Fenster öffnet sich mit allen Seiten der Collection
3. Platzhalter (Seitenzahl, Kapitel etc.) werden automatisch aufgelöst
4. Nutze `Cmd+P` / `Ctrl+P` zum Drucken oder als PDF speichern

> **Tipp:** Stelle im Druckdialog „Ränder: Keine" und „Hintergrundgrafiken: An" ein für beste Ergebnisse.

---

## Teil 6: Templates

### CSS-Stile

Vordefinierte Stylesheets, die du auf jede Seite anwenden kannst:

- **Workshop Style** – Professionell mit blauen Akzenten
- **Minimal Clean** – Minimalistisch modern

Du kannst eigene CSS-Stile erstellen: **➕ Neuer CSS-Stil** → Name, Beschreibung und CSS-Code eingeben. Änderungen werden live in der Vorschau angezeigt.

### Seitenvorlagen

Fertige HTML-Seitenvorlagen mit Platzhaltern:

- **Deckblatt** – Titelseite mit Titel, Untertitel, Autor und Datum
- **Inhaltsverzeichnis** – Automatisch formatiertes Inhaltsverzeichnis
- **Workbookseite** – Arbeitsblatt mit Aufgabenfeldern
- **Kapiteltrennseite** – Visueller Trenner zwischen Kapiteln

Du kannst eigene Vorlagen erstellen oder die aktuelle Seite im Editor als Vorlage speichern (**📋 Als Vorlage speichern**).

---

## Teil 7: Datensicherung

### Wo werden Daten gespeichert?

PageForge speichert alles im **Browser** (IndexedDB). Daten bleiben erhalten, solange du den Browsercache nicht löschst. Zusätzlich gibt es mehrere Backup-Mechanismen:

### Auto-Backup (localStorage)

Ein automatisches Backup wird regelmäßig im localStorage erstellt. Der Status wird oben rechts angezeigt (z.B. „Auto-Backup vor 5min"). Falls IndexedDB beschädigt wird, kann PageForge daraus wiederherstellen.

### Manuelles Backup (JSON)

⚙️ → **📤 Backup herunterladen** speichert alle Daten als `.json`-Datei auf deinen Computer.

⚙️ → **📥 Backup importieren** stellt Daten aus einer `.json`-Datei wieder her.

> **Empfehlung:** Regelmäßig ein manuelles Backup machen, besonders vor Browser-Updates.

### Datendatei verknüpfen (File System Access API)

⚙️ → **📁 Datendatei verknüpfen** verknüpft eine lokale `.json`-Datei mit PageForge. Änderungen werden automatisch in diese Datei geschrieben. Ideal für Synchronisation über Cloud-Dienste (iCloud, Dropbox, Google Drive).

> Diese Funktion nutzt die File System Access API und ist nur in Chromium-Browsern (Chrome, Edge) verfügbar.

### Aus Datei laden

⚙️ → **📂 Aus Datei laden** lädt einmalig den Stand einer `.json`-Datei, ohne sie dauerhaft zu verknüpfen.

---

## Teil 8: Kategorien verwalten

⚙️ → **🏷️ Kategorien verwalten** öffnet den Kategorien-Manager. Standardkategorien:

Deckblatt, Inhaltsverzeichnis, Kapiteltrenner, Workbookseite, Inhaltsseite, Glossar, Urhebernote, Notizseite, Anhang

Du kannst eigene Kategorien hinzufügen (Name + Icon) oder bestehende umbenennen.

---

## Teil 9: Test-Workflow – Ein Workshop-Handbuch erstellen

Folge dieser Anleitung um alle Funktionen kennenzulernen.

### Schritt 1: Server starten

```bash
cd pageforge
source venv/bin/activate    # oder venv\Scripts\activate unter Windows
python3 server.py
```

### Schritt 2: Titelseite erstellen

1. Gehe zum **Editor**-Tab
2. Klicke **📋 Aus Vorlage**
3. Wähle **Deckblatt**
4. Im HTML-Code: Ändere den Titel zu „Workshop: Immobilieninvestment"
5. Ändere den Untertitel zu „Grundlagen, Strategien & Praxistipps"
6. Klicke **💾 Speichern**
7. Titel: „Titelseite", Kategorie: „Deckblatt", Status: „Final", Tags: „workshop, immo"

### Schritt 3: Inhaltsseite erstellen

1. Klicke **➕** (Neue Seite)
2. Klicke **{ } HTML Code einfügen**
3. Füge diesen HTML-Code ein:

```html
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: 'Segoe UI', sans-serif; padding: 25mm; color: #2d3748; }
  h1 { color: #1a365d; border-bottom: 3px solid #3182ce; padding-bottom: 8px; }
  h2 { color: #2b6cb0; margin-top: 24px; }
  .highlight { background: #ebf8ff; border-left: 4px solid #3182ce; padding: 12px 16px; margin: 16px 0; }
  .footer { position: fixed; bottom: 15mm; left: 25mm; right: 25mm; text-align: center; font-size: 9pt; color: #999; }
</style></head><body>
  <h1>1. Grundlagen der Immobilienbewertung</h1>
  <p>Die Bewertung von Immobilien bildet die Basis für jede Investmententscheidung.</p>
  <h2>Ertragswertverfahren</h2>
  <p>Beim Ertragswertverfahren wird der Wert einer Immobilie aus den nachhaltig erzielbaren Erträgen abgeleitet.</p>
  <div class="highlight">
    <strong>Merke:</strong> Der Ertragswert berücksichtigt Mieteinnahmen, Bewirtschaftungskosten und den Liegenschaftszins.
  </div>
  <h2>Vergleichswertverfahren</h2>
  <p>Hier werden vergleichbare Objekte herangezogen, um den Marktwert zu ermitteln.</p>
  <div class="footer">{{collection}} · Seite {{seitenzahl}} von {{gesamtseiten}}</div>
</body></html>
```

4. Klicke **✓ Anwenden** im Code-Editor
5. Beachte: Die Platzhalter `{{collection}}`, `{{seitenzahl}}` und `{{gesamtseiten}}` werden als blaue Badges angezeigt
6. Klicke **💾 Speichern**
7. Titel: „Grundlagen Bewertung", Kategorie: „Inhaltsseite", Status: „Entwurf", Tags: „workshop, immo, grundlagen"

### Schritt 4: Weitere Seite duplizieren und bearbeiten

1. Wechsle zur **Bibliothek**
2. Klicke auf **📋** bei „Grundlagen Bewertung" → Duplikat wird erstellt
3. Klicke auf das Duplikat → Öffnet im Editor
4. Ändere die Überschrift zu „2. Finanzierungsstrategien"
5. Passe den Inhalt an und speichere mit neuem Titel

### Schritt 5: Collection anlegen

1. Wechsle zum Tab **Collectionen**
2. Klicke **➕ Neue Collection**
3. Name: „Workshop-Handbuch 2025"

### Schritt 6: Titelseite als Einzelseite einfügen

1. Klicke **📄 Einzelseite einfügen**
2. Wähle „Titelseite" aus dem Picker
3. Die Titelseite erscheint in der Seitenleiste als eigenständiges Element

### Schritt 7: Kapitel befüllen

1. Klicke auf **📖 Kapitel 1** in der Seitenleiste
2. Benenne es um zu „Grundlagen" (Klick auf ✏️ Umbenennen)
3. Klicke **Seiten hinzufügen**
4. Wähle „Grundlagen Bewertung" und „Finanzierungsstrategien"
5. Klicke **Hinzufügen**

### Schritt 8: Reihenfolge anpassen

1. In der Seitenleiste: Ziehe die **Titelseite** ganz nach oben (falls nicht schon dort)
2. Im Hauptbereich: Ziehe die Seiten innerhalb des Kapitels in die gewünschte Reihenfolge

### Schritt 9: PDF exportieren

1. Klicke **🖨️ PDF / Druck**
2. Ein neues Fenster zeigt alle Seiten mit aufgelösten Platzhaltern
3. Die Titelseite ist Seite 1, die Kapitelseiten folgen mit korrekter Nummerierung
4. Drucke als PDF: `Cmd+P` → Ziel: „Als PDF speichern"

### Schritt 10: Backup erstellen

1. Klicke auf ⚙️ oben rechts
2. Wähle **📤 Backup herunterladen**
3. Speichere die `.json`-Datei an einem sicheren Ort

---

## Tastenkürzel

| Kürzel | Funktion |
|--------|----------|
| `Cmd+S` / `Ctrl+S` | Seite speichern |
| `Cmd+P` / `Ctrl+P` | Seite drucken |
| `Cmd+Shift+R` / `Ctrl+Shift+R` | Hard Refresh (nach Updates) |

---

## Tipps & Tricks

**HTML von Claude generieren lassen:**
Du kannst HTML-Seiten von einem KI-Assistenten generieren lassen. Gib ihm das gewünschte Layout als Beschreibung und füge das generierte HTML in PageForge ein. Sage ihm, dass die Seite für A4-Druck mit Maßen 210mm × 297mm optimiert sein soll.

**CSS-Stile wiederverwenden:**
Erstelle unter Templates → CSS-Stile einen einheitlichen Stil für dein Projekt. Im Editor kannst du dann per 🎨 CSS jederzeit zwischen Stilen wechseln, ohne den HTML-Code zu ändern.

**Master-CSS in Collections:**
Definiere globales CSS in der Collection (🎨 Master CSS). Dieses wird beim PDF-Export automatisch jeder Seite hinzugefügt – ideal für einheitliche Schriften, Farben und Abstände.

**Platzhalter für Seitennummern:**
Füge `{{seitenzahl}} / {{gesamtseiten}}` in die Fußzeile deiner Seiten ein. Beim PDF-Export werden die Nummern automatisch über alle Seiten der Collection durchnummeriert.

**Tags strategisch nutzen:**
Vergib Tags wie „modul-1", „übung", „theorie" – in der Bibliothek kannst du dann per Tag-Cloud schnell alle Seiten eines Moduls oder Typs filtern.

---

## Fehlerbehebung

**Seiten werden nicht angezeigt / Seite ist leer:**
Hard Refresh mit `Cmd+Shift+R` / `Ctrl+Shift+R`. Falls das nicht hilft: ⚙️ → Backup importieren.

**Browser-Cache gelöscht – Daten weg:**
Falls du ein manuelles Backup hast: ⚙️ → Backup importieren. Falls nicht: Das Auto-Backup im localStorage könnte noch vorhanden sein – PageForge prüft dies automatisch beim Start.

**Port 8420 belegt:**
Ein anderer Prozess nutzt den Port. Beende ihn mit:
```bash
# macOS / Linux:
lsof -ti:8420 | xargs kill -9
# Dann erneut:
python3 server.py
```

**Bilder werden im PDF nicht gedruckt:**
Aktiviere im Druckdialog die Option „Hintergrundgrafiken drucken".
