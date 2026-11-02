((root, factory) => {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.window === root) root.MoneyFlowHistoryView = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const TYPE_LABELS = {
    future: '재물 흐름 체크',
    money: '오늘의 재물운',
    spending: '소비 스타일',
    tarot: '오늘의 타로',
    palm: '오늘의 손금',
    quote: '투자 한 줄',
    lotto: '이번 주 로또번호'
  };

  function numericScore(item) {
    if (item.score == null || item.score === '') return null;
    const score = Number(item.score);
    return Number.isFinite(score) ? score : null;
  }

  function buildHistoryView(items) {
    const records = Array.isArray(items) ? items.filter((item) => item && typeof item === 'object') : [];
    const futureRecords = records.filter((item) => item.type === 'future' && numericScore(item) !== null);
    const rows = records.slice(0, 30).map((item) => {
      const row = {
        id: item.id,
        type: item.type || 'unknown',
        label: item.label || TYPE_LABELS[item.type] || '머니 기록',
        title: item.title || '기록 결과',
        date: item.date || ''
      };
      const score = numericScore(item);
      if (score !== null) row.score = score;
      if (item.summary) row.summary = String(item.summary);
      return row;
    });

    return {
      count: records.length,
      latestFutureScore: futureRecords.length ? numericScore(futureRecords[0]) : null,
      rows,
      futureTrend: futureRecords.slice(0, 7).reverse().map((item) => ({
        id: item.id,
        date: item.date || '',
        score: numericScore(item)
      }))
    };
  }

  return { buildHistoryView };
});
