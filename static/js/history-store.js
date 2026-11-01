((root) => {
  'use strict';

  const KEY = 'moneyflow_history_v1';

  function formatDate(value) {
    return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(value);
  }

  function createHistoryStore(storage, { maxItems = 30 } = {}) {
    const limit = Number.isInteger(maxItems) && maxItems > 0 ? maxItems : 30;

    function read() {
      if (!storage) return [];
      try {
        const parsed = JSON.parse(storage.getItem(KEY) || '[]');
        return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry)) : [];
      } catch (_) {
        return [];
      }
    }

    function add(entry) {
      if (!storage || !entry || typeof entry !== 'object' || entry.id == null) return false;
      const now = new Date();
      const normalized = {
        ...entry,
        date: entry.date || formatDate(now),
        createdAt: entry.createdAt || now.toISOString()
      };
      try {
        const current = read();
        const next = [normalized, ...current.filter((item) => String(item.id) !== String(normalized.id))].slice(0, limit);
        storage.setItem(KEY, JSON.stringify(next));
        return true;
      } catch (_) {
        return false;
      }
    }

    return { read, add };
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { createHistoryStore };
  }

  if (root && root.window === root) {
    try {
      root.MoneyFlowHistory = createHistoryStore(root.localStorage);
    } catch (_) {
      root.MoneyFlowHistory = createHistoryStore(null);
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
