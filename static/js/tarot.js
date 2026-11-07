(() => {
  'use strict';

  const dataNode = document.getElementById('tarot-data');
  const picker = document.getElementById('tarot-picker');
  const modal = document.getElementById('tarot-modal');
  const reveal = document.getElementById('tarot-reveal');
  const report = document.getElementById('tarot-report');
  if (!dataNode || !picker || !modal || !reveal || !report) return;

  let cards = [];
  try { cards = JSON.parse(dataNode.textContent || '[]'); } catch (error) { console.error(error); }
  if (!cards.length) return;

  const $ = (id) => document.getElementById(id);
  const elements = {
    choices: [...document.querySelectorAll('.tarot-choice')],
    hint: $('tarot-hint'), title: $('tarot-modal-title'),
    image: $('tarot-art-image'), revealCard: $('tarot-reveal-card'),
    reportImage: $('tarot-report-image'), fortuneButton: $('tarot-fortune-btn'),
    redrawButton: $('tarot-redraw-btn'), reportTitle: $('tarot-report-title'),
    status: $('tarot-status'), flow: $('tarot-flow'), caution: $('tarot-caution'),
    line: $('tarot-line'), caption: $('tarot-reveal-caption')
  };

  let selected = null;
  let isShuffling = false;
  let isOpening = false;
  let pendingOpenTimer = null;
  let shuffleTimer = null;
  const completedShuffleChoices = new Set();
  let drawId = null;
  const focusManager = window.MoneyFlowDialogFocus?.create(document);
  const newDrawId = () => `tarot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const imageUrl = (card) => `/static/${String(card?.image || '').replace(/^\/+/, '')}`;
  const randomCard = () => cards[Math.floor(Math.random() * cards.length)];

  function openModal(card) {
    isOpening = false;
    selected = card;
    drawId = newDrawId();
    elements.title.textContent = card.title;
    elements.image.src = imageUrl(card);
    elements.image.alt = `${card.title} 타로카드`;
    elements.caption.textContent = `${card.title} · ${card.status}`;
    reveal.classList.remove('is-hidden');
    report.classList.add('is-hidden');
    modal.classList.remove('is-hidden');
    document.body.style.overflow = 'hidden';
    focusManager?.open(modal, elements.fortuneButton);
    elements.revealCard.classList.remove('is-revealing');
    void elements.revealCard.offsetWidth;
    elements.revealCard.classList.add('is-revealing');
  }

  function closeModal() {
    modal.classList.add('is-hidden');
    document.body.style.overflow = '';
    focusManager?.close();
  }

  function renderReport() {
    if (!selected || reveal.classList.contains('is-hidden')) return;
    elements.reportTitle.textContent = selected.title;
    elements.status.textContent = selected.status;
    elements.flow.textContent = selected.flow;
    elements.caution.textContent = selected.caution;
    elements.line.textContent = selected.line;
    elements.reportImage.src = imageUrl(selected);
    reveal.classList.add('is-hidden');
    report.classList.remove('is-hidden');
    window.MoneyFlowHistory?.add({
      id: drawId,
      type: 'tarot',
      label: '오늘의 타로',
      title: selected.title,
      summary: `${selected.title} · 오늘의 마음을 돌아본 기록`,
      meta: { cardId: String(selected.id) }
    });
    report.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearChoiceState() {
    selected = null;
    drawId = null;
    elements.choices.forEach((button) => {
      button.disabled = false;
      button.classList.remove('is-muted', 'is-picked');
    });
  }

  function finishShuffle() {
    if (!isShuffling) return;
    if (shuffleTimer !== null) window.clearTimeout(shuffleTimer);
    shuffleTimer = null;
    picker.classList.remove('is-shuffling');
    elements.choices.forEach((button) => { button.disabled = false; });
    elements.hint.textContent = '세 카드의 위치와 관계없이 한 장을 무작위로 뽑아요.';
    completedShuffleChoices.clear();
    isShuffling = false;
  }

  function reset(animate = false) {
    if (isShuffling) return;
    if (pendingOpenTimer !== null) window.clearTimeout(pendingOpenTimer);
    pendingOpenTimer = null;
    isOpening = false;
    clearChoiceState();
    closeModal();
    if (!animate) return;
    isShuffling = true;
    picker.classList.add('is-shuffling');
    elements.choices.forEach((button) => { button.disabled = true; });
    elements.hint.textContent = '카드를 다시 섞고 있어요…';
    picker.scrollIntoView({ behavior: 'smooth', block: 'center' });
    completedShuffleChoices.clear();
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finishShuffle();
      return;
    }
    shuffleTimer = window.setTimeout(finishShuffle, 1300);
  }

  picker.addEventListener('animationend', (event) => {
    if (!isShuffling || !elements.choices.includes(event.target) || !event.animationName?.startsWith('shuffle-')) return;
    completedShuffleChoices.add(event.target);
    if (completedShuffleChoices.size === elements.choices.length) finishShuffle();
  });

  elements.choices.forEach((choice) => choice.addEventListener('click', () => {
    if (selected || isOpening || isShuffling) return;
    isOpening = true;
    const card = randomCard(); // Draw with replacement; a selected card stays in the pool.
    elements.choices.forEach((button) => button === choice
      ? button.classList.add('is-picked')
      : button.classList.add('is-muted'));
    elements.choices.forEach((button) => { button.disabled = true; });
    elements.hint.textContent = '오늘의 카드를 만나고 있어요…';
    pendingOpenTimer = window.setTimeout(() => {
      pendingOpenTimer = null;
      if (isOpening) openModal(card);
    }, 400);
  }));

  document.querySelectorAll('[data-close-modal]').forEach((node) => {
    node.addEventListener('click', () => reset(false));
  });
  elements.fortuneButton?.addEventListener('click', renderReport);
  elements.redrawButton?.addEventListener('click', () => reset(true));
  if (focusManager) document.addEventListener('keydown', focusManager.handleKeydown);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('is-hidden')) reset(false);
  });
})();
