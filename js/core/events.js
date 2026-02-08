/**
 * PageForge Event Bus
 * Simple pub/sub for decoupled module communication
 */
const PageForgeEvents = (() => {
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => off(event, callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => {
      try { cb(data); } catch (e) { console.error(`Event handler error [${event}]:`, e); }
    });
  }

  // Predefined events
  const EVENTS = {
    SNIPPET_SAVED: 'snippet:saved',
    SNIPPET_DELETED: 'snippet:deleted',
    SNIPPET_UPDATED: 'snippet:updated',
    SNIPPET_SELECTED: 'snippet:selected',
    SNIPPET_EDIT: 'snippet:edit',
    COLLECTION_SAVED: 'collection:saved',
    COLLECTION_UPDATED: 'collection:updated',
    COLLECTION_DELETED: 'collection:deleted',
    TAB_CHANGED: 'tab:changed',
    CSS_TEMPLATE_CHANGED: 'css:templateChanged',
    CATEGORY_ADDED: 'category:added',
    TOAST: 'ui:toast',
    MODAL_OPEN: 'ui:modalOpen',
    MODAL_CLOSE: 'ui:modalClose',
    LIBRARY_REFRESH: 'library:refresh',
    EXPORT_START: 'export:start',
    EXPORT_DONE: 'export:done',
    BACKUP_DONE: 'backup:done',
  };

  return { on, off, emit, EVENTS };
})();
