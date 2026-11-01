(() => {
  'use strict';
  const input = document.getElementById('palm-file-input');
  const comboNode = document.getElementById('palm-combo-data');
  const previewCard = document.getElementById('palm-preview-card');
  if (!input || !previewCard || !comboNode || !window.MoneyFlowPalmAnalysis || !window.MoneyFlowPalmCombinations) return;

  const $ = (id) => document.getElementById(id);
  const el = {
    camera: $('palm-camera-button'), gallery: $('palm-gallery-button'), capture: $('palm-capture'),
    preview: $('palm-preview'), canvas: $('palm-overlay'), status: $('palm-status'),
    review: $('palm-review'), quality: $('palm-quality-note'), retake: $('palm-retake-button'),
    resultButton: $('palm-result-button'), result: $('palm-result'), again: $('palm-again-button'),
    heart: $('palm-heart-type'), head: $('palm-head-type'), fate: $('palm-fate-type'),
    resultCopy: $('palm-result-copy'), resultTypes: $('palm-result-types'), resultTitle: $('palm-result-title'),
    resultSummary: $('palm-result-summary'), resultOneLine: $('palm-result-one-line')
  };
  let combinations = [];
  try { combinations = JSON.parse(comboNode.textContent || '[]'); } catch (_) { combinations = []; }
  const labels = {
    heart: { h1: '비교적 곧은 마음선', h2: '바깥쪽으로 올라가는 마음선', h3: '바깥쪽으로 내려가는 마음선', h4: '안쪽으로 휘는 마음선', h5: '둥글게 휘는 마음선' },
    head: { d1: '비교적 곧은 두뇌선', d2: '손가락 쪽으로 올라가는 두뇌선', d3: '손목 쪽으로 내려가는 두뇌선', d4: '안쪽으로 휘는 두뇌선', d5: '둥글게 휘는 두뇌선' },
    fate: { f1: '중앙을 곧게 지나는 운명선', f2: '한쪽으로 기운 운명선', f3: '중간에 끊겨 보이는 운명선', f4: '갈라져 보이는 운명선' }
  };
  const selectors = { heart: el.heart, head: el.head, fate: el.fate };
  let activeUrls = new Set();
  let analysisCanvas = null;
  let candidates = { heart: null, head: null, fate: null };
  let generation = 0;

  function fillSelect(select, items, selected) {
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = selected ? '사진에서 찾은 후보를 확인해 주세요' : '후보를 못 찾았어요 · 직접 선택';
    select.appendChild(placeholder);
    for (const [id, label] of Object.entries(items)) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = label;
      if (id === selected) option.selected = true;
      select.appendChild(option);
    }
    select.value = selected || '';
  }

  function updateConfirmButton() {
    el.resultButton.disabled = !Object.values(selectors).every((select) => Boolean(select.value));
  }

  function applyLineShapes(lineTypes) {
    const paths = {
      heart: {
        h1: 'M38 62 Q88 64 141 62', h2: 'M38 69 Q88 54 141 44', h3: 'M38 45 Q88 57 141 75',
        h4: 'M38 62 Q84 42 141 64', h5: 'M38 72 Q88 38 141 72'
      },
      head: {
        d1: 'M37 87 Q91 87 145 87', d2: 'M37 96 Q91 82 145 72', d3: 'M37 74 Q91 93 145 106',
        d4: 'M37 82 Q91 101 145 80', d5: 'M37 99 Q91 62 145 99'
      },
      fate: {
        f1: 'M91 145 Q92 101 90 56', f2: 'M70 145 Q93 105 111 56',
        f3: 'M91 145 Q93 119 90 98 M90 86 Q88 68 90 56', f4: 'M91 145 Q92 101 90 56 M90 102 Q73 88 63 76 M91 91 Q108 80 119 66'
      }
    };
    for (const [kind, id] of Object.entries(lineTypes)) {
      document.querySelector(`.palm-${kind}-path`).setAttribute('d', paths[kind][id]);
    }
  }

  function handleConfirmedLines(event) {
    const lineTypes = { heart: event.detail.heartId, head: event.detail.headId, fate: event.detail.fateId };
    let id;
    try { id = window.MoneyFlowPalmCombinations.comboId(lineTypes.heart, lineTypes.head, lineTypes.fate); }
    catch (_) { return; }
    const result = combinations.find((item) => item.id === id);
    if (!result) return;

    applyLineShapes(lineTypes);
    el.resultTitle.textContent = result.title;
    el.resultSummary.textContent = result.summary;
    el.resultOneLine.textContent = result.oneLine;
    el.resultTypes.textContent = `마음선 ${lineTypes.heart} · 두뇌선 ${lineTypes.head} · 운명선 ${lineTypes.fate}`;
    el.resultCopy.classList.add('is-hidden');
    el.resultCopy.classList.remove('is-revealed');
    el.result.classList.remove('is-scanning');
    void el.result.offsetWidth;
    el.result.classList.add('is-scanning');
    window.MoneyFlowPalm.dispose();
    window.setTimeout(() => {
      el.result.classList.remove('is-scanning');
      el.resultCopy.classList.remove('is-hidden');
      el.resultCopy.classList.add('is-revealed');
      const drawId = `palm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.MoneyFlowHistory?.add({
        id: drawId, type: 'palm', label: '오늘의 손금', title: result.title, summary: result.summary,
        meta: { comboId: result.id, lineTypes }
      });
    }, 2200);
  }

  function revokeUrls() {
    for (const url of activeUrls) URL.revokeObjectURL(url);
    activeUrls.clear();
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
    dispose();
    candidates = { heart: null, head: null, fate: null };
    previewCard.classList.add('is-hidden');
    el.review.classList.add('is-hidden');
    el.result.classList.add('is-hidden');
    el.result.classList.remove('is-scanning');
    el.capture.classList.remove('is-hidden');
    for (const [name, select] of Object.entries(selectors)) fillSelect(select, labels[name], null);
    updateConfirmButton();
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
      previewCard.classList.remove('is-hidden');
      return;
    }
    el.capture.classList.add('is-hidden');
    previewCard.classList.remove('is-hidden');
    el.review.classList.add('is-hidden');
    el.status.textContent = '사진의 선 모양을 이 기기에서 살펴보고 있어요…';

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
      el.status.textContent = result.quality === 'usable'
        ? '사진에서 찾은 선 후보를 표시했어요.'
        : '선이 잘 보이지 않아요. 밝은 곳에서 다시 찍거나 유형을 직접 골라주세요.';
      el.quality.textContent = '후보는 사진의 명암을 바탕으로 한 참고값이에요. 틀리면 바꿔도 괜찮아요.';
      for (const [name, select] of Object.entries(selectors)) fillSelect(select, labels[name], candidates[name]);
      el.review.classList.remove('is-hidden');
      updateConfirmButton();
    } catch (_) {
      URL.revokeObjectURL(sourceUrl);
      activeUrls.delete(sourceUrl);
      el.status.textContent = '사진을 읽지 못했어요. 다른 사진을 선택해주세요.';
      el.review.classList.add('is-hidden');
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
  for (const select of Object.values(selectors)) select.addEventListener('change', updateConfirmButton);
  el.resultButton.addEventListener('click', () => {
    if (el.resultButton.disabled) return;
    el.capture.classList.add('is-hidden');
    previewCard.classList.add('is-hidden');
    el.review.classList.add('is-hidden');
    el.result.classList.remove('is-hidden');
    window.dispatchEvent(new CustomEvent('moneyflow:palm-confirmed', { detail: {
      heartId: el.heart.value,
      headId: el.head.value,
      fateId: el.fate.value
    }}));
    dispose();
  });
  window.addEventListener('moneyflow:palm-confirmed', handleConfirmedLines);

  for (const [name, select] of Object.entries(selectors)) fillSelect(select, labels[name], null);
  updateConfirmButton();
  window.MoneyFlowPalm = { dispose, reset: resetPhotoFlow, getConfirmedLineTypes: () => ({ heartId: el.heart.value, headId: el.head.value, fateId: el.fate.value }) };
})();
