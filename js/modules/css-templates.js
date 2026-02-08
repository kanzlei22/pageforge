/**
 * PageForge CSS & Page Templates Module v4
 * Combined management for CSS templates and page templates
 */
const CssTemplatesModule = (() => {
  let activeSubTab = 'css';

  function $(id) { return document.getElementById(id); }

  function init() { buildUI(); bindEvents(); }

  function buildUI() {
    $('tab-css-templates').innerHTML = `
      <div class="css-layout">
        <div class="css-head">
          <div>
            <div class="sec-title">Templates</div>
            <div class="sec-sub">CSS-Designs und Seitenvorlagen verwalten</div>
          </div>
          <div class="css-tabs">
            <button class="tb2 tb2-sm css-tab active" data-sub="css">🎨 CSS Templates</button>
            <button class="tb2 tb2-sm css-tab" data-sub="page">📋 Seitenvorlagen</button>
          </div>
        </div>

        <!-- CSS Templates -->
        <div class="css-sub-panel" id="sub-css">
          <div class="css-actions"><button id="btn-new-css" class="tb2 tb2-primary tb2-sm">➕ Neues CSS Template</button></div>
          <div class="css-grid" id="css-grid"></div>
        </div>

        <!-- Page Templates -->
        <div class="css-sub-panel" id="sub-page" style="display:none">
          <div class="css-actions">
            <button id="btn-new-page-tpl" class="tb2 tb2-primary tb2-sm">➕ Neue Seitenvorlage</button>
            <button id="btn-save-as-tpl" class="tb2 tb2-outline tb2-sm">💾 Aktuelle Seite als Vorlage</button>
          </div>
          <div class="css-grid" id="page-tpl-grid"></div>
        </div>

        <!-- CSS Editor Modal -->
        <div class="modal-backdrop" id="modal-css-edit" style="display:none">
          <div class="modal-content modal-lg">
            <div class="modal-header"><h3 id="css-edit-title">CSS Template</h3><button class="modal-close" id="css-edit-close">✕</button></div>
            <div class="modal-body">
              <div style="display:flex;gap:10px;margin-bottom:10px">
                <input type="text" id="css-edit-name" class="search-inp" placeholder="Name…" style="flex:1" />
                <input type="text" id="css-edit-desc" class="search-inp" placeholder="Beschreibung…" style="flex:2" />
              </div>
              <div class="css-ed-split">
                <div class="css-ed-pane"><label class="swap-label">CSS Code</label>
                  <textarea id="css-edit-code" class="code-ta-v2" style="flex:1" spellcheck="false"></textarea></div>
                <div class="css-ed-pane"><label class="swap-label">Vorschau</label>
                  <iframe id="css-edit-preview" class="css-ed-frame" sandbox="allow-same-origin"></iframe></div>
              </div>
            </div>
            <div class="modal-footer">
              <button id="css-edit-delete" class="tb2 tb2-ghost tb2-sm" style="color:var(--err)">🗑️ Löschen</button>
              <button id="css-edit-save" class="tb2 tb2-primary">💾 Speichern</button>
            </div>
          </div>
        </div>

        <!-- Page Template Editor Modal -->
        <div class="modal-backdrop" id="modal-ptpl-edit" style="display:none">
          <div class="modal-content modal-lg">
            <div class="modal-header"><h3 id="ptpl-edit-title">Seitenvorlage</h3><button class="modal-close" id="ptpl-edit-close">✕</button></div>
            <div class="modal-body">
              <div style="display:flex;gap:10px;margin-bottom:10px">
                <input type="text" id="ptpl-edit-name" class="search-inp" placeholder="Name…" style="flex:1" />
                <input type="text" id="ptpl-edit-desc" class="search-inp" placeholder="Beschreibung…" style="flex:2" />
                <select id="ptpl-edit-cat" class="fsel"></select>
              </div>
              <div class="css-ed-split">
                <div class="css-ed-pane"><label class="swap-label">HTML Code</label>
                  <textarea id="ptpl-edit-code" class="code-ta-v2" style="flex:1" spellcheck="false"></textarea></div>
                <div class="css-ed-pane"><label class="swap-label">Vorschau</label>
                  <iframe id="ptpl-edit-preview" class="css-ed-frame" sandbox="allow-same-origin"></iframe></div>
              </div>
            </div>
            <div class="modal-footer">
              <button id="ptpl-edit-delete" class="tb2 tb2-ghost tb2-sm" style="color:var(--err)">🗑️ Löschen</button>
              <button id="ptpl-edit-save" class="tb2 tb2-primary">💾 Speichern</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function bindEvents() {
    document.querySelectorAll('.css-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.css-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeSubTab = btn.dataset.sub;
        $('sub-css').style.display = activeSubTab === 'css' ? '' : 'none';
        $('sub-page').style.display = activeSubTab === 'page' ? '' : 'none';
      });
    });

    // CSS
    $('btn-new-css').addEventListener('click', () => openCssEditor(null));
    $('css-edit-close').addEventListener('click', () => $('modal-css-edit').style.display = 'none');
    $('modal-css-edit').addEventListener('click', e => { if (e.target.id === 'modal-css-edit') e.target.style.display = 'none'; });
    $('css-edit-code').addEventListener('input', () => previewCss());
    $('css-edit-save').addEventListener('click', saveCssTemplate);
    $('css-edit-delete').addEventListener('click', deleteCssTemplate);

    // Page templates
    $('btn-new-page-tpl').addEventListener('click', () => openPtplEditor(null));
    $('btn-save-as-tpl').addEventListener('click', saveCurrentAsTpl);
    $('ptpl-edit-close').addEventListener('click', () => $('modal-ptpl-edit').style.display = 'none');
    $('modal-ptpl-edit').addEventListener('click', e => { if (e.target.id === 'modal-ptpl-edit') e.target.style.display = 'none'; });
    $('ptpl-edit-code').addEventListener('input', () => previewPtpl());
    $('ptpl-edit-save').addEventListener('click', savePtpl);
    $('ptpl-edit-delete').addEventListener('click', deletePtpl);
  }

  // ── CSS Templates ──

  let editingCssId = null;

  async function renderCssGrid() {
    const templates = await PageForgeDB.getAll('cssTemplates');
    const grid = $('css-grid');
    grid.innerHTML = templates.map(t => `
      <div class="css-card" data-id="${t.id}">
        <div class="css-card-prev"><iframe class="css-card-frame" sandbox="allow-same-origin" data-css-id="${t.id}"></iframe></div>
        <div class="css-card-body"><strong>${esc(t.name)}</strong><span>${esc(t.description || '')}</span></div>
      </div>`).join('');

    grid.querySelectorAll('iframe[data-css-id]').forEach(f => {
      const t = templates.find(x => x.id === f.dataset.cssId);
      if (t) requestAnimationFrame(() => {
        try { const d = f.contentDocument; d.open();
          d.write(`<style>${t.css}</style><body><h1>Überschrift</h1><h2>Abschnitt</h2><p>Beispieltext für die Vorschau des Templates.</p>
            <div class="highlight"><strong>Tipp:</strong> Hervorgehobener Bereich</div></body>`);
          d.close(); } catch (e) {}
      });
    });

    grid.querySelectorAll('.css-card').forEach(card => {
      card.addEventListener('click', () => openCssEditor(card.dataset.id));
    });
  }

  async function openCssEditor(id) {
    editingCssId = id;
    if (id) {
      const t = await PageForgeDB.get('cssTemplates', id);
      if (!t) return;
      $('css-edit-name').value = t.name;
      $('css-edit-desc').value = t.description || '';
      $('css-edit-code').value = t.css;
      $('css-edit-title').textContent = 'CSS Template bearbeiten';
      $('css-edit-delete').style.display = '';
    } else {
      $('css-edit-name').value = '';
      $('css-edit-desc').value = '';
      $('css-edit-code').value = '';
      $('css-edit-title').textContent = 'Neues CSS Template';
      $('css-edit-delete').style.display = 'none';
    }
    $('modal-css-edit').style.display = 'flex';
    previewCss();
  }

  function previewCss() {
    const css = $('css-edit-code').value;
    const f = $('css-edit-preview');
    try { const d = f.contentDocument; d.open();
      d.write(`<style>${css}</style><body><h1>Überschrift</h1><h2>Abschnitt</h2><p>Beispieltext.</p>
        <div class="highlight"><strong>Tipp:</strong> Highlight-Bereich</div>
        <table><tr><th>Spalte A</th><th>Spalte B</th></tr><tr><td>Wert 1</td><td>Wert 2</td></tr></table></body>`);
      d.close(); } catch (e) {}
  }

  async function saveCssTemplate() {
    const name = $('css-edit-name').value.trim();
    if (!name) { toast('Name eingeben', 'warning'); return; }
    const data = {
      id: editingCssId || 'css_' + Date.now(),
      name, description: $('css-edit-desc').value.trim(),
      css: $('css-edit-code').value
    };
    await PageForgeDB.put('cssTemplates', data);
    $('modal-css-edit').style.display = 'none';
    renderCssGrid();
    PageForgeEvents.emit(PageForgeEvents.EVENTS.CSS_TEMPLATE_CHANGED);
    toast('Gespeichert', 'success');
  }

  async function deleteCssTemplate() {
    if (!editingCssId || !confirm('Template löschen?')) return;
    await PageForgeDB.remove('cssTemplates', editingCssId);
    $('modal-css-edit').style.display = 'none';
    renderCssGrid();
    toast('Gelöscht', 'info');
  }

  // ── Page Templates ──

  let editingPtplId = null;

  async function renderPageTplGrid() {
    const templates = await PageForgeDB.getAll('pageTemplates');
    const cats = await PageForgeDB.getAll('categories');
    const grid = $('page-tpl-grid');
    grid.innerHTML = templates.map(t => {
      const cat = cats.find(c => c.id === t.category);
      return `<div class="css-card" data-id="${t.id}">
        <div class="css-card-prev"><iframe class="css-card-frame" sandbox="allow-same-origin" data-tpl-id="${t.id}"></iframe></div>
        <div class="css-card-body"><strong>${esc(t.name)}</strong><span>${cat ? cat.icon + ' ' : ''}${esc(t.description || '')}</span></div>
      </div>`;
    }).join('');

    grid.querySelectorAll('iframe[data-tpl-id]').forEach(f => {
      const t = templates.find(x => x.id === f.dataset.tplId);
      if (t) requestAnimationFrame(() => {
        try { const d = f.contentDocument; d.open();
          d.write(PageForgePlaceholders.highlight(t.htmlContent || ''));
          d.close(); } catch (e) {}
      });
    });

    grid.querySelectorAll('.css-card').forEach(card => {
      card.addEventListener('click', () => openPtplEditor(card.dataset.id));
    });

    // Load categories into editor dropdown
    const catSel = $('ptpl-edit-cat');
    catSel.innerHTML = '<option value="">Kategorie…</option>';
    cats.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.icon} ${c.name}`; catSel.appendChild(o); });
  }

  async function openPtplEditor(id) {
    editingPtplId = id;
    const cats = await PageForgeDB.getAll('categories');
    const catSel = $('ptpl-edit-cat');
    catSel.innerHTML = '<option value="">Kategorie…</option>';
    cats.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.icon} ${c.name}`; catSel.appendChild(o); });

    if (id) {
      const t = await PageForgeDB.get('pageTemplates', id);
      if (!t) return;
      $('ptpl-edit-name').value = t.name;
      $('ptpl-edit-desc').value = t.description || '';
      $('ptpl-edit-cat').value = t.category || '';
      $('ptpl-edit-code').value = t.htmlContent || '';
      $('ptpl-edit-title').textContent = 'Vorlage bearbeiten';
      $('ptpl-edit-delete').style.display = '';
    } else {
      $('ptpl-edit-name').value = '';
      $('ptpl-edit-desc').value = '';
      $('ptpl-edit-cat').value = '';
      $('ptpl-edit-code').value = DEFAULT_PAGE_HTML;
      $('ptpl-edit-title').textContent = 'Neue Seitenvorlage';
      $('ptpl-edit-delete').style.display = 'none';
    }
    $('modal-ptpl-edit').style.display = 'flex';
    previewPtpl();
  }

  const DEFAULT_PAGE_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body { font-family: 'Segoe UI', sans-serif; padding: 25mm; color: #333; line-height: 1.6; min-height: 297mm; width: 210mm; box-sizing: border-box; }
h1 { font-size: 22pt; color: #1a365d; }
</style></head><body>
<h1>Titel</h1>
<p>Inhalt hier…</p>
</body></html>`;

  function previewPtpl() {
    const html = $('ptpl-edit-code').value;
    const f = $('ptpl-edit-preview');
    try { const d = f.contentDocument; d.open();
      d.write(PageForgePlaceholders.highlight(html)); d.close(); } catch (e) {}
  }

  async function savePtpl() {
    const name = $('ptpl-edit-name').value.trim();
    if (!name) { toast('Name eingeben', 'warning'); return; }
    const data = {
      id: editingPtplId || 'tpl_' + Date.now(),
      name, description: $('ptpl-edit-desc').value.trim(),
      category: $('ptpl-edit-cat').value || null,
      htmlContent: $('ptpl-edit-code').value
    };
    await PageForgeDB.put('pageTemplates', data);
    $('modal-ptpl-edit').style.display = 'none';
    renderPageTplGrid();
    toast('Vorlage gespeichert', 'success');
  }

  async function deletePtpl() {
    if (!editingPtplId || !confirm('Vorlage löschen?')) return;
    await PageForgeDB.remove('pageTemplates', editingPtplId);
    $('modal-ptpl-edit').style.display = 'none';
    renderPageTplGrid();
    toast('Gelöscht', 'info');
  }

  async function saveCurrentAsTpl() {
    // This gets the current editor snippet
    toast('Öffne eine Seite im Editor und nutze dann diese Funktion', 'info');
    // We'll use an event to request the current snippet
    const snippets = await PageForgeDB.getAll('snippets');
    if (!snippets.length) return;
    const latest = snippets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
    const name = prompt('Vorlagenname:', `Vorlage – ${latest.title}`);
    if (!name) return;
    await PageForgeDB.put('pageTemplates', {
      id: 'tpl_' + Date.now(), name,
      description: `Basiert auf "${latest.title}"`,
      category: latest.category || null,
      htmlContent: latest.htmlContent
    });
    renderPageTplGrid();
    toast(`"${name}" als Vorlage gespeichert`, 'success');
  }

  async function refresh() { await renderCssGrid(); await renderPageTplGrid(); }

  function toast(m, t) { PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: m, type: t }); }
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  return { init, refresh };
})();
