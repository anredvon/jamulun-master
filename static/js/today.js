(() => {
  const payloadNode = document.getElementById('today-horoscope-data');
  const trigger = document.getElementById('zodiac-select-trigger');
  const sheet = document.getElementById('zodiac-picker');
  const grid = document.getElementById('zodiac-grid');
  const label = document.getElementById('selected-zodiac-label');
  const icon = document.getElementById('selected-zodiac-icon');
  const copy = document.getElementById('horoscope-copy');
  if (!payloadNode || !trigger || !sheet || !grid || !label || !icon || !copy) return;
  const action = document.getElementById('horoscope-action');
  const luckyItem = document.getElementById('horoscope-lucky-item');
  const luckColorArt = document.getElementById('luck-color-art');
  const luckColorName = document.getElementById('luck-color-name');
  const luckDiceArt = document.getElementById('luck-dice-art');
  const luckDiceNumber = document.getElementById('luck-dice-number');
  const luckDirectionArt = document.getElementById('luck-direction-art');
  const luckDirectionName = document.getElementById('luck-direction-name');
  const overviewTrigger = document.getElementById('zodiac-overview-trigger');
  const overview = document.getElementById('zodiac-overview');
  const overviewList = document.getElementById('zodiac-overview-list');

  const STORAGE_KEY = 'moneyflow.today.zodiac.v1';
  const luckyColors = [
    { name: '라벤더', sprite: [0, 0] }, { name: '하늘색', sprite: [1, 0] },
    { name: '세이지', sprite: [2, 0] }, { name: '장미색', sprite: [3, 0] },
    { name: '골드', sprite: [0, 1] }, { name: '피치', sprite: [1, 1] }, { name: '민트', sprite: [2, 1] },
  ];
  const luckyDirections = [
    { name: '북쪽', sprite: [0, 0] }, { name: '북동쪽', sprite: [1, 0] },
    { name: '동쪽', sprite: [2, 0] }, { name: '남동쪽', sprite: [3, 0] },
    { name: '남쪽', sprite: [0, 1] }, { name: '남서쪽', sprite: [1, 1] },
    { name: '서쪽', sprite: [2, 1] }, { name: '북서쪽', sprite: [3, 1] },
  ];
  const starPatterns = {
    aries: {stars:[[18,34,2.7],[46,48,3.5],[78,62,2.8]],lines:[[0,1],[1,2]]},
    taurus: {stars:[[17,29,2.7],[40,42,3],[57,50,3.6],[74,42,2.8],[86,57,2.5],[42,74,2.8]],lines:[[0,1],[1,2],[2,3],[3,4],[2,5]]},
    gemini: {stars:[[22,25,2.7],[39,43,3.1],[47,63,2.6],[78,24,3.2],[63,43,3.1],[58,66,2.6],[39,43,2],[63,43,2]],lines:[[0,1],[1,2],[3,4],[4,5],[1,4]]},
    cancer: {stars:[[18,53,2.7],[39,40,2.6],[53,55,3.4],[70,38,2.6],[84,56,2.7]],lines:[[0,1],[1,2],[2,3],[2,4]]},
    leo: {stars:[[19,43,2.7],[34,26,2.8],[48,41,3.4],[62,31,2.6],[70,52,3.1],[56,70,2.8],[36,67,2.6],[82,73,2.5]],lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[4,7]]},
    virgo: {stars:[[17,67,2.6],[30,51,3],[45,58,2.6],[60,38,3.5],[73,46,2.8],[84,28,2.6]],lines:[[0,1],[1,2],[2,3],[3,4],[4,5]]},
    libra: {stars:[[25,35,2.8],[56,23,3.3],[76,53,3],[45,71,3.2]],lines:[[0,1],[1,2],[2,3],[3,0]]},
    scorpio: {stars:[[16,30,2.7],[32,42,2.8],[47,36,3.2],[59,50,2.7],[71,55,3.4],[78,71,2.8],[90,80,3]],lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]},
    sagittarius: {stars:[[17,41,2.7],[32,52,3],[45,34,3.2],[59,42,2.8],[47,62,3.5],[68,61,2.7],[81,49,2.7],[66,23,2.8]],lines:[[0,1],[1,2],[2,3],[3,4],[4,1],[3,5],[5,6],[5,7]]},
    capricorn: {stars:[[20,30,2.7],[39,48,2.8],[60,40,3.2],[80,60,2.7],[57,73,3.3]],lines:[[0,1],[1,2],[2,3],[3,4],[4,1]]},
    aquarius: {stars:[[17,34,2.7],[31,48,3],[45,38,2.7],[57,56,3.4],[71,43,2.7],[84,57,3]],lines:[[0,1],[1,2],[2,3],[3,4],[4,5]]},
    pisces: {stars:[[17,36,2.7],[32,51,3.1],[46,39,2.7],[58,30,2.6],[68,46,3.3],[80,59,2.7],[89,71,2.6]],lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[1,5]]},
  };

  let data;
  try { data = JSON.parse(payloadNode.textContent); } catch (_) { return; }
  const signs = Array.isArray(data.signs) ? data.signs : [];
  const byId = new Map(signs.map((sign) => [sign.id, sign]));
  let previouslyFocused = null;
  let overviewPreviouslyFocused = null;

  function updateLuckPoints(sign) {
    if (!data.date || !luckColorArt || !luckDiceArt || !luckDirectionArt) return;
    const utcDays = Math.floor(Date.parse(`${data.date}T00:00:00Z`) / 86400000);
    const signIndex = signs.findIndex((item) => item.id === sign.id);
    const seed = utcDays + Math.max(signIndex, 0) * 11;
    const color = luckyColors[((seed % luckyColors.length) + luckyColors.length) % luckyColors.length];
    const dice = ((seed % 6) + 6) % 6 + 1;
    const direction = luckyDirections[((seed % luckyDirections.length) + luckyDirections.length) % luckyDirections.length];
    luckColorArt.style.backgroundPosition = `${color.sprite[0] * 100 / 3}% ${color.sprite[1] * 100}%`;
    luckDiceArt.style.backgroundPosition = `${((dice - 1) % 3) * 50}% ${Math.floor((dice - 1) / 3) * 100}%`;
    luckDirectionArt.style.backgroundPosition = `${direction.sprite[0] * 100 / 3}% ${direction.sprite[1] * 100}%`;
    if (luckColorName) luckColorName.textContent = color.name;
    if (luckDiceNumber) luckDiceNumber.textContent = String(dice);
    if (luckDirectionName) luckDirectionName.textContent = direction.name;
  }

  function makePattern(signId) {
    const pattern = starPatterns[signId];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    if (!pattern) return svg;
    pattern.lines.forEach(([start, end]) => {
      const line = document.createElementNS(svg.namespaceURI, 'line');
      line.setAttribute('x1', pattern.stars[start][0]);
      line.setAttribute('y1', pattern.stars[start][1]);
      line.setAttribute('x2', pattern.stars[end][0]);
      line.setAttribute('y2', pattern.stars[end][1]);
      svg.append(line);
    });
    pattern.stars.forEach(([cx, cy, radius]) => {
      const star = document.createElementNS(svg.namespaceURI, 'circle');
      star.setAttribute('cx', cx);
      star.setAttribute('cy', cy);
      star.setAttribute('r', radius);
      svg.append(star);
    });
    return svg;
  }

  function selectSign(signId, persist = true) {
    const sign = byId.get(signId);
    if (!sign) return;
    label.textContent = sign.name;
    icon.replaceChildren(makePattern(sign.id));
    copy.textContent = sign.fortune;
    if (action) action.textContent = sign.action || '오늘의 소비와 지출을 한 번 가볍게 살펴보세요.';
    if (luckyItem) luckyItem.textContent = sign.lucky_item || '오늘의 작은 메모';
    updateLuckPoints(sign);
    document.querySelectorAll('[data-sign-id]').forEach((button) => {
      const selected = button.dataset.signId === sign.id;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-selected', selected);
    });
    if (persist) {
      try { window.localStorage.setItem(STORAGE_KEY, sign.id); } catch (_) { /* Private browsing may disable storage. */ }
    }
    closeSheet();
    if (overview && !overview.classList.contains('is-hidden')) {
      closeOverview(false);
      trigger.focus();
    }
  }

  signs.forEach((sign) => {
    const button = document.createElement('button');
    button.className = 'zodiac-option';
    button.type = 'button';
    button.dataset.signId = sign.id;
    button.setAttribute('aria-pressed', 'false');
    const patternWrap = document.createElement('span');
    patternWrap.className = 'zodiac-option-pattern';
    patternWrap.append(makePattern(sign.id));
    const name = document.createElement('span');
    name.className = 'zodiac-option-name';
    name.textContent = sign.name;
    const dates = document.createElement('span');
    dates.className = 'zodiac-option-dates';
    dates.textContent = sign.dates;
    button.append(patternWrap, name, dates);
    button.addEventListener('click', () => selectSign(sign.id));
    grid.append(button);

    if (overviewList) {
      const row = document.createElement('article');
      row.className = 'zodiac-overview-item';
      row.setAttribute('role', 'listitem');
      const select = document.createElement('button');
      select.className = 'zodiac-overview-select';
      select.type = 'button';
      select.dataset.signId = sign.id;
      select.setAttribute('aria-pressed', 'false');
      const patternWrap = document.createElement('span');
      patternWrap.className = 'zodiac-overview-pattern';
      patternWrap.append(makePattern(sign.id));
      const details = document.createElement('span');
      details.className = 'zodiac-overview-copy';
      const identity = document.createElement('span');
      identity.className = 'zodiac-overview-identity';
      const name = document.createElement('strong');
      name.textContent = sign.name;
      const dates = document.createElement('small');
      dates.textContent = sign.dates;
      identity.append(name, dates);
      const fortune = document.createElement('span');
      fortune.className = 'zodiac-overview-fortune';
      fortune.textContent = sign.fortune || '오늘의 흐름을 차분히 살펴보세요.';
      const item = document.createElement('span');
      item.className = 'zodiac-overview-lucky';
      item.textContent = `행운 아이템 · ${sign.lucky_item || '오늘의 작은 메모'}`;
      details.append(identity, fortune, item);
      select.append(patternWrap, details);
      select.addEventListener('click', () => selectSign(sign.id));
      row.append(select);
      overviewList.append(row);
    }
  });

  function openSheet() {
    previouslyFocused = document.activeElement;
    sheet.classList.remove('is-hidden');
    sheet.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('zodiac-sheet-open');
    sheet.querySelector('.zodiac-option')?.focus();
  }

  function closeSheet() {
    if (sheet.classList.contains('is-hidden')) return;
    sheet.classList.add('is-hidden');
    sheet.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    if (!overview || overview.classList.contains('is-hidden')) document.body.classList.remove('zodiac-sheet-open');
    previouslyFocused?.focus();
  }

  function openOverview() {
    if (!overview || !overviewTrigger) return;
    overviewPreviouslyFocused = document.activeElement;
    overview.classList.remove('is-hidden');
    overview.setAttribute('aria-hidden', 'false');
    overviewTrigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('zodiac-sheet-open');
    overviewList?.querySelector('.zodiac-overview-select')?.focus();
  }

  function closeOverview(restoreFocus = true) {
    if (!overview || overview.classList.contains('is-hidden')) return;
    overview.classList.add('is-hidden');
    overview.setAttribute('aria-hidden', 'true');
    overviewTrigger?.setAttribute('aria-expanded', 'false');
    if (sheet.classList.contains('is-hidden')) document.body.classList.remove('zodiac-sheet-open');
    if (restoreFocus) overviewPreviouslyFocused?.focus();
  }

  trigger.addEventListener('click', openSheet);
  sheet.querySelectorAll('[data-close-zodiac]').forEach((button) => button.addEventListener('click', closeSheet));
  overviewTrigger?.addEventListener('click', openOverview);
  overview?.querySelectorAll('[data-close-overview]').forEach((button) => button.addEventListener('click', () => closeOverview()));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSheet();
      closeOverview();
    }
  });

  let storedSign = '';
  try { storedSign = window.localStorage.getItem(STORAGE_KEY) || ''; } catch (_) { /* Use the unselected state. */ }
  if (byId.has(storedSign)) selectSign(storedSign, false);
})();
