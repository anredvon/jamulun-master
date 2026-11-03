((root, factory) => {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.window === root) root.MoneyFlowPalmAnalysis = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const RETAKE = {
    'no-hand': '손을 찾지 못했어요. 손바닥을 펴서 한 손만 화면에 담아주세요.',
    partial: '손가락 끝과 손목이 모두 보이도록 조금 멀리서 다시 찍어주세요.',
    'too-small': '손바닥이 작게 보여요. 화면 가운데에 손바닥을 조금 더 크게 담아주세요.',
    'low-light': '사진이 어두워요. 그림자가 적은 밝은 곳에서 다시 찍어주세요.',
    'overexposed': '손바닥이 너무 밝게 찍혔어요. 빛을 정면으로 받지 않게 다시 찍어주세요.',
    blurry: '초점이 흐려 선을 읽기 어려워요. 손을 고정하고 다시 촬영해주세요.',
    'palm-not-visible': '손바닥 선이 잘 보이지 않아요. 손바닥이 카메라를 향하도록 펴서 다시 찍어주세요.',
    'lines-not-readable': '손은 확인했지만 주요 선을 읽기 어려워요. 손바닥을 펴고 밝은 곳에서 다시 찍어주세요.'
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const gray = (data, width, x, y) => {
    const ix = clamp(Math.round(x), 0, width - 1);
    const iy = clamp(Math.round(y), 0, data.length / (width * 4) - 1);
    const i = (iy * width + ix) * 4;
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  };

  function imageQuality(data, width, height) {
    const step = Math.max(2, Math.floor(Math.min(width, height) / 180));
    let sum = 0, count = 0, lapSum = 0, lapSquares = 0;
    for (let y = step; y < height - step; y += step) {
      for (let x = step; x < width - step; x += step) {
        const center = gray(data, width, x, y);
        sum += center; count += 1;
        const lap = gray(data, width, x - step, y) + gray(data, width, x + step, y)
          + gray(data, width, x, y - step) + gray(data, width, x, y + step) - 4 * center;
        lapSum += lap; lapSquares += lap * lap;
      }
    }
    const mean = count ? sum / count : 0;
    const blurVariance = count ? lapSquares / count - (lapSum / count) ** 2 : 0;
    return { mean, blurVariance };
  }

  function palmMapper(landmarks, width, height) {
    const point = (index) => ({ x: landmarks[index].x * width, y: landmarks[index].y * height });
    const wrist = point(0), indexMcp = point(5), pinkyMcp = point(17);
    const base = {
      x: (indexMcp.x + point(9).x + point(13).x + pinkyMcp.x) / 4,
      y: (indexMcp.y + point(9).y + point(13).y + pinkyMcp.y) / 4
    };
    const u = { x: pinkyMcp.x - indexMcp.x, y: pinkyMcp.y - indexMcp.y };
    const v = { x: base.x - wrist.x, y: base.y - wrist.y };
    return (across, along) => ({
      x: wrist.x + v.x * along + u.x * (across - 0.5),
      y: wrist.y + v.y * along + u.y * (across - 0.5)
    });
  }

  function pathContrast(data, width, height, mapper, pathAt) {
    const samples = 46;
    let hits = 0, contrastSum = 0;
    const points = [];
    for (let i = 0; i < samples; i += 1) {
      const t = (i + 0.5) / samples;
      const { x, y } = mapper(...pathAt(t));
      const dx = width * 0.012, dy = height * 0.012;
      const center = gray(data, width, x, y);
      const flank = (gray(data, width, x - dx, y - dy) + gray(data, width, x + dx, y + dy)) / 2;
      const contrast = flank - center;
      if (contrast > 6.5) { hits += 1; points.push({ x, y }); }
      contrastSum += Math.max(0, contrast);
    }
    return { coverage: hits / samples, meanContrast: contrastSum / samples, points };
  }

  function searchHorizontal(data, width, height, mapper, startAlong, endAlong) {
    const samples = 48;
    let hits = 0, contrastSum = 0;
    const points = [];
    for (let i = 0; i < samples; i += 1) {
      const across = 0.025 + 0.95 * ((i + 0.5) / samples);
      let best = { contrast: -Infinity, x: 0, y: 0 };
      for (let along = startAlong; along <= endAlong; along += 0.012) {
        const center = mapper(across, along);
        const before = mapper(across, along - 0.014);
        const after = mapper(across, along + 0.014);
        const contrast = (gray(data, width, before.x, before.y) + gray(data, width, after.x, after.y)) / 2
          - gray(data, width, center.x, center.y);
        if (contrast > best.contrast) best = { contrast, x: center.x, y: center.y };
      }
      if (best.contrast > 6.5) { hits += 1; points.push(best); }
      contrastSum += Math.max(0, best.contrast);
    }
    return { coverage: hits / samples, meanContrast: contrastSum / samples, points };
  }

  function searchVertical(data, width, height, mapper, startAlong, endAlong) {
    const samples = 44;
    let hits = 0, contrastSum = 0;
    const points = [];
    for (let i = 0; i < samples; i += 1) {
      const along = startAlong + (endAlong - startAlong) * ((i + 0.5) / samples);
      let best = { contrast: -Infinity, x: 0, y: 0 };
      for (let across = 0.36; across <= 0.64; across += 0.012) {
        const center = mapper(across, along);
        const before = mapper(across - 0.014, along);
        const after = mapper(across + 0.014, along);
        const contrast = (gray(data, width, before.x, before.y) + gray(data, width, after.x, after.y)) / 2
          - gray(data, width, center.x, center.y);
        if (contrast > best.contrast) best = { contrast, x: center.x, y: center.y };
      }
      if (best.contrast > 6.5) { hits += 1; points.push(best); }
      contrastSum += Math.max(0, best.contrast);
    }
    return { coverage: hits / samples, meanContrast: contrastSum / samples, points };
  }

  function classifyHorizontal(path, prefix) {
    if (path.coverage < 0.40 || path.meanContrast < 2.3) return null;
    const points = path.points;
    const first = points[Math.floor(points.length * 0.1)];
    const middle = points[Math.floor(points.length * 0.5)];
    const last = points[Math.floor(points.length * 0.9)];
    if (!first || !middle || !last) return null;
    const slope = last.y - first.y;
    const curve = middle.y - (first.y + last.y) / 2;
    if (Math.abs(curve) > 4) return `${prefix}4`;
    if (slope < -5) return `${prefix}2`;
    if (slope > 5) return `${prefix}3`;
    return `${prefix}1`;
  }

  function inspectPalmPhoto(imageData, width, height, landmarks) {
    const data = imageData?.data || imageData;
    if (!data || !Number.isInteger(width) || !Number.isInteger(height) || data.length !== width * height * 4) {
      return { status: 'poor-quality', retakeReasons: ['사진을 읽지 못했어요. 다른 사진을 선택해주세요.'] };
    }
    if (!Array.isArray(landmarks) || landmarks.length < 21) return { status: 'no-hand', retakeReasons: [RETAKE['no-hand']] };
    const keyPoints = [0, 4, 5, 8, 9, 12, 13, 16, 17, 20].map((index) => landmarks[index]);
    if (keyPoints.some((p) => !p || p.x < 0.018 || p.x > 0.982 || p.y < 0.018 || p.y > 0.982)) {
      return { status: 'partial', retakeReasons: [RETAKE.partial] };
    }
    const palmWidth = Math.hypot((landmarks[17].x - landmarks[5].x) * width, (landmarks[17].y - landmarks[5].y) * height);
    if (palmWidth < Math.min(width, height) * 0.16) return { status: 'too-small', retakeReasons: [RETAKE['too-small']] };
    const quality = imageQuality(data, width, height);
    if (quality.mean < 48) return { status: 'low-light', retakeReasons: [RETAKE['low-light']] };
    if (quality.mean > 236) return { status: 'overexposed', retakeReasons: [RETAKE.overexposed] };
    if (quality.blurVariance < 16) return { status: 'blurry', retakeReasons: [RETAKE.blurry] };

    const map = palmMapper(landmarks, width, height);
    // Landmark geometry anchors the crease search to the palm instead of scanning the full photo.
    const heart = searchHorizontal(data, width, height, map, 0.68, 0.87);
    const head = searchHorizontal(data, width, height, map, 0.43, 0.68);
    const life = pathContrast(data, width, height, map, (t) => [0.08 + 0.25 * Math.sin(Math.PI * t * 0.78), 0.79 - 0.64 * t]);
    const fate = searchVertical(data, width, height, map, 0.14, 0.83);
    const lines = {
      heart: classifyHorizontal(heart, 'h') ? 'clear_continuous' : null,
      head: classifyHorizontal(head, 'd') ? 'defined_continuous' : null,
      life: life.coverage >= 0.34 && life.meanContrast >= 2.3 ? 'thumb_base_arc' : null,
      fate: fate.coverage >= 0.38 && fate.meanContrast >= 2.4 ? 'central_vertical_visible' : null
    };
    const confidenceFor = (line) => Math.round(clamp(line.coverage * 0.65 + Math.min(1, line.meanContrast / 12) * 0.35, 0, 1) * 100) / 100;
    const confidenceByLine = {
      heart: confidenceFor(heart), head: confidenceFor(head), life: confidenceFor(life), fate: confidenceFor(fate)
    };
    const visibleCreases = [heart, head, life, fate].filter((line) => line.coverage >= 0.25 && line.meanContrast >= 1.8).length;
    const palmCreaseDetected = [heart, head, life].some((line) => line.coverage >= 0.25 && line.meanContrast >= 1.8);
    if (!palmCreaseDetected) {
      return { status: 'palm-not-visible', retakeReasons: [RETAKE['palm-not-visible']], lines, confidenceByLine, quality: { ...quality, visibleCreases } };
    }
    return {
      status: 'usable',
      retakeReasons: [],
      lines,
      confidenceByLine,
      quality: { ...quality, visibleCreases, palmWidthRatio: palmWidth / width }
    };
  }

  return { inspectPalmPhoto, retakeCopy: RETAKE };
});
