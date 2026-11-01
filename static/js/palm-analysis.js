((root, factory) => {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.window === root) root.MoneyFlowPalmAnalysis = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function empty(quality = 'retake') {
    return { heartCandidate: null, headCandidate: null, fateCandidate: null, quality };
  }

  function luminance(data, width, x, y) {
    const index = (y * width + x) * 4;
    return 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
  }

  function horizontalPath(data, width, height, startRatio, endRatio) {
    const bins = 24;
    const xStart = Math.floor(width * 0.18);
    const xEnd = Math.ceil(width * 0.82);
    const yStart = Math.max(0, Math.floor(height * startRatio));
    const yEnd = Math.min(height, Math.ceil(height * endRatio));
    const points = [];
    let hits = 0;

    for (let bin = 0; bin < bins; bin += 1) {
      const bx0 = Math.floor(xStart + ((xEnd - xStart) * bin) / bins);
      const bx1 = Math.max(bx0 + 1, Math.floor(xStart + ((xEnd - xStart) * (bin + 1)) / bins));
      let minValue = 256;
      let minY = 0;
      let sum = 0;
      let count = 0;
      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = bx0; x < bx1; x += 1) {
          const value = luminance(data, width, x, y);
          sum += value;
          count += 1;
          if (value < minValue) { minValue = value; minY = y; }
        }
      }
      const mean = count ? sum / count : 0;
      if (mean - minValue >= 19) hits += 1;
      points.push({ x: (bx0 + bx1) / 2, y: minY, found: mean - minValue >= 19 });
    }
    if (hits / bins < 0.58) return null;
    return { points: points.filter((point) => point.found), coverage: hits / bins };
  }

  function verticalPath(data, width, height) {
    const bins = 24;
    const yStart = Math.floor(height * 0.34);
    const yEnd = Math.ceil(height * 0.86);
    const xStart = Math.floor(width * 0.42);
    const xEnd = Math.ceil(width * 0.58);
    const points = [];
    let hits = 0;
    let maxWidth = 0;

    for (let bin = 0; bin < bins; bin += 1) {
      const by0 = Math.floor(yStart + ((yEnd - yStart) * bin) / bins);
      const by1 = Math.max(by0 + 1, Math.floor(yStart + ((yEnd - yStart) * (bin + 1)) / bins));
      let minValue = 256;
      let minX = 0;
      let sum = 0;
      let count = 0;
      let darkColumns = 0;
      for (let x = xStart; x < xEnd; x += 1) {
        let columnMin = 256;
        for (let y = by0; y < by1; y += 1) {
          const value = luminance(data, width, x, y);
          sum += value;
          count += 1;
          columnMin = Math.min(columnMin, value);
          if (value < minValue) { minValue = value; minX = x; }
        }
        if (columnMin < 105) darkColumns += 1;
      }
      const mean = count ? sum / count : 0;
      const found = mean - minValue >= 19;
      if (found) hits += 1;
      maxWidth = Math.max(maxWidth, darkColumns);
      points.push({ x: minX, y: (by0 + by1) / 2, found });
    }
    if (hits / bins < 0.58) return null;
    return { points: points.filter((point) => point.found), coverage: hits / bins, maxWidth };
  }

  function average(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  function horizontalVariant(path, prefix) {
    if (path.coverage < 0.72) return `${prefix}5`;
    const points = path.points;
    const count = points.length;
    const start = average(points.slice(0, Math.max(2, Math.ceil(count * 0.2))).map((point) => point.y));
    const middle = average(points.slice(Math.floor(count * 0.4), Math.ceil(count * 0.6)).map((point) => point.y));
    const end = average(points.slice(-Math.max(2, Math.ceil(count * 0.2))).map((point) => point.y));
    const slope = end - start;
    const curve = middle - (start + end) / 2;
    if (curve < -3) return `${prefix}4`;
    if (curve > 3) return `${prefix}5`;
    if (slope < -2) return `${prefix}2`;
    if (slope > 2) return `${prefix}3`;
    return `${prefix}1`;
  }

  function analyzeImageData(imageData, width, height) {
    const data = imageData && imageData.data ? imageData.data : imageData;
    width = Number(width || imageData?.width);
    height = Number(height || imageData?.height);
    if (!data || !Number.isInteger(width) || !Number.isInteger(height) || width < 120 || height < 120 || data.length !== width * height * 4) return empty();

    let sum = 0;
    let sumSquares = 0;
    const sampleStep = Math.max(1, Math.floor((width * height) / 50000));
    let sampleCount = 0;
    for (let pixel = 0; pixel < width * height; pixel += sampleStep) {
      const value = luminance(data, width, pixel % width, Math.floor(pixel / width));
      sum += value;
      sumSquares += value * value;
      sampleCount += 1;
    }
    const mean = sum / sampleCount;
    const variance = sumSquares / sampleCount - mean * mean;
    if (variance < 13) return empty();

    const heart = horizontalPath(data, width, height, 0.34, 0.51);
    const head = horizontalPath(data, width, height, 0.53, 0.70);
    const fate = verticalPath(data, width, height);
    const result = {
      heartCandidate: heart ? horizontalVariant(heart, 'h') : null,
      headCandidate: head ? horizontalVariant(head, 'd') : null,
      fateCandidate: fate
        ? fate.maxWidth >= Math.max(7, Math.floor(width * 0.065))
          ? 'f4'
          : fate.coverage < 0.72
            ? 'f3'
            : Math.abs(fate.points.at(-1).x - fate.points[0].x) > 2
              ? 'f2'
              : 'f1'
        : null,
      quality: 'retake'
    };
    if (result.heartCandidate || result.headCandidate || result.fateCandidate) result.quality = 'usable';
    return result;
  }

  return { analyzeImageData };
});
