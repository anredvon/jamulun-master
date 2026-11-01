'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeImageData } = require('../static/js/palm-analysis.js');
const { comboId } = require('../static/js/palm-combinations.js');
const catalog = require('../static/data/palm-combinations.json');

function fixture(width = 200, height = 240, lines = { heart: true, head: true, fate: true }, crease = 72) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = 184;
    data[index * 4 + 1] = 136;
    data[index * 4 + 2] = 106;
    data[index * 4 + 3] = 255;
  }
  const darken = (x, y) => {
    const index = (y * width + x) * 4;
    data[index] = crease;
    data[index + 1] = crease;
    data[index + 2] = crease;
  };
  if (lines.heart) {
    for (let x = Math.round(width * 0.2); x < Math.round(width * 0.8); x += 1) {
      const y = Math.round(height * 0.41 + Math.sin((x / width) * Math.PI) * 7);
      for (let offset = -1; offset <= 1; offset += 1) darken(x, y + offset);
    }
  }
  if (lines.head) {
    for (let x = Math.round(width * 0.2); x < Math.round(width * 0.8); x += 1) {
      const y = Math.round(height * 0.59 + (x / width - 0.5) * 12);
      for (let offset = -1; offset <= 1; offset += 1) darken(x, y + offset);
    }
  }
  if (lines.fate) {
    for (let y = Math.round(height * 0.37); y < Math.round(height * 0.82); y += 1) {
      for (let offset = -1; offset <= 1; offset += 1) darken(Math.round(width * 0.5) + offset, y);
    }
  }
  return { data, width, height };
}

test('visible crease pixels produce only valid line candidate IDs', () => {
  const result = analyzeImageData(fixture());

  assert.equal(result.quality, 'usable');
  assert.match(result.heartCandidate, /^h[1-5]$/);
  assert.match(result.headCandidate, /^d[1-5]$/);
  assert.match(result.fateCandidate, /^f[1-4]$/);
});

test('missing crease regions stay null instead of receiving random candidates', () => {
  const result = analyzeImageData(fixture(200, 240, { heart: true, head: false, fate: false }));

  assert.equal(result.quality, 'usable');
  assert.match(result.heartCandidate, /^h[1-5]$/);
  assert.equal(result.headCandidate, null);
  assert.equal(result.fateCandidate, null);
});

test('low-contrast lines are rejected for a retake', () => {
  const result = analyzeImageData(fixture(200, 240, { heart: true, head: true, fate: true }, 178));

  assert.equal(result.quality, 'retake');
  assert.equal(result.heartCandidate, null);
  assert.equal(result.headCandidate, null);
  assert.equal(result.fateCandidate, null);
});

test('small or malformed image data is rejected without throwing', () => {
  assert.equal(analyzeImageData(fixture(60, 80)).quality, 'retake');
  assert.deepEqual(analyzeImageData({ data: new Uint8ClampedArray(4), width: 1, height: 1 }), {
    heartCandidate: null, headCandidate: null, fateCandidate: null, quality: 'retake'
  });
});

test('the 100 confirmed line combinations map uniquely to IDs 1 through 100', () => {
  const ids = new Set();
  for (let heart = 1; heart <= 5; heart += 1) {
    for (let head = 1; head <= 5; head += 1) {
      for (let fate = 1; fate <= 4; fate += 1) {
        ids.add(comboId(`h${heart}`, `d${head}`, `f${fate}`));
      }
    }
  }

  assert.equal(ids.size, 100);
  assert.deepEqual([...ids].sort((a, b) => a - b), Array.from({ length: 100 }, (_, index) => index + 1));
});

test('the result catalog has one complete record for every valid combination', () => {
  assert.equal(catalog.length, 100);
  assert.equal(new Set(catalog.map((item) => item.id)).size, 100);
  for (const item of catalog) {
    assert.equal(item.id, comboId(item.lineTypes.heart, item.lineTypes.head, item.lineTypes.fate));
    assert.ok(item.title && item.summary && item.oneLine);
    assert.match(item.lineTypes.heart, /^h[1-5]$/);
    assert.match(item.lineTypes.head, /^d[1-5]$/);
    assert.match(item.lineTypes.fate, /^f[1-4]$/);
  }
});

test('invalid line IDs are rejected instead of creating a fallback result', () => {
  assert.throws(() => comboId('h0', 'd1', 'f1'), /invalid/);
  assert.throws(() => comboId('h1', 'd1', null), /invalid/);
});
