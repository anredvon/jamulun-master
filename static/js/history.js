(() => {
  'use strict';
  const KEY = 'moneyflow_history_v1';
  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  const summary = document.getElementById('history-summary');
  if (!list || !empty || !summary) return;

  let items = [];
  try { items = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { items = []; }
  if (!Array.isArray(items) || !items.length) return;

  empty.classList.add('is-hidden');
  summary.classList.remove('is-hidden');
  document.getElementById('history-count').textContent = `${items.length}개`;
  document.getElementById('history-latest-score').textContent = `${items[0].score ?? '-'}점`;

  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14v15H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  items.slice(0, 30).forEach(item => {
    const row = document.createElement('article');
    row.className = 'history-item';
    row.innerHTML = `<span class="history-item-icon">${icon}</span><div class="history-item-copy"><div class="history-item-top"><strong>${escapeHtml(item.label || '머니 리포트')}</strong><time>${escapeHtml(item.date || '')}</time></div><p>${escapeHtml(item.title || '나의 머니 흐름')}</p></div><div class="history-item-score">${escapeHtml(item.score)}<small>/100</small></div>`;
    list.appendChild(row);
  });
})();
