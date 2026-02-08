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

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => PageForge.init());
