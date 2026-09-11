(() => {
  'use strict';

  const dataNode = document.getElementById('tarot-data');
  const picker = document.getElementById('tarot-picker');
  const modal = document.getElementById('tarot-modal');
  const reveal = document.getElementById('tarot-reveal');
  const report = document.getElementById('tarot-report');
  if (!dataNode || !picker || !modal || !reveal || !report) return;

  let cards = [];
  try { cards = JSON.parse(dataNode.textContent || '[]'); } catch (err) { console.error('Tarot data parse failed', err); }
  if (!cards.length) return;

  const COLLECTION_KEY = 'moneyflow_tarot_collection_v1';
  const el = {
    choices: [...document.querySelectorAll('.tarot-choice')], hint: document.getElementById('tarot-hint'),
    title: document.getElementById('tarot-modal-title'), en: document.getElementById('tarot-card-en'), image: document.getElementById('tarot-art-image'),
    reportImage: document.getElementById('tarot-report-image'), fortuneBtn: document.getElementById('tarot-fortune-btn'), redrawBtn: document.getElementById('tarot-redraw-btn'),
    reportTitle: document.getElementById('tarot-report-title'), score: document.getElementById('tarot-score'), status: document.getElementById('tarot-status'),
    flow: document.getElementById('tarot-flow'), caution: document.getElementById('tarot-caution'), line: document.getElementById('tarot-line'),
    foundCount: document.getElementById('tarot-found-count'), newBadge: document.getElementById('tarot-new-badge'),
    revealCaption: document.getElementById('tarot-reveal-caption'), collectionNote: document.getElementById('tarot-collection-note')
  };

  let selectedCard = null;
  let selectedWasNew = false;
  const cardKey = card => String(card?.id || card?.image || card?.title || '');
  const readCollection = () => {
    try { const value = JSON.parse(localStorage.getItem(COLLECTION_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch (_) { return []; }
  };
  const updateCollectionCount = () => { if (el.foundCount) el.foundCount.textContent = String(readCollection().length); };
  updateCollectionCount();

  function randomCard() { return cards[Math.floor(Math.random() * cards.length)]; }
  function staticUrl(path) { return `/static/${String(path || '').replace(/^\/+/, '')}`; }
  function cardImageUrl(card) { return staticUrl(card?.image); }

  function discover(card) {
    const found = readCollection();
    const key = cardKey(card);
    const isNew = !found.includes(key);
    if (isNew) {
      try { localStorage.setItem(COLLECTION_KEY, JSON.stringify([...found, key])); } catch (_) {}
    }
    updateCollectionCount();
    return isNew;
  }

  function openModal(card) {
    selectedCard = card;
    selectedWasNew = discover(card);
    el.title.textContent = card.title;
    el.en.textContent = card.en || 'MONEY CARD';
    if (el.image) { el.image.src = cardImageUrl(card); el.image.alt = `${card.title} ${card.en || ''} 타로카드`.trim(); }
    el.newBadge?.classList.toggle('is-hidden', !selectedWasNew);
    if (el.revealCaption) el.revealCaption.textContent = selectedWasNew ? '처음 만난 카드예요. 컬렉션에 새 카드가 추가됐어요 ✨' : '다시 만난 카드예요. 오늘은 어떤 메시지를 건넬까요?';
    reveal.classList.remove('is-hidden'); report.classList.add('is-hidden'); modal.classList.remove('is-hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => el.fortuneBtn?.focus(), 50);
  }

  function closeModal() { modal.classList.add('is-hidden'); document.body.style.overflow = ''; }

  function renderReport() {
    if (!selectedCard) return;
    el.reportTitle.textContent = `${selectedCard.title} · ${selectedCard.en}`;
    el.score.textContent = selectedCard.score; el.status.textContent = selectedCard.status; el.flow.textContent = selectedCard.flow;
    el.caution.textContent = selectedCard.caution; el.line.textContent = selectedCard.line;
    if (el.reportImage) { el.reportImage.src = cardImageUrl(selectedCard); el.reportImage.alt = `${selectedCard.title} 카드 미리보기`; }
    if (el.collectionNote) {
      const count = readCollection().length;
      el.collectionNote.textContent = selectedWasNew ? `새 카드 발견! 지금까지 24장 중 ${count}장을 만났어요 ✨` : `지금까지 24장 중 ${count}장을 만났어요.`;
    }
    reveal.classList.add('is-hidden'); report.classList.remove('is-hidden'); report.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function resetPicker() {
    selectedCard = null; selectedWasNew = false; closeModal();
    if (el.image) { el.image.removeAttribute('src'); el.image.alt = ''; }
    if (el.reportImage) { el.reportImage.removeAttribute('src'); el.reportImage.alt = ''; }
    el.choices.forEach(btn => btn.classList.remove('is-muted','is-picked'));
    if (el.hint) el.hint.textContent = '첫눈에 끌리는 카드가 오늘의 카드예요.';
  }

  el.choices.forEach(choice => choice.addEventListener('click', () => {
    if (selectedCard) return;
    const card = randomCard();
    el.choices.forEach(btn => btn === choice ? btn.classList.add('is-picked') : btn.classList.add('is-muted'));
    if (el.hint) el.hint.textContent = '오늘의 카드를 만나고 있어요…';
    window.setTimeout(() => openModal(card), 360);
  }));

  document.querySelectorAll('[data-close-modal]').forEach(node => node.addEventListener('click', resetPicker));
  el.fortuneBtn?.addEventListener('click', renderReport);
  el.redrawBtn?.addEventListener('click', resetPicker);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.classList.contains('is-hidden')) resetPicker(); });
})();
