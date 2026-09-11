(() => {
  'use strict';

  const dataNode = document.getElementById('tarot-data');
  const picker = document.getElementById('tarot-picker');
  const modal = document.getElementById('tarot-modal');
  const reveal = document.getElementById('tarot-reveal');
  const report = document.getElementById('tarot-report');
  if (!dataNode || !picker || !modal || !reveal || !report) return;

  let cards = [];
  try {
    cards = JSON.parse(dataNode.textContent || '[]');
  } catch (err) {
    console.error('Tarot data parse failed', err);
  }
  if (!cards.length) return;

  const el = {
    choices: [...document.querySelectorAll('.tarot-choice')],
    hint: document.getElementById('tarot-hint'),
    title: document.getElementById('tarot-modal-title'),
    en: document.getElementById('tarot-card-en'),
    image: document.getElementById('tarot-art-image'),
    fortuneBtn: document.getElementById('tarot-fortune-btn'),
    redrawBtn: document.getElementById('tarot-redraw-btn'),
    reportTitle: document.getElementById('tarot-report-title'),
    score: document.getElementById('tarot-score'),
    status: document.getElementById('tarot-status'),
    flow: document.getElementById('tarot-flow'),
    caution: document.getElementById('tarot-caution'),
    line: document.getElementById('tarot-line')
  };

  let selectedCard = null;

  function randomCard() {
    return cards[Math.floor(Math.random() * cards.length)];
  }

  function staticUrl(path) {
    return `/static/${String(path || '').replace(/^\/+/, '')}`;
  }

  function openModal(card) {
    selectedCard = card;
    el.title.textContent = card.title;
    el.en.textContent = card.en || 'MONEY CARD';
    if (el.image) {
      el.image.src = staticUrl(card.image);
      el.image.alt = `${card.title} ${card.en || ''} 재물 카드`.trim();
    }
    reveal.classList.remove('is-hidden');
    report.classList.add('is-hidden');
    modal.classList.remove('is-hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => el.fortuneBtn?.focus(), 50);
  }

  function closeModal() {
    modal.classList.add('is-hidden');
    document.body.style.overflow = '';
  }

  function renderReport() {
    if (!selectedCard) return;
    el.reportTitle.textContent = `${selectedCard.title} · ${selectedCard.en}`;
    el.score.textContent = selectedCard.score;
    el.status.textContent = selectedCard.status;
    el.flow.textContent = selectedCard.flow;
    el.caution.textContent = selectedCard.caution;
    el.line.textContent = selectedCard.line;
    reveal.classList.add('is-hidden');
    report.classList.remove('is-hidden');
    report.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetPicker() {
    selectedCard = null;
    closeModal();
    if (el.image) {
      el.image.removeAttribute('src');
      el.image.alt = '';
    }
    el.choices.forEach(btn => btn.classList.remove('is-muted', 'is-picked'));
    if (el.hint) el.hint.textContent = '정답은 없어요. 가장 먼저 눈에 들어오는 카드를 선택해보세요.';
  }

  el.choices.forEach(choice => {
    choice.addEventListener('click', () => {
      if (selectedCard) return;
      const card = randomCard();
      el.choices.forEach(btn => {
        if (btn === choice) btn.classList.add('is-picked');
        else btn.classList.add('is-muted');
      });
      if (el.hint) el.hint.textContent = '선택한 카드의 메시지를 열고 있어요…';
      window.setTimeout(() => openModal(card), 360);
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(node => {
    node.addEventListener('click', resetPicker);
  });

  el.fortuneBtn?.addEventListener('click', renderReport);
  el.redrawBtn?.addEventListener('click', resetPicker);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.classList.contains('is-hidden')) resetPicker();
  });
})();
