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
              <button id="btn-col-placeholders" class="tb2 tb2-outline tb2-sm" title="Platzhalter-Werte für diese Collection">⚙️ Platzhalter</button>
              <button id="btn-master-css" class="tb2 tb2-outline tb2-sm" title="Master CSS für alle Seiten">🎨 Master CSS</button>
              <button id="btn-save-col" class="tb2 tb2-primary tb2-sm">💾</button>
              <button id="btn-export-print" class="tb2 tb2-outline tb2-sm">🖨️ PDF</button>
            </div>

            <!-- Collection Platzhalter Modal -->
            <div class="modal-backdrop" id="modal-col-placeholders" style="display:none">
              <div class="modal-content" style="max-width:520px">
                <div class="modal-header"><h3>⚙️ Collection Platzhalter</h3><button class="modal-close" id="colph-close">✕</button></div>
                <div class="modal-body">
                  <p class="meta-dim" style="margin:0 0 16px;font-size:12px">Diese Werte gelten für alle Seiten dieser Collection und werden beim PDF-Export in <code>{{platzhalter}}</code> eingesetzt.</p>

                  <div class="colph-row">
                    <label>Autor <code>{{autor}}</code></label>
                    <input type="text" id="colph-autor" class="colph-inp" placeholder="z.B. Max Mustermann" />
                  </div>
                  <div class="colph-row">
                    <label>Copyright <code>{{copyright}}</code></label>
                    <input type="text" id="colph-copyright" class="colph-inp" placeholder="z.B. © vfsverband" />
                  </div>
                  <div class="colph-row">
                    <label>Untertitel <code>{{untertitel}}</code></label>
                    <input type="text" id="colph-untertitel" class="colph-inp" placeholder="z.B. Investorenworkshop" />
                  </div>
                  <div class="colph-row">
                    <label>Beschreibung <span class="meta-dim">(intern, nicht als Platzhalter)</span></label>
                    <input type="text" id="colph-desc" class="colph-inp" placeholder="Interne Notizen…" />
                  </div>

                  <div class="pdf-hint" style="margin-top:16px">
                    <strong>Im HTML verwenden:</strong><br>
                    <code>{{copyright}}</code> → wird zu „© vfsverband"<br>
                    <code>{{untertitel}}</code> → wird zu „Investorenworkshop"<br>
                    <code>{{autor}}</code> <code>{{collection}}</code> <code>{{datum}}</code> <code>{{kapitel}}</code> <code>{{seitenzahl}}</code> <code>{{gesamtseiten}}</code>
                  </div>
                </div>
                <div class="modal-footer">
                  <button id="colph-save" class="tb2 tb2-primary">💾 Speichern</button>
                </div>
              </div>
            </div>

            <!-- PDF Export Modal -->
            <div class="modal-backdrop" id="modal-pdf-export" style="display:none">
              <div class="modal-content" style="max-width:560px">
                <div class="modal-header"><h3>🖨️ PDF-Export</h3><button class="modal-close" id="pdf-modal-close">✕</button></div>
                <div class="modal-body">

                  <div class="pdf-section">
                    <label class="pdf-label">
                      <input type="checkbox" id="pdf-cover" /> Deckblatt – erste Seite bekommt <code>{{seitenzahl}}</code> = leer
                    </label>
                  </div>

                  <div class="pdf-section">
                    <label class="pdf-label">Startnummer</label>
                    <div style="display:flex;gap:8px;align-items:center">
                      <input type="number" id="pdf-start-nr" value="1" min="1" max="999" class="pdf-num" style="width:70px" />
                      <span class="meta-dim">Seitennummerierung beginnt bei diesem Wert</span>
                    </div>
                  </div>

                  <div class="pdf-section">
                    <label class="pdf-label">
                      <input type="checkbox" id="pdf-toc" /> Inhaltsverzeichnis einfügen
                    </label>
                    <div class="pdf-sub" id="pdf-toc-opts" style="display:none">
                      <select id="pdf-toc-style" class="fsel" style="width:100%">
                        <option value="classic">📖 Klassisch – Linien + Seitenzahlen</option>
                        <option value="modern">🎨 Modern – Farbblöcke, serifenlos</option>
                        <option value="minimal">✨ Minimal – Nur Text, viel Weißraum</option>
                      </select>
                    </div>
                  </div>

                  <div class="pdf-section">
                    <label class="pdf-label">
                      <input type="checkbox" id="pdf-chapter-covers" /> Kapitel-Deckblätter einfügen
                    </label>
                    <div class="pdf-sub" id="pdf-cc-opts" style="display:none">
                      <select id="pdf-cc-style" class="fsel" style="width:100%">
                        <option value="bold">🔷 Bold – Großer Titel, Farbe</option>
                        <option value="elegant">📜 Elegant – Zentriert, Linie</option>
                        <option value="stripe">🟧 Stripe – Seitlicher Farbbalken</option>
                      </select>
                    </div>
                  </div>

                  <div class="pdf-hint">
                    <strong>Tipp:</strong> Platzhalter in deinen Seiten werden automatisch aufgelöst:<br>
                    <code>{{seitenzahl}}</code> <code>{{gesamtseiten}}</code> <code>{{collection}}</code> <code>{{kapitel}}</code> <code>{{copyright}}</code> <code>{{untertitel}}</code> <code>{{autor}}</code> <code>{{datum}}</code><br><br>
                    Werte für <code>{{copyright}}</code>, <code>{{autor}}</code> etc. setzt du über ⚙️ <strong>Platzhalter</strong>.
                  </div>

                </div>
                <div class="modal-footer">
                  <button id="btn-pdf-go" class="tb2 tb2-primary">🖨️ PDF erzeugen</button>
                </div>
              </div>
            </div>
            <div class="col-chapter-header" id="col-chapter-header">
              <h3 id="col-chapter-title">—</h3>
              <span id="col-chapter-count" class="meta-dim"></span>
              <button id="btn-add-pages" class="tb2 tb2-outline tb2-sm">➕ Seiten</button>
              <button id="btn-rename-item" class="tb2 tb2-ghost tb2-sm" title="Umbenennen">✏️</button>
              <button id="btn-del-item" class="tb2 tb2-ghost tb2-sm" title="Entfernen">🗑️</button>
              <div class="col-size-ctrl"><span class="meta-dim">Größe</span>
                <input type="range" id="col-preview-size" min="30" max="350" value="48" class="size-slider" />
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
    $('btn-col-placeholders').addEventListener('click', openColPlaceholders);
    $('colph-close').addEventListener('click', () => $('modal-col-placeholders').style.display = 'none');
    $('modal-col-placeholders').addEventListener('click', e => { if (e.target.id === 'modal-col-placeholders') e.target.style.display = 'none'; });
    $('colph-save').addEventListener('click', saveColPlaceholders);
    $('btn-export-print').addEventListener('click', () => {
      if (!active) return;
      if (!countAllPages(active)) { toast('Collection ist leer', 'warning'); return; }
      loadPdfSettings();
      $('modal-pdf-export').style.display = 'flex';
    });
    $('pdf-modal-close').addEventListener('click', () => $('modal-pdf-export').style.display = 'none');
    $('modal-pdf-export').addEventListener('click', e => { if (e.target.id === 'modal-pdf-export') e.target.style.display = 'none'; });
    $('btn-pdf-go').addEventListener('click', () => { savePdfSettings(); $('modal-pdf-export').style.display = 'none'; exportPdf(); });
    $('pdf-toc').addEventListener('change', () => $('pdf-toc-opts').style.display = $('pdf-toc').checked ? '' : 'none');
    $('pdf-chapter-covers').addEventListener('change', () => $('pdf-cc-opts').style.display = $('pdf-chapter-covers').checked ? '' : 'none');
    $('btn-add-pages').addEventListener('click', openAddPages);
    $('btn-rename-item').addEventListener('click', renameItem);
    $('btn-del-item').addEventListener('click', deleteItem);
    $('btn-master-css').addEventListener('click', () => { if (!active) return; $('mcss-textarea').value = active.masterCss || ''; $('modal-master-css').style.display = 'flex'; });
    $('mcss-close').addEventListener('click', () => $('modal-master-css').style.display = 'none');
    $('modal-master-css').addEventListener('click', e => { if (e.target.id === 'modal-master-css') e.target.style.display = 'none'; });
    $('mcss-apply').addEventListener('click', () => { if (!active) return; active.masterCss = $('mcss-textarea').value.trim(); $('modal-master-css').style.display = 'none'; renderPages(); autoSave(); toast('Master CSS aktualisiert', 'success'); });
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
            renderSidebar(); renderPages(); autoSave();
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
        renderSidebar(); renderPages(); autoSave();
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
      untertitel: active?.untertitel || '',
      kapitel: item?.type === 'chapter' ? (item.name || '') : '',
      kapitelnr: String(getChapterNumber(itemIdx)),
      seitenzahl: String(getGlobalOffset(itemIdx) + pageIdx + 1),
      gesamtseiten: String(totalPages),
      autor: active?.author || '',
      copyright: active?.copyright || '',
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
          renderPages(); renderSidebar(); autoSave();
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
        if (ch?.type === 'chapter') { ch.snippetIds.splice(parseInt(btn.dataset.index), 1); renderPages(); renderSidebar(); autoSave(); }
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
    try {
      const col = await PageForgeDB.saveCollection({
        name, description: '', author: '', masterCss: '',
        items: [{ type: 'chapter', name: 'Kapitel 1', snippetIds: [] }]
      });
      allCollections.push(col); updateDropdown(); loadCollection(col.id);
      toast(`"${name}" erstellt`, 'success');
    } catch (e) {
      console.error('Collection erstellen fehlgeschlagen:', e);
      toast('Fehler beim Erstellen', 'error');
    }
  }

  async function autoSave() {
    if (!active) return;
    await PageForgeDB.saveCollection(active);
    const idx = allCollections.findIndex(c => c.id === active.id);
    if (idx >= 0) allCollections[idx] = active; else allCollections.push(active);
    updateDropdown();
  }

  // ── Collection Platzhalter ──

  function openColPlaceholders() {
    if (!active) return;
    $('colph-autor').value = active.author || '';
    $('colph-copyright').value = active.copyright || '';
    $('colph-untertitel').value = active.untertitel || '';
    $('colph-desc').value = active.description || '';
    $('modal-col-placeholders').style.display = 'flex';
  }

  async function saveColPlaceholders() {
    if (!active) return;
    active.author = $('colph-autor').value.trim();
    active.copyright = $('colph-copyright').value.trim();
    active.untertitel = $('colph-untertitel').value.trim();
    active.description = $('colph-desc').value.trim();
    await autoSave();
    $('modal-col-placeholders').style.display = 'none';
    renderPages(); // re-render previews with new placeholder values
    toast('Platzhalter gespeichert', 'success');
  }

  async function saveCollection() {
    if (!active) return;
    active.name = $('col-name').value.trim() || 'Unbenannt';
    await autoSave();
    renderSidebar();
    toast('Gespeichert', 'success');
  }

  async function deleteCollection() {
    if (!active || !confirm(`"${active.name}" löschen?`)) return;
    const id = active.id;
    await PageForgeDB.remove('collections', id);
    clearEditor(); allCollections = allCollections.filter(c => c.id !== id); updateDropdown();
    PageForgeEvents.emit(PageForgeEvents.EVENTS.COLLECTION_DELETED, { id });
    toast('Gelöscht', 'info');
  }

  function addChapter() {
    if (!active) return;
    const name = prompt('Kapitelname:', `Kapitel ${active.items.filter(i => i.type === 'chapter').length + 1}`);
    if (!name) return;
    active.items.push({ type: 'chapter', name, snippetIds: [] });
    selectedIdx = active.items.length - 1;
    renderSidebar(); renderPages(); autoSave();
  }

  function renameItem() {
    const item = active?.items?.[selectedIdx];
    if (!item) return;
    if (item.type === 'chapter') {
      const name = prompt('Kapitelname:', item.name);
      if (!name) return;
      item.name = name; renderSidebar(); renderPages(); autoSave();
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
    renderSidebar(); renderPages(); autoSave();
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
    closeAddPages(); renderPages(); renderSidebar(); autoSave();
    toast(`${selectedIds.size} Seiten hinzugefügt`, 'success');
  }

  // ── PDF Export ──

  function getPdfSettings() {
    return {
      cover: $('pdf-cover')?.checked || false,
      startNr: parseInt($('pdf-start-nr')?.value) || 1,
      toc: $('pdf-toc')?.checked || false,
      tocStyle: $('pdf-toc-style')?.value || 'classic',
      chapterCovers: $('pdf-chapter-covers')?.checked || false,
      ccStyle: $('pdf-cc-style')?.value || 'bold',
    };
  }

  function loadPdfSettings() {
    const s = active?.pdfSettings;
    if (!s) return;
    $('pdf-cover').checked = !!s.cover;
    if (s.startNr) $('pdf-start-nr').value = s.startNr;
    $('pdf-toc').checked = !!s.toc;
    $('pdf-toc-opts').style.display = s.toc ? '' : 'none';
    if (s.tocStyle) $('pdf-toc-style').value = s.tocStyle;
    $('pdf-chapter-covers').checked = !!s.chapterCovers;
    $('pdf-cc-opts').style.display = s.chapterCovers ? '' : 'none';
    if (s.ccStyle) $('pdf-cc-style').value = s.ccStyle;
  }

  async function savePdfSettings() {
    if (!active) return;
    active.pdfSettings = getPdfSettings();
    await autoSave();
  }

  function resolveHfTemplate(tpl, vars) {
    if (!tpl) return '';
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
  }

  async function exportPdf() {
    if (!active) return;
    const rawTotal = countAllPages(active);
    if (!rawTotal) { toast('Collection ist leer', 'warning'); return; }
    toast('PDF wird vorbereitet…', 'info');
    const s = getPdfSettings();
    const datum = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Pass 1: Build page list with metadata
    let entries = []; // {type, snippet?, chapterName?, chapterNr?, itemIdx?, pageIdx?}
    let chNr = 0;
    for (let ii = 0; ii < active.items.length; ii++) {
      const item = active.items[ii];
      if (item.type === 'chapter') {
        chNr++;
        if (s.chapterCovers) entries.push({ type: 'chapter-cover', chapterName: item.name, chapterNr: chNr });
        for (let si = 0; si < (item.snippetIds?.length || 0); si++) {
          const sn = await PageForgeDB.get('snippets', item.snippetIds[si]);
          if (sn) entries.push({ type: 'page', snippet: sn, chapterName: item.name, chapterNr: chNr, itemIdx: ii, pageIdx: si });
        }
      } else {
        const sn = await PageForgeDB.get('snippets', item.snippetId);
        if (sn) entries.push({ type: 'page', snippet: sn, chapterName: '', chapterNr: 0, itemIdx: ii, pageIdx: 0 });
      }
    }

    // Calculate numbering
    const tocPages = s.toc ? 1 : 0;
    const numberedTotal = tocPages + entries.length;
    const displayTotal = s.cover ? numberedTotal - 1 : numberedTotal;

    // Assign page numbers
    let nr = s.startNr;
    const isCoverFirst = s.cover;
    let tocPageNr = 0;

    // TOC data (need page numbers before building)
    const tocData = [];
    let tempNr = s.startNr;
    if (isCoverFirst) { /* cover = page 0, not numbered */ }
    if (s.toc) { tocPageNr = isCoverFirst ? tempNr : tempNr; tempNr++; }
    for (const e of entries) {
      e.displayNr = tempNr;
      if (e.type === 'chapter-cover') tocData.push({ title: e.chapterName, pageNr: tempNr, isChapter: true });
      else tocData.push({ title: e.snippet.title, pageNr: tempNr, isChapter: false });
      tempNr++;
    }

    // Build HTML
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>@page{size:A4;margin:0}*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;width:210mm}
.pf-page{width:210mm;min-height:297mm;page-break-after:always;overflow:hidden;position:relative}
.pf-page:last-child{page-break-after:auto}
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Open+Sans:wght@400;600&display=swap');
${active.masterCss ? `.pf-page{${active.masterCss}}` : ''}
</style></head><body>`;

    let gpIdx = 0;

    // Render pages in order
    // If cover: first content page is cover (no number)
    // Then TOC if enabled
    // Then entries

    // We need to handle cover: the FIRST entry is the cover page
    let entryIdx = 0;
    if (isCoverFirst && entries.length) {
      const e = entries[0];
      if (e.type === 'page') {
        html += buildContentPage(e.snippet, e, gpIdx, '', String(displayTotal), s, datum);
      }
      gpIdx++; entryIdx = 1;
    }

    // TOC
    if (s.toc) {
      html += generateTocPage(tocData, s.tocStyle, String(tocPageNr), String(displayTotal), datum);
      gpIdx++;
    }

    // Rest of entries
    for (let i = entryIdx; i < entries.length; i++) {
      const e = entries[i];
      if (e.type === 'chapter-cover') {
        html += generateChapterCoverPage(e, s.ccStyle, String(e.displayNr), String(displayTotal), datum);
      } else {
        html += buildContentPage(e.snippet, e, gpIdx, String(e.displayNr), String(displayTotal), s, datum);
      }
      gpIdx++;
    }

    html += '</body></html>';
    const w = window.open('', '_blank', 'width=800,height=1100');
    if (!w) { toast('Popup blockiert', 'error'); return; }
    w.document.write(html); w.document.close();
    w.onload = () => setTimeout(() => { w.focus(); w.print(); }, 500);
  }

  function buildContentPage(snippet, entry, gpIdx, pageNr, displayTotal, s, datum) {
    const vars = {
      collection: active?.name || '',
      untertitel: active?.untertitel || '',
      kapitel: entry.chapterName || '',
      kapitelnr: String(entry.chapterNr || ''),
      seitenzahl: pageNr,
      gesamtseiten: displayTotal,
      autor: active?.author || '',
      copyright: active?.copyright || '',
      seitentitel: snippet.title || '',
      datum,
    };
    let raw = PageForgePlaceholders.resolve(snippet.htmlContent || '', vars);
    const sid = `pf-s${gpIdx}`;
    const p = new DOMParser(), doc = p.parseFromString(raw, 'text/html');
    const css = Array.from(doc.querySelectorAll('style')).map(e => e.textContent).join('\n');
    const scoped = scopeCssViaCSSOM(css, `#${sid}`);
    const body = doc.body ? doc.body.innerHTML : raw;
    const bs = doc.body?.getAttribute('style') || '', bc = doc.body?.getAttribute('class') || '';
    return `<div class="pf-page ${bc}" id="${sid}" style="${esc(bs)}"><style>${scoped}</style>${body}</div>`;
  }

  // ── TOC Generator ──

  function generateTocPage(tocData, style, pageNr, total, datum) {
    const colName = active?.name || '';
    const copyright = active?.copyright || '';
    const styles = {
      classic: `
        .toc-page{font-family:'Open Sans',sans-serif;padding:50px 60px;color:#222}
        .toc-title{font-family:'Montserrat',sans-serif;font-size:28px;font-weight:700;margin-bottom:8px;color:#003366}
        .toc-sub{font-size:12px;color:#888;margin-bottom:40px;padding-bottom:16px;border-bottom:2px solid #003366}
        .toc-chapter{font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#003366;margin:20px 0 6px;text-transform:uppercase;letter-spacing:0.5px}
        .toc-entry{display:flex;align-items:baseline;padding:5px 0;font-size:12px;border-bottom:1px dotted #ccc}
        .toc-entry-title{flex:1}
        .toc-entry-nr{font-weight:600;color:#003366;min-width:30px;text-align:right}
        .toc-footer{position:absolute;bottom:30px;left:60px;right:60px;font-size:8px;color:#999;display:flex;justify-content:space-between;border-top:1px solid #e0e0e0;padding-top:6px}
      `,
      modern: `
        .toc-page{font-family:'Open Sans',sans-serif;padding:50px 55px;color:#333}
        .toc-title{font-family:'Montserrat',sans-serif;font-size:32px;font-weight:700;color:#fff;background:#003366;margin:-50px -55px 30px;padding:50px 55px 30px}
        .toc-sub{font-size:11px;color:rgba(255,255,255,0.7);margin-top:6px}
        .toc-chapter{font-family:'Montserrat',sans-serif;font-size:11px;font-weight:700;color:#fff;background:#B87333;padding:6px 14px;margin:18px 0 8px;border-radius:4px;text-transform:uppercase;letter-spacing:1px}
        .toc-entry{display:flex;align-items:baseline;padding:7px 0;font-size:12px}
        .toc-entry-title{flex:1}
        .toc-entry-nr{font-weight:700;color:#B87333;font-size:14px;min-width:30px;text-align:right}
        .toc-footer{position:absolute;bottom:30px;left:55px;right:55px;font-size:8px;color:#999;display:flex;justify-content:space-between}
      `,
      minimal: `
        .toc-page{font-family:'Open Sans',sans-serif;padding:80px 70px;color:#333}
        .toc-title{font-family:'Montserrat',sans-serif;font-size:22px;font-weight:400;color:#333;margin-bottom:50px;letter-spacing:2px;text-transform:uppercase}
        .toc-sub{display:none}
        .toc-chapter{font-size:10px;font-weight:600;color:#999;margin:30px 0 8px;text-transform:uppercase;letter-spacing:2px}
        .toc-entry{display:flex;align-items:baseline;padding:6px 0;font-size:13px}
        .toc-entry-title{flex:1;color:#333}
        .toc-entry-nr{color:#999;font-size:12px;min-width:30px;text-align:right}
        .toc-footer{position:absolute;bottom:50px;left:70px;right:70px;font-size:8px;color:#bbb;display:flex;justify-content:space-between}
      `,
    };

    let body = '';
    let currentChapter = null;
    for (const entry of tocData) {
      if (entry.isChapter) {
        currentChapter = entry.title;
        body += `<div class="toc-chapter">${esc(entry.title)}</div>`;
      } else {
        body += `<div class="toc-entry"><span class="toc-entry-title">${esc(entry.title)}</span><span class="toc-entry-nr">${entry.pageNr}</span></div>`;
      }
    }

    return `<div class="pf-page"><style>${styles[style] || styles.classic}</style>
      <div class="toc-page">
        <div class="toc-title">Inhaltsverzeichnis<div class="toc-sub">${esc(colName)}</div></div>
        ${body}
        <div class="toc-footer"><span>${esc(copyright)}</span><span>Seite ${pageNr} / ${total}</span></div>
      </div></div>`;
  }

  // ── Chapter Cover Generator ──

  function generateChapterCoverPage(entry, style, pageNr, total, datum) {
    const colName = active?.name || '';
    const copyright = active?.copyright || '';
    const untertitel = active?.untertitel || '';
    const styles = {
      bold: `
        .cc-page{font-family:'Montserrat',sans-serif;position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#003366;color:#fff}
        .cc-nr{position:absolute;top:50px;left:60px;font-size:80px;font-weight:700;color:rgba(255,255,255,0.1)}
        .cc-center{text-align:center;padding:40px}
        .cc-label{font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#B87333;margin-bottom:16px}
        .cc-title{font-size:38px;font-weight:700;line-height:1.2;margin-bottom:12px}
        .cc-sub{font-size:13px;color:rgba(255,255,255,0.6)}
        .cc-footer{position:absolute;bottom:30px;left:60px;right:60px;font-size:8px;color:rgba(255,255,255,0.4);display:flex;justify-content:space-between}
      `,
      elegant: `
        .cc-page{font-family:'Montserrat',sans-serif;position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;color:#222}
        .cc-nr{display:none}
        .cc-center{text-align:center;padding:40px;max-width:500px}
        .cc-label{font-size:10px;text-transform:uppercase;letter-spacing:4px;color:#B87333;margin-bottom:20px}
        .cc-title{font-size:32px;font-weight:600;line-height:1.3;margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #B87333}
        .cc-sub{font-size:12px;color:#888}
        .cc-footer{position:absolute;bottom:30px;left:60px;right:60px;font-size:8px;color:#bbb;display:flex;justify-content:space-between;border-top:1px solid #e0e0e0;padding-top:6px}
      `,
      stripe: `
        .cc-page{font-family:'Montserrat',sans-serif;position:relative;width:100%;height:100%;display:flex;align-items:center;background:#fff;color:#222}
        .cc-page::before{content:'';position:absolute;left:0;top:0;bottom:0;width:80px;background:#003366}
        .cc-nr{position:absolute;left:0;top:50%;transform:translateY(-50%) rotate(-90deg);font-size:14px;font-weight:700;color:rgba(255,255,255,0.6);letter-spacing:3px;text-transform:uppercase;width:200px;text-align:center;transform-origin:center}
        .cc-center{padding:40px 60px 40px 120px}
        .cc-label{font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#B87333;margin-bottom:12px}
        .cc-title{font-size:36px;font-weight:700;line-height:1.2;margin-bottom:10px;color:#003366}
        .cc-sub{font-size:12px;color:#888}
        .cc-footer{position:absolute;bottom:30px;left:120px;right:60px;font-size:8px;color:#bbb;display:flex;justify-content:space-between}
      `,
    };

    return `<div class="pf-page"><style>${styles[style] || styles.bold}</style>
      <div class="cc-page">
        <div class="cc-nr">Kapitel ${entry.chapterNr}</div>
        <div class="cc-center">
          <div class="cc-label">Kapitel ${entry.chapterNr}</div>
          <div class="cc-title">${esc(entry.chapterName)}</div>
          <div class="cc-sub">${esc(colName)}${untertitel ? ' · ' + esc(untertitel) : ''}</div>
        </div>
        <div class="cc-footer"><span>${esc(copyright)}</span><span>${datum}</span><span>Seite ${pageNr} / ${total}</span></div>
      </div></div>`;
  }

  function buildPdfPage(snippet, itemIdx, pageIdx, gp, totalPages, displayTotal, s) {
    // Legacy function kept for compatibility - not used in new export
    return '';
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
