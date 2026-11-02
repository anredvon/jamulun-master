(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const currentPanel = $('lotto-history-current');
  if (!currentPanel) return;
  const pastPanel = $('lotto-history-past');
  const currentTab = $('lotto-history-current-tab');
  const pastTab = $('lotto-history-past-tab');
  const status = $('lotto-history-status');
  const colors = ['yellow', 'blue', 'red', 'gray', 'green'];
  const category = (number) => colors[Math.min(4, Math.floor((number - 1) / 10))];

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '저장 시간 확인 불가';
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
  }

  function setTab(which) {
    const isCurrent = which === 'current';
    currentPanel.hidden = !isCurrent;
    pastPanel.hidden = isCurrent;
    currentTab.setAttribute('aria-selected', String(isCurrent));
    pastTab.setAttribute('aria-selected', String(!isCurrent));
    currentTab.classList.toggle('is-active', isCurrent);
    pastTab.classList.toggle('is-active', !isCurrent);
  }

  function createCard(draw) {
    const article = document.createElement('article');
    article.className = 'lotto-history-card';
    const heading = document.createElement('div');
    heading.className = 'lotto-history-card-heading';
    const label = document.createElement('strong');
    label.textContent = '✿ ' + draw.sequence + '번째 추첨';
    const time = document.createElement('time');
    time.dateTime = draw.created_at || '';
    time.textContent = formatTime(draw.created_at);
    heading.append(label, time);
    const balls = document.createElement('div');
    balls.className = 'lotto-number-row';
    balls.setAttribute('role', 'list');
    balls.setAttribute('aria-label', draw.numbers.join(', ') + ' 로또 번호');
    draw.numbers.forEach((number) => {
      const ball = document.createElement('span');
      ball.className = 'lotto-ball lotto-ball-' + category(number);
      ball.setAttribute('role', 'listitem');
      ball.textContent = String(number).padStart(2, '0');
      balls.append(ball);
    });
    article.append(heading, balls);
    return article;
  }

  function fillPanel(panel, draws, emptyText) {
    panel.replaceChildren();
    if (!draws.length) {
      const empty = document.createElement('div');
      empty.className = 'lotto-history-empty';
      empty.innerHTML = '<span aria-hidden="true">✧</span>';
      const title = document.createElement('strong');
      title.textContent = emptyText;
      const detail = document.createElement('p');
      detail.textContent = '추첨 버튼을 누르면 번호가 이곳에 자동 저장돼요.';
      empty.append(empty.firstElementChild, title, detail);
      panel.append(empty);
      return;
    }
    draws.slice().sort((a, b) => a.sequence - b.sequence).forEach((draw) => panel.append(createCard(draw)));
  }

  currentTab.addEventListener('click', () => setTab('current'));
  pastTab.addEventListener('click', () => setTab('past'));
  [currentTab, pastTab].forEach((tab, index) => tab.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = index === 0 ? pastTab : currentTab;
    next.focus();
    setTab(next === currentTab ? 'current' : 'past');
  }));

  Promise.all([
    fetch('/api/lotto/status', { credentials: 'same-origin', cache: 'no-store' }).then((response) => response.json()),
    fetch('/api/lotto/history', { credentials: 'same-origin', cache: 'no-store' }).then((response) => response.json())
  ]).then(([roundData, historyData]) => {
    if (!roundData.ok || !historyData.ok) throw new Error('기록을 불러오지 못했습니다.');
    const draws = Array.isArray(historyData.draws) ? historyData.draws : [];
    const current = draws.filter((draw) => draw.round === roundData.round);
    const previous = draws.filter((draw) => draw.round !== roundData.round);
    $('lotto-history-current-tab').textContent = '이번 회차 (' + roundData.round + ')';
    $('lotto-history-round').textContent = '제' + roundData.round + '회 추첨 일정';
    if (roundData.draw_date) {
      const date = new Date(roundData.draw_date + 'T12:00:00+09:00');
      $('lotto-history-date').textContent = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short'
      }).format(date) + ' · 판매 마감 20:00 · 추첨 20:35경';
    }
    fillPanel(currentPanel, current, '이번 회차 기록이 아직 없어요');
    fillPanel(pastPanel, previous, '지난 회차 기록이 아직 없어요');
    status.textContent = '저장된 번호 ' + draws.length + '개 조합';
  }).catch(() => {
    status.textContent = '로또 기록을 불러오지 못했어요. 잠시 후 새로고침해 주세요.';
    status.classList.add('is-error');
  });
})();
