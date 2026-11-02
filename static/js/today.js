(() => {
  const payloadNode = document.getElementById('today-horoscope-data');
  const trigger = document.getElementById('zodiac-select-trigger');
  const sheet = document.getElementById('zodiac-picker');
  const grid = document.getElementById('zodiac-grid');
  const label = document.getElementById('selected-zodiac-label');
  const icon = document.getElementById('selected-zodiac-icon');
  const copy = document.getElementById('horoscope-copy');
  if (!payloadNode || !trigger || !sheet || !grid || !label || !icon || !copy) return;

  const STORAGE_KEY = 'moneyflow.today.zodiac.v1';
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
    grid.querySelectorAll('[data-sign-id]').forEach((button) => {
      const selected = button.dataset.signId === sign.id;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-selected', selected);
    });
    if (persist) {
      try { window.localStorage.setItem(STORAGE_KEY, sign.id); } catch (_) { /* Private browsing may disable storage. */ }
    }
    closeSheet();
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
    document.body.classList.remove('zodiac-sheet-open');
    previouslyFocused?.focus();
  }

  trigger.addEventListener('click', openSheet);
  sheet.querySelectorAll('[data-close-zodiac]').forEach((button) => button.addEventListener('click', closeSheet));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSheet(); });

  let storedSign = '';
  try { storedSign = window.localStorage.getItem(STORAGE_KEY) || ''; } catch (_) { /* Use the unselected state. */ }
  if (byId.has(storedSign)) selectSign(storedSign, false);
})();
