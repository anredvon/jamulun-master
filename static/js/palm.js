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
    retake: $('palm-retake-button'), result: $('palm-result'), again: $('palm-again-button'), completeNotice: $('palm-complete-notice'),
    scanCenter: $('palm-scan-center'),
    resultCopy: $('palm-result-copy'), resultTypes: $('palm-result-types'), resultTitle: $('palm-result-title'),
    resultOneLine: $('palm-result-one-line'), resultReadings: $('palm-line-readings'), resultHeading: $('palm-result-heading')
  };
  let combinations = [];
  try { combinations = JSON.parse(comboNode.textContent || '[]'); } catch (_) { combinations = []; }
  const labels = {
    heart: { h1: '비교적 곧은 마음선', h2: '바깥쪽으로 올라가는 마음선', h3: '바깥쪽으로 내려가는 마음선', h4: '안쪽으로 휘는 마음선', h5: '둥글게 휘는 마음선' },
    head: { d1: '비교적 곧은 두뇌선', d2: '손가락 쪽으로 올라가는 두뇌선', d3: '손목 쪽으로 내려가는 두뇌선', d4: '안쪽으로 휘는 두뇌선', d5: '둥글게 휘는 두뇌선' },
    fate: { f1: '중앙을 곧게 지나는 운명선', f2: '한쪽으로 기운 운명선', f3: '중간에 끊겨 보이는 운명선', f4: '갈라져 보이는 운명선' }
  };
  const readings = {
    heart: {
      h1: '곧게 뻗은 마음선은 감정을 차분히 다루고 현실적인 균형을 중시하는 모습으로 풀이해요.',
      h2: '위로 향하는 마음선은 밝고 적극적으로 마음을 표현하는 성향으로 풀이해요.',
      h3: '아래로 향하는 마음선은 생각이 깊고 공감의 폭이 넓은 모습으로 풀이해요.',
      h4: '안쪽으로 휘는 마음선은 관계에서 신중하고 속마음을 천천히 나누는 모습으로 풀이해요.',
      h5: '둥글게 휘는 마음선은 정이 많고 주변과 따뜻함을 나누는 모습으로 풀이해요.'
    },
    head: {
      d1: '곧은 두뇌선은 순서와 현실성을 중시하는 생각 방식으로 풀이해요.',
      d2: '위로 향하는 두뇌선은 목표를 세우고 구체적으로 추진하는 모습으로 풀이해요.',
      d3: '아래로 향하는 두뇌선은 상상력과 직관을 살려 가능성을 넓히는 모습으로 풀이해요.',
      d4: '완만하게 휘는 두뇌선은 상황에 따라 판단을 조정하는 유연함으로 풀이해요.',
      d5: '둥글게 휘는 두뇌선은 한 주제를 깊이 생각하고 충분히 살피는 모습으로 풀이해요.'
    },
    fate: {
      f1: '중앙을 이어 가는 운명선은 한 방향으로 꾸준히 쌓아가는 흐름으로 풀이해요.',
      f2: '기울어진 운명선은 환경과 선택에 따라 진로의 폭을 넓혀 가는 흐름으로 풀이해요.',
      f3: '중간에 끊겨 보이는 운명선은 변화의 시기에 잠시 멈춰 새 방향을 찾는 흐름으로 풀이해요.',
      f4: '갈라져 보이는 운명선은 여러 관심사와 선택지를 함께 살피는 흐름으로 풀이해요.'
    }
  };
  let activeUrls = new Set();
  let analysisCanvas = null;
  let candidates = { heart: null, head: null, fate: null };
  let generation = 0;

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

  function renderResult(lineTypes) {
    let id;
    try { id = window.MoneyFlowPalmCombinations.comboId(lineTypes.heart, lineTypes.head, lineTypes.fate); }
    catch (_) { return; }
    const result = combinations.find((item) => item.id === id);
    if (!result) return;

    applyLineShapes(lineTypes);
    el.resultTitle.textContent = result.title;
    el.resultOneLine.textContent = result.oneLine;
    el.resultTypes.textContent = '사진에서 추정한 선 모양을 바탕으로 한 재미용 풀이';
    el.resultReadings.replaceChildren();
    for (const [key, title] of [['heart', '마음선'], ['head', '두뇌선'], ['fate', '운명선']]) {
      const card = document.createElement('article');
      card.className = 'palm-reading-item';
      const heading = document.createElement('h4');
      heading.textContent = `${title} · ${labels[key][lineTypes[key]]}`;
      const description = document.createElement('p');
      description.textContent = readings[key][lineTypes[key]];
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
      id: drawId, type: 'palm', label: '오늘의 손금', title: result.title, summary: result.oneLine,
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
      candidates = { heart: result.heartCandidate || 'h1', head: result.headCandidate || 'd1', fate: result.fateCandidate || 'f1' };
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
    el.completeNotice.classList.add('is-hidden');
    el.capture.classList.add('is-hidden');
    previewCard.classList.add('is-hidden');
    el.result.classList.remove('is-hidden');
    renderResult(candidates);
  });
  window.MoneyFlowPalm = { dispose, reset: resetPhotoFlow };
})();
