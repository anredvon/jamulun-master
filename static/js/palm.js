(() => {
  'use strict';
  const input = document.getElementById('palm-file-input');
  const comboNode = document.getElementById('palm-combo-data');
  const previewCard = document.getElementById('palm-preview-card');
  if (!input || !previewCard || !comboNode || !window.MoneyFlowPalmAnalysis || !window.MoneyFlowPalmCombinations || !window.MoneyFlowPalmCopy) return;

  const $ = (id) => document.getElementById(id);
  const el = {
    camera: $('palm-camera-button'), gallery: $('palm-gallery-button'), capture: $('palm-capture'),
    preview: $('palm-preview'), canvas: $('palm-overlay'), status: $('palm-status'),
    retake: $('palm-retake-button'), result: $('palm-result'), again: $('palm-again-button'), completeNotice: $('palm-complete-notice'),
    scanCenter: $('palm-scan-center'),
    resultCopy: $('palm-result-copy'), resultTypes: $('palm-result-types'), resultTitle: $('palm-result-title'),
    resultOneLine: $('palm-result-one-line'), resultReadings: $('palm-line-readings'), resultHeading: $('palm-result-heading')
  };
  let combinations = [];
  try { combinations = JSON.parse(comboNode.textContent || '[]'); } catch (_) { combinations = []; }
  const { labels, readings, summaryTraits, reflectionPrompt, uncertainReading } = window.MoneyFlowPalmCopy;
  let activeUrls = new Set();
  let analysisCanvas = null;
  let candidates = { heart: null, head: null, fate: null };
  let generation = 0;
  let needsRetake = false;

  function renderResult(lineTypes) {
    let id;
    try { id = window.MoneyFlowPalmCombinations.comboId(lineTypes.heart, lineTypes.head, lineTypes.fate); }
    catch (_) { return; }
    const result = combinations.find((item) => item.id === id);
    if (!result) return;

    el.resultTitle.textContent = `${summaryTraits.heart[lineTypes.heart]} · ${summaryTraits.head[lineTypes.head]} · ${summaryTraits.fate[lineTypes.fate]}`;
    el.resultOneLine.textContent = reflectionPrompt;
    const uncertainLines = Object.entries(lineTypes).filter(([key]) => !candidates[key]);
    el.resultTypes.textContent = uncertainLines.length
      ? `사진에서 추정한 선 모양 · ${uncertainLines.map(([key]) => ({ heart: '감정선', head: '두뇌선', fate: '운명선' })[key]).join('·')}은 잘 보이지 않아 참고 유형으로 표시했어요`
      : '사진에서 추정한 감정선 · 두뇌선 · 운명선';
    el.resultReadings.replaceChildren();
    for (const [key, title] of [['heart', '감정선'], ['head', '두뇌선'], ['fate', '운명선']]) {
      const card = document.createElement('article');
      card.className = 'palm-reading-item';
      const heading = document.createElement('h4');
      heading.textContent = `${title} · ${labels[key][lineTypes[key]]}`;
      const description = document.createElement('p');
      description.textContent = candidates[key]
        ? readings[key][lineTypes[key]]
        : uncertainReading;
      card.append(heading, description);
      el.resultReadings.appendChild(card);
    }
    el.resultCopy.classList.add('is-hidden');
    el.resultCopy.classList.remove('is-revealed');
    el.completeNotice.classList.add('is-hidden');
    el.result.classList.remove('is-result-ready');
    el.result.classList.add('is-result-ready');
    el.resultCopy.classList.remove('is-hidden');
    el.resultCopy.classList.add('is-revealed');
    el.resultHeading.textContent = '내 손금은 이렇게 풀이돼요';
    el.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const drawId = `palm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.MoneyFlowHistory?.add({
      id: drawId, type: 'palm', label: '오늘의 손금', title: el.resultTitle.textContent, summary: el.resultOneLine.textContent,
      meta: { comboId: result.id, lineTypes }
    });
    window.MoneyFlowPalm.dispose();
  }

  function revokeUrls() {
    for (const url of activeUrls) URL.revokeObjectURL(url);
    activeUrls.clear();
  }

  function finishPreviewScan() {
    previewCard.classList.remove('is-scanning');
    previewCard.classList.add('is-analysis-complete');
    el.scanCenter.classList.add('is-hidden');
    needsRetake = Object.values(candidates).filter(Boolean).length < 2;
    if (needsRetake) {
      el.completeNotice.querySelector('.palm-complete-icon').textContent = '↻';
      el.completeNotice.querySelector('strong').textContent = '손금 선이 잘 보이지 않아요';
      el.completeNotice.querySelector('small').textContent = '밝은 곳에서 손바닥 전체를 다시 찍어주세요';
      el.completeNotice.querySelector('.palm-complete-arrow').textContent = '›';
    } else {
      el.completeNotice.querySelector('.palm-complete-icon').textContent = '✓';
      el.completeNotice.querySelector('strong').textContent = '손금 분석이 완료되었습니다';
      el.completeNotice.querySelector('small').textContent = '눌러서 손금풀이 보기';
      el.completeNotice.querySelector('.palm-complete-arrow').textContent = '›';
    }
    el.completeNotice.classList.remove('is-hidden');
  }

  function dispose() {
    revokeUrls();
    if (analysisCanvas) {
      analysisCanvas.width = 0;
      analysisCanvas.height = 0;
      analysisCanvas = null;
    }
    el.preview.removeAttribute('src');
    el.canvas.width = 0;
    el.canvas.height = 0;
    input.value = '';
  }

  function resetPhotoFlow() {
    generation += 1;
    needsRetake = false;
    dispose();
    candidates = { heart: null, head: null, fate: null };
    previewCard.classList.add('is-hidden');
    el.result.classList.add('is-hidden');
    el.result.classList.remove('is-scanning');
    el.result.classList.remove('is-result-ready');
    el.completeNotice.classList.add('is-hidden');
    el.resultCopy.classList.add('is-hidden');
    el.capture.classList.remove('is-hidden');
  }

  function resizeToCanvas(image, canvas) {
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    canvas.getContext('2d', { willReadFrequently: true }).drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  }

  function makePreviewUrl(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('preview-unavailable'));
        const url = URL.createObjectURL(blob);
        activeUrls.add(url);
        resolve(url);
      }, 'image/jpeg', 0.84);
    });
  }

  async function inspectFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const operation = ++generation;
    if (file.size > 12 * 1024 * 1024) {
      el.status.textContent = '사진이 너무 커요. 12MB 이하의 사진을 선택해주세요.';
      el.capture.classList.add('is-hidden');
      previewCard.classList.remove('is-hidden');
      previewCard.classList.remove('is-scanning', 'is-analysis-complete');
      el.scanCenter.classList.add('is-hidden');
      el.completeNotice.classList.add('is-hidden');
      return;
    }
    el.capture.classList.add('is-hidden');
    previewCard.classList.remove('is-hidden');
    previewCard.classList.remove('is-analysis-complete');
    previewCard.classList.add('is-scanning');
    el.scanCenter.classList.remove('is-hidden');
    el.completeNotice.classList.add('is-hidden');
    el.status.textContent = '손바닥 선을 읽고 있어요';

    const sourceUrl = URL.createObjectURL(file);
    activeUrls.add(sourceUrl);
    const image = new Image();
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('image-unreadable'));
        image.src = sourceUrl;
      });
      if (operation !== generation) return;
      el.preview.src = sourceUrl;
      const scanStartedAt = performance.now();
      analysisCanvas = document.createElement('canvas');
      const imageData = resizeToCanvas(image, analysisCanvas);
      const result = window.MoneyFlowPalmAnalysis.analyzeImageData(imageData, analysisCanvas.width, analysisCanvas.height);
      candidates = { heart: result.heartCandidate, head: result.headCandidate, fate: result.fateCandidate };
      const previewUrl = await makePreviewUrl(analysisCanvas);
      if (operation !== generation) {
        URL.revokeObjectURL(previewUrl);
        activeUrls.delete(previewUrl);
        return;
      }
      el.preview.src = previewUrl;
      URL.revokeObjectURL(sourceUrl);
      activeUrls.delete(sourceUrl);
      analysisCanvas.width = 0;
      analysisCanvas.height = 0;
      analysisCanvas = null;
      candidates = { heart: result.heartCandidate, head: result.headCandidate, fate: result.fateCandidate };
      await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, 2600 - (performance.now() - scanStartedAt))));
      if (operation !== generation) return;
      el.status.textContent = '손금 분석이 완료되었습니다.';
      finishPreviewScan();
    } catch (_) {
      URL.revokeObjectURL(sourceUrl);
      activeUrls.delete(sourceUrl);
      el.status.textContent = '사진을 읽지 못했어요. 다른 사진을 선택해주세요.';
      previewCard.classList.remove('is-scanning');
      el.scanCenter.classList.add('is-hidden');
    }
  }

  el.camera.addEventListener('click', () => {
    input.setAttribute('capture', 'environment');
    input.click();
  });
  el.gallery.addEventListener('click', () => {
    input.removeAttribute('capture');
    input.click();
  });
  input.addEventListener('change', () => { void inspectFile(input.files?.[0]); });
  el.retake.addEventListener('click', resetPhotoFlow);
  el.again.addEventListener('click', resetPhotoFlow);
  el.completeNotice.addEventListener('click', () => {
    if (needsRetake) {
      resetPhotoFlow();
      el.camera.click();
      return;
    }
    el.completeNotice.classList.add('is-hidden');
    el.capture.classList.add('is-hidden');
    previewCard.classList.add('is-hidden');
    el.result.classList.remove('is-hidden');
    renderResult({ heart: candidates.heart || 'h1', head: candidates.head || 'd1', fate: candidates.fate || 'f1' });
  });
  window.MoneyFlowPalm = { dispose, reset: resetPhotoFlow };
})();
