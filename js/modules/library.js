/**
 * PageForge Library Module v5
 * - Tag cloud for quick filtering
 * - Extended zoom range (120-700px) for large monitors
 * - Adjustable list view thumbnails
 * - Lazy iframe previews
 */
const LibraryModule = (() => {
  let allSnippets = [], allCategories = [], allTags = [];
  let collectionMap = {}; // snippetId → [{name, id}]
  let filters = { query: '', category: '', status: '', tag: '', sort: 'date-desc', favOnly: false };
  let viewMode = 'grid';
  let previewHeight = 250;
  let selected = new Set();

  function $(id) { return document.getElementById(id); }

  function init() {
    buildUI(); bindEvents();
    PageForgeEvents.on(PageForgeEvents.EVENTS.SNIPPET_SAVED, refresh);
    PageForgeEvents.on(PageForgeEvents.EVENTS.SNIPPET_UPDATED, refresh);
    PageForgeEvents.on(PageForgeEvents.EVENTS.SNIPPET_DELETED, refresh);
    PageForgeEvents.on(PageForgeEvents.EVENTS.LIBRARY_REFRESH, refresh);
    PageForgeEvents.on(PageForgeEvents.EVENTS.COLLECTION_SAVED, refresh);
    PageForgeEvents.on(PageForgeEvents.EVENTS.COLLECTION_DELETED, refresh);
  }

  function buildUI() {
    $('tab-library').innerHTML = `
      <div class="lib-layout">
        <div class="lib-toolbar">
          <div class="lib-search-row">
            <div class="search-wrap"><span class="search-ico">🔍</span>
              <input type="text" id="lib-search" class="search-inp" placeholder="Suchen…" />
              <span class="search-x" id="lib-search-x" style="display:none">✕</span>
            </div>
            <div class="lib-size-ctrl"><span class="meta-dim">Größe</span>
              <input type="range" id="lib-preview-size" min="80" max="600" value="250" class="size-slider" />
            </div>
            <div class="view-toggle">
              <button class="vbtn active" data-v="grid" title="Raster">⊞</button>
              <button class="vbtn" data-v="list" title="Liste">☰</button>
            </div>
          </div>
          <div class="lib-filters">
            <select id="lf-cat" class="fsel"><option value="">Alle Kategorien</option></select>
            <select id="lf-status" class="fsel"><option value="">Alle Status</option>
              <option value="draft">⏳ Entwurf</option><option value="review">🔍 Review</option><option value="final">✅ Final</option></select>
            <select id="lf-sort" class="fsel">
              <option value="date-desc">📅 Neueste zuerst</option>
              <option value="date-asc">📅 Älteste zuerst</option>
              <option value="title-asc">🔤 A → Z</option>
              <option value="title-desc">🔤 Z → A</option>
              <option value="category">📁 Kategorie</option>
            </select>
            <button class="fav-filter-btn" id="btn-fav-filter" title="Nur Favoriten anzeigen">☆</button>
            <span class="lib-count" id="lib-count"></span>
          </div>
          <div class="lib-tagcloud" id="lib-tagcloud"></div>
          <div class="lib-bulk-bar" id="lib-bulk-bar" style="display:none">
            <label class="bulk-sel-all"><input type="checkbox" id="bulk-sel-all" /> <span id="bulk-count">0</span> ausgewählt</label>
            <button class="tb2 tb2-outline tb2-sm" id="bulk-status" title="Status ändern">🔄 Status</button>
            <button class="tb2 tb2-outline tb2-sm" id="bulk-collection" title="Zu Collection">📑 Collection</button>
            <button class="tb2 tb2-outline tb2-sm" id="bulk-delete" title="Löschen">🗑️ Löschen</button>
            <button class="tb2 tb2-ghost tb2-sm" id="bulk-cancel">✕ Abbrechen</button>
          </div>
        </div>
        <div class="lib-grid" id="lib-grid"></div>
      </div>`;
  }

  function bindEvents() {
    const si = $('lib-search'), sx = $('lib-search-x');
    si.addEventListener('input', e => { filters.query = e.target.value; sx.style.display = e.target.value ? '' : 'none'; render(); });
    sx.addEventListener('click', () => { si.value = ''; filters.query = ''; sx.style.display = 'none'; render(); });
    $('lf-cat').addEventListener('change', e => { filters.category = e.target.value; render(); });
    $('lf-status').addEventListener('change', e => { filters.status = e.target.value; render(); });
    $('lf-sort').addEventListener('change', e => { filters.sort = e.target.value; render(); });
    $('btn-fav-filter').addEventListener('click', () => {
      filters.favOnly = !filters.favOnly;
      $('btn-fav-filter').textContent = filters.favOnly ? '★' : '☆';
      $('btn-fav-filter').classList.toggle('fav-active', filters.favOnly);
      render();
    });
    document.querySelectorAll('.vbtn').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.vbtn').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); viewMode = b.dataset.v; render();
    }));
    $('lib-preview-size').addEventListener('input', e => {
      previewHeight = parseInt(e.target.value);
      clearTimeout(renderTimer);
      renderTimer = setTimeout(() => render(), 80);
    });

    // Bulk actions
    $('bulk-cancel').addEventListener('click', () => { selected.clear(); updateBulkBar(); render(); });
    $('bulk-sel-all').addEventListener('change', e => {
      const items = getFiltered();
      if (e.target.checked) items.forEach(s => selected.add(s.id)); else selected.clear();
      updateBulkBar(); render();
    });
    $('bulk-delete').addEventListener('click', bulkDelete);
    $('bulk-status').addEventListener('click', bulkStatus);
    $('bulk-collection').addEventListener('click', bulkCollection);
  }

  let renderTimer = null;

  function updateGridLayout() {
    const scale = previewHeight / 1123, w = Math.round(794 * scale);
    const grid = $('lib-grid');
    if (viewMode === 'grid') {
      grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${w + 20}px, 1fr))`;
      grid.style.setProperty('--card-s', Math.min(2, Math.max(1, previewHeight / 250)).toFixed(2));
    }
  }

  async function refresh() {
    allSnippets = await PageForgeDB.getAll('snippets');
    allCategories = await PageForgeDB.getAll('categories');
    allTags = await PageForgeDB.getAll('tags');

    // Build collection membership map
    collectionMap = {};
    const collections = await PageForgeDB.getAll('collections');
    collections.forEach(col => {
      (col.items || []).forEach(item => {
        if (item.type === 'page' && item.snippetId) {
          (collectionMap[item.snippetId] = collectionMap[item.snippetId] || []).push({ name: col.name, id: col.id });
        }
        if (item.type === 'chapter') {
          (item.snippetIds || []).forEach(sid => {
            (collectionMap[sid] = collectionMap[sid] || []).push({ name: col.name, id: col.id });
          });
        }
      });
    });
    // Deduplicate (same snippet in multiple chapters of same collection)
    Object.keys(collectionMap).forEach(k => {
      const seen = new Set();
      collectionMap[k] = collectionMap[k].filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    });

    // Update category filter
    const catS = $('lf-cat');
    if (catS) { const v = catS.value; catS.innerHTML = '<option value="">Alle Kategorien</option>';
      allCategories.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.icon} ${c.name}`; catS.appendChild(o); }); catS.value = v; }

    renderTagCloud();
    render();
  }

  // ── Tag Cloud ──

  function renderTagCloud() {
    const cloud = $('lib-tagcloud');
    if (!cloud) return;

    // Collect tags with counts
    const tagCounts = {};
    allSnippets.forEach(s => {
      (s.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });

    const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    if (!tags.length) { cloud.innerHTML = ''; return; }

    cloud.innerHTML = tags.map(([tag, count]) => {
      const isActive = filters.tag === tag;
      return `<button class="tc-chip ${isActive ? 'tc-active' : ''}" data-tag="${esc(tag)}">
        ${esc(tag)} <span class="tc-count">${count}</span>
      </button>`;
    }).join('');

    cloud.querySelectorAll('.tc-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        filters.tag = filters.tag === tag ? '' : tag;
        renderTagCloud();
        render();
      });
    });
  }

  function getFiltered() {
    return allSnippets.filter(s => {
      const q = filters.query.toLowerCase();
      return (!q || s.title?.toLowerCase().includes(q) || s.tags?.some(t => t.toLowerCase().includes(q)) || s.htmlContent?.toLowerCase().includes(q))
        && (!filters.category || s.category === filters.category)
        && (!filters.status || s.status === filters.status)
        && (!filters.tag || s.tags?.includes(filters.tag))
        && (!filters.favOnly || s.favorite);
    }).sort((a, b) => {
      switch (filters.sort) {
        case 'date-asc': return new Date(a.updatedAt) - new Date(b.updatedAt);
        case 'title-asc': return (a.title || '').localeCompare(b.title || '', 'de');
        case 'title-desc': return (b.title || '').localeCompare(a.title || '', 'de');
        case 'category': {
          const ca = allCategories.find(c => c.id === a.category)?.name || 'zzz';
          const cb = allCategories.find(c => c.id === b.category)?.name || 'zzz';
          return ca.localeCompare(cb, 'de') || new Date(b.updatedAt) - new Date(a.updatedAt);
        }
        default: return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });
  }

  function render() {
    const grid = $('lib-grid'), items = getFiltered();
    $('lib-count').textContent = `${items.length} von ${allSnippets.length}`;

    if (!items.length) {
      grid.className = 'lib-grid'; grid.style.cssText = '';
      grid.innerHTML = `<div class="lib-empty"><div class="lib-empty-ico">${allSnippets.length ? '🔍' : '📄'}</div>
        <p class="lib-empty-t">${allSnippets.length ? 'Keine Treffer' : 'Noch keine Seiten'}</p></div>`;
      return;
    }

    const stMap = { draft: '⏳ Entwurf', review: '🔍 Review', final: '✅ Final' };
    const scale = previewHeight / 1123, cardW = Math.round(794 * scale);
    const listH = Math.max(50, Math.round(previewHeight * 0.8)), listW = Math.round(listH * 794 / 1123), listScale = listH / 1123;

    if (viewMode === 'list') { grid.className = 'lib-list'; grid.style.cssText = ''; }
    else {
      grid.className = 'lib-grid';
      grid.style.cssText = `--card-w:${cardW}px;--card-h:${previewHeight}px`;
    }
    grid.innerHTML = items.map(s => {
      const cat = allCategories.find(c => c.id === s.category);
      const date = new Date(s.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
      const cols = collectionMap[s.id] || [];
      const colBadges = cols.map(c => `<span class="col-badge" title="${esc(c.name)}">📑 ${esc(c.name)}</span>`).join('');
      if (viewMode === 'list') {
        return `<div class="lib-list-item${selected.has(s.id) ? ' lib-selected' : ''}" data-id="${s.id}">
          <input type="checkbox" class="lib-chk" data-id="${s.id}" ${selected.has(s.id) ? 'checked' : ''} />
          <div class="lli-preview-wrap" data-id="${s.id}" style="width:${listW}px;height:${listH}px"></div>
          <div class="lli-info"><div class="lli-title">${esc(s.title)}</div>
            <div class="lli-meta">${cat ? `<span>${cat.icon} ${cat.name}</span>` : ''}
              <span class="status-badge sb-${s.status}">${stMap[s.status] || ''}</span>
              <span class="meta-dim">${date} · v${s.version || 1}</span>${colBadges}</div>
            <div class="lli-tags">${(s.tags || []).map(t => `<span class="tag-chip">${esc(t)}</span>`).join('')}</div></div>
          <div class="lli-acts"><button class="fav-star${s.favorite ? ' fav-on' : ''}" data-id="${s.id}" title="Favorit">${s.favorite ? '★' : '☆'}</button><button class="abtn a-edit" data-id="${s.id}">✏️</button><button class="abtn a-dup" data-id="${s.id}">📋</button><button class="abtn a-del" data-id="${s.id}">🗑️</button></div>
        </div>`;
      }
      return `<div class="lib-card${selected.has(s.id) ? ' lib-selected' : ''}" data-id="${s.id}">
        <input type="checkbox" class="lib-chk lib-chk-grid" data-id="${s.id}" ${selected.has(s.id) ? 'checked' : ''} />
        <button class="fav-star${s.favorite ? ' fav-on' : ''}" data-id="${s.id}" title="Favorit">${s.favorite ? '★' : '☆'}</button>
        <div class="lc-preview-wrap" data-id="${s.id}"></div>
        <div class="lc-overlay">
          <div class="lc-overlay-top">
            <span class="lc-title">${esc(s.title)}</span>
            ${cat ? `<span class="lc-cat">${cat.icon}</span>` : ''}
          </div>
          <div class="lc-overlay-bottom">
            <span class="status-pip sb-${s.status}"></span>
            <span class="lc-date">${date}</span>
            ${cols.length ? `<span class="lc-col-dot" title="${cols.map(c=>esc(c.name)).join(', ')}">📑</span>` : ''}
            <span class="lc-spacer"></span>
            <button class="lc-act a-dup" data-id="${s.id}" title="Duplizieren">📋</button>
            <button class="lc-act a-del" data-id="${s.id}" title="Löschen">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');

    requestAnimationFrame(() => injectPreviews(items, scale, listScale));
    bindActions(grid);
  }

  function injectPreviews(items, scale, listScale) {
    const map = new Map(items.map(s => [s.id, s]));
    const containers = document.querySelectorAll('.lc-preview-wrap, .lli-preview-wrap');
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) {
          const c = entry.target; if (c.dataset.loaded) return; c.dataset.loaded = '1';
          const s = map.get(c.dataset.id);
          if (s) createMiniIframe(c, s.htmlContent, c.classList.contains('lli-preview-wrap') ? listScale : scale);
          obs.unobserve(c);
        }});
      }, { rootMargin: '300px' });
      containers.forEach(c => obs.observe(c));
    } else {
      let d = 0;
      containers.forEach(c => { const s = map.get(c.dataset.id);
        if (s) { setTimeout(() => createMiniIframe(c, s.htmlContent, c.classList.contains('lli-preview-wrap') ? listScale : scale), d); d += 30; }
      });
    }
  }

  function createMiniIframe(container, html, scale) {
    // Iframe IS the container size. Content zoomed inside. No overflow possible.
    let cleanHtml = (html || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Inject zoom into the HTML before writing
    const zoomCss = `<style>html{zoom:${scale};overflow:hidden!important}body{overflow:hidden!important;width:794px;margin:0}</style>`;
    if (cleanHtml.includes('</head>')) cleanHtml = cleanHtml.replace('</head>', zoomCss + '</head>');
    else if (cleanHtml.includes('<body')) cleanHtml = cleanHtml.replace('<body', zoomCss + '<body');
    else cleanHtml = zoomCss + cleanHtml;

    const f = document.createElement('iframe');
    f.className = 'mini-frame';
    f.sandbox = 'allow-same-origin';
    f.setAttribute('tabindex', '-1');
    f.style.cssText = 'width:100%;height:100%;border:none;display:block;pointer-events:none';
    container.appendChild(f);
    requestAnimationFrame(() => {
      try { const d = f.contentDocument; d.open(); d.write(cleanHtml); d.close(); }
      catch (e) { container.innerHTML = '<div class="preview-fallback">📄</div>'; }
    });
  }

  function bindActions(grid) {
    // Checkbox toggle
    grid.querySelectorAll('.lib-chk').forEach(chk => {
      chk.addEventListener('click', e => e.stopPropagation());
      chk.addEventListener('change', e => {
        const id = chk.dataset.id;
        if (chk.checked) selected.add(id); else selected.delete(id);
        chk.closest('.lib-card,.lib-list-item')?.classList.toggle('lib-selected', chk.checked);
        updateBulkBar();
      });
    });
    grid.querySelectorAll('.lib-card,.lib-list-item').forEach(el => {
      el.addEventListener('click', async e => { if (e.target.closest('.abtn') || e.target.closest('.lc-act') || e.target.closest('.lib-chk') || e.target.closest('.fav-star')) return;
        const s = await PageForgeDB.get('snippets', el.dataset.id);
        if (s) PageForgeEvents.emit(PageForgeEvents.EVENTS.SNIPPET_EDIT, s);
      });
    });
    grid.querySelectorAll('.a-edit').forEach(b => b.addEventListener('click', async e => {
      e.stopPropagation(); const s = await PageForgeDB.get('snippets', b.dataset.id);
      if (s) PageForgeEvents.emit(PageForgeEvents.EVENTS.SNIPPET_EDIT, s);
    }));
    grid.querySelectorAll('.a-dup').forEach(b => b.addEventListener('click', async e => {
      e.stopPropagation(); const o = await PageForgeDB.get('snippets', b.dataset.id); if (!o) return;
      const c = { ...o, title: o.title + ' (Kopie)', version: 1, versions: [] }; delete c.id; delete c.createdAt; delete c.updatedAt;
      await PageForgeDB.saveSnippet(c); refresh();
      PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: 'Dupliziert', type: 'success' });
    }));
    grid.querySelectorAll('.a-del').forEach(b => b.addEventListener('click', async e => {
      e.stopPropagation(); const s = await PageForgeDB.get('snippets', b.dataset.id);
      if (!s || !confirm(`"${s.title}" löschen?`)) return;
      await PageForgeDB.remove('snippets', s.id); refresh();
      PageForgeEvents.emit(PageForgeEvents.EVENTS.SNIPPET_DELETED, { id: s.id });
      PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: 'Gelöscht', type: 'info' });
    }));
    grid.querySelectorAll('.fav-star').forEach(b => b.addEventListener('click', async e => {
      e.stopPropagation(); const s = await PageForgeDB.get('snippets', b.dataset.id); if (!s) return;
      s.favorite = !s.favorite; await PageForgeDB.saveSnippet(s);
      b.textContent = s.favorite ? '★' : '☆';
      b.classList.toggle('fav-on', s.favorite);
      const idx = allSnippets.findIndex(x => x.id === s.id);
      if (idx >= 0) allSnippets[idx].favorite = s.favorite;
    }));
  }

  // ── Bulk Actions ──

  function updateBulkBar() {
    const bar = $('lib-bulk-bar');
    if (selected.size > 0) {
      bar.style.display = '';
      $('bulk-count').textContent = selected.size;
      $('bulk-sel-all').checked = selected.size === getFiltered().length;
    } else {
      bar.style.display = 'none';
    }
  }

  async function bulkDelete() {
    if (!selected.size) return;
    if (!confirm(`${selected.size} Seiten löschen?`)) return;
    for (const id of selected) {
      await PageForgeDB.remove('snippets', id);
      PageForgeEvents.emit(PageForgeEvents.EVENTS.SNIPPET_DELETED, { id });
    }
    selected.clear(); updateBulkBar(); refresh();
    PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: `${selected.size || 'Alle'} gelöscht`, type: 'info' });
  }

  async function bulkStatus() {
    if (!selected.size) return;
    const status = prompt('Neuer Status (draft / review / final):');
    if (!status || !['draft', 'review', 'final'].includes(status)) { toast('Ungültiger Status', 'warning'); return; }
    for (const id of selected) {
      const s = await PageForgeDB.get('snippets', id);
      if (s) { s.status = status; await PageForgeDB.saveSnippet(s); }
    }
    selected.clear(); updateBulkBar(); refresh();
    PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: `Status geändert`, type: 'success' });
  }

  async function bulkCollection() {
    if (!selected.size) return;
    const collections = await PageForgeDB.getAll('collections');
    if (!collections.length) { toast('Keine Collections vorhanden', 'warning'); return; }
    const choices = collections.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
    const pick = prompt(`Zu Collection hinzufügen:\n${choices}\n\nNummer eingeben:`);
    if (!pick) return;
    const idx = parseInt(pick) - 1;
    const col = collections[idx];
    if (!col) { toast('Ungültige Auswahl', 'warning'); return; }

    // Add as standalone pages
    if (!col.items) col.items = [];
    const existing = new Set();
    col.items.forEach(item => {
      if (item.type === 'page') existing.add(item.snippetId);
      if (item.type === 'chapter') item.snippetIds?.forEach(id => existing.add(id));
    });
    let added = 0;
    for (const id of selected) {
      if (!existing.has(id)) { col.items.push({ type: 'page', snippetId: id }); added++; }
    }
    await PageForgeDB.saveCollection(col);
    PageForgeEvents.emit(PageForgeEvents.EVENTS.COLLECTION_SAVED, col);
    selected.clear(); updateBulkBar(); render();
    toast(`${added} Seiten zu "${col.name}" hinzugefügt`, 'success');
  }

  function toast(msg, type) { PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: msg, type }); }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  return { init, refresh };
})();
