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
    heart: { h1: '비교적 곧은 감정선', h2: '바깥쪽으로 올라가는 감정선', h3: '아래로 기울어진 감정선', h4: '안쪽으로 휘는 감정선', h5: '둥글게 휘는 감정선' },
    head: { d1: '비교적 곧은 두뇌선', d2: '손가락 쪽으로 올라가는 두뇌선', d3: '손목 쪽으로 내려가는 두뇌선', d4: '안쪽으로 휘는 두뇌선', d5: '둥글게 휘는 두뇌선' },
    fate: { f1: '중앙을 곧게 지나는 운명선', f2: '한쪽으로 기운 운명선', f3: '중간에 끊겨 보이는 운명선', f4: '갈라져 보이는 운명선' }
  };
  const readings = {
    heart: {
      h1: '곧은 감정선은 감정을 차분히 살피고 관계에서 균형을 중시하는 모습으로 풀이해요. 마음을 전할 땐 핵심을 분명히 말해보세요.',
      h2: '위로 향하는 감정선은 호감과 고마움을 적극적으로 표현하는 모습으로 읽어요. 상대의 속도도 함께 살피면 배려가 더 잘 전해져요.',
      h3: '아래로 기우는 감정선은 타인의 사정을 깊이 헤아리는 모습으로 풀이해요. 공감만큼 내 감정의 경계도 챙겨보세요.',
      h4: '안쪽으로 휘는 감정선은 신뢰를 확인한 뒤 깊이 관계 맺는 모습으로 읽어요. 원하는 바를 먼저 표현하면 오해를 줄일 수 있어요.',
      h5: '둥근 감정선은 친밀감을 따뜻하게 나누는 모습으로 풀이해요. 상대를 배려하듯 내 기분과 필요도 살펴보세요.'
    },
    head: {
      d1: '곧은 두뇌선은 사실과 순서를 중시하는 방식으로 풀이해요. 익숙한 답 외에 선택지 하나를 더 비교해보세요.',
      d2: '위로 향하는 두뇌선은 목표를 정하고 실행하는 성향으로 읽어요. 큰 결정은 비용과 기간을 적어 점검해보세요.',
      d3: '아래로 기우는 두뇌선은 상상력과 직관을 활용하는 모습으로 풀이해요. 떠오른 생각을 적고 현실 조건을 확인해보세요.',
      d4: '완만히 휘는 두뇌선은 여러 상황을 함께 살피는 유연한 판단으로 읽어요. 우선순위와 결정 시점을 정하면 도움이 돼요.',
      d5: '둥근 두뇌선은 한 주제를 깊이 살피며 직관과 분석을 함께 쓰는 모습으로 풀이해요. 작은 시도로 생각을 확인해보세요.'
    },
    fate: {
      f1: '곧게 이어진 운명선은 한 목표에 꾸준히 힘을 쌓는 흐름으로 풀이해요. 가끔 방향을 점검하면 노력의 초점을 잡기 좋아요.',
      f2: '기울어진 운명선은 환경과 만남에 따라 방향을 조정하는 모습으로 읽어요. 선택할 때는 내 기준을 먼저 적어보세요.',
      f3: '중간에 끊겨 보이는 운명선은 변화의 시기를 상징한다고 풀이해요. 불운으로 단정하지 말고 계획을 다시 살펴보세요.',
      f4: '갈라진 운명선은 여러 관심사나 역할을 함께 살피는 흐름으로 읽어요. 지금 집중할 한두 가지를 정해보세요.'
    }
  };
  const summaryTraits = {
    heart: { h1: '감정은 차분히 살피고', h2: '호감은 적극 표현하고', h3: '상대 마음을 깊이 헤아리고', h4: '신뢰를 쌓아 마음을 열고', h5: '따뜻하게 마음을 나누고' },
    head: { d1: '현실 기준으로 결정하고', d2: '목표를 정해 실행하고', d3: '직관으로 가능성을 찾고', d4: '여러 조건을 함께 살피고', d5: '깊이 생각해 답을 찾고' },
    fate: { f1: '정한 방향을 꾸준히 이어가는 편', f2: '환경에 맞춰 방향을 조정하는 편', f3: '변화에 맞춰 계획을 새로 세우는 편', f4: '여러 관심사를 함께 살피는 편' }
  };
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
    el.resultOneLine.textContent = '오늘은 지출이나 선택 하나를 정하고, 결정 전에 기준을 한 번 더 확인해보세요.';
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
        : '사진에서 선의 형태가 뚜렷하지 않아 대표 유형으로 채웠어요. 이 부분은 다시 촬영하면 달라질 수 있습니다.';
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
