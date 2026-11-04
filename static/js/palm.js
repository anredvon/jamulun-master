(() => {
  'use strict';
  const input = document.getElementById('palm-file-input');
  const previewCard = document.getElementById('palm-preview-card');
  if (!input || !previewCard || !window.MoneyFlowPalmAnalysis || !window.MoneyFlowPalmHandDetector) return;

  const $ = (id) => document.getElementById(id);
  const el = {
    camera: $('palm-camera-button'), gallery: $('palm-gallery-button'), capture: $('palm-capture'),
    preview: $('palm-preview'), status: $('palm-status'), retake: $('palm-retake-button'),
    result: $('palm-result'), again: $('palm-again-button'), completeNotice: $('palm-complete-notice'),
    scanCenter: $('palm-scan-center'), resultCopy: $('palm-result-copy'), resultHeading: $('palm-result-heading'),
    side: $('palm-side'), dominant: $('palm-dominant'), captureState: $('palm-capture-state')
  };
  const rulesNode = $('palm-reading-rules');
  let rules = [];
  try { rules = JSON.parse(rulesNode?.textContent || '[]'); } catch (_) { rules = []; }
  const hands = { left: null, right: null };
  let activeUrl = null;
  let generation = 0;
  let needsRetake = false;
  let currentAnalysis = null;

  const sideName = (side) => side === 'left' ? '왼손' : '오른손';
  const lineNames = { heart: '감정선', head: '두뇌선', life: '생명선', fate: '운명선' };
  const featureNames = {
    h1: '비교적 곧고 완만한 감정선', h2: '한쪽으로 기운 감정선 · 유형 2',
    h3: '한쪽으로 기운 감정선 · 유형 3', h4: '가운데가 휘어 보이는 감정선',
    d1: '비교적 곧게 이어진 두뇌선', d2: '한쪽으로 기운 두뇌선 · 유형 2',
    d3: '한쪽으로 기운 두뇌선 · 유형 3', d4: '가운데가 휘어 보이는 두뇌선',
    thumb_base_arc: '엄지 밑을 감싸는 선', central_vertical_visible: '손바닥 가운데 세로선'
  };
  const sourceReading = (lineType, feature) => rules.find((item) => item.line_type === lineType && item.feature_code === feature);

  function renderResults() {
    el.resultCopy.replaceChildren();
    for (const side of ['left', 'right']) {
      const section = document.createElement('section');
      section.className = 'palm-hand-result';
      const heading = document.createElement('h3');
      heading.textContent = `${sideName(side)} · ${side === el.dominant.value ? '주로 쓰는 손' : '반대 손'}`;
      section.appendChild(heading);
      const captured = hands[side];
      if (!captured) {
        const note = document.createElement('p');
        note.className = 'palm-missing-hand';
        note.textContent = '아직 사진을 살펴보지 않았어요. 이 손도 찍으면 좌우 결과를 함께 볼 수 있어요.';
        section.appendChild(note);
        el.resultCopy.appendChild(section);
        continue;
      }
      for (const lineType of ['heart', 'head', 'life', 'fate']) {
        const feature = captured.lines[lineType];
        const card = document.createElement('article');
        card.className = 'palm-reading-item';
        const title = document.createElement('h4');
        title.textContent = lineNames[lineType];
        card.appendChild(title);
        if (!feature) {
          const uncertain = document.createElement('p');
          uncertain.textContent = '이 선은 사진에서 뚜렷하게 확인되지 않았어요. 다른 유형으로 대신 풀이하지 않았어요.';
          card.appendChild(uncertain);
        } else {
          const rule = sourceReading(lineType, feature);
          const observed = document.createElement('p');
          observed.className = 'palm-observed-feature';
          observed.textContent = `사진에서 읽힌 모양 · ${featureNames[feature] || '선이 보임'}`;
          card.appendChild(observed);
          if (rule) {
            const name = document.createElement('strong'); name.className = 'palm-rule-title'; name.textContent = rule.reading_title;
            const body = document.createElement('p'); body.textContent = rule.reading_text;
            const prompt = document.createElement('p'); prompt.className = 'palm-reflection'; prompt.textContent = rule.reflection_prompt;
            const source = document.createElement('a'); source.className = 'palm-source';
            source.href = rule.source.url; source.target = '_blank'; source.rel = 'noopener noreferrer';
            source.textContent = `전통 풀이 출처 · ${rule.source.title} (${rule.source.author}, ${rule.source.publication_year}) · ${rule.source.locator}`;
            card.append(name, body, prompt, source);
          } else {
            const note = document.createElement('p');
            note.textContent = '선 모양은 감지했지만 연결된 출처 풀이가 아직 편집 검토 중이에요.';
            card.appendChild(note);
          }
        }
        section.appendChild(card);
      }
      el.resultCopy.appendChild(section);
    }
    const caveat = document.createElement('p');
    caveat.className = 'palm-scope-note';
    caveat.textContent = '손금 풀이는 오래된 문화적 상징을 오늘의 자기성찰에 빗댄 콘텐츠예요. 과학적 성격 진단이나 건강·수명·재물 예측이 아닙니다. 사진 인식도 조명과 촬영 각도에 따라 달라질 수 있어요.';
    el.resultCopy.appendChild(caveat);
    el.resultCopy.classList.remove('is-hidden');
    el.resultCopy.classList.add('is-revealed');
    el.resultHeading.textContent = '내 손바닥 선을 함께 살펴봐요';
    el.result.classList.add('is-result-ready');
    el.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.MoneyFlowHistory?.add({
      id: `palm-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: 'palm', label: '손금 풀이', title: '좌우 손바닥 선 살펴보기',
      summary: '좌우 손바닥에서 확인된 선 특징을 전통 자료와 함께 살펴봤어요.',
      meta: { capturedHands: Object.keys(hands).filter((side) => hands[side]), dominantHand: el.dominant.value }
    });
  }

  function releasePreview() {
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = null;
    el.preview.removeAttribute('src');
  }

  function resetFlow() {
    generation += 1;
    releasePreview();
    previewCard.classList.add('is-hidden');
    previewCard.classList.remove('is-scanning', 'is-analysis-complete');
    el.capture.classList.remove('is-hidden');
    el.result.classList.add('is-hidden');
    el.result.classList.remove('is-result-ready');
    el.completeNotice.classList.add('is-hidden');
    el.resultCopy.classList.add('is-hidden');
    input.value = '';
  }

  function updateCaptureState() {
    el.captureState.textContent = `왼손 ${hands.left ? '확인 완료' : '사진 필요'} · 오른손 ${hands.right ? '확인 완료' : '사진 필요'}`;
  }

  async function inspectFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const operation = ++generation;
    needsRetake = false;
    currentAnalysis = null;
    releasePreview();
    previewCard.classList.remove('is-hidden', 'is-analysis-complete');
    previewCard.classList.add('is-scanning');
    el.scanCenter.classList.remove('is-hidden');
    el.completeNotice.classList.add('is-hidden');
    el.capture.classList.add('is-hidden');
    const side = el.side.value;
    if (file.size > 12 * 1024 * 1024) {
      needsRetake = true;
      el.status.textContent = '사진이 너무 커요. 12MB 이하의 사진을 선택해주세요.';
      el.scanCenter.classList.add('is-hidden');
      el.completeNotice.querySelector('strong').textContent = '사진 크기를 줄여주세요';
      el.completeNotice.querySelector('small').textContent = '12MB 이하 사진을 선택해주세요';
      el.completeNotice.classList.remove('is-hidden');
      previewCard.classList.remove('is-scanning');
      previewCard.classList.add('is-analysis-complete');
      return;
    }
    el.status.textContent = `${sideName(side)} 사진에서 손바닥을 찾고 있어요`;
    const url = URL.createObjectURL(file);
    activeUrl = url;
    const image = new Image();
    try {
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
      if (operation !== generation) return;
      el.preview.src = url;
      const detect = await window.MoneyFlowPalmHandDetector.detect(image);
      if (operation !== generation) return;
      let result;
      if (detect.status === 'multiple-hands') {
        result = { status: 'multiple-hands', retakeReasons: ['손이 여러 개 보여요. 한 손만 화면에 담아 다시 찍어주세요.'] };
      } else if (!detect.landmarks) {
        result = { status: 'no-hand', retakeReasons: [window.MoneyFlowPalmAnalysis.retakeCopy['no-hand']] };
      } else {
        const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d', { willReadFrequently: true }).drawImage(image, 0, 0, canvas.width, canvas.height);
        result = window.MoneyFlowPalmAnalysis.inspectPalmPhoto(
          canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height),
          canvas.width, canvas.height, detect.landmarks
        );
        canvas.width = 0; canvas.height = 0;
      }
      needsRetake = result.status !== 'usable';
      currentAnalysis = result;
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      if (operation !== generation) return;
      el.status.textContent = needsRetake ? '사진을 다시 확인해주세요.' : `${sideName(side)} 사진에서 손바닥 선을 살펴봤어요.`;
      el.scanCenter.classList.add('is-hidden');
      const strong = el.completeNotice.querySelector('strong');
      const small = el.completeNotice.querySelector('small');
      strong.textContent = needsRetake ? '사진을 다시 찍어주세요' : `${sideName(side)} 확인을 마쳤어요`;
      small.textContent = needsRetake ? result.retakeReasons[0] : '눌러서 좌우 손 풀이를 확인해요';
      el.completeNotice.querySelector('.palm-complete-icon').textContent = needsRetake ? '↻' : '✓';
      el.completeNotice.classList.remove('is-hidden');
      previewCard.classList.remove('is-scanning');
      previewCard.classList.add('is-analysis-complete');
    } catch (_) {
      needsRetake = true;
      el.status.textContent = '손 감지 기능을 불러오지 못했어요. 네트워크를 확인한 뒤 다시 시도해주세요.';
      el.scanCenter.classList.add('is-hidden');
      el.completeNotice.querySelector('strong').textContent = '사진 분석을 시작하지 못했어요';
      el.completeNotice.querySelector('small').textContent = '페이지를 새로고침하고 다시 시도해주세요.';
      el.completeNotice.classList.remove('is-hidden');
      previewCard.classList.remove('is-scanning');
      previewCard.classList.add('is-analysis-complete');
    }
  }

  el.camera.addEventListener('click', () => { input.setAttribute('capture', 'environment'); input.click(); });
  el.gallery.addEventListener('click', () => { input.removeAttribute('capture'); input.click(); });
  input.addEventListener('change', () => { void inspectFile(input.files?.[0]); });
  el.side.addEventListener('change', updateCaptureState);
  el.dominant.addEventListener('change', updateCaptureState);
  el.retake.addEventListener('click', resetFlow);
  el.again.addEventListener('click', resetFlow);
  el.completeNotice.addEventListener('click', () => {
    if (needsRetake) { resetFlow(); return; }
    hands[el.side.value] = currentAnalysis;
    releasePreview();
    updateCaptureState();
    el.completeNotice.classList.add('is-hidden');
    previewCard.classList.add('is-hidden');
    el.capture.classList.remove('is-hidden');
    el.result.classList.remove('is-hidden');
    renderResults();
  });
  updateCaptureState();
  window.MoneyFlowPalm = { dispose: releasePreview, reset: resetFlow };
})();
