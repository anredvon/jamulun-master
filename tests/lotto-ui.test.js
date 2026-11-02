'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.handlers = {};
    this.style = { setProperty() {} };
    this.className = '';
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.classList = {
      toggle() {}, add() {}, remove() {}
    };
  }

  addEventListener(type, handler) { this.handlers[type] = handler; }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  scrollIntoView() {}
  querySelectorAll(selector) {
    if (selector === '.lotto-result-card') {
      return this.children.filter((child) => child.className === 'lotto-result-card');
    }
    return [];
  }
}

const DRAW = {
  result_id: 'result-1', round: 1249, sequence: 1,
  numbers: [4, 11, 18, 27, 34, 41],
  created_at: '2026-11-02T00:00:00Z', remaining: 2,
  draw_date: '2026-11-07'
};

function status(draws = []) {
  return {
    ok: true, round: 1249, draw_date: '2026-11-07',
    remaining: 3 - draws.length, used: draws.length, draws
  };
}

function boot(fetchHandler, options = {}) {
  const ids = [
    'lotto-machine', 'lotto-results-list', 'lotto-draw-button', 'lotto-message',
    'lotto-stage-intro', 'lotto-stage-progress', 'lotto-stage-numbers',
    'lotto-progress-fill', 'lotto-stage-stars', 'lotto-round',
    'lotto-remaining', 'lotto-draw-date', 'lotto-canvas'
  ];
  const elements = new Map(ids.map((id) => [id, new FakeElement(id === 'lotto-canvas' ? 'canvas' : 'div')]));
  const canvasContext = {
    clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillText() {},
    createRadialGradient() { return { addColorStop() {} }; }
  };
  const frameQueue = [];
  const documentHandlers = {};
  const timerQueue = [];
  let intersectionHandler = null;
  let requestedFrames = 0;
  let cancelledFrames = 0;
  elements.get('lotto-canvas').width = 600;
  elements.get('lotto-canvas').height = 600;
  elements.get('lotto-canvas').getContext = () => canvasContext;
  const document = {
    hidden: false,
    body: { style: {} },
    getElementById(id) { return elements.get(id) || null; },
    createElement(tag) { return new FakeElement(tag); },
    addEventListener(type, handler) { documentHandlers[type] = handler; }
  };
  const window = {
    matchMedia() { return { matches: options.reducedMotion ?? true }; },
    MoneyFlowHistory: { add() { return true; } },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; intersectionHandler = callback; }
      observe() { this.callback([{ isIntersecting: true }]); }
      disconnect() {}
    }
  };
  const context = {
    window, document, console: { error() {} },
    fetch: fetchHandler,
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    requestAnimationFrame(callback) {
      requestedFrames += 1;
      frameQueue.push(callback);
      return requestedFrames;
    },
    cancelAnimationFrame() { cancelledFrames += 1; frameQueue.length = 0; },
    setTimeout(callback) {
      if (options.manualTimers) timerQueue.push(callback);
      else queueMicrotask(callback);
      return 1;
    },
    clearTimeout() {},
    Intl, Date, Math, Uint8Array, URL,
    location: { origin: 'https://example.test' },
    navigator: {}, File: class File {}
  };
  const sourcePath = path.join(__dirname, '../static/js/lotto.js');
  vm.runInNewContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: sourcePath });
  return {
    elements,
    get requestedFrames() { return requestedFrames; },
    get cancelledFrames() { return cancelledFrames; },
    get pendingTimers() { return timerQueue.length; },
    fireFrame(time = 100) {
      const callback = frameQueue.shift();
      if (callback) callback(time);
    },
    async flushTimer() {
      const callback = timerQueue.shift();
      if (callback) callback();
      await new Promise((resolve) => setImmediate(resolve));
    },
    setHidden(hidden) {
      document.hidden = hidden;
      documentHandlers.visibilitychange?.();
    },
    setStageVisible(visible) {
      intersectionHandler?.([{ isIntersecting: visible }]);
    }
  };
}

function jsonResponse(data, ok = true) {
  return { ok, async json() { return data; } };
}

async function settleInitialLoad() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('a first visit does not draw until the visitor presses the button', async () => {
  const posts = [];
  const app = boot(async (url, options = {}) => {
    if (url === '/api/lotto/status') return jsonResponse(status());
    if (url === '/api/lotto/draw') {
      posts.push(options);
      return jsonResponse({ ok: false, code: 'TEST_STOP' }, false);
    }
    throw new Error('Unexpected request: ' + url);
  });

  await settleInitialLoad();

  assert.equal(posts.length, 0);
  assert.equal(app.elements.get('lotto-draw-button').disabled, false);
});

test('a revisit restores saved results without issuing a draw', async () => {
  const posts = [];
  const app = boot(async (url) => {
    if (url === '/api/lotto/status') return jsonResponse(status([DRAW]));
    if (url === '/api/lotto/draw') posts.push(url);
    throw new Error('Unexpected request: ' + url);
  });

  await settleInitialLoad();

  assert.equal(posts.length, 0);
  assert.equal(app.elements.get('lotto-results-list').children.length, 1);
  assert.match(app.elements.get('lotto-remaining').textContent, /2\/3/);
});

test('a committed draw with a lost response is restored from status', async () => {
  let statusReads = 0;
  let drawPosts = 0;
  const app = boot(async (url) => {
    if (url === '/api/lotto/status') {
      statusReads += 1;
      return jsonResponse(status(statusReads === 1 ? [] : [DRAW]));
    }
    if (url === '/api/lotto/draw') {
      drawPosts += 1;
      throw new Error('connection lost after server commit');
    }
    throw new Error('Unexpected request: ' + url);
  });

  await settleInitialLoad();
  await app.elements.get('lotto-draw-button').handlers.click();

  assert.equal(drawPosts, 1);
  assert.equal(app.elements.get('lotto-results-list').children.length, 1);
  assert.equal(app.elements.get('lotto-results-list').children[0].className, 'lotto-result-card');
  assert.match(app.elements.get('lotto-remaining').textContent, /2\/3/);
  assert.deepEqual(
    app.elements.get('lotto-results-list').children[0].children[2].children.map((ball) => ball.textContent),
    DRAW.numbers.map(String)
  );
});

test('the decorative Canvas does not request frames while the page is idle', async () => {
  const app = boot(async () => jsonResponse(status()));
  await settleInitialLoad();

  assert.equal(app.requestedFrames, 0);
});

test('reduced motion reveals the committed result without starting Canvas animation', async () => {
  const app = boot(async (url) => {
    if (url === '/api/lotto/status') return jsonResponse(status());
    if (url === '/api/lotto/draw') return jsonResponse({ ok: true, ...DRAW });
    throw new Error('Unexpected request: ' + url);
  }, { reducedMotion: true });
  await settleInitialLoad();
  await app.elements.get('lotto-draw-button').handlers.click();

  assert.equal(app.requestedFrames, 0);
  assert.equal(app.elements.get('lotto-stage-numbers').children.length, 6);
});

test('the Canvas loop pauses when offscreen or hidden and resumes when visible', async () => {
  const app = boot(async (url) => {
    if (url === '/api/lotto/status') return jsonResponse(status());
    if (url === '/api/lotto/draw') return jsonResponse({ ok: true, ...DRAW });
    throw new Error('Unexpected request: ' + url);
  }, { reducedMotion: false, manualTimers: true });
  await settleInitialLoad();
  const drawPromise = app.elements.get('lotto-draw-button').handlers.click();
  await settleInitialLoad();
  assert.ok(app.requestedFrames > 0);

  app.setStageVisible(false);
  assert.ok(app.cancelledFrames > 0);
  const offscreenFrameCount = app.requestedFrames;
  app.fireFrame();
  assert.equal(app.requestedFrames, offscreenFrameCount);

  app.setStageVisible(true);
  assert.equal(app.requestedFrames, offscreenFrameCount + 1);
  app.setHidden(true);
  assert.ok(app.cancelledFrames > 1);
  const pausedFrameCount = app.requestedFrames;
  app.fireFrame();
  assert.equal(app.requestedFrames, pausedFrameCount);

  app.setHidden(false);
  assert.equal(app.requestedFrames, pausedFrameCount + 1);
  app.fireFrame(200);
  assert.equal(app.requestedFrames, pausedFrameCount + 2);

  while (app.pendingTimers) await app.flushTimer();
  await drawPromise;
  assert.ok(app.cancelledFrames > 1);
});
