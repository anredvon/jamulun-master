'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { inspectPalmPhoto } = require('../static/js/palm-analysis.js');
const { comboId } = require('../static/js/palm-combinations.js');
const catalog = require('../static/data/palm-combinations.json');

function landmarks() {
  const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const set = (i, x, y) => { points[i] = { x, y, z: 0 }; };
  set(0, 0.5, 0.91); set(1, 0.24, 0.78); set(2, 0.20, 0.80); set(3, 0.16, 0.82); set(4, 0.12, 0.83);
  set(5, 0.32, 0.48); set(8, 0.30, 0.15); set(9, 0.43, 0.44); set(12, 0.47, 0.11);
  set(13, 0.56, 0.45); set(16, 0.63, 0.17); set(17, 0.68, 0.48); set(20, 0.74, 0.27);
  return points;
}

function fixture(width = 320, height = 320, { heart = true, head = true, fate = true, dark = 72, base = [184, 136, 106] } = {}) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = base[0];
    data[index * 4 + 1] = base[1];
    data[index * 4 + 2] = base[2];
    data[index * 4 + 3] = 255;
  }
  const map = (across, along) => {
    const p = landmarks();
    const point = (i) => ({ x: p[i].x * width, y: p[i].y * height });
    const wrist = point(0), index = point(5), pinky = point(17);
    const base = { x: (point(5).x + point(9).x + point(13).x + point(17).x) / 4, y: (point(5).y + point(9).y + point(13).y + point(17).y) / 4 };
    const u = { x: pinky.x - index.x, y: pinky.y - index.y }, v = { x: base.x - wrist.x, y: base.y - wrist.y };
    return { x: wrist.x + v.x * along + u.x * (across - 0.5), y: wrist.y + v.y * along + u.y * (across - 0.5) };
  };
  const darken = (point, radius = 2) => {
    for (let x = Math.round(point.x) - radius; x <= Math.round(point.x) + radius; x += 1) {
      for (let y = Math.round(point.y) - radius; y <= Math.round(point.y) + radius; y += 1) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const index = (y * width + x) * 4;
        data[index] = dark; data[index + 1] = dark; data[index + 2] = dark;
      }
    }
  };
  if (heart) for (let t = 0; t <= 1; t += 0.004) darken(map(t, 0.76 + 0.025 * Math.sin(Math.PI * t)));
  if (head) for (let t = 0; t <= 1; t += 0.004) darken(map(t, 0.53 + 0.07 * t));
  if (fate) {
    for (let t = 0; t <= 1; t += 0.004) {
      const along = 0.14 + 0.69 * t;
      darken(map(0.49 + 0.025 * Math.sin(Math.PI * t), along));
    }
  }
  return { data, width, height, landmarks: landmarks() };
}

test('a hand with clear palm creases is accepted and returns only detected features', () => {
  const photo = fixture();
  const result = inspectPalmPhoto(photo, photo.width, photo.height, photo.landmarks);
  assert.equal(result.status, 'usable');
  assert.equal(result.lines.heart, 'clear_continuous');
  assert.equal(result.lines.head, 'defined_continuous');
  assert.equal(result.lines.fate, 'central_vertical_visible');
  assert.equal(typeof result.confidenceByLine.heart, 'number');
});

test('a faint or absent line remains unknown when another palm crease is visible', () => {
  const photo = fixture(320, 320, { heart: true, head: false, fate: false });
  const result = inspectPalmPhoto(photo, photo.width, photo.height, photo.landmarks);
  assert.equal(result.status, 'usable');
  assert.equal(result.lines.heart, 'clear_continuous');
  assert.equal(result.lines.head, null);
  assert.equal(result.lines.fate, null);
});

test('a non-hand photo is rejected and a cropped hand asks for a retake', () => {
  const photo = fixture();
  assert.equal(inspectPalmPhoto(photo, photo.width, photo.height, null).status, 'no-hand');
  const partial = landmarks(); partial[8].x = 0.005;
  assert.equal(inspectPalmPhoto(photo, photo.width, photo.height, partial).status, 'partial');
});

test('dark or crease-free hand photos do not produce an invented reading', () => {
  const dark = fixture(320, 320, { dark: 18, base: [18, 18, 18] });
  assert.equal(inspectPalmPhoto(dark, dark.width, dark.height, dark.landmarks).status, 'low-light');
  const blank = fixture(320, 320, { heart: false, head: false, fate: false });
  assert.equal(inspectPalmPhoto(blank, blank.width, blank.height, blank.landmarks).status, 'blurry');
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
