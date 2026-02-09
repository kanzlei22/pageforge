/**
 * PageForge Editor Module v4
 * - Image management modal
 * - New-from-template flow
 * - Placeholder highlighting in preview
 * - CSS swap with original preservation + save as template
 */
const EditorModule = (() => {
  let currentSnippet = null;
  let codeDrawerOpen = false;
  let extractedCss = '';
  let extractedHtml = '';

  function init() {
    buildUI();
    bindEvents();
    loadDropdowns();
    PageForgeEvents.on(PageForgeEvents.EVENTS.SNIPPET_EDIT, loadSnippet);
    PageForgeEvents.on(PageForgeEvents.EVENTS.CSS_TEMPLATE_CHANGED, loadDropdowns);
    PageForgeEvents.on(PageForgeEvents.EVENTS.CATEGORY_ADDED, loadDropdowns);
    PageForgeEvents.on(PageForgeEvents.EVENTS.COLLECTION_SAVED, loadCollectionDropdown);
    PageForgeEvents.on(PageForgeEvents.EVENTS.COLLECTION_DELETED, loadCollectionDropdown);
  }

  function $(id) { return document.getElementById(id); }

  function buildUI() {
    const c = $('tab-editor');
    c.innerHTML = `
      <div class="editor-v2">
        <div class="editor-toolbar-v2">
          <div class="etb-left">
            <input type="text" id="editor-title" class="title-input-v2" placeholder="Seitenname…" spellcheck="false" />
            <select id="editor-category" class="tsel-v2"><option value="">Kategorie…</option></select>
            <select id="editor-status" class="tsel-v2">
              <option value="draft">⏳ Entwurf</option>
              <option value="review">🔍 Review</option>
              <option value="final">✅ Final</option>
            </select>
          </div>
          <div class="etb-center">
            <div class="zoom-group">
              <button class="zbtn" data-zoom="50">50%</button>
              <button class="zbtn active" data-zoom="75">75%</button>
              <button class="zbtn" data-zoom="100">100%</button>
              <button class="zbtn" data-zoom="fit">Fit</button>
            </div>
          </div>
          <div class="etb-right">
            <input type="text" id="editor-tags" class="tags-input-v2" placeholder="Tags (kommagetrennt)…" />
            <select id="editor-collection" class="tsel-v2" title="Zu Collection hinzufügen"><option value="">📑 Collection…</option></select>
            <button id="btn-code-drawer" class="tb2 tb2-outline" title="HTML Code">{ } Code</button>
            <button id="btn-css-swap" class="tb2 tb2-outline" title="CSS austauschen">🎨 CSS</button>
            <button id="btn-images" class="tb2 tb2-outline" title="Bilder verwalten">🖼️</button>
            <button id="btn-placeholders" class="tb2 tb2-outline" title="Platzhalter einfügen">{{ }}</button>
            <button id="btn-preview-print" class="tb2 tb2-outline" title="Drucken">🖨️</button>
            <button id="btn-save-snippet" class="tb2 tb2-primary" title="⌘S">💾 Speichern</button>
            <button id="btn-save-new-version" class="tb2 tb2-ghost" title="Neue Version" style="display:none">v+</button>
            <button id="btn-version-history" class="tb2 tb2-ghost" title="Versionshistorie" style="display:none">📜</button>
            <button id="btn-new-snippet" class="tb2 tb2-ghost" title="Neu">➕</button>
          </div>
        </div>

        <div class="preview-area-v2" id="preview-area">
          <div class="preview-empty-v2" id="preview-empty">
            <div class="pe-icon">⚒️</div>
            <h2>Neue Seite erstellen</h2>
            <p>Starte mit einer Vorlage oder füge eigenen Code ein</p>
            <div class="pe-actions">
              <button class="tb2 tb2-primary tb2-lg" id="btn-from-template">📋 Aus Vorlage</button>
              <button class="tb2 tb2-outline tb2-lg" id="btn-paste-start">{ } HTML Code einfügen</button>
            </div>
          </div>
          <div class="a4-container-v2" id="a4-container" style="display:none">
            <div class="a4-page-v2" id="a4-page">
              <iframe id="preview-frame" class="preview-iframe-v2" sandbox="allow-same-origin"></iframe>
            </div>
          </div>
        </div>

        <!-- Code Drawer -->
        <div class="code-drawer" id="code-drawer">
          <div class="drawer-head">
            <h3>HTML Code</h3>
            <div class="drawer-acts">
              <button id="btn-copy-code" class="tb2 tb2-ghost tb2-sm">📋 Kopieren</button>
              <button id="btn-apply-code" class="tb2 tb2-primary tb2-sm">✓ Anwenden</button>
              <button id="btn-close-drawer" class="drawer-x">✕</button>
            </div>
          </div>
          <textarea id="code-textarea" class="code-ta-v2" spellcheck="false" placeholder="HTML Code hier einfügen…"></textarea>
        </div>

        <!-- CSS Swap Modal -->
        <div class="modal-backdrop" id="modal-css-swap" style="display:none">
          <div class="modal-content modal-lg">
            <div class="modal-header"><h3>CSS Design austauschen</h3><button class="modal-close" id="css-swap-close">✕</button></div>
            <div class="modal-body css-swap-body">
              <div class="css-swap-left">
                <label class="swap-label">Templates & Original</label>
                <div class="css-tmpl-list" id="css-template-list"></div>
              </div>
              <div class="css-swap-right">
                <label class="swap-label">Aktuelles CSS <span class="label-badge">readonly</span></label>
                <textarea id="css-current-code" class="code-ta-v2 css-swap-ta" spellcheck="false" readonly></textarea>
                <label class="swap-label" style="margin-top:10px">Neues CSS <span class="label-badge">editierbar</span></label>
                <textarea id="css-new-code" class="code-ta-v2 css-swap-ta" spellcheck="false"></textarea>
              </div>
            </div>
            <div class="modal-footer"><span class="footer-note">Vorschau wird live aktualisiert</span><button id="btn-apply-css" class="tb2 tb2-primary">🎨 CSS anwenden</button></div>
          </div>
        </div>

        <!-- Template Picker Modal -->
        <div class="modal-backdrop" id="modal-templates" style="display:none">
          <div class="modal-content modal-lg">
            <div class="modal-header"><h3>Vorlage auswählen</h3><button class="modal-close" id="tpl-modal-close">✕</button></div>
            <div class="modal-body"><div class="tpl-grid" id="tpl-grid"></div></div>
          </div>
        </div>

        <!-- Image Manager Modal -->
        <div class="modal-backdrop" id="modal-images" style="display:none">
          <div class="modal-content modal-lg">
            <div class="modal-header"><h3>🖼️ Bilder</h3><button class="modal-close" id="img-modal-close">✕</button></div>
            <div class="modal-body">
              <div class="img-upload-zone" id="img-upload-zone">
                <span>📁 Bilder hierher ziehen oder <label class="img-upload-label">klicken<input type="file" id="img-file-input" accept="image/*" multiple hidden /></label></span>
              </div>
              <div class="img-gallery" id="img-gallery"></div>
            </div>
          </div>
        </div>

        <!-- Version History Modal -->
        <div class="modal-backdrop" id="modal-versions" style="display:none">
          <div class="modal-content modal-lg">
            <div class="modal-header"><h3>📜 Versionshistorie</h3><span id="ver-current-badge" class="meta-dim"></span><button class="modal-close" id="ver-modal-close">✕</button></div>
            <div class="modal-body"><div class="ver-list" id="ver-list"></div></div>
          </div>
        </div>

        <!-- Placeholder Picker -->
        <div class="placeholder-picker" id="placeholder-picker" style="display:none"></div>
      </div>
    `;
  }

  function bindEvents() {
    $('btn-code-drawer').addEventListener('click', toggleCodeDrawer);
    $('btn-paste-start').addEventListener('click', toggleCodeDrawer);
    $('btn-close-drawer').addEventListener('click', closeCodeDrawer);
    $('btn-apply-code').addEventListener('click', applyCode);
    $('btn-copy-code').addEventListener('click', copyCode);

    $('btn-css-swap').addEventListener('click', openCssSwap);
    $('css-swap-close').addEventListener('click', closeCssSwap);
    $('btn-apply-css').addEventListener('click', applyCssSwap);
    $('modal-css-swap').addEventListener('click', e => { if (e.target.id === 'modal-css-swap') closeCssSwap(); });
    $('css-new-code').addEventListener('input', () => {
      const c = $('css-new-code').value;
      if (c.trim()) previewWithCss(c);
    });

    $('btn-from-template').addEventListener('click', openTemplatePicker);
    $('tpl-modal-close').addEventListener('click', () => $('modal-templates').style.display = 'none');
    $('modal-templates').addEventListener('click', e => { if (e.target.id === 'modal-templates') e.target.style.display = 'none'; });

    $('btn-version-history').addEventListener('click', openVersionHistory);
    $('ver-modal-close').addEventListener('click', () => $('modal-versions').style.display = 'none');
    $('modal-versions').addEventListener('click', e => { if (e.target.id === 'modal-versions') e.target.style.display = 'none'; });

    $('btn-images').addEventListener('click', openImageManager);
    $('img-modal-close').addEventListener('click', () => $('modal-images').style.display = 'none');
    $('modal-images').addEventListener('click', e => { if (e.target.id === 'modal-images') e.target.style.display = 'none'; });
    $('img-file-input').addEventListener('change', handleImageUpload);
    setupImageDrop();

    $('btn-placeholders').addEventListener('click', togglePlaceholderPicker);
    $('btn-save-snippet').addEventListener('click', saveSnippet);
    $('btn-save-new-version').addEventListener('click', saveNewVersion);
    $('btn-new-snippet').addEventListener('click', newSnippet);
    $('btn-preview-print').addEventListener('click', printPreview);

    document.querySelectorAll('.zbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.zbtn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setZoom(btn.dataset.zoom);
      });
    });

    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (document.querySelector('.tab-btn.active')?.dataset?.tab === 'editor') saveSnippet();
      }
      if (e.key === 'Escape' && codeDrawerOpen) closeCodeDrawer();
    });

    $('code-textarea').addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = e.target, s = ta.selectionStart;
        ta.value = ta.value.substring(0, s) + '  ' + ta.value.substring(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + 2;
      }
    });
  }

  // ── CSS Extraction ──

  function parseHtmlAndCss(html) {
    const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let blocks = [], m;
    while ((m = re.exec(html)) !== null) blocks.push(m[1].trim());
    return { css: blocks.join('\n\n'), htmlShell: html.replace(re, '<!-- css-slot -->') };
  }

  function rebuildHtml(shell, css) {
    let replaced = false;
    let result = shell.replace(/<!-- css-slot -->/g, () => {
      if (!replaced) { replaced = true; return `<style>\n${css}\n</style>`; }
      return '';
    });
    if (!replaced) {
      if (result.includes('</head>')) return result.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
      return `<style>\n${css}\n</style>\n` + result;
    }
    return result;
  }

  // ── Code Drawer ──

  function toggleCodeDrawer() { codeDrawerOpen ? closeCodeDrawer() : openCodeDrawer(); }
  function openCodeDrawer() {
    codeDrawerOpen = true;
    $('code-drawer').classList.add('open');
    $('btn-code-drawer').classList.add('active');
    const ta = $('code-textarea');
    if (currentSnippet?.htmlContent) ta.value = currentSnippet.htmlContent;
    ta.focus();
  }
  function closeCodeDrawer() {
    codeDrawerOpen = false;
    $('code-drawer').classList.remove('open');
    $('btn-code-drawer').classList.remove('active');
  }

  function applyCode() {
    const code = $('code-textarea').value.trim();
    if (!code) return;
    if (!currentSnippet) currentSnippet = { htmlContent: '', status: 'draft', tags: [], versions: [] };
    currentSnippet.htmlContent = code;
    const parsed = parseHtmlAndCss(code);
    extractedCss = parsed.css; extractedHtml = parsed.htmlShell;
    if (!currentSnippet.originalCss) currentSnippet.originalCss = extractedCss;
    renderPreview();
    closeCodeDrawer();
    $('preview-empty').style.display = 'none';
    $('a4-container').style.display = '';
  }

  function copyCode() {
    const ta = $('code-textarea');
    if (currentSnippet?.htmlContent) ta.value = currentSnippet.htmlContent;
    navigator.clipboard.writeText(ta.value).then(() =>
      PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: 'Kopiert', type: 'success' }));
  }

  // ── CSS Swap ──

  async function openCssSwap() {
    if (!currentSnippet?.htmlContent) { toast('Erst HTML Code einfügen', 'warning'); return; }
    const p = parseHtmlAndCss(currentSnippet.htmlContent);
    extractedCss = p.css; extractedHtml = p.htmlShell;
    $('css-current-code').value = extractedCss;
    $('css-new-code').value = '';
    await loadCssTemplateList();
    $('modal-css-swap').style.display = 'flex';
  }

  function closeCssSwap() { $('modal-css-swap').style.display = 'none'; renderPreview(); }

  async function loadCssTemplateList() {
    const templates = await PageForgeDB.getAll('cssTemplates');
    const list = $('css-template-list');
    let html = '';

    if (currentSnippet?.originalCss) {
      const isCurrent = currentSnippet.originalCss === extractedCss;
      html += `<div class="css-tmpl-opt css-tmpl-original ${isCurrent ? 'css-tmpl-active' : ''}" data-action="restore">
        <div class="css-tmpl-row"><div><strong>↩ Original-CSS</strong><span>${isCurrent ? '✓ Aktiv' : 'Ursprüngliches Design'}</span></div>
        <button class="tb2 tb2-ghost tb2-sm css-save-tmpl-btn" data-action="save-original" title="Als Template speichern">💾</button></div></div>`;
    }
    if (currentSnippet?.originalCss && currentSnippet.originalCss !== extractedCss) {
      html += `<div class="css-tmpl-opt css-tmpl-current css-tmpl-active" data-action="current">
        <div class="css-tmpl-row"><div><strong>⬤ Aktuelles CSS</strong><span>✓ Wird verwendet</span></div>
        <button class="tb2 tb2-ghost tb2-sm css-save-tmpl-btn" data-action="save-current" title="Als Template speichern">💾</button></div></div>`;
    }
    if (currentSnippet?.originalCss) html += '<div class="css-tmpl-divider"></div>';

    html += templates.map(t => `<div class="css-tmpl-opt" data-id="${t.id}"><strong>${esc(t.name)}</strong><span>${esc(t.description || '')}</span></div>`).join('');
    list.innerHTML = html;

    list.querySelector('[data-action="restore"]')?.addEventListener('click', function() {
      selectOpt(this); $('css-new-code').value = currentSnippet.originalCss; previewWithCss(currentSnippet.originalCss);
    });
    list.querySelector('[data-action="current"]')?.addEventListener('click', function() {
      selectOpt(this); $('css-new-code').value = extractedCss; previewWithCss(extractedCss);
    });
    list.querySelectorAll('[data-id]').forEach(el => {
      el.addEventListener('click', async () => {
        selectOpt(el);
        const t = await PageForgeDB.get('cssTemplates', el.dataset.id);
        if (t) { $('css-new-code').value = t.css; previewWithCss(t.css); }
      });
    });
    list.querySelectorAll('.css-save-tmpl-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const css = btn.dataset.action === 'save-original' ? currentSnippet.originalCss : extractedCss;
        if (!css) return;
        const name = prompt('Template-Name:', `${currentSnippet.title || 'Seite'} – CSS`);
        if (!name) return;
        await PageForgeDB.put('cssTemplates', { id: 'css_' + Date.now(), name, description: `Aus "${currentSnippet.title || 'Seite'}"`, css });
        toast(`"${name}" gespeichert`, 'success');
        await loadCssTemplateList();
      });
    });

    function selectOpt(el) { list.querySelectorAll('.css-tmpl-opt').forEach(e => e.classList.remove('selected')); el.classList.add('selected'); }
  }

  function previewWithCss(css) { if (extractedHtml) renderToFrame($('preview-frame'), rebuildHtml(extractedHtml, css)); }

  function applyCssSwap() {
    const css = $('css-new-code').value.trim();
    if (!css) { toast('Kein neues CSS', 'warning'); return; }
    if (!currentSnippet.originalCss) currentSnippet.originalCss = extractedCss;
    currentSnippet.htmlContent = rebuildHtml(extractedHtml, css);
    extractedCss = css;
    $('code-textarea').value = currentSnippet.htmlContent;
    renderPreview();
    $('modal-css-swap').style.display = 'none';
    toast('CSS ausgetauscht ✓', 'success');
  }

  // ── Template Picker ──

  async function openTemplatePicker() {
    const templates = await PageForgeDB.getAll('pageTemplates');
    const categories = await PageForgeDB.getAll('categories');
    const grid = $('tpl-grid');
    grid.innerHTML = templates.map(t => {
      const cat = categories.find(c => c.id === t.category);
      return `<div class="tpl-card" data-id="${t.id}">
        <div class="tpl-preview" data-tpl-id="${t.id}"></div>
        <div class="tpl-info">
          <div class="tpl-name">${esc(t.name)}</div>
          <div class="tpl-desc">${cat ? `${cat.icon} ` : ''}${esc(t.description || '')}</div>
        </div>
      </div>`;
    }).join('');

    // Inject mini previews
    grid.querySelectorAll('.tpl-preview[data-tpl-id]').forEach(container => {
      const t = templates.find(x => x.id === container.dataset.tplId);
      if (t?.htmlContent) injectMiniIframe(container, PageForgePlaceholders.highlight(t.htmlContent), 0.18);
    });

    grid.querySelectorAll('.tpl-card').forEach(card => {
      card.addEventListener('click', async () => {
        const t = await PageForgeDB.get('pageTemplates', card.dataset.id);
        if (!t) return;
        currentSnippet = { htmlContent: t.htmlContent, status: 'draft', tags: [], versions: [], category: t.category || '' };
        const p = parseHtmlAndCss(t.htmlContent);
        extractedCss = p.css; extractedHtml = p.htmlShell;
        currentSnippet.originalCss = extractedCss;
        $('editor-title').value = '';
        $('editor-category').value = t.category || '';
        $('editor-status').value = 'draft';
        $('editor-tags').value = '';
        $('code-textarea').value = t.htmlContent;
        $('preview-empty').style.display = 'none';
        $('a4-container').style.display = '';
        renderPreview();
        $('modal-templates').style.display = 'none';
        $('editor-title').focus();
        toast('Vorlage geladen – Titel eingeben', 'info');
      });
    });

    $('modal-templates').style.display = 'flex';
  }

  // ── Image Manager ──

  async function openImageManager() {
    $('modal-images').style.display = 'flex';
    await refreshImageGallery();
  }

  async function refreshImageGallery() {
    const images = await PageForgeDB.getAll('images');
    const gallery = $('img-gallery');
    if (!images.length) {
      gallery.innerHTML = '<div class="img-empty">Noch keine Bilder hochgeladen</div>';
      return;
    }
    gallery.innerHTML = images.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(img => `
      <div class="img-card" data-id="${img.id}">
        <img src="${img.dataUrl}" alt="${esc(img.name)}" class="img-thumb" />
        <div class="img-card-info">
          <span class="img-card-name">${esc(img.name)}</span>
          <span class="img-card-size">${formatSize(img.size)}</span>
        </div>
        <div class="img-card-acts">
          <button class="tb2 tb2-primary tb2-sm img-insert-btn" data-id="${img.id}" title="In Code einfügen">Einfügen</button>
          <button class="tb2 tb2-ghost tb2-sm img-del-btn" data-id="${img.id}" title="Löschen">🗑️</button>
        </div>
      </div>
    `).join('');

    gallery.querySelectorAll('.img-insert-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const img = await PageForgeDB.get('images', btn.dataset.id);
        if (!img) return;
        const tag = `<img src="${img.dataUrl}" alt="${img.name}" style="max-width:100%;" />`;
        // Insert into code textarea
        const ta = $('code-textarea');
        if (codeDrawerOpen) {
          const pos = ta.selectionStart;
          ta.value = ta.value.substring(0, pos) + tag + ta.value.substring(ta.selectionEnd);
          ta.selectionStart = ta.selectionEnd = pos + tag.length;
          ta.focus();
        } else {
          navigator.clipboard.writeText(tag);
        }
        toast(codeDrawerOpen ? 'Bild eingefügt' : 'IMG-Tag kopiert', 'success');
      });
    });

    gallery.querySelectorAll('.img-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bild löschen?')) return;
        await PageForgeDB.remove('images', btn.dataset.id);
        await refreshImageGallery();
        toast('Gelöscht', 'info');
      });
    });
  }

  function handleImageUpload(e) {
    const files = e.target.files;
    if (!files.length) return;
    Array.from(files).forEach(processImageFile);
    e.target.value = '';
  }

  function setupImageDrop() {
    const zone = $('img-upload-zone');
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-active'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-active'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-active');
      Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).forEach(processImageFile);
    });
  }

  function processImageFile(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      await PageForgeDB.put('images', {
        id, name: file.name, dataUrl: reader.result,
        mimeType: file.type, size: file.size, createdAt: new Date().toISOString()
      });
      await refreshImageGallery();
      toast(`"${file.name}" hochgeladen`, 'success');
    };
    reader.readAsDataURL(file);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // ── Placeholder Picker ──

  function togglePlaceholderPicker() {
    const picker = $('placeholder-picker');
    if (picker.style.display === 'flex') { picker.style.display = 'none'; return; }
    picker.innerHTML = PageForgePlaceholders.PLACEHOLDERS.map(p =>
      `<button class="ph-btn" data-key="${p.key}"><code>{{${p.key}}}</code><span>${p.desc}</span></button>`
    ).join('');
    picker.style.display = 'flex';

    picker.querySelectorAll('.ph-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = `{{${btn.dataset.key}}}`;
        const ta = $('code-textarea');
        if (codeDrawerOpen) {
          const pos = ta.selectionStart;
          ta.value = ta.value.substring(0, pos) + tag + ta.value.substring(ta.selectionEnd);
          ta.selectionStart = ta.selectionEnd = pos + tag.length;
          ta.focus();
        } else {
          navigator.clipboard.writeText(tag);
        }
        toast(codeDrawerOpen ? `${tag} eingefügt` : `${tag} kopiert`, 'info');
        picker.style.display = 'none';
      });
    });
  }

  // ── Rendering ──

  function renderPreview() {
    if (!currentSnippet?.htmlContent) return;
    // Highlight placeholders in preview
    const highlighted = PageForgePlaceholders.highlight(currentSnippet.htmlContent);
    renderToFrame($('preview-frame'), highlighted);
  }

  function renderToFrame(frame, html) {
    const clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    const doc = frame.contentDocument;
    doc.open(); doc.write(clean); doc.close();
  }

  function setZoom(level) {
    const page = $('a4-page'), area = $('preview-area');
    if (level === 'fit') {
      const s = Math.min((area.clientWidth - 60) / 794, (area.clientHeight - 40) / 1123, 1);
      page.style.transform = `scale(${s})`;
    } else {
      page.style.transform = `scale(${parseInt(level) / 100})`;
    }
    page.style.transformOrigin = 'top center';
  }

  function printPreview() {
    if (!currentSnippet?.htmlContent) { toast('Nichts zum Drucken', 'warning'); return; }
    const w = window.open('', '_blank', 'width=800,height=1100');
    if (!w) { toast('Popup blockiert', 'error'); return; }
    w.document.write(currentSnippet.htmlContent);
    w.document.close();
    w.onload = () => setTimeout(() => { w.focus(); w.print(); }, 300);
  }

  // ── Dropdowns ──

  async function loadDropdowns() {
    const cats = await PageForgeDB.getAll('categories');
    const sel = $('editor-category');
    if (!sel) return;
    const v = sel.value;
    sel.innerHTML = '<option value="">Kategorie…</option>';
    cats.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.icon} ${c.name}`; sel.appendChild(o); });
    sel.value = v;
    await loadCollectionDropdown();
  }

  async function loadCollectionDropdown() {
    const colSel = $('editor-collection');
    if (!colSel) return;
    const cv = colSel.value;
    const collections = await PageForgeDB.getAll('collections');
    colSel.innerHTML = '<option value="">📑 Collection…</option>';
    collections.forEach(col => {
      const pages = (col.items || []).reduce((s, i) => s + (i.type === 'chapter' ? (i.snippetIds?.length || 0) : 1), 0);
      const o = document.createElement('option');
      o.value = col.id;
      o.textContent = `📑 ${col.name} (${pages})`;
      colSel.appendChild(o);
    });
    colSel.value = cv;
  }

  function detectCollectionMembership(snippetId) {
    if (!snippetId) return '';
    return new Promise(async resolve => {
      const collections = await PageForgeDB.getAll('collections');
      for (const col of collections) {
        for (const item of (col.items || [])) {
          if (item.type === 'page' && item.snippetId === snippetId) return resolve(col.id);
          if (item.type === 'chapter' && item.snippetIds?.includes(snippetId)) return resolve(col.id);
        }
      }
      resolve('');
    });
  }

  async function addSnippetToCollection(snippetId) {
    const colId = $('editor-collection')?.value;
    if (!colId) return;
    const col = await PageForgeDB.get('collections', colId);
    if (!col) return;
    if (!col.items) col.items = [];

    // Check if already in this collection
    const alreadyIn = col.items.some(item =>
      (item.type === 'page' && item.snippetId === snippetId) ||
      (item.type === 'chapter' && item.snippetIds?.includes(snippetId))
    );
    if (alreadyIn) return;

    col.items.push({ type: 'page', snippetId });
    await PageForgeDB.saveCollection(col);
    PageForgeEvents.emit(PageForgeEvents.EVENTS.COLLECTION_SAVED, col);
  }

  // ── Save ──

  async function saveSnippet() {
    const title = $('editor-title').value.trim();
    if (!title) { $('editor-title').focus(); $('editor-title').classList.add('input-error'); setTimeout(() => $('editor-title').classList.remove('input-error'), 1500); toast('Bitte Titel eingeben', 'warning'); return; }
    if (!currentSnippet?.htmlContent) { toast('Kein HTML Code', 'warning'); return; }
    const isNew = !currentSnippet.id;
    const tags = $('editor-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    currentSnippet.title = title;
    currentSnippet.category = $('editor-category').value || null;
    currentSnippet.status = $('editor-status').value;
    currentSnippet.tags = tags;
    const saved = await PageForgeDB.saveSnippet(currentSnippet);
    currentSnippet = saved;
    for (const tag of tags) await PageForgeDB.put('tags', { id: tag.toLowerCase().replace(/\s+/g, '-'), name: tag });
    if (isNew) await addSnippetToCollection(saved.id);
    showVersionButtons(true);
    PageForgeEvents.emit(PageForgeEvents.EVENTS.SNIPPET_SAVED, saved);
    const colVal = $('editor-collection')?.value;
    toast(`"${title}" gespeichert${colVal && isNew ? ' + Collection' : ''}`, 'success');
  }

  async function saveNewVersion() {
    if (!currentSnippet?.id) return;
    const note = prompt('Was wurde geändert? (optional):', '');
    if (note === null) return; // cancelled
    const u = await PageForgeDB.createNewVersion(currentSnippet.id, note);
    u.htmlContent = currentSnippet.htmlContent;
    u.originalCss = currentSnippet.originalCss;
    u.category = $('editor-category').value || null;
    u.status = $('editor-status').value;
    u.tags = $('editor-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    await PageForgeDB.put('snippets', u);
    currentSnippet = u;
    showVersionButtons(true);
    PageForgeEvents.emit(PageForgeEvents.EVENTS.SNIPPET_UPDATED, u);
    toast(`Version ${u.version}${note ? ': ' + note : ''}`, 'success');
  }

  function showVersionButtons(show) {
    $('btn-save-new-version').style.display = show ? '' : 'none';
    const hasVersions = currentSnippet?.versions?.length > 0;
    $('btn-version-history').style.display = show && hasVersions ? '' : 'none';
  }

  async function openVersionHistory() {
    if (!currentSnippet?.id) return;
    // Re-read from DB to get latest versions
    const fresh = await PageForgeDB.get('snippets', currentSnippet.id);
    if (!fresh) return;
    const versions = fresh.versions || [];
    if (!versions.length) { toast('Keine älteren Versionen', 'info'); return; }

    $('ver-current-badge').textContent = `Aktuelle Version: v${fresh.version}`;
    const stMap = { draft: '⏳ Entwurf', review: '🔍 Review', final: '✅ Final' };
    const list = $('ver-list');
    list.innerHTML = versions.slice().reverse().map((v, ri) => {
      const idx = versions.length - 1 - ri;
      const date = new Date(v.savedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
      return `<div class="ver-item" data-idx="${idx}">
        <div class="ver-preview" data-vidx="${idx}"></div>
        <div class="ver-info">
          <div class="ver-title">Version ${v.version}</div>
          ${v.note ? `<div class="ver-note">${esc(v.note)}</div>` : ''}
          <div class="ver-meta">${stMap[v.status] || ''} · ${date}</div>
        </div>
        <div class="ver-actions">
          <button class="tb2 tb2-outline tb2-sm ver-restore" data-idx="${idx}">↩️ Laden</button>
        </div>
      </div>`;
    }).join('');

    // Inject previews
    list.querySelectorAll('.ver-preview[data-vidx]').forEach(container => {
      const idx = parseInt(container.dataset.vidx);
      const v = versions[idx];
      if (v?.htmlContent) injectMiniIframe(container, v.htmlContent, 0.12);
    });

    // Bind restore
    list.querySelectorAll('.ver-restore').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const v = versions[idx];
        if (!v || !confirm(`Version ${v.version} laden? Der aktuelle Stand wird NICHT automatisch gespeichert.`)) return;
        currentSnippet.htmlContent = v.htmlContent;
        if (v.originalCss) currentSnippet.originalCss = v.originalCss;
        const p = parseHtmlAndCss(v.htmlContent);
        extractedCss = p.css; extractedHtml = p.htmlShell;
        $('code-textarea').value = v.htmlContent;
        renderPreview();
        $('modal-versions').style.display = 'none';
        toast(`Version ${v.version} geladen – Speichern nicht vergessen`, 'info');
      });
    });

    $('modal-versions').style.display = 'flex';
  }

  // ── Load ──

  function loadSnippet(snippet) {
    currentSnippet = { ...snippet };
    $('editor-title').value = snippet.title || '';
    $('editor-category').value = snippet.category || '';
    $('editor-status').value = snippet.status || 'draft';
    $('editor-tags').value = (snippet.tags || []).join(', ');
    showVersionButtons(true);
    const p = parseHtmlAndCss(snippet.htmlContent || '');
    extractedCss = p.css; extractedHtml = p.htmlShell;
    if (!currentSnippet.originalCss && extractedCss) currentSnippet.originalCss = extractedCss;
    $('preview-empty').style.display = 'none';
    $('a4-container').style.display = '';
    renderPreview();
    $('code-textarea').value = snippet.htmlContent || '';
    // Detect collection membership
    loadCollectionDropdown().then(() => {
      detectCollectionMembership(snippet.id).then(val => { if ($('editor-collection')) $('editor-collection').value = val; });
    });
    PageForgeEvents.emit(PageForgeEvents.EVENTS.TAB_CHANGED, 'editor');
  }

  function newSnippet() {
    currentSnippet = null; extractedCss = ''; extractedHtml = '';
    $('editor-title').value = ''; $('editor-category').value = ''; $('editor-status').value = 'draft';
    $('editor-tags').value = ''; $('code-textarea').value = '';
    if ($('editor-collection')) $('editor-collection').value = '';
    showVersionButtons(false);
    $('preview-empty').style.display = ''; $('a4-container').style.display = 'none';
  }

  // ── Helpers ──

  function injectMiniIframe(container, html, scale) {
    let cleanHtml = (html || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    const zoomCss = `<style>html{zoom:${scale};overflow:hidden!important}body{overflow:hidden!important;width:794px;margin:0}</style>`;
    if (cleanHtml.includes('</head>')) cleanHtml = cleanHtml.replace('</head>', zoomCss + '</head>');
    else if (cleanHtml.includes('<body')) cleanHtml = cleanHtml.replace('<body', zoomCss + '<body');
    else cleanHtml = zoomCss + cleanHtml;

    const f = document.createElement('iframe');
    f.className = 'tpl-mini-frame';
    f.sandbox = 'allow-same-origin';
    f.setAttribute('tabindex', '-1');
    f.style.cssText = 'width:100%;height:100%;border:none;display:block;pointer-events:none';
    container.innerHTML = '';
    container.appendChild(f);
    requestAnimationFrame(() => {
      try { const d = f.contentDocument; d.open(); d.write(cleanHtml); d.close(); } catch (e) {}
    });
  }

  function toast(msg, type) { PageForgeEvents.emit(PageForgeEvents.EVENTS.TOAST, { message: msg, type }); }
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  return { init, loadSnippet, newSnippet };
})();
