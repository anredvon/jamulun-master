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
  const emptyLink = document.getElementById('history-empty-link');
  const dialog = document.getElementById('history-detail-dialog');
  const detailKind = document.getElementById('history-detail-kind');
  const detailDate = document.getElementById('history-detail-date');
  const detailContent = document.getElementById('history-detail-content');
  const detailActions = document.getElementById('history-detail-actions');
  const detailClose = document.getElementById('history-detail-close');
  const localItems = window.MoneyFlowHistory?.read() || [];
  const filterLabels = { all: '전체', tarot: '타로', palm: '손금', lotto: '로또', check: '체크', quote: '명언' };
  const emptyDestinations = {
    tarot: ['/tarot', '타로 한 장 만나보기'],
    palm: ['/palm', '손금 살펴보기'],
    lotto: ['/lotto', '이번 주 번호 받아보기'],
    check: ['/check', '머니 체크 시작하기'],
    quote: ['/today', '오늘의 명언 보기']
  };
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

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(String(value || ''), window.location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }

  function checkResultUrl(item) {
    return ['future', 'money', 'spending'].includes(item.type) && /^\d+$/.test(String(item.id))
      ? `/result/${encodeURIComponent(item.id)}` : '';
  }

  function makeRow(item) {
    const row = node('button', `history-item${item.score !== undefined ? ' has-score' : ''}`);
    row.type = 'button';
    row.dataset.category = item.category;
    row.setAttribute('aria-label', `${filterLabels[item.category] || '기록'}: ${item.label}, ${item.title}. 상세 결과 보기`);

    const icon = node('span', 'history-item-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = icons[item.category] || icons.check;

    const copy = node('span', 'history-item-copy');
    const top = node('span', 'history-item-top');
    top.append(node('span', 'history-item-kind', filterLabels[item.category] || '기록'));
    const date = node('time', 'history-item-date', item.date || '날짜 정보 없음');
    if (item.createdAt && Number.isFinite(Date.parse(item.createdAt))) date.dateTime = item.createdAt;
    top.append(date);
    const title = node('span', 'history-item-title', item.title);
    copy.append(top, title);
    if (item.summary) copy.append(node('span', 'history-item-summary', item.summary));

    row.append(icon, copy);
    if (item.score !== undefined) {
      const score = node('span', 'history-item-score', item.score);
      score.append(node('small', '', '점'));
      row.append(score);
    }
    row.append(node('span', 'history-item-arrow', '›'));
    row.addEventListener('click', () => openDetail(item));
    return row;
  }

  function makeDayGroup(label, items) {
    const group = node('section', 'history-day');
    group.setAttribute('aria-label', `${label} 기록`);
    group.append(node('h2', 'history-day-title', label));
    const groupList = node('div', 'history-day-list');
    items.forEach((item) => groupList.append(makeRow(item)));
    group.append(groupList);
    return group;
  }

  function renderList(rows) {
    const groups = new Map();
    rows.forEach((item) => {
      const label = item.date || '날짜 정보 없음';
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(item);
    });
    list.replaceChildren(...[...groups.entries()].map(([label, items]) => makeDayGroup(label, items)));
  }

  function render() {
    const view = viewModel.buildHistoryView(localItems, lottoDraws);
    const rows = activeFilter === 'all' ? view.rows : view.rows.filter((item) => item.category === activeFilter);
    renderList(rows);
    count.textContent = `${rows.length}개 기록`;
    filters.forEach((button) => {
      const selected = button.dataset.historyFilter === activeFilter;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
      const badge = button.querySelector('[data-filter-count]');
      if (badge) badge.textContent = String(view.categoryCounts[button.dataset.historyFilter] || 0);
    });

    const noRecords = view.count === 0;
    const noFilteredRecords = !noRecords && rows.length === 0;
    empty.classList.toggle('is-hidden', !noRecords && !noFilteredRecords);
    reset.hidden = !noFilteredRecords;
    if (noRecords) {
      emptyTitle.textContent = '아직 저장된 기록이 없어요';
      emptyCopy.textContent = '둘러본 결과가 이곳에 차곡차곡 모여요.';
      emptyLink.href = '/home';
      emptyLink.replaceChildren(document.createTextNode('콘텐츠 둘러보기 '), node('span', '', '→'));
      emptyLink.lastElementChild.setAttribute('aria-hidden', 'true');
    } else if (noFilteredRecords) {
      const [href, action] = emptyDestinations[activeFilter] || ['/home', '콘텐츠 둘러보기'];
      emptyTitle.textContent = `${filterLabels[activeFilter]} 기록이 아직 없어요`;
      emptyCopy.textContent = `${filterLabels[activeFilter]} 결과를 확인하면 여기에 모아둘게요.`;
      emptyLink.href = href;
      emptyLink.textContent = action;
    }
  }

  function section(title, content) {
    const card = node('section', 'history-detail-section');
    card.append(node('h3', '', title));
    card.append(content);
    return card;
  }

  function addTextSection(parent, title, text) {
    if (!text) return;
    parent.append(section(title, node('p', '', text)));
  }

  function addDetailAction(href, label) {
    if (!href) return;
    const link = node('a', 'history-detail-action', label);
    link.href = href;
    detailActions.append(link);
  }

  function addScore(item) {
    if (item.score === undefined) return;
    const scoreCard = node('div', `history-detail-score${item.category === 'tarot' ? ' is-tarot' : ''}`);
    scoreCard.append(node('span', '', item.category === 'tarot' ? '오늘의 카드 점수' : '내 응답 참고 점수'));
    const value = node('strong', '', item.score);
    value.append(node('small', '', '/100'));
    scoreCard.append(value);
    scoreCard.append(node('small', 'history-detail-score-note', '재물 상태나 미래를 측정하는 점수가 아니에요.'));
    detailContent.append(scoreCard);
  }

  function renderTarot(item) {
    let cards = [];
    try { cards = JSON.parse(document.getElementById('history-tarot-data')?.textContent || '[]'); } catch (_) { cards = []; }
    const card = cards.find((entry) => String(entry.id) === String(item.meta?.cardId));
    if (card) {
      const image = node('img', 'history-detail-tarot-image');
      image.src = `/static/${String(card.image || '').replace(/^\/+/, '')}`;
      image.alt = `${card.title} 타로카드`;
      detailContent.append(image);
      const status = node('p', 'history-detail-status', card.status);
      detailContent.append(status);
      addScore({ ...item, score: Number(card.score) });
      addTextSection(detailContent, '돈의 흐름', card.flow);
      addTextSection(detailContent, '오늘 살펴볼 점', card.caution);
      addTextSection(detailContent, '한마디', card.line);
    } else {
      addTextSection(detailContent, '저장된 내용', item.summary || item.title);
    }
    detailContent.append(node('p', 'history-detail-disclaimer', '타로 카드는 재미와 자기 성찰을 위한 콘텐츠예요.'));
  }

  function renderPalm(item) {
    const copy = window.MoneyFlowPalmCopy;
    const lineTypes = item.meta?.lineTypes;
    if (copy && lineTypes && typeof lineTypes === 'object') {
      [['heart', '감정선'], ['head', '두뇌선'], ['fate', '운명선']].forEach(([key, name]) => {
        const id = lineTypes[key];
        const title = copy.labels?.[key]?.[id];
        const description = item.meta?.uncertainLines?.includes(key)
          ? copy.uncertainReading : copy.readings?.[key]?.[id];
        if (title && description) {
          const block = node('div', 'history-detail-reading');
          block.append(node('strong', '', title));
          block.append(node('p', '', description));
          detailContent.append(section(name, block));
        }
      });
      detailContent.append(node('p', 'history-detail-disclaimer', copy.disclaimer));
    } else {
      addTextSection(detailContent, '저장된 한마디', item.summary);
      detailContent.append(node('p', 'history-detail-disclaimer', '손 사진은 저장하지 않아 당시 사진을 다시 볼 수 없어요.'));
    }
  }

  function renderQuote(item) {
    const quote = node('blockquote', 'history-detail-quote', item.summary || '저장된 문장이 없어요.');
    detailContent.append(quote);
    detailContent.append(node('p', 'history-detail-author', item.title));
    const sourceTitle = item.meta?.sourceTitle;
    const sourceUrl = safeExternalUrl(item.meta?.sourceUrl);
    if (sourceTitle) {
      const source = sourceUrl ? node('a', 'history-detail-source', sourceTitle) : node('p', 'history-detail-source', sourceTitle);
      if (sourceUrl) { source.href = sourceUrl; source.target = '_blank'; source.rel = 'noopener noreferrer'; }
      detailContent.append(source);
    }
  }

  function renderLotto(item) {
    const numbers = Array.isArray(item.numbers) && item.numbers.length
      ? item.numbers
      : String(item.summary || '').split(/\s*[·,]\s*/).map(Number).filter((number) => Number.isInteger(number) && number >= 1 && number <= 45);
    const balls = node('div', 'history-detail-balls');
    numbers.forEach((number) => {
      const band = Math.floor((number - 1) / 10);
      balls.append(node('span', `history-detail-ball ball-${['yellow', 'blue', 'red', 'gray', 'green'][Math.min(4, band)]}`, number));
    });
    if (numbers.length) detailContent.append(section('추첨 번호', balls));
    detailContent.append(node('p', 'history-detail-disclaimer', '무작위로 생성한 오락용 번호이며 당첨을 보장하지 않아요.'));
  }

  function openDetail(item) {
    detailKind.textContent = filterLabels[item.category] || '기록';
    detailDate.textContent = item.date || '';
    detailContent.replaceChildren();
    detailActions.replaceChildren();
    detailContent.append(node('h2', 'history-detail-title', item.title));
    if (item.category === 'tarot') renderTarot(item);
    else if (item.category === 'palm') renderPalm(item);
    else if (item.category === 'quote') renderQuote(item);
    else if (item.category === 'lotto') renderLotto(item);
    else {
      addScore(item);
      addTextSection(detailContent, '오늘의 한마디', item.summary || '저장된 결과를 확인해보세요.');
      detailContent.append(node('p', 'history-detail-disclaimer', '체크 결과는 내 답변을 돌아보기 위한 참고예요.'));
      addDetailAction(checkResultUrl(item), '체크 결과 다시 보기');
    }
    dialog.showModal();
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
  detailClose.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

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
      error.textContent = '로또 기록을 불러오지 못했어요. 다른 기록은 계속 볼 수 있어요.';
      error.hidden = false;
    });
})();
