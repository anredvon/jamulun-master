(() => {
  'use strict';
  const dataNode = document.getElementById('investment-quote-data');
  const button = document.getElementById('quote-draw-button');
  if (!dataNode || !button) return;

  let quotes = [];
  try { quotes = JSON.parse(dataNode.textContent || '[]'); } catch (_) { quotes = []; }
  if (!quotes.length) { button.disabled = true; return; }

  const el = {
    text: document.getElementById('quote-text'), original: document.getElementById('quote-original'),
    attribution: document.getElementById('quote-attribution'), author: document.getElementById('quote-author'),
    source: document.getElementById('quote-source'), sourceTitle: document.getElementById('quote-source-title'), status: document.getElementById('quote-save-status')
  };

  button.addEventListener('click', () => {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    el.text.textContent = quote.text_ko;
    el.original.textContent = quote.text_original;
    el.original.classList.remove('is-hidden');
    el.author.textContent = quote.author;
    el.source.href = quote.source_url;
    el.source.title = quote.source_title;
    el.sourceTitle.textContent = quote.source_title;
    el.attribution.classList.remove('is-hidden');
    const saved = window.MoneyFlowHistory?.add({
      id: `quote-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: 'quote', label: '투자 한 줄', title: quote.author, summary: quote.text_ko,
      meta: { quoteId: quote.id, sourceTitle: quote.source_title, sourceUrl: quote.source_url }
    });
    el.status.textContent = saved ? '이 한 줄을 기록에 저장했어요.' : '한 줄을 보여드렸지만 이 기기에는 저장하지 못했어요.';
  });
})();
