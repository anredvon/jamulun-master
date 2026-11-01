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
      h1: '전통 손금에서는 곧은 감정선을 감정을 쉽게 드러내기보다 차분히 살피고, 관계에서도 현실적인 균형을 중시하는 모습으로 풀이해요. 마음을 표현할 때는 짧고 분명한 말이 도움이 된다고 봅니다.',
      h2: '바깥쪽으로 올라가는 감정선은 호감과 고마움을 비교적 적극적으로 표현하는 유형으로 풀이해요. 마음이 앞설 때는 상대의 속도도 함께 확인하면 관계가 한결 편안하다는 이야기로 읽습니다.',
      h3: '아래로 기울어진 감정선은 감정을 깊이 곱씹고 타인의 사정을 헤아리는 유형으로 풀이해요. 공감이 강점인 만큼 다른 사람의 몫까지 떠안지 않도록 경계를 살피라는 전통적 해석이 따릅니다.',
      h4: '안쪽으로 휘는 감정선은 쉽게 마음을 열기보다 신뢰를 확인한 뒤 깊게 관계 맺는 모습으로 풀이해요. 표현이 늦어 오해가 생기지 않도록 원하는 바를 먼저 말해보라는 조언과 연결됩니다.',
      h5: '둥글게 휘는 감정선은 애정과 친밀감을 따뜻하게 나누고 상대의 반응을 살피는 유형으로 풀이해요. 배려가 장점이지만, 자신의 기분과 필요도 같은 무게로 챙기는 것이 좋다는 이야기입니다.'
    },
    head: {
      d1: '곧은 두뇌선은 사실과 순서를 중시하고, 손에 잡히는 기준으로 결정을 내리는 유형으로 풀이해요. 계획을 잘 세우는 편이지만 익숙한 방식만 고집하지 않도록 선택지를 하나 더 비교해보라는 해석입니다.',
      d2: '위쪽으로 향하는 두뇌선은 목표를 정하고 결과를 향해 밀고 나가는 실천형으로 풀이해요. 추진력이 강점인 만큼 큰 결정을 할 때는 비용과 기간을 적어 속도와 점검을 함께 가져가라는 이야기입니다.',
      d3: '아래쪽으로 기우는 두뇌선은 상상력과 직관을 활용해 여러 가능성을 떠올리는 유형으로 풀이해요. 아이디어를 잘 포착하는 만큼 생각을 기록하고 현실적인 조건을 확인하면 구상이 더 구체화된다는 해석입니다.',
      d4: '완만하게 휘는 두뇌선은 한 가지 답에 서두르기보다 상황과 사람을 함께 고려하는 유연한 판단으로 풀이해요. 장점은 조정 능력이고, 결정이 늦어지기 쉬우니 우선순위를 정해 마감 시점을 두라는 조언과 이어집니다.',
      d5: '둥글게 휘는 두뇌선은 한 주제를 깊게 살피면서 직관과 분석을 함께 쓰는 유형으로 풀이해요. 충분히 검토한 뒤 움직이는 편이라, 작은 실험으로 먼저 확인하면 고민을 실행으로 옮기기 쉽다는 이야기입니다.'
    },
    fate: {
      f1: '손바닥 중앙을 길게 잇는 운명선은 한 목표에 시간과 노력을 꾸준히 쌓는 흐름으로 풀이해요. 반복을 힘으로 삼는 유형이라는 뜻이며, 방향을 정기적으로 점검하면 성실함이 더 잘 살아난다는 이야기입니다.',
      f2: '한쪽으로 기울어 보이는 운명선은 주변 환경이나 만남을 계기로 진로와 역할이 달라질 수 있는 흐름으로 풀이해요. 변화에 적응하는 힘을 장점으로 보되, 중요한 선택은 자신의 기준을 먼저 세우라는 해석입니다.',
      f3: '중간에 끊겨 보이는 운명선은 일이나 삶의 방향에 전환점이 생기는 모습으로 풀이해요. 끊김을 불운으로 단정하지 않고, 쉬어 가며 계획을 다시 세우는 시기로 해석합니다.',
      f4: '갈라져 보이는 운명선은 여러 관심사나 역할을 병행하는 흐름으로 풀이해요. 선택지가 넓은 장점이 있는 만큼 지금 집중할 한두 가지를 정하면 에너지를 모으기 쉽다는 해석입니다.'
    }
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

    el.resultTitle.textContent = result.title;
    el.resultOneLine.textContent = result.oneLine;
    const uncertainLines = Object.entries(lineTypes).filter(([key]) => !candidates[key]);
    el.resultTypes.textContent = uncertainLines.length
      ? `사진 명암에서 추정한 재미용 풀이 · ${uncertainLines.map(([key]) => ({ heart: '감정선', head: '두뇌선', fate: '운명선' })[key]).join('·')}은 선이 뚜렷하지 않아 기본 유형으로 표시했어요`
      : '사진 명암에서 추정한 선 모양을 바탕으로 한 재미용 풀이';
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
