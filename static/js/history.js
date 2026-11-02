(() => {
  'use strict';

  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  const count = document.getElementById('history-count');
  const error = document.getElementById('history-load-error');
  const filters = [...document.querySelectorAll('[data-history-filter]')];
  const viewModel = window.MoneyFlowHistoryView;
  if (!list || !empty || !count || !viewModel) return;

  const emptyTitle = document.getElementById('history-empty-title');
  const emptyCopy = document.getElementById('history-empty-copy');
  const reset = document.getElementById('history-empty-reset');
  const localItems = window.MoneyFlowHistory?.read() || [];
  const filterLabels = { all: '전체', tarot: '타로', palm: '손금', lotto: '로또', check: '체크', quote: '명언' };
  const icons = {
    tarot: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 8h6M9 12h6M12 15v3M10.5 16.5h3"/></svg>',
    palm: '<svg viewBox="0 0 24 24"><path d="M8 12V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v7l1-2a1.5 1.5 0 0 1 2.8 1l-1.3 5.2A6 6 0 0 1 13.7 22h-.9a6 6 0 0 1-4.5-2l-3-3.4A1.8 1.8 0 0 1 8 14l1.5 1"/></svg>',
    lotto: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 8.5h6M9 12h6M9 15.5h6"/><circle cx="8" cy="8.5" r=".5"/><circle cx="16" cy="15.5" r=".5"/></svg>',
    check: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9h6M9 13h2l1.2 1.5L15 12M9 17h6"/></svg>',
    quote: '<svg viewBox="0 0 24 24"><path d="M5 11h6V6H7a2 2 0 0 0-2 2v3Zm8 0h6V6h-4a2 2 0 0 0-2 2v3ZM5 11v2a4 4 0 0 1-2 3m10-5v2a4 4 0 0 1-2 3"/></svg>'
  };
  let lottoDraws = [];
  let activeFilter = new URLSearchParams(window.location.search).get('filter') || 'all';
  if (!Object.hasOwn(filterLabels, activeFilter)) activeFilter = 'all';

  function makeRow(item) {
    const row = document.createElement('article');
    row.className = 'history-item';
    row.dataset.category = item.category;
    const icon = document.createElement('span');
    icon.className = 'history-item-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = icons[item.category] || icons.check;

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
      if (item.createdAt) date.dateTime = item.createdAt;
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
      suffix.textContent = '점';
      score.appendChild(suffix);
      row.appendChild(score);
    }
    return row;
  }

  function render() {
    const view = viewModel.buildHistoryView(localItems, lottoDraws);
    const rows = activeFilter === 'all' ? view.rows : view.rows.filter((item) => item.category === activeFilter);
    list.replaceChildren(...rows.map(makeRow));
    count.textContent = `${rows.length}개 기록`;
    filters.forEach((button) => {
      const selected = button.dataset.historyFilter === activeFilter;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    const noRecords = view.count === 0;
    const noFilteredRecords = !noRecords && rows.length === 0;
    empty.classList.toggle('is-hidden', !noRecords && !noFilteredRecords);
    reset.hidden = !noFilteredRecords;
    if (noRecords) {
      emptyTitle.textContent = '아직 쌓인 기록이 없어요';
      emptyCopy.textContent = '타로·손금·체크를 둘러보면 이곳에 결과가 모여요.';
    } else if (noFilteredRecords) {
      emptyTitle.textContent = `${filterLabels[activeFilter]} 기록이 아직 없어요`;
      emptyCopy.textContent = '다른 종류의 기록을 보거나 콘텐츠를 먼저 이용해보세요.';
    }
  }

  filters.forEach((button) => button.addEventListener('click', () => {
    activeFilter = button.dataset.historyFilter;
    const url = new URL(window.location.href);
    if (activeFilter === 'all') url.searchParams.delete('filter');
    else url.searchParams.set('filter', activeFilter);
    window.history.replaceState({}, '', url);
    render();
  }));
  reset.addEventListener('click', () => {
    activeFilter = 'all';
    const url = new URL(window.location.href);
    url.searchParams.delete('filter');
    window.history.replaceState({}, '', url);
    render();
    filters[0]?.focus();
  });

  render();
  fetch('/api/lotto/history', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } })
    .then((response) => {
      if (!response.ok) throw new Error('lotto-history-unavailable');
      return response.json();
    })
    .then((payload) => {
      if (!payload || payload.ok !== true || !Array.isArray(payload.draws)) throw new Error('invalid-lotto-history');
      lottoDraws = payload.draws;
      error.hidden = true;
      render();
    })
    .catch(() => {
      error.textContent = '로또 기록을 불러오지 못했어요.';
      error.hidden = false;
    });
})();
