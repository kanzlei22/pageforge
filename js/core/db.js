/**
 * PageForge Database Layer v4
 * Stores: snippets, collections, cssTemplates, pageTemplates, images, categories, tags
 */
const PageForgeDB = (() => {
  const DB_NAME = 'PageForgeDB';
  const DB_VERSION = 3;
  const LS_BACKUP_KEY = 'pageforge_autobackup';
  const LS_META_KEY = 'pageforge_meta';
  let db = null;
  let fileHandle = null;
  let backupTimer = null;
  let lastBackupTime = null;

  const ALL_STORES = ['snippets','collections','cssTemplates','pageTemplates','images','categories','tags'];

  const DEFAULT_CATEGORIES = [
    { id: 'cover', name: 'Deckblatt', icon: '📄', isDefault: true },
    { id: 'toc', name: 'Inhaltsverzeichnis', icon: '📑', isDefault: true },
    { id: 'chapter-divider', name: 'Kapiteltrenner', icon: '📌', isDefault: true },
    { id: 'workbook', name: 'Workbookseite', icon: '📝', isDefault: true },
    { id: 'content', name: 'Inhaltsseite', icon: '📖', isDefault: true },
    { id: 'glossary', name: 'Glossar', icon: '📚', isDefault: true },
    { id: 'copyright', name: 'Urhebernote', icon: '©️', isDefault: true },
    { id: 'notes', name: 'Notizseite', icon: '🗒️', isDefault: true },
    { id: 'appendix', name: 'Anhang', icon: '📎', isDefault: true },
  ];

  const DEFAULT_CSS_TEMPLATES = [
    { id: 'workshop-style', name: 'Workshop Style', description: 'Professionell für Workshops',
      css: `body { font-family: 'Segoe UI', system-ui, sans-serif; color: #2d3748; line-height: 1.6; padding: 25mm; }
h1 { color: #1a365d; font-size: 28pt; border-bottom: 3px solid #3182ce; padding-bottom: 8px; }
h2 { color: #2b6cb0; font-size: 20pt; } h3 { color: #2c5282; font-size: 16pt; }
.highlight { background: #ebf8ff; border-left: 4px solid #3182ce; padding: 12px 16px; margin: 16px 0; }
table { width: 100%; border-collapse: collapse; } th { background: #2b6cb0; color: white; padding: 10px; }
td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; } tr:nth-child(even) { background: #f7fafc; }` },
    { id: 'minimal-style', name: 'Minimal Clean', description: 'Minimalistisch modern',
      css: `body { font-family: 'Helvetica Neue', sans-serif; color: #333; line-height: 1.8; padding: 25mm; }
h1 { font-size: 26pt; font-weight: 700; color: #111; } h2 { font-size: 18pt; color: #222; }
h3 { font-size: 14pt; color: #444; text-transform: uppercase; letter-spacing: 1px; }
.highlight { background: #f5f5f5; padding: 16px; margin: 16px 0; border-radius: 4px; }` },
  ];

  const DEFAULT_PAGE_TEMPLATES = [
    { id: 'tpl-cover', name: 'Deckblatt', description: 'Titelseite mit Platzhaltern', category: 'cover',
      htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body { margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
.cover { width: 210mm; height: 297mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%); color: white; }
.cover h1 { font-size: 42pt; font-weight: 300; margin: 0 40mm; line-height: 1.2; }
.cover .subtitle { font-size: 18pt; opacity: .7; margin-top: 20px; }
.cover .meta { position: absolute; bottom: 60px; font-size: 12pt; opacity: .5; }
</style></head><body>
<div class="cover">
  <h1>{{collection}}</h1>
  <div class="subtitle">{{kapitel}}</div>
  <div class="meta">{{datum}} · {{autor}}</div>
</div>
</body></html>` },
    { id: 'tpl-chapter', name: 'Kapitelseite', description: 'Kapitel-Trennseite', category: 'chapter-divider',
      htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
.ch-page { width: 210mm; height: 297mm; display: flex; align-items: center; padding: 0 30mm; background: #f8f9fa; }
.ch-inner { border-left: 6px solid #3182ce; padding-left: 30px; }
.ch-nr { font-size: 14pt; color: #3182ce; text-transform: uppercase; letter-spacing: 3px; font-weight: 600; }
.ch-title { font-size: 36pt; color: #1a365d; font-weight: 300; margin: 8px 0 0; }
</style></head><body>
<div class="ch-page"><div class="ch-inner">
  <div class="ch-nr">Kapitel {{kapitelnr}}</div>
  <h1 class="ch-title">{{kapitel}}</h1>
</div></div>
</body></html>` },
    { id: 'tpl-content', name: 'Inhaltsseite', description: 'Standard-Textseite mit Header/Footer', category: 'content',
      htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body { font-family: 'Segoe UI', system-ui, sans-serif; color: #2d3748; line-height: 1.7; margin: 0; padding: 25mm 25mm 20mm; min-height: 297mm; width: 210mm; box-sizing: border-box; position: relative; }
.page-header { position: absolute; top: 10mm; left: 25mm; right: 25mm; display: flex; justify-content: space-between; font-size: 9pt; color: #a0aec0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
.page-footer { position: absolute; bottom: 10mm; left: 25mm; right: 25mm; display: flex; justify-content: space-between; font-size: 9pt; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 4px; }
h1 { color: #1a365d; font-size: 22pt; border-bottom: 2px solid #3182ce; padding-bottom: 6px; }
h2 { color: #2b6cb0; font-size: 16pt; margin-top: 24px; }
.highlight { background: #ebf8ff; border-left: 4px solid #3182ce; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0; }
</style></head><body>
<div class="page-header"><span>{{collection}} – {{kapitel}}</span><span>Seite {{seitenzahl}}</span></div>
<h1>Seitentitel</h1>
<p>Inhalt hier einfügen…</p>
<div class="highlight"><strong>Tipp:</strong> Nutze Platzhalter wie <code>{{collection}}</code>, <code>{{kapitel}}</code>, <code>{{seitenzahl}}</code> für automatische Werte.</div>
<div class="page-footer"><span>{{autor}}</span><span>{{datum}}</span></div>
</body></html>` },
    { id: 'tpl-exercise', name: 'Übungsseite', description: 'Seite mit Übungen und Checkboxen', category: 'workbook',
      htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body { font-family: 'Segoe UI', system-ui, sans-serif; color: #2d3748; line-height: 1.6; margin: 0; padding: 25mm; min-height: 297mm; width: 210mm; box-sizing: border-box; }
h1 { color: #1a365d; font-size: 20pt; }
h2 { color: #2b6cb0; font-size: 14pt; margin-top: 20px; }
.exercise { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 12px 0; }
.exercise h3 { margin: 0 0 8px; font-size: 12pt; color: #2c5282; }
.check-item { display: flex; align-items: flex-start; gap: 8px; margin: 6px 0; }
.check-box { width: 16px; height: 16px; border: 2px solid #a0aec0; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
.lines { border-bottom: 1px solid #e2e8f0; height: 28px; margin: 4px 0; }
.page-footer { position: fixed; bottom: 10mm; left: 25mm; right: 25mm; font-size: 9pt; color: #a0aec0; text-align: center; }
</style></head><body>
<h1>{{kapitel}} – Übungen</h1>
<div class="exercise">
  <h3>Übung 1: Reflexion</h3>
  <p>Notiere deine Gedanken zu folgenden Fragen:</p>
  <div class="lines"></div><div class="lines"></div><div class="lines"></div>
</div>
<div class="exercise">
  <h3>Übung 2: Checkliste</h3>
  <div class="check-item"><div class="check-box"></div><span>Punkt 1</span></div>
  <div class="check-item"><div class="check-box"></div><span>Punkt 2</span></div>
  <div class="check-item"><div class="check-box"></div><span>Punkt 3</span></div>
</div>
<div class="page-footer">Seite {{seitenzahl}} · {{collection}}</div>
</body></html>` },
    { id: 'tpl-notes', name: 'Notizseite', description: 'Linierte Notizseite', category: 'notes',
      htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20mm 25mm; min-height: 297mm; width: 210mm; box-sizing: border-box; }
h2 { font-size: 14pt; color: #4a5568; margin: 0 0 16px; }
.note-line { border-bottom: 1px solid #e2e8f0; height: 32px; }
.note-line:nth-child(odd) { background: #f8f9fa; }
.footer { position: fixed; bottom: 10mm; left: 25mm; right: 25mm; font-size: 9pt; color: #cbd5e0; display: flex; justify-content: space-between; }
</style></head><body>
<h2>📝 Notizen – {{kapitel}}</h2>
<div class="note-line"></div><div class="note-line"></div><div class="note-line"></div>
<div class="note-line"></div><div class="note-line"></div><div class="note-line"></div>
<div class="note-line"></div><div class="note-line"></div><div class="note-line"></div>
<div class="note-line"></div><div class="note-line"></div><div class="note-line"></div>
<div class="note-line"></div><div class="note-line"></div><div class="note-line"></div>
<div class="note-line"></div><div class="note-line"></div><div class="note-line"></div>
<div class="footer"><span>{{collection}}</span><span>Seite {{seitenzahl}}</span></div>
</body></html>` },
  ];

  // ── IndexedDB ──

  async function open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('snippets')) {
          const s = db.createObjectStore('snippets', { keyPath: 'id' });
          s.createIndex('title', 'title'); s.createIndex('category', 'category');
          s.createIndex('status', 'status'); s.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('collections')) {
          const c = db.createObjectStore('collections', { keyPath: 'id' });
          c.createIndex('name', 'name');
        }
        if (!db.objectStoreNames.contains('cssTemplates')) db.createObjectStore('cssTemplates', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('tags')) db.createObjectStore('tags', { keyPath: 'id' });
        // v3 stores
        if (!db.objectStoreNames.contains('pageTemplates')) db.createObjectStore('pageTemplates', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' });
      };
      request.onsuccess = (e) => { db = e.target.result; resolve(db); };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async function init() {
    await open();
    const snippets = await getAll('snippets');
    const collections = await getAll('collections');
    if (snippets.length === 0 && collections.length === 0) {
      const recovered = await recoverFromBackup();
      if (!recovered) await seedDefaults();
    } else {
      await seedDefaults();
    }
    try {
      const meta = JSON.parse(localStorage.getItem(LS_META_KEY) || '{}');
      lastBackupTime = meta.lastBackup || null;
    } catch (e) {}
  }

  async function seedDefaults() {
    const cats = await getAll('categories');
    if (!cats.length) for (const c of DEFAULT_CATEGORIES) await put('categories', c, true);
    const css = await getAll('cssTemplates');
    if (!css.length) for (const t of DEFAULT_CSS_TEMPLATES) await put('cssTemplates', t, true);
    const pt = await getAll('pageTemplates');
    if (!pt.length) for (const t of DEFAULT_PAGE_TEMPLATES) await put('pageTemplates', t, true);
  }

  // ── CRUD ──

  function tx(store, mode = 'readonly') { return db.transaction(store, mode).objectStore(store); }

  async function getAll(store) {
    return new Promise((res, rej) => { const r = tx(store).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  }
  async function get(store, id) {
    return new Promise((res, rej) => { const r = tx(store).get(id); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  }
  async function put(store, data, skipBackup = false) {
    return new Promise((res, rej) => {
      const r = tx(store, 'readwrite').put(data);
      r.onsuccess = () => { if (!skipBackup) scheduleBackup(); res(r.result); };
      r.onerror = () => rej(r.error);
    });
  }
  async function remove(store, id) {
    return new Promise((res, rej) => {
      const r = tx(store, 'readwrite').delete(id);
      r.onsuccess = () => { scheduleBackup(); res(); };
      r.onerror = () => rej(r.error);
    });
  }

  // ── Helpers ──

  async function saveSnippet(snippet) {
    const now = new Date().toISOString();
    if (!snippet.id) {
      snippet.id = 'snip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      snippet.createdAt = now; snippet.version = 1; snippet.versions = [];
    }
    snippet.updatedAt = now;
    await put('snippets', snippet);
    return snippet;
  }

  async function createNewVersion(snippetId, note) {
    const s = await get('snippets', snippetId);
    if (!s) return null;
    s.versions = s.versions || [];
    s.versions.push({ version: s.version, htmlContent: s.htmlContent, originalCss: s.originalCss, status: s.status, note: note || '', savedAt: new Date().toISOString() });
    s.version += 1; s.updatedAt = new Date().toISOString();
    await put('snippets', s);
    return s;
  }

  async function saveCollection(col) {
    const now = new Date().toISOString();
    if (!col.id) { col.id = 'col_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6); col.createdAt = now; }
    col.updatedAt = now;
    await put('collections', col);
    return col;
  }

  async function searchSnippets(query) {
    const all = await getAll('snippets');
    const q = (query || '').toLowerCase();
    return all.filter(s => !q || s.title?.toLowerCase().includes(q) || s.tags?.some(t => t.toLowerCase().includes(q)) || s.htmlContent?.toLowerCase().includes(q));
  }

  // ── Export / Import ──

  async function exportAll() {
    const data = {};
    for (const s of ALL_STORES) data[s] = await getAll(s);
    data.exportedAt = new Date().toISOString();
    data.version = DB_VERSION;
    return data;
  }

  async function importAll(data) {
    for (const store of ALL_STORES) {
      if (!data[store]) continue;
      const existing = await getAll(store);
      for (const item of existing) await remove(store, item.id);
      for (const item of data[store]) await put(store, item, true);
    }
    await doBackup();
  }

  // ── Auto-Backup ──

  function scheduleBackup() { clearTimeout(backupTimer); backupTimer = setTimeout(doBackup, 2000); }

  async function doBackup() {
    try {
      const data = await exportAll();
      const json = JSON.stringify(data);
      try {
        localStorage.setItem(LS_BACKUP_KEY, json);
        lastBackupTime = new Date().toISOString();
        localStorage.setItem(LS_META_KEY, JSON.stringify({ lastBackup: lastBackupTime, snippetCount: data.snippets?.length || 0, collectionCount: data.collections?.length || 0 }));
      } catch (e) {
        // Slim version without images/versions
        try {
          const slim = { ...data };
          slim.snippets = (data.snippets || []).map(s => ({ ...s, versions: [] }));
          slim.images = []; // images are too big for localStorage
          localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(slim));
          lastBackupTime = new Date().toISOString();
        } catch (e2) { console.warn('Backup failed:', e2); }
      }
      if (fileHandle) {
        try { const w = await fileHandle.createWritable(); await w.write(json); await w.close(); }
        catch (e) { fileHandle = null; }
      }
      PageForgeEvents.emit(PageForgeEvents.EVENTS.BACKUP_DONE, { time: lastBackupTime, hasFile: !!fileHandle });
    } catch (e) { console.error('Backup error:', e); }
  }

  async function recoverFromBackup() {
    try {
      const json = localStorage.getItem(LS_BACKUP_KEY);
      if (!json) return false;
      const data = JSON.parse(json);
      if (!data.snippets?.length && !data.collections?.length) return false;
      console.log(`[PageForge] Recovering: ${data.snippets?.length || 0} snippets`);
      for (const store of ALL_STORES) {
        if (!data[store]) continue;
        for (const item of data[store]) await put(store, item, true);
      }
      await seedDefaults();
      return true;
    } catch (e) { console.error('Recovery failed:', e); return false; }
  }

  // ── File System Access ──

  async function linkDataFile() {
    if (!('showSaveFilePicker' in window)) return { supported: false };
    try {
      fileHandle = await window.showSaveFilePicker({ suggestedName: 'pageforge-data.json', types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
      await doBackup();
      return { supported: true, linked: true, name: fileHandle.name };
    } catch (e) { return e.name === 'AbortError' ? { supported: true, linked: false } : { supported: true, linked: false, error: e.message }; }
  }

  async function loadFromFile() {
    if (!('showOpenFilePicker' in window)) return { supported: false };
    try {
      const [handle] = await window.showOpenFilePicker({ types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
      const file = await handle.getFile();
      const data = JSON.parse(await file.text());
      if (!data.snippets && !data.collections) return { supported: true, loaded: false, error: 'Keine PageForge-Daten' };
      await importAll(data);
      fileHandle = handle;
      return { supported: true, loaded: true, name: handle.name, data };
    } catch (e) { return e.name === 'AbortError' ? { supported: true, loaded: false } : { supported: true, loaded: false, error: e.message }; }
  }

  function getBackupStatus() {
    const meta = JSON.parse(localStorage.getItem(LS_META_KEY) || '{}');
    return { lastBackup: meta.lastBackup, snippetCount: meta.snippetCount || 0, collectionCount: meta.collectionCount || 0, hasFileLink: !!fileHandle, fileName: fileHandle?.name, fileSystemSupported: 'showSaveFilePicker' in window };
  }

  async function forceBackup() { await doBackup(); return getBackupStatus(); }

  return { init, getAll, get, put, remove, saveSnippet, createNewVersion, saveCollection, searchSnippets, exportAll, importAll, linkDataFile, loadFromFile, getBackupStatus, forceBackup, ALL_STORES };
})();
