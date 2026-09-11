(() => {
  'use strict';
  const KEY = 'moneyflow_history_v1';
  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  const summary = document.getElementById('history-summary');
  const weekly = document.getElementById('weekly-flow');
  if (!list || !empty || !summary) return;

  let items = [];
  try { items = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { items = []; }
  if (!Array.isArray(items) || !items.length) return;

  empty.classList.add('is-hidden');
  summary.classList.remove('is-hidden');
  document.getElementById('history-count').textContent = `${items.length}개`;
  document.getElementById('history-latest-score').textContent = `${items[0].score ?? '-'}점`;

  if (weekly) {
    weekly.classList.remove('is-hidden');
    const recent = items.slice(0, 7).reverse();
    const bars = document.getElementById('weekly-flow-bars');
    const delta = document.getElementById('weekly-flow-delta');
    const note = document.getElementById('weekly-flow-note');
    recent.forEach((item, index) => {
      const score = Math.max(8, Math.min(100, Number(item.score) || 0));
      const bar = document.createElement('span');
      bar.style.height = `${score}%`;
      bar.title = `${item.date || index + 1}: ${item.score || 0}점`;
      if (index === recent.length - 1) bar.classList.add('is-latest');
      bars.appendChild(bar);
    });
    if (recent.length >= 2) {
      const change = (Number(recent[recent.length - 1].score) || 0) - (Number(recent[0].score) || 0);
      delta.textContent = change === 0 ? '흐름 유지 →' : `${change > 0 ? '+' : ''}${change}점 ${change > 0 ? '↗' : '↘'}`;
      note.textContent = change > 0 ? '최근 흐름이 조금씩 좋아지고 있어요. 이 페이스를 이어가봐요.' : change < 0 ? '조금 흔들려도 괜찮아요. 오늘의 작은 미션부터 다시 시작해봐요.' : '최근 흐름이 안정적으로 이어지고 있어요.';
    } else {
      delta.textContent = '첫 기록 ✦';
      note.textContent = '한 번 더 확인하면 첫 번째 변화가 보이기 시작해요.';
    }
  }

  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14v15H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  items.slice(0, 30).forEach(item => {
    const row = document.createElement('article');
    row.className = 'history-item';
    row.innerHTML = `<span class="history-item-icon">${icon}</span><div class="history-item-copy"><div class="history-item-top"><strong>${escapeHtml(item.label || '머니 리포트')}</strong><time>${escapeHtml(item.date || '')}</time></div><p>${escapeHtml(item.title || '나의 머니 흐름')}</p></div><div class="history-item-score">${escapeHtml(item.score)}<small>/100</small></div>`;
    list.appendChild(row);
  });
})();
