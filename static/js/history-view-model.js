((root, factory) => {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.window === root) root.MoneyFlowHistoryView = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const TYPE_LABELS = {
    future: '돈 관리 습관', money: '오늘의 재물운', spending: '소비 스타일',
    tarot: '오늘의 타로', palm: '오늘의 손금', quote: '오늘의 명언', lotto: '로또 번호'
  };
  const CATEGORY_BY_TYPE = { future: 'check', money: 'check', spending: 'check' };

  function numericScore(item) {
    if (item.score == null || item.score === '') return null;
    const score = Number(item.score);
    return Number.isFinite(score) ? score : null;
  }

  function resolveTarotPreview(item, tarotCards) {
    if (!item || item.type !== 'tarot' || !Array.isArray(tarotCards)) return null;
    const cardId = item.meta && item.meta.cardId;
    if (cardId == null || String(cardId).trim() === '') return null;
    return tarotCards.find((card) => card && String(card.id) === String(cardId)
      && typeof card.image === 'string' && card.image.trim()) || null;
  }

  function parseTimestamp(value) {
    const timestamp = value ? Date.parse(value) : NaN;
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function formatDate(value) {
    const timestamp = parseTimestamp(value);
    if (timestamp === null) return '';
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', month: 'long', day: 'numeric'
    }).format(new Date(timestamp));
  }

  function normalizeLocal(item, index) {
    const type = item.type || 'unknown';
    const createdAt = item.createdAt || item.created_at || '';
    const row = {
      id: String(item.id || `${type}-${index}`),
      type,
      category: CATEGORY_BY_TYPE[type] || type,
      iconType: type,
      label: type === 'quote' ? TYPE_LABELS.quote : (item.label || TYPE_LABELS[type] || '머니 기록'),
      title: item.title || '기록 결과',
      date: item.date || formatDate(createdAt),
      createdAt,
      summary: type === 'tarot'
        ? '재미와 자기 성찰을 위한 기록'
        : (item.summary ? String(item.summary) : ''),
      meta: item.meta && typeof item.meta === 'object' && !Array.isArray(item.meta) ? item.meta : {}
    };
    const score = numericScore(item);
    if (score !== null && type !== 'tarot') row.score = score;
    return row;
  }

  function normalizeLotto(draw) {
    const resultId = String(draw.result_id || draw.id || '');
    const createdAt = draw.created_at || draw.createdAt || '';
    return {
      id: `lotto-${resultId}`, resultId, type: 'lotto', category: 'lotto',
      iconType: 'lotto',
      label: '로또 번호',
      title: `제${draw.round}회 ${draw.sequence}번째 추첨`,
      date: formatDate(createdAt),
      createdAt,
      summary: Array.isArray(draw.numbers) ? draw.numbers.join(' · ') : '',
      round: draw.round,
      sequence: draw.sequence,
      numbers: Array.isArray(draw.numbers) ? draw.numbers.map(Number).filter(Number.isFinite) : []
    };
  }

  function buildHistoryView(items, lottoDraws = []) {
    const localRecords = Array.isArray(items) ? items
      .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
      .map(normalizeLocal) : [];
    const serverLottoRecords = Array.isArray(lottoDraws) ? lottoDraws
      .filter((draw) => draw && typeof draw === 'object' && (draw.result_id || draw.id))
      .map(normalizeLotto) : [];
    const serverLottoIds = new Set(serverLottoRecords.map((row) => row.resultId));
    const uniqueLocalRecords = localRecords.filter((row) => row.type !== 'lotto'
      || !serverLottoIds.has(row.id.replace(/^lotto-/, '')));
    const records = [...uniqueLocalRecords, ...serverLottoRecords];
    records.sort((a, b) => {
      const left = parseTimestamp(a.createdAt);
      const right = parseTimestamp(b.createdAt);
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      return right - left;
    });
    const futureRecords = records.filter((item) => item.type === 'future' && numericScore(item) !== null);
    const categoryCounts = { all: records.length, tarot: 0, palm: 0, lotto: 0, check: 0, quote: 0 };
    records.forEach((item) => {
      if (Object.hasOwn(categoryCounts, item.category) && item.category !== 'all') categoryCounts[item.category] += 1;
    });
    return {
      count: records.length,
      categoryCounts,
      latestFutureScore: futureRecords.length ? numericScore(futureRecords[0]) : null,
      rows: records.slice(0, 120),
      futureTrend: futureRecords.slice(0, 7).reverse().map((item) => ({
        id: item.id, date: item.date || '', score: numericScore(item)
      }))
    };
  }

  return { buildHistoryView, resolveTarotPreview };
});
