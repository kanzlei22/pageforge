/**
 * PageForge Library Module v5
 * - Tag cloud for quick filtering
 * - Extended zoom range (120-700px) for large monitors
 * - Adjustable list view thumbnails
 * - Lazy iframe previews
 */
const LibraryModule = (() => {
  let allSnippets = [], allCategories = [], allTags = [];
  let filters = { query: '', category: '', status: '', tag: '' };
  let viewMode = 'grid';
  let previewHeight = 250;

  function $(id) { return document.getElementById(id); }

  function init() {
    buildUI(); bindEvents();
    PageForgeEvents.on(PageForgeEvents.EVENTS.SNIPPET_SAVED, refresh);
    PageForgeEvents.on(PageForgeEvents.EVENTS.SNIPPET_UPDATED, refresh);
    PageForgeEvents.on(PageForgeEvents.EVENTS.SNIPPET_DELETED, refresh);
    PageForgeEvents.on(PageForgeEvents.EVENTS.LIBRARY_REFRESH, refresh);
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
              <input type="range" id="lib-preview-size" min="120" max="700" value="250" class="size-slider" />
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
            <span class="lib-count" id="lib-count"></span>
          </div>
          <div class="lib-tagcloud" id="lib-tagcloud"></div>
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
    document.querySelectorAll('.vbtn').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.vbtn').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); viewMode = b.dataset.v; render();
    }));
    $('lib-preview-size').addEventListener('input', e => { previewHeight = parseInt(e.target.value); updateSizes(); });
  }

  function updateSizes() {
    const scale = previewHeight / 1123, w = Math.round(794 * scale);
    const grid = $('lib-grid');
    if (viewMode === 'grid') {
      grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${w + 20}px, 1fr))`;
      document.querySelectorAll('.lc-preview-wrap').forEach(c => {
        c.style.height = previewHeight + 'px';
        const f = c.querySelector('.mini-frame');
        if (f) try { f.contentDocument.documentElement.style.zoom = scale; } catch (e) {}
      });
    }
    if (viewMode === 'list') {
      const lH = Math.max(50, Math.round(previewHeight * 0.8)), lW = Math.round(lH * 794 / 1123), lS = lH / 1123;
      document.querySelectorAll('.lli-preview-wrap').forEach(c => {
        c.style.width = lW + 'px'; c.style.height = lH + 'px';
        const f = c.querySelector('.mini-frame');
        if (f) try { f.contentDocument.documentElement.style.zoom = lS; } catch (e) {}
      });
    }
  }

  async function refresh() {
    allSnippets = await PageForgeDB.getAll('snippets');
    allCategories = await PageForgeDB.getAll('categories');
    allTags = await PageForgeDB.getAll('tags');

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
        && (!filters.tag || s.tags?.includes(filters.tag));
    }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function render() {
    const grid = $('lib-grid'), items = getFiltered();
    $('lib-count').textContent = `${items.length} von ${allSnippets.length}`;

    if (!items.length) {
      grid.className = 'lib-grid'; grid.style.gridTemplateColumns = '';
      grid.innerHTML = `<div class="lib-empty"><div class="lib-empty-ico">${allSnippets.length ? '🔍' : '📄'}</div>
        <p class="lib-empty-t">${allSnippets.length ? 'Keine Treffer' : 'Noch keine Seiten'}</p></div>`;
      return;
    }

    const stMap = { draft: '⏳ Entwurf', review: '🔍 Review', final: '✅ Final' };
    const scale = previewHeight / 1123, cardW = Math.round(794 * scale) + 20;
    const listH = Math.max(50, Math.round(previewHeight * 0.8)), listW = Math.round(listH * 794 / 1123), listScale = listH / 1123;

    if (viewMode === 'list') { grid.className = 'lib-list'; grid.style.gridTemplateColumns = ''; }
    else { grid.className = 'lib-grid'; grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${cardW}px, 1fr))`; }

    grid.innerHTML = items.map(s => {
      const cat = allCategories.find(c => c.id === s.category);
      const date = new Date(s.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
      if (viewMode === 'list') {
        return `<div class="lib-list-item" data-id="${s.id}">
          <div class="lli-preview-wrap" data-id="${s.id}" style="width:${listW}px;height:${listH}px"></div>
          <div class="lli-info"><div class="lli-title">${esc(s.title)}</div>
            <div class="lli-meta">${cat ? `<span>${cat.icon} ${cat.name}</span>` : ''}
              <span class="status-badge sb-${s.status}">${stMap[s.status] || ''}</span>
              <span class="meta-dim">${date} · v${s.version || 1}</span></div>
            <div class="lli-tags">${(s.tags || []).map(t => `<span class="tag-chip">${esc(t)}</span>`).join('')}</div></div>
          <div class="lli-acts"><button class="abtn a-edit" data-id="${s.id}">✏️</button><button class="abtn a-dup" data-id="${s.id}">📋</button><button class="abtn a-del" data-id="${s.id}">🗑️</button></div>
        </div>`;
      }
      return `<div class="lib-card" data-id="${s.id}">
        <div class="lc-preview-wrap" data-id="${s.id}" style="height:${previewHeight}px"></div>
        <div class="lc-body"><div class="lc-title">${esc(s.title)}</div>
          <div class="lc-meta">${cat ? `<span>${cat.icon} ${cat.name}</span>` : ''}<span class="status-badge sb-${s.status}">${stMap[s.status] || ''}</span></div>
          <div class="lc-tags">${(s.tags || []).slice(0, 3).map(t => `<span class="tag-chip">${esc(t)}</span>`).join('')}</div>
          <div class="lc-foot"><span class="meta-dim">${date} · v${s.version || 1}</span>
            <div class="lc-acts"><button class="abtn a-dup" data-id="${s.id}">📋</button><button class="abtn a-del" data-id="${s.id}">🗑️</button></div></div></div>
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
    grid.querySelectorAll('.lib-card,.lib-list-item').forEach(el => {
      el.addEventListener('click', async e => { if (e.target.closest('.abtn')) return;
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
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  return { init, refresh };
})();
