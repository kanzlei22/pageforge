/**
 * PageForge Collections Module v5
 * - Items model: chapters + standalone pages in one ordered list
 * - Full sidebar drag & drop reordering
 * - Cross-chapter page moves via sidebar drop
 * - Master CSS per collection
 * - Placeholder resolution in previews & PDF
 */
const CollectionsModule = (() => {
  let allCollections = [];
  let active = null;
  let selectedIdx = 0;
  let dragData = null;
  let previewScale = 0.06;

  function $(id) { return document.getElementById(id); }

  function init() {
    buildUI();
    bindEvents();
    PageForgeEvents.on(PageForgeEvents.EVENTS.COLLECTION_SAVED, refresh);
    PageForgeEvents.on(PageForgeEvents.EVENTS.SNIPPET_DELETED, onSnippetDeleted);
  }

  function buildUI() {
    $('tab-collections').innerHTML = `
      <div class="col-layout">
        <div class="col-sidebar" id="col-sidebar">
          <div class="col-sb-header">
            <select id="col-select" class="col-select-dd"><option value="">Collection wählen…</option></select>
            <div class="col-sb-btns">
              <button id="btn-new-col" class="tb2 tb2-primary tb2-sm" title="Neue Collection">➕</button>
              <button id="btn-del-col" class="tb2 tb2-ghost tb2-sm" title="Löschen" style="display:none">🗑️</button>
            </div>
          </div>
          <div class="col-chapters" id="col-chapters"><div class="col-sb-empty">Collection wählen oder erstellen</div></div>
          <div class="col-sb-footer" id="col-sb-footer" style="display:none">
            <button id="btn-add-chapter" class="tb2 tb2-outline tb2-sm" style="width:100%">📖 Neues Kapitel</button>
            <button id="btn-add-standalone" class="tb2 tb2-ghost tb2-sm" style="width:100%;margin-top:4px">📄 Einzelseite einfügen</button>
          </div>
        </div>
        <div class="col-main" id="col-main">
          <div class="col-empty-state" id="col-empty">
            <div class="pe-icon">📚</div><h2>Collectionen</h2>
            <p>Wähle links eine Collection oder erstelle eine neue</p>
          </div>
          <div class="col-editor" id="col-editor" style="display:none">
            <div class="col-info-bar">
              <input type="text" id="col-name" class="col-name-inp" placeholder="Collection Name…" />
              <input type="text" id="col-author" class="col-desc-inp" placeholder="Autor…" style="flex:0 1 160px" />
              <input type="text" id="col-desc" class="col-desc-inp" placeholder="Beschreibung…" />
              <button id="btn-master-css" class="tb2 tb2-outline tb2-sm" title="Master CSS für alle Seiten">🎨 Master CSS</button>
              <button id="btn-save-col" class="tb2 tb2-primary tb2-sm">💾</button>
              <button id="btn-export-print" class="tb2 tb2-outline tb2-sm">🖨️ PDF</button>
            </div>
            <div class="col-chapter-header" id="col-chapter-header">
              <h3 id="col-chapter-title">—</h3>
              <span id="col-chapter-count" class="meta-dim"></span>
              <button id="btn-add-pages" class="tb2 tb2-outline tb2-sm">➕ Seiten</button>
              <button id="btn-rename-item" class="tb2 tb2-ghost tb2-sm" title="Umbenennen">✏️</button>
              <button id="btn-del-item" class="tb2 tb2-ghost tb2-sm" title="Entfernen">🗑️</button>
              <div class="col-size-ctrl"><span class="meta-dim">Größe</span>
                <input type="range" id="col-preview-size" min="30" max="120" value="48" class="size-slider" />
              </div>
            </div>
            <div class="col-pages" id="col-pages"></div>
          </div>
        </div>
      </div>

      <!-- Add Pages Modal -->
      <div class="modal-backdrop" id="modal-add-pages" style="display:none">
        <div class="modal-content modal-lg">
          <div class="modal-header"><h3>Seiten hinzufügen</h3><button class="modal-close" id="ap-close">✕</button></div>
          <div class="modal-body">
            <div class="ap-search-row">
              <input type="text" id="modal-page-search" class="search-inp" placeholder="Suchen…" />
              <span id="modal-sel-count" class="meta-dim">0 ausgewählt</span>
            </div>
            <div class="mp-grid" id="modal-pgrid"></div>
          </div>
          <div class="modal-footer"><button id="btn-confirm-add" class="tb2 tb2-primary">Hinzufügen</button></div>
        </div>
      </div>

      <!-- Master CSS Modal -->
      <div class="modal-backdrop" id="modal-master-css" style="display:none">
        <div class="modal-content modal-lg">
          <div class="modal-header"><h3>🎨 Master CSS</h3><button class="modal-close" id="mcss-close">✕</button></div>
          <div class="modal-body">
            <p class="modal-hint">Dieses CSS wird auf alle Seiten der Collection angewandt.</p>
            <textarea id="mcss-textarea" class="code-ta-v2" style="min-height:300px" spellcheck="false" placeholder="/* Master CSS hier eingeben */"></textarea>
          </div>
          <div class="modal-footer"><button id="mcss-apply" class="tb2 tb2-primary">Übernehmen</button></div>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    $('col-select').addEventListener('change', e => { e.target.value ? loadCollection(e.target.value) : clearEditor(); });
    $('btn-new-col').addEventListener('click', createCollection);
    $('btn-del-col').addEventListener('click', deleteCollection);
    $('btn-add-chapter').addEventListener('click', addChapter);
    $('btn-add-standalone').addEventListener('click', openAddStandalone);
    $('btn-save-col').addEventListener('click', saveCollection);
    $('btn-export-print').addEventListener('click', exportPdf);
    $('btn-add-pages').addEventListener('click', openAddPages);
    $('btn-rename-item').addEventListener('click', renameItem);
    $('btn-del-item').addEventListener('click', deleteItem);
    $('btn-master-css').addEventListener('click', () => { if (!active) return; $('mcss-textarea').value = active.masterCss || ''; $('modal-master-css').style.display = 'flex'; });
    $('mcss-close').addEventListener('click', () => $('modal-master-css').style.display = 'none');
    $('modal-master-css').addEventListener('click', e => { if (e.target.id === 'modal-master-css') e.target.style.display = 'none'; });
    $('mcss-apply').addEventListener('click', () => { if (!active) return; active.masterCss = $('mcss-textarea').value.trim(); $('modal-master-css').style.display = 'none'; renderPages(); toast('Master CSS aktualisiert', 'success'); });
    $('ap-close').addEventListener('click', closeAddPages);
    $('modal-add-pages').addEventListener('click', e => { if (e.target.id === 'modal-add-pages') closeAddPages(); });
    $('modal-page-search').addEventListener('input', e => renderModalPages(e.target.value));
    $('btn-confirm-add').addEventListener('click', confirmAddPages);
    $('col-preview-size').addEventListener('input', e => { previewScale = parseInt(e.target.value) / 794; updatePreviewSizes(); });
  }

  // ── Data ──

  async function refresh() {
    allCollections = await PageForgeDB.getAll('collections');
    allCollections.forEach(migrateToItems);
    updateDropdown();
    if (active) {
      const fresh = await PageForgeDB.get('collections', active.id);
      if (fresh) { active = fresh; migrateToItems(active); renderSidebar(); renderPages(); }
    }
  }

  function migrateToItems(col) {
    if (col.items) return;
    col.items = (col.chapters || []).map(ch => ({ type: 'chapter', name: ch.name, snippetIds: ch.snippetIds || [] }));
    delete col.chapters;
  }

  function countAllPages(col) {
    return (col.items || []).reduce((s, item) => s + (item.type === 'chapter' ? (item.snippetIds?.length || 0) : 1), 0);
  }

  function updateDropdown() {
    const sel = $('col-select'), val = sel.value;
    sel.innerHTML = '<option value="">Collection wählen…</option>';
    allCollections.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = `${c.name} (${countAllPages(c)} Seiten)`;
      sel.appendChild(o);
    });
    sel.value = val;
  }

  async function loadCollection(id) {
    active = await PageForgeDB.get('collections', id);
    if (!active) return;
    migrateToItems(active);
    if (!active.items.length) active.items = [{ type: 'chapter', name: 'Kapitel 1', snippetIds: [] }];
    selectedIdx = 0;
    $('col-empty').style.display = 'none';
    $('col-editor').style.display = '';
    $('btn-del-col').style.display = '';
    $('col-sb-footer').style.display = '';
    $('col-name').value = active.name || '';
    $('col-author').value = active.author || '';
    $('col-desc').value = active.description || '';
    $('col-select').value = id;
    renderSidebar(); renderPages();
  }

  function clearEditor() {
    active = null;
    $('col-empty').style.display = '';
    $('col-editor').style.display = 'none';
    $('btn-del-col').style.display = 'none';
    $('col-sb-footer').style.display = 'none';
    $('col-chapters').innerHTML = '<div class="col-sb-empty">Collection wählen oder erstellen</div>';
  }

  // ══════════════════════════════════════
  //  SIDEBAR
  // ══════════════════════════════════════

  async function renderSidebar() {
    const container = $('col-chapters');
    if (!active?.items?.length) { container.innerHTML = '<div class="col-sb-empty">Keine Elemente</div>'; return; }

    const titles = {};
    for (const item of active.items) {
      if (item.type === 'page' && item.snippetId) {
        const s = await PageForgeDB.get('snippets', item.snippetId);
        titles[item.snippetId] = s?.title || 'Unbenannt';
      }
    }

    container.innerHTML = active.items.map((item, i) => {
      const isSel = i === selectedIdx;
      if (item.type === 'chapter') {
        const count = item.snippetIds?.length || 0;
        return `<div class="ch-item ${isSel ? 'ch-active' : ''}" data-idx="${i}" draggable="true">
          <div class="ch-drag">⠿</div>
          <div class="ch-icon">📖</div>
          <div class="ch-info"><div class="ch-name">${esc(item.name)}</div>
            <div class="ch-count">${count} Seite${count !== 1 ? 'n' : ''}</div></div>
        </div>`;
      } else {
        return `<div class="ch-item ch-standalone ${isSel ? 'ch-active' : ''}" data-idx="${i}" draggable="true">
          <div class="ch-drag">⠿</div>
          <div class="ch-icon">📄</div>
          <div class="ch-info"><div class="ch-name">${esc(titles[item.snippetId] || 'Unbenannt')}</div>
            <div class="ch-count">Einzelseite</div></div>
        </div>`;
      }
    }).join('');

    const total = countAllPages(active);
    const chC = active.items.filter(i => i.type === 'chapter').length;
    const pgC = active.items.filter(i => i.type === 'page').length;
    const sum = document.createElement('div');
    sum.className = 'ch-summary';
    sum.textContent = `${total} Seiten · ${chC} Kap.${pgC ? ` · ${pgC} Einzels.` : ''}`;
    container.appendChild(sum);

    // Click
    container.querySelectorAll('.ch-item').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.ch-drag')) return;
        selectedIdx = parseInt(el.dataset.idx);
        renderSidebar(); renderPages();
      });
    });

    setupSidebarDragDrop(container);
  }

  function setupSidebarDragDrop(container) {
    let dragIdx = null;

    container.querySelectorAll('.ch-item').forEach(el => {
      el.addEventListener('dragstart', e => {
        dragIdx = parseInt(el.dataset.idx);
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'sidebar');
      });

      el.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // Cross-chapter page drop from main area
        if (dragData?.snippetId) { el.classList.add('ch-drop-target'); return; }
        if (dragIdx === null) return;

        const rect = el.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        el.classList.remove('ch-drop-above', 'ch-drop-below');
        el.classList.add(e.clientY < midY ? 'ch-drop-above' : 'ch-drop-below');
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('ch-drop-target', 'ch-drop-above', 'ch-drop-below');
      });

      el.addEventListener('drop', e => {
        e.preventDefault();
        el.classList.remove('ch-drop-target', 'ch-drop-above', 'ch-drop-below');
        const targetIdx = parseInt(el.dataset.idx);

        // Cross-chapter page drop
        if (dragData?.snippetId) {
          const targetItem = active.items[targetIdx];
          if (targetItem?.type === 'chapter') {
            const srcItem = active.items[dragData.sourceItemIdx];
            if (srcItem?.type === 'chapter') srcItem.snippetIds.splice(dragData.sourceIndex, 1);
            targetItem.snippetIds.push(dragData.snippetId);
            dragData = null;
            renderSidebar(); renderPages();
            toast('Seite verschoben', 'success');
          }
          return;
        }

        // Sidebar reorder
        if (dragIdx === null || dragIdx === targetIdx) return;
        const rect = el.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;
        const [moved] = active.items.splice(dragIdx, 1);
        let newIdx = targetIdx;
        if (dragIdx < targetIdx) newIdx--;
        if (!insertBefore) newIdx++;
        active.items.splice(newIdx, 0, moved);
        selectedIdx = newIdx;
        dragIdx = null;
        renderSidebar(); renderPages();
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        container.querySelectorAll('.ch-drop-above,.ch-drop-below,.ch-drop-target').forEach(
          x => x.classList.remove('ch-drop-above', 'ch-drop-below', 'ch-drop-target'));
        dragIdx = null;
      });
    });
  }

  // ══════════════════════════════════════
  //  PAGES (main area)
  // ══════════════════════════════════════

  async function renderPages() {
    const item = active?.items?.[selectedIdx];
    if (!item) return;

    const isChapter = item.type === 'chapter';
    const totalPages = countAllPages(active);

    if (isChapter) {
      $('col-chapter-title').textContent = item.name;
      $('col-chapter-count').textContent = `${item.snippetIds?.length || 0} Seiten`;
      $('btn-add-pages').style.display = '';
      $('btn-rename-item').title = 'Umbenennen';
    } else {
      const s = await PageForgeDB.get('snippets', item.snippetId);
      $('col-chapter-title').textContent = s?.title || 'Einzelseite';
      $('col-chapter-count').textContent = 'Einzelseite';
      $('btn-add-pages').style.display = 'none';
      $('btn-rename-item').title = 'Bearbeiten';
    }

    const pagesEl = $('col-pages');
    if (isChapter) await renderChapterPages(item, pagesEl, totalPages);
    else await renderStandalonePage(item, pagesEl, totalPages);
  }

  async function renderChapterPages(chapter, pagesEl, totalPages) {
    const ids = chapter.snippetIds || [];
    const snippets = [], categories = await PageForgeDB.getAll('categories');
    for (const id of ids) { const s = await PageForgeDB.get('snippets', id); if (s) snippets.push(s); }

    if (!snippets.length) {
      pagesEl.innerHTML = `<div class="col-pages-empty"><p>Noch keine Seiten</p>
        <button class="tb2 tb2-outline" onclick="document.getElementById('btn-add-pages').click()">➕ Seiten hinzufügen</button></div>`;
      return;
    }

    const offset = getGlobalOffset(selectedIdx);
    const tW = Math.round(previewScale * 794), tH = Math.round(previewScale * 1123);

    pagesEl.innerHTML = snippets.map((s, i) => {
      const cat = categories.find(c => c.id === s.category);
      const st = { draft: '⏳', review: '🔍', final: '✅' };
      return `<div class="cp-item" draggable="true" data-index="${i}" data-id="${s.id}">
        <div class="cp-drag">⠿</div>
        <div class="cp-num">${offset + i + 1}</div>
        <div class="cp-thumb" data-snippet-id="${s.id}" data-page-idx="${i}" style="width:${tW}px;height:${tH}px"><span>📄</span></div>
        <div class="cp-info"><div class="cp-title">${esc(s.title)}</div>
          <div class="cp-meta">${cat ? `${cat.icon} ${cat.name} ·` : ''} v${s.version || 1} ${st[s.status] || ''}</div></div>
        <div class="cp-acts">
          <button class="abtn" data-action="edit" data-id="${s.id}">✏️</button>
          <button class="abtn" data-action="remove" data-index="${i}">✕</button>
        </div>
      </div>`;
    }).join('');

    pagesEl.querySelectorAll('.cp-thumb[data-snippet-id]').forEach(container => {
      const idx = parseInt(container.dataset.pageIdx);
      const snippet = snippets.find(s => s.id === container.dataset.snippetId);
      if (!snippet?.htmlContent) return;
      const vars = buildVars(selectedIdx, idx, totalPages);
      vars.seitentitel = snippet.title || '';
      let html = PageForgePlaceholders.resolve(snippet.htmlContent, vars);
      if (active.masterCss) html = injectMasterCss(html, active.masterCss);
      injectMiniIframe(container, html, previewScale);
    });

    setupPageDragDrop(pagesEl); setupPageActions(pagesEl);
  }

  async function renderStandalonePage(item, pagesEl, totalPages) {
    const s = await PageForgeDB.get('snippets', item.snippetId);
    if (!s) { pagesEl.innerHTML = '<div class="col-pages-empty"><p>Seite nicht gefunden</p></div>'; return; }
    const offset = getGlobalOffset(selectedIdx);
    const tW = Math.round(previewScale * 794), tH = Math.round(previewScale * 1123);

    pagesEl.innerHTML = `<div class="cp-item" data-id="${s.id}">
      <div class="cp-num">${offset + 1}</div>
      <div class="cp-thumb" data-snippet-id="${s.id}" style="width:${tW}px;height:${tH}px"><span>📄</span></div>
      <div class="cp-info"><div class="cp-title">${esc(s.title)}</div>
        <div class="cp-meta">v${s.version || 1} · Einzelseite</div></div>
      <div class="cp-acts"><button class="abtn" data-action="edit" data-id="${s.id}">✏️</button></div>
    </div>`;

    const c = pagesEl.querySelector('.cp-thumb[data-snippet-id]');
    if (c && s.htmlContent) {
      const vars = buildVars(selectedIdx, 0, totalPages);
      vars.seitentitel = s.title || '';
      let html = PageForgePlaceholders.resolve(s.htmlContent, vars);
      if (active.masterCss) html = injectMasterCss(html, active.masterCss);
      injectMiniIframe(c, html, previewScale);
    }
    setupPageActions(pagesEl);
  }

  function getGlobalOffset(itemIdx) {
    let o = 0;
    for (let i = 0; i < itemIdx; i++) {
      const item = active.items[i];
      o += item.type === 'chapter' ? (item.snippetIds?.length || 0) : 1;
    }
    return o;
  }

  function getChapterNumber(itemIdx) {
    let n = 0;
    for (let i = 0; i <= itemIdx; i++) if (active.items[i]?.type === 'chapter') n++;
    return n;
  }

  function buildVars(itemIdx, pageIdx, totalPages) {
    const item = active.items[itemIdx];
    return {
      collection: active?.name || '',
      kapitel: item?.type === 'chapter' ? (item.name || '') : '',
      kapitelnr: String(getChapterNumber(itemIdx)),
      seitenzahl: String(getGlobalOffset(itemIdx) + pageIdx + 1),
      gesamtseiten: String(totalPages),
      autor: active?.author || '',
      datum: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    };
  }

  function setupPageDragDrop(el) {
    el.querySelectorAll('.cp-item[draggable]').forEach(item => {
      item.addEventListener('dragstart', e => {
        dragData = { snippetId: item.dataset.id, sourceItemIdx: selectedIdx, sourceIndex: parseInt(item.dataset.index) };
        item.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragover', e => { e.preventDefault(); item.classList.add('drag-over'); });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', e => {
        e.preventDefault(); item.classList.remove('drag-over');
        if (!dragData || dragData.sourceItemIdx !== selectedIdx) { dragData = null; return; }
        const tgt = parseInt(item.dataset.index);
        if (dragData.sourceIndex !== tgt) {
          const ch = active.items[selectedIdx];
          const [moved] = ch.snippetIds.splice(dragData.sourceIndex, 1);
          ch.snippetIds.splice(tgt, 0, moved);
          renderPages(); renderSidebar();
        }
        dragData = null;
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        el.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'));
        document.querySelectorAll('.ch-drop-target').forEach(x => x.classList.remove('ch-drop-target'));
        dragData = null;
      });
    });
  }

  function setupPageActions(el) {
    el.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const s = await PageForgeDB.get('snippets', btn.dataset.id);
        if (s) PageForgeEvents.emit(PageForgeEvents.EVENTS.SNIPPET_EDIT, s);
      });
    });
    el.querySelectorAll('[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ch = active.items[selectedIdx];
        if (ch?.type === 'chapter') { ch.snippetIds.splice(parseInt(btn.dataset.index), 1); renderPages(); renderSidebar(); }
      });
    });
  }

  function updatePreviewSizes() {
    const w = Math.round(previewScale * 794), h = Math.round(previewScale * 1123);
    document.querySelectorAll('#col-pages .cp-thumb').forEach(c => {
      c.style.width = w + 'px'; c.style.height = h + 'px';
      const f = c.querySelector('.cp-mini-frame');
      if (f) try { f.contentDocument.documentElement.style.zoom = previewScale; } catch (e) {}
    });
  }

  // ── CRUD ──

  async function createCollection() {
    const name = prompt('Name der neuen Collection:');
    if (!name) return;
    const col = await PageForgeDB.saveCollection({
      name, description: '', author: '', masterCss: '',
      items: [{ type: 'chapter', name: 'Kapitel 1', snippetIds: [] }]
    });
    allCollections.push(col); updateDropdown(); loadCollection(col.id);
    toast(`"${name}" erstellt`, 'success');
  }

  async function saveCollection() {
    if (!active) return;
    active.name = $('col-name').value.trim() || 'Unbenannt';
    active.author = $('col-author').value.trim();
    active.description = $('col-desc').value.trim();
    await PageForgeDB.saveCollection(active);
    updateDropdown(); renderSidebar();
    toast('Gespeichert', 'success');
  }

  async function deleteCollection() {
    if (!active || !confirm(`"${active.name}" löschen?`)) return;
    await PageForgeDB.remove('collections', active.id);
    clearEditor(); allCollections = allCollections.filter(c => c.id !== active.id); updateDropdown();
    toast('Gelöscht', 'info');
  }

  function addChapter() {
    if (!active) return;
    const name = prompt('Kapitelname:', `Kapitel ${active.items.filter(i => i.type === 'chapter').length + 1}`);
    if (!name) return;
    active.items.push({ type: 'chapter', name, snippetIds: [] });
    selectedIdx = active.items.length - 1;
    renderSidebar(); renderPages();
  }

  function renameItem() {
    const item = active?.items?.[selectedIdx];
    if (!item) return;
    if (item.type === 'chapter') {
      const name = prompt('Kapitelname:', item.name);
      if (!name) return;
      item.name = name; renderSidebar(); renderPages();
    } else {
      PageForgeDB.get('snippets', item.snippetId).then(s => {
        if (s) PageForgeEvents.emit(PageForgeEvents.EVENTS.SNIPPET_EDIT, s);
      });
    }
  }

  function deleteItem() {
    const item = active?.items?.[selectedIdx];
    if (!item) return;
    const label = item.type === 'chapter' ? `Kapitel "${item.name}"` : 'Einzelseite';
    if (!confirm(`${label} entfernen?`)) return;
    active.items.splice(selectedIdx, 1);
    selectedIdx = Math.min(selectedIdx, Math.max(0, active.items.length - 1));
    if (!active.items.length) active.items.push({ type: 'chapter', name: 'Kapitel 1', snippetIds: [] });
    renderSidebar(); renderPages();
  }

  // ── Add Pages Modal ──

  let selectedIds = new Set();
  let addMode = 'chapter';

  function openAddPages() { selectedIds.clear(); addMode = 'chapter'; showModal(); }
  function openAddStandalone() { if (!active) return; selectedIds.clear(); addMode = 'standalone'; showModal(); }
  function showModal() { $('modal-add-pages').style.display = 'flex'; $('modal-page-search').value = ''; renderModalPages(''); $('modal-sel-count').textContent = '0 ausgewählt'; }
  function closeAddPages() { $('modal-add-pages').style.display = 'none'; }

  async function renderModalPages(query) {
    const snippets = await PageForgeDB.searchSnippets(query);
    const existing = new Set();
    for (const item of (active?.items || [])) {
      if (item.type === 'chapter') (item.snippetIds || []).forEach(id => existing.add(id));
      else if (item.snippetId) existing.add(item.snippetId);
    }
    const cats = await PageForgeDB.getAll('categories');
    const grid = $('modal-pgrid');
    grid.innerHTML = snippets.map(s => {
      const cat = cats.find(c => c.id === s.category);
      const exists = existing.has(s.id);
      return `<div class="mp-card ${exists ? 'mp-exists' : ''} ${selectedIds.has(s.id) ? 'mp-sel' : ''}" data-id="${s.id}">
        <div class="mp-thumb" data-snippet-id="${s.id}">📄</div>
        <div class="mp-info"><div class="mp-title">${esc(s.title)}</div>
          <div class="mp-meta">${cat ? `${cat.icon} ${cat.name}` : ''}</div>
          ${exists ? '<div class="mp-badge">Bereits enthalten</div>' : ''}</div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.mp-thumb[data-snippet-id]').forEach(c => {
      const s = snippets.find(x => x.id === c.dataset.snippetId);
      if (s?.htmlContent) injectMiniIframe(c, s.htmlContent, 0.176);
    });

    grid.querySelectorAll('.mp-card:not(.mp-exists)').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
        card.classList.toggle('mp-sel');
        $('modal-sel-count').textContent = `${selectedIds.size} ausgewählt`;
      });
    });
  }

  function confirmAddPages() {
    if (!active || !selectedIds.size) return;
    if (addMode === 'standalone') {
      for (const id of selectedIds) active.items.push({ type: 'page', snippetId: id });
      selectedIdx = active.items.length - 1;
    } else {
      const item = active.items[selectedIdx];
      if (item?.type === 'chapter') item.snippetIds.push(...selectedIds);
    }
    closeAddPages(); renderPages(); renderSidebar();
    toast(`${selectedIds.size} Seiten hinzugefügt`, 'success');
  }

  // ── PDF Export ──

  async function exportPdf() {
    if (!active) return;
    const totalPages = countAllPages(active);
    if (!totalPages) { toast('Collection ist leer', 'warning'); return; }
    toast('PDF wird vorbereitet…', 'info');

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>@page{size:A4;margin:0}*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;width:210mm}
.pf-page{width:210mm;min-height:297mm;page-break-after:always;overflow:hidden;position:relative}
.pf-page:last-child{page-break-after:auto}
${active.masterCss ? `.pf-page{${active.masterCss}}` : ''}
</style></head><body>`;

    let gp = 0;
    for (let ii = 0; ii < active.items.length; ii++) {
      const item = active.items[ii];
      if (item.type === 'page') {
        const s = await PageForgeDB.get('snippets', item.snippetId);
        if (s) { const v = buildVars(ii, 0, totalPages); v.seitentitel = s.title || ''; html += buildPdfPage(s, v, gp); }
        gp++;
      } else {
        for (let si = 0; si < (item.snippetIds?.length || 0); si++) {
          const s = await PageForgeDB.get('snippets', item.snippetIds[si]);
          if (s) { const v = buildVars(ii, si, totalPages); v.seitentitel = s.title || ''; html += buildPdfPage(s, v, gp); }
          gp++;
        }
      }
    }

    html += '</body></html>';
    const w = window.open('', '_blank', 'width=800,height=1100');
    if (!w) { toast('Popup blockiert', 'error'); return; }
    w.document.write(html); w.document.close();
    w.onload = () => setTimeout(() => { w.focus(); w.print(); }, 500);
  }

  function buildPdfPage(snippet, vars, gp) {
    let raw = PageForgePlaceholders.resolve(snippet.htmlContent || '', vars);
    const sid = `pf-s${gp}`;
    const p = new DOMParser(), doc = p.parseFromString(raw, 'text/html');
    const css = Array.from(doc.querySelectorAll('style')).map(e => e.textContent).join('\n');
    const scoped = scopeCssViaCSSOM(css, `#${sid}`);
    const body = doc.body ? doc.body.innerHTML : raw;
    const bs = doc.body?.getAttribute('style') || '', bc = doc.body?.getAttribute('class') || '';
    return `<div class="pf-page ${bc}" id="${sid}" style="${esc(bs)}"><style>${scoped}</style>${body}</div>`;
  }

  function scopeCssViaCSSOM(cssText, scope) {
    if (!cssText.trim()) return '';
    const tmp = document.createElement('style'); tmp.textContent = cssText;
    document.head.appendChild(tmp); let r = '';
    try { if (tmp.sheet) for (const rule of tmp.sheet.cssRules) r += scopeRule(rule, scope) + '\n'; } catch (e) { r = cssText; }
    document.head.removeChild(tmp); return r;
  }

  function scopeRule(rule, scope) {
    if (rule instanceof CSSStyleRule) {
      const sel = rule.selectorText.split(',').map(s => {
        s = s.trim();
        if (/^(html|body|\*|:root)$/i.test(s)) return scope;
        if (/^(html|body)\s+/i.test(s)) return scope + ' ' + s.replace(/^(html|body)\s+/i, '');
        return scope + ' ' + s;
      }).join(', ');
      return `${sel} { ${rule.style.cssText} }`;
    }
    if (rule instanceof CSSMediaRule) { let inner = ''; for (const r of rule.cssRules) inner += scopeRule(r, scope) + '\n'; return `@media ${rule.conditionText} { ${inner} }`; }
    return rule.cssText;
  }

  function injectMasterCss(html, mc) {
    if (!mc) return html;
    const tag = `<style>/* Master */\n${mc}</style>`;
    if (html.includes('</head>')) return html.replace('</head>', tag + '</head>');
    if (html.includes('<body')) return html.replace('<body', tag + '<body');
    return tag + html;
  }

  function injectMiniIframe(container, html, scale) {
    let cleanHtml = (html || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    const zoomCss = `<style>html{zoom:${scale};overflow:hidden!important}body{overflow:hidden!important;width:794px;margin:0}</style>`;
    if (cleanHtml.includes('</head>')) cleanHtml = cleanHtml.replace('</head>', zoomCss + '</head>');
    else if (cleanHtml.includes('<body')) cleanHtml = cleanHtml.replace('<body', zoomCss + '<body');
    else cleanHtml = zoomCss + cleanHtml;

    const f = document.createElement('iframe');
    f.className = 'cp-mini-frame'; f.sandbox = 'allow-same-origin';
    f.setAttribute('tabindex', '-1');
    f.style.cssText = 'width:100%;height:100%;border:none;display:block;pointer-events:none';
    container.innerHTML = ''; container.appendChild(f);
    requestAnimationFrame(() => { try {
      const d = f.contentDocument; d.open(); d.write(cleanHtml); d.close();
    } catch (e) { container.innerHTML = '<span>📄</span>'; } });
  }

  function onSnippetDeleted(data) {
    allCollections.forEach(async c => {
      migrateToItems(c); let changed = false;
      c.items.forEach(item => { if (item.type === 'chapter' && item.snippetIds?.includes(data.id)) { item.snippetIds = item.snippetIds.filter(id => id !== data.id); changed = true; } });
      c.items = c.items.filter(item => { if (item.type === 'page' && item.snippetId === data.id) { changed = true; return false; } return true; });
      if (changed) await PageForgeDB.saveCollection(c);
    });
  }

  function toast(m, t) { PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: m, type: t }); }
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  return { init, refresh };
})();
