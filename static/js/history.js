(() => {
  'use strict';
  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  const summary = document.getElementById('history-summary');
  const weekly = document.getElementById('weekly-flow');
  if (!list || !empty || !summary || !window.MoneyFlowHistoryView) return;

  const view = window.MoneyFlowHistoryView.buildHistoryView(window.MoneyFlowHistory?.read() || []);
  if (!view.count) return;

  empty.classList.add('is-hidden');
  summary.classList.remove('is-hidden');
  document.getElementById('history-count').textContent = `${view.count}개`;
  document.getElementById('history-latest-score').textContent = view.latestFutureScore === null
    ? '—'
    : `${view.latestFutureScore}점`;
  if (view.latestFutureScore === null) document.getElementById('history-score-summary')?.classList.add('is-hidden');

  if (weekly && view.futureTrend.length) {
    weekly.classList.remove('is-hidden');
    const bars = document.getElementById('weekly-flow-bars');
    const delta = document.getElementById('weekly-flow-delta');
    const note = document.getElementById('weekly-flow-note');
    view.futureTrend.forEach((item, index) => {
      const bar = document.createElement('span');
      const height = Math.max(8, Math.min(100, item.score));
      bar.style.height = `${height}%`;
      bar.title = `${item.date || index + 1}: ${item.score}점`;
      if (index === view.futureTrend.length - 1) bar.classList.add('is-latest');
      bars.appendChild(bar);
    });

    if (view.futureTrend.length >= 2) {
      const first = view.futureTrend[0].score;
      const last = view.futureTrend[view.futureTrend.length - 1].score;
      const change = last - first;
      delta.textContent = change === 0 ? '흐름 유지 →' : `${change > 0 ? '+' : ''}${change}점 ${change > 0 ? '↗' : '↘'}`;
      note.textContent = change > 0
        ? '최근 재물 흐름 체크 점수가 조금씩 좋아지고 있어요.'
        : change < 0
          ? '점수는 참고로만 보고, 오늘의 작은 습관부터 살펴봐요.'
          : '최근 재물 흐름 체크 점수가 비슷하게 이어지고 있어요.';
    } else {
      delta.textContent = '첫 기록 ✦';
      note.textContent = '재물 흐름 체크 기록이 더 쌓이면 변화를 보여드릴게요.';
    }
  }

  const icons = { future: '↗', money: '₩', spending: '◉', tarot: '✦', palm: '☼', quote: '“' };
  view.rows.forEach((item) => {
    const row = document.createElement('article');
    row.className = 'history-item';
    const icon = document.createElement('span');
    icon.className = 'history-item-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = icons[item.type] || '•';

    const copy = document.createElement('div');
    copy.className = 'history-item-copy';
    const top = document.createElement('div');
    top.className = 'history-item-top';
    const label = document.createElement('strong');
    label.textContent = item.label;
    top.appendChild(label);
    if (item.date) {
      const date = document.createElement('time');
      date.textContent = item.date;
      top.appendChild(date);
    }
    const title = document.createElement('p');
    title.className = 'history-item-title';
    title.textContent = item.title;
    copy.append(top, title);
    if (item.summary) {
      const detail = document.createElement('p');
      detail.className = 'history-item-summary';
      detail.textContent = item.summary;
      copy.appendChild(detail);
    }
    row.append(icon, copy);

    if (item.score !== undefined) {
      const score = document.createElement('div');
      score.className = 'history-item-score';
      score.textContent = String(item.score);
      const suffix = document.createElement('small');
      suffix.textContent = '/100';
      score.appendChild(suffix);
      row.appendChild(score);
    }
    list.appendChild(row);
  });
})();
