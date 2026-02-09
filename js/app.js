/**
 * PageForge - Main App Controller v3
 * With data persistence management
 */
const PageForge = (() => {
  let activeTab = 'editor';

  async function init() {
    // Init DB (includes auto-recovery from localStorage if needed)
    const snippetsBefore = 0;
    await PageForgeDB.init();

    // Check if recovery happened
    const snippets = await PageForgeDB.getAll('snippets');
    const status = PageForgeDB.getBackupStatus();

    EditorModule.init();
    LibraryModule.init();
    CollectionsModule.init();
    CssTemplatesModule.init();
    setupTabs();
    setupToast();
    setupSettings();
    setupBackupStatus();
    setupChangelog();
    PageForgeEvents.on(PageForgeEvents.EVENTS.TAB_CHANGED, switchTab);
    await LibraryModule.refresh();
    await CollectionsModule.refresh();
    await CssTemplatesModule.refresh();

    // Show recovery message if data was restored
    if (snippets.length > 0 && status.lastBackup) {
      setTimeout(() => {
        PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, {
          message: `${snippets.length} Seiten geladen`,
          type: 'success', duration: 3000
        });
      }, 600);
    }

    document.getElementById('loading-screen').classList.add('loaded');
    setTimeout(() => document.getElementById('loading-screen')?.remove(), 500);
  }

  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
    if (tabId === 'library') LibraryModule.refresh();
    if (tabId === 'collections') CollectionsModule.refresh();
    if (tabId === 'css-templates') CssTemplatesModule.refresh();
  }

  function setupToast() {
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-box';
    document.body.appendChild(c);
    PageForgeEvents.on(PageForgeEvents.EVENTS.TOAST, ({ message, type = 'info', duration = 3000 }) => {
      const t = document.createElement('div');
      t.className = `toast t-${type}`;
      const icons = { success: '✓', warning: '⚠', error: '✕', info: 'ℹ' };
      t.innerHTML = `<span class="t-ico">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
      c.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, duration);
    });
  }

  // ── Backup Status Indicator ──

  function setupBackupStatus() {
    PageForgeEvents.on(PageForgeEvents.EVENTS.BACKUP_DONE, updateBackupBadge);
    // Initial state
    updateBackupBadge();
  }

  function updateBackupBadge() {
    const badge = document.getElementById('backup-badge');
    if (!badge) return;
    const status = PageForgeDB.getBackupStatus();

    if (status.hasFileLink) {
      badge.className = 'backup-badge bb-file';
      badge.innerHTML = `<span class="bb-dot"></span><span class="bb-text">📁 ${status.fileName}</span>`;
      badge.title = `Auto-Backup aktiv: ${status.fileName}\n${status.snippetCount} Seiten, ${status.collectionCount} Collectionen`;
    } else if (status.lastBackup) {
      const ago = timeSince(new Date(status.lastBackup));
      badge.className = 'backup-badge bb-local';
      badge.innerHTML = `<span class="bb-dot"></span><span class="bb-text">Auto-Backup ${ago}</span>`;
      badge.title = `Backup in Browser-Speicher\n${status.snippetCount} Seiten, ${status.collectionCount} Collectionen\nDaten überleben App-Updates`;
    } else {
      badge.className = 'backup-badge bb-none';
      badge.innerHTML = `<span class="bb-dot"></span><span class="bb-text">Kein Backup</span>`;
      badge.title = 'Noch kein Backup erstellt';
    }
  }

  function timeSince(date) {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 5) return 'gerade eben';
    if (secs < 60) return `vor ${secs}s`;
    if (secs < 3600) return `vor ${Math.floor(secs / 60)}min`;
    if (secs < 86400) return `vor ${Math.floor(secs / 3600)}h`;
    return `vor ${Math.floor(secs / 86400)}d`;
  }

  // ── Settings ──

  function setupSettings() {
    const btn = document.getElementById('btn-settings');
    const menu = document.getElementById('settings-menu');
    btn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('show'); });
    document.addEventListener('click', () => menu.classList.remove('show'));

    // Export JSON download
    document.getElementById('btn-export-data').addEventListener('click', async () => {
      menu.classList.remove('show');
      const data = await PageForgeDB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pageforge-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: 'Backup heruntergeladen', type: 'success' });
    });

    // Import JSON
    document.getElementById('btn-import-data').addEventListener('click', () => {
      menu.classList.remove('show');
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.json';
      inp.addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          const data = JSON.parse(await f.text());
          if (!data.snippets && !data.collections) {
            PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: 'Keine PageForge-Daten', type: 'error' });
            return;
          }
          if (!confirm(`Import: ${data.snippets?.length || 0} Seiten, ${data.collections?.length || 0} Collectionen?\n\nAchtung: Bestehende Daten werden ersetzt!`)) return;
          await PageForgeDB.importAll(data);
          await refreshAll();
          PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: 'Import erfolgreich', type: 'success' });
        } catch (err) {
          PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: 'Fehler: ' + err.message, type: 'error' });
        }
      });
      inp.click();
    });

    // Link data file (File System Access API)
    const linkBtn = document.getElementById('btn-link-file');
    if (linkBtn) {
      linkBtn.addEventListener('click', async () => {
        menu.classList.remove('show');
        const result = await PageForgeDB.linkDataFile();
        if (!result.supported) {
          PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, {
            message: 'File System API nicht verfügbar (nur Chrome/Edge)',
            type: 'warning'
          });
          return;
        }
        if (result.linked) {
          PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, {
            message: `Verknüpft: ${result.name}`,
            type: 'success'
          });
          updateBackupBadge();
        }
      });
    }

    // Load from file
    const loadBtn = document.getElementById('btn-load-file');
    if (loadBtn) {
      loadBtn.addEventListener('click', async () => {
        menu.classList.remove('show');
        const result = await PageForgeDB.loadFromFile();
        if (!result.supported) {
          PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, {
            message: 'File System API nicht verfügbar (nur Chrome/Edge)',
            type: 'warning'
          });
          return;
        }
        if (result.loaded) {
          await refreshAll();
          PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, {
            message: `Geladen: ${result.name}`,
            type: 'success'
          });
          updateBackupBadge();
        } else if (result.error) {
          PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: result.error, type: 'error' });
        }
      });
    }

    // Manage categories
    document.getElementById('btn-manage-categories').addEventListener('click', async () => {
      menu.classList.remove('show');
      const cats = await PageForgeDB.getAll('categories');
      const list = cats.map(c => `${c.icon} ${c.name}`).join('\n');
      const input = prompt(`Kategorien:\n${list}\n\nNeue hinzufügen (Format: icon name):\nz.B.: 📊 Diagrammseite`);
      if (!input) return;
      const m = input.match(/^(\S+)\s+(.+)$/);
      if (!m) { PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: 'Format: icon name', type: 'warning' }); return; }
      const [, icon, name] = m;
      const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await PageForgeDB.put('categories', { id, name, icon, isDefault: false });
      PageForgeEvents.emit(PageForgeEvents.EVENTS.CATEGORY_ADDED, { id, name, icon });
      PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: `"${name}" hinzugefügt`, type: 'success' });
    });
  }

  async function refreshAll() {
    await LibraryModule.refresh();
    await CollectionsModule.refresh();
    await CssTemplatesModule.refresh();
  }

  function setupChangelog() {
    const btn = document.getElementById('btn-changelog');
    const modal = document.getElementById('modal-changelog');
    const close = document.getElementById('changelog-close');
    if (!btn || !modal) return;

    const versions = [
      { v: '7.4', date: '09.02.2026', items: [
        'Zwei-Dropdown-System: Collection wählen → Kapitel erscheint dynamisch',
        'Kapitel-Dropdown zeigt Namen + Seitenzahl, Default: „Einzelseite"',
        'Auto-Erkennung: Beim Laden wird Collection UND Kapitel vorausgewählt',
      ]},
      { v: '7.3', date: '09.02.2026', items: [
        'App-Versionshistorie: Klick auf Versionsnummer öffnet kompletten Changelog',
        'Collection-Dropdown im Editor vereinfacht (nur Collection, keine Kapitel)',
        'Fix: Mehrere Collection-Badges werden jetzt korrekt angezeigt',
        'Version wird automatisch in Header und Changelog synchronisiert',
      ]},
      { v: '7.2', date: '09.02.2026', items: [
        'Versionshistorie bei v+ mit Beschreibung – Prompt „Was wurde geändert?"',
        'Collection-Zugehörigkeit als 📑 Badges in der Bibliothek (Grid + List)',
        'Header-Version automatisch aktualisiert',
      ]},
      { v: '7.1', date: '09.02.2026', items: [
        'Collection-Zuordnung beim Speichern im Editor',
        'Versionshistorie-Panel (📜) mit Mini-Previews und Restore',
        'Bibliothek-Sortierung: Datum, Titel A-Z/Z-A, Kategorie',
        'Bulk-Aktionen: Mehrfachauswahl mit Checkboxen, Status ändern, löschen, zu Collection',
      ]},
      { v: '6.7', date: '09.02.2026', items: [
        'Collection-Zoom erhöht (Slider bis 350px)',
      ]},
      { v: '6.6', date: '09.02.2026', items: [
        'Grid-Slider gedeckelt auf 120–350px (sinnvoller Bereich)',
        'Overlay-Design entfernt (in Ruhe überdenken)',
      ]},
      { v: '6.5', date: '09.02.2026', items: [
        'Grid-Karten: Text skaliert proportional mit Thumbnail-Größe',
        'List-View: Slider löst vollen Re-Render aus (Zoom-Fix für Scrollbereich)',
      ]},
      { v: '6.4', date: '09.02.2026', items: [
        'Fix: Sidebar z-index – Collections ➕ Button war nicht klickbar (empty-state Overlay)',
      ]},
      { v: '6.3', date: '09.02.2026', items: [
        'Grid-Karten skalieren Text proportional (--card-s CSS Variable)',
        'autoSave synchronisiert allCollections Array',
        'createCollection mit Error-Handling',
      ]},
      { v: '6.2', date: '09.02.2026', items: [
        'Fix: Collections Auto-Save – 9 Mutation-Punkte gesichert',
        'Seiten hinzufügen, Kapitel erstellen, Drag & Drop, Löschen, Master CSS',
      ]},
      { v: '6.1', date: '09.02.2026', items: [
        'Grid-Overflow Fix – Thumbnails laufen nicht mehr aus Karten',
        'CSS Zoom für Mini-Previews statt transform:scale',
        'Collections-Refactor: Kapitel + Einzelseiten Modell',
      ]},
      { v: '6.0', date: '09.02.2026', items: [
        'Collections-Modul: Sidebar mit Kapitelstruktur',
        'Drag & Drop für Kapitel und Seiten',
        'Master CSS für Collections',
        'PDF-Export für Collections',
      ]},
      { v: '5.0', date: '08.02.2026', items: [
        'Komplett-Redesign: Dark Theme, modulare Architektur',
        'Editor mit Live-Preview, Zoom-Stufen, Code-Drawer',
        'Bibliothek mit Grid/List-View, Tag Cloud, Zoom-Slider',
        'CSS-Swap-System mit Template-Verwaltung',
        'Bilder-Manager mit Base64-Embedding',
        'Platzhalter-System (Datum, Autor, Seitennr.)',
        'Auto-Backup in localStorage, File System Access API',
      ]},
      { v: '4.0', date: '08.02.2026', items: [
        'Kategorien- und Tag-System',
        'Seiten-Templates (Page Templates)',
        'Versionierung mit v+ Button',
      ]},
      { v: '3.0', date: '08.02.2026', items: [
        'IndexedDB als Datenbank (7 Stores)',
        'CSS-Templates Store',
        'Bilder-Store mit Base64',
      ]},
      { v: '2.0', date: '08.02.2026', items: [
        'Multi-Page Bibliothek',
        'Suchfunktion und Filter',
        'Status-System (Entwurf/Review/Final)',
      ]},
      { v: '1.0', date: '08.02.2026', items: [
        'Erster Prototyp: Single-Page HTML Editor',
        'A4-Vorschau mit Live-Preview',
        'Druck-Funktion',
      ]},
    ];

    function renderChangelog() {
      document.getElementById('changelog-body').innerHTML = versions.map(ver =>
        `<div class="cl-version">
          <div class="cl-header"><span class="cl-badge">v${ver.v}</span><span class="cl-date">${ver.date}</span></div>
          <ul class="cl-list">${ver.items.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>`
      ).join('');
    }

    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => { renderChangelog(); modal.style.display = 'flex'; });
    close.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => PageForge.init());
