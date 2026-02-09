/**
 * PageForge Placeholder System
 * Resolves {{variables}} in HTML content
 */
const PageForgePlaceholders = (() => {

  const PLACEHOLDERS = [
    { key: 'seitentitel', label: 'Seitentitel', desc: 'Titel der aktuellen Seite' },
    { key: 'seitenzahl', label: 'Seitenzahl', desc: 'Aktuelle Seitennummer' },
    { key: 'gesamtseiten', label: 'Gesamtseiten', desc: 'Gesamtzahl aller Seiten' },
    { key: 'kapitel', label: 'Kapitel', desc: 'Name des aktuellen Kapitels' },
    { key: 'kapitelnr', label: 'Kapitelnr', desc: 'Nummer des Kapitels (1, 2, 3…)' },
    { key: 'collection', label: 'Collection', desc: 'Name der Collection' },
    { key: 'untertitel', label: 'Untertitel', desc: 'Untertitel der Collection (z.B. Investorenworkshop)' },
    { key: 'autor', label: 'Autor', desc: 'Autorname (aus Collection)' },
    { key: 'copyright', label: 'Copyright', desc: 'Copyright-Zeile (z.B. © vfsverband)' },
    { key: 'datum', label: 'Datum', desc: 'Heutiges Datum' },
  ];

  /**
   * Resolve all placeholders in HTML with actual values
   * @param {string} html
   * @param {object} vars - { seitentitel, seitenzahl, kapitel, ... }
   * @returns {string} resolved HTML
   */
  function resolve(html, vars = {}) {
    if (!html) return html;
    return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key === 'datum' && !vars.datum) {
        return new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      return vars[key] !== undefined ? vars[key] : match;
    });
  }

  /**
   * Highlight placeholders for editor preview (make them visible but styled)
   * @param {string} html
   * @returns {string} HTML with highlighted placeholder badges
   */
  function highlight(html) {
    if (!html) return html;
    return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const info = PLACEHOLDERS.find(p => p.key === key);
      if (!info) return match;
      if (key === 'datum') {
        return new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      return `<span style="background:#ebf8ff;color:#2b6cb0;padding:1px 6px;border-radius:3px;font-size:90%;font-family:monospace;border:1px dashed #3182ce">${info.label}</span>`;
    });
  }

  /**
   * Build variables for a specific page within a collection context
   */
  function buildCollectionVars(collection, chapterIdx, pageIdx, totalPages) {
    const chapter = collection?.chapters?.[chapterIdx];
    let globalPage = pageIdx + 1;
    for (let i = 0; i < chapterIdx; i++) {
      globalPage += collection.chapters[i].snippetIds?.length || 0;
    }
    return {
      collection: collection?.name || '',
      kapitel: chapter?.name || '',
      kapitelnr: String(chapterIdx + 1),
      seitenzahl: String(globalPage),
      gesamtseiten: String(totalPages),
      autor: collection?.author || '',
      datum: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    };
  }

  /**
   * Resolve pf://alias image references to base64 data URLs
   * @param {string} html
   * @param {object} imageMap - { alias: dataUrl }
   * @returns {string} HTML with resolved image sources
   */
  function resolveImages(html, imageMap) {
    if (!html || !imageMap) return html;
    return html.replace(/pf:\/\/([a-zA-Z0-9_-]+)/g, (match, alias) => {
      return imageMap[alias.toLowerCase()] || match;
    });
  }

  /**
   * Build image map from IndexedDB
   * @returns {Promise<object>} { alias: dataUrl }
   */
  async function buildImageMap() {
    const images = await PageForgeDB.getAll('images');
    const map = {};
    images.forEach(img => {
      const alias = (img.alias || img.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-')).toLowerCase();
      map[alias] = img.dataUrl;
    });
    return map;
  }

  return { PLACEHOLDERS, resolve, highlight, buildCollectionVars, resolveImages, buildImageMap };
})();
