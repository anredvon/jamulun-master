const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class ClassList {
  constructor(initial = []) { this.values = new Set(initial); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
}

function element({ classes = [], onText = null } = {}) {
  let text = '';
  return {
    classList: new ClassList(classes),
    listeners: new Map(),
    disabled: false,
    style: {},
    src: '',
    alt: '',
    offsetWidth: 1,
    addEventListener(name, callback) { this.listeners.set(name, callback); },
    scrollIntoView() {},
    focus() {},
    get textContent() { return text; },
    set textContent(value) { text = value; onText?.(value); },
  };
}

function createTarotHarness({ reducedMotion = false } = {}) {
  const titleWrites = [];
  const historyWrites = [];
  const nodes = {
    'tarot-data': element(),
    'tarot-picker': element(),
    'tarot-modal': element({ classes: ['is-hidden'] }),
    'tarot-reveal': element({ classes: ['is-hidden'] }),
    'tarot-report': element({ classes: ['is-hidden'] }),
    'tarot-hint': element(),
    'tarot-modal-title': element({ onText: (value) => titleWrites.push(value) }),
    'tarot-art-image': element(),
    'tarot-reveal-card': element(),
    'tarot-report-image': element(),
    'tarot-fortune-btn': element(),
    'tarot-redraw-btn': element(),
    'tarot-report-title': element(),
    'tarot-status': element(),
    'tarot-flow': element(),
    'tarot-caution': element(),
    'tarot-line': element(),
    'tarot-reveal-caption': element(),
  };
  nodes['tarot-data'].textContent = JSON.stringify([{
    id: 7, title: '마음의 여유', status: '흐름', image: 'images/tarot/sample.png',
    flow: '천천히 살펴봐요.', caution: '무엇을 지키고 싶나요?', line: '오늘은 무엇을 가볍게 할까요?'
  }]);
  const choices = [element(), element(), element()];
  let nextTimerId = 0;
  const timers = new Map();
  const documentListeners = new Map();
  const document = {
    body: { style: {} },
    getElementById: (id) => nodes[id],
    querySelectorAll: (selector) => selector === '.tarot-choice' ? choices : [],
    addEventListener: (name, callback) => documentListeners.set(name, callback),
  };
  const window = {
    document,
    MoneyFlowHistory: { add: (entry) => historyWrites.push(entry) },
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout(callback, delay) { const id = ++nextTimerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const source = fs.readFileSync(path.join(__dirname, '../static/js/tarot.js'), 'utf8');
  vm.runInNewContext(source, { window, document, JSON, Math, Date, console });
  function runTimers(delay) {
    const due = [...timers.entries()].filter(([, timer]) => timer.delay === delay);
    due.forEach(([id, timer]) => { timers.delete(id); timer.callback(); });
  }
  function drawAndShowReport() {
    choices[0].listeners.get('click')();
    runTimers(400);
    nodes['tarot-fortune-btn'].listeners.get('click')();
  }
  return { nodes, choices, timers, titleWrites, historyWrites, runTimers, drawAndShowReport };
}

test('rapid taps on all three cards open only one pending Tarot reveal', () => {
  const app = createTarotHarness();
  app.choices.forEach((choice) => choice.listeners.get('click')());
  assert.equal(app.timers.size, 1);
  assert.ok(app.choices.every((choice) => choice.disabled));
  app.runTimers(400);
  assert.equal(app.titleWrites.length, 1);
  assert.equal(app.nodes['tarot-modal'].classList.contains('is-hidden'), false);
});

test('repeated result CTA events record and render the Tarot report once', () => {
  const app = createTarotHarness();
  app.drawAndShowReport();
  app.nodes['tarot-fortune-btn'].listeners.get('click')();
  assert.equal(app.historyWrites.length, 1);
});

test('shuffle keeps choices disabled until all three card animations end', () => {
  const app = createTarotHarness();
  app.drawAndShowReport();
  app.nodes['tarot-redraw-btn'].listeners.get('click')();
  assert.ok(app.choices.every((choice) => choice.disabled));
  const finish = app.nodes['tarot-picker'].listeners.get('animationend');
  assert.equal(typeof finish, 'function');
  app.choices.slice(0, 2).forEach((choice) => finish({ target: choice, animationName: 'shuffle-card' }));
  assert.ok(app.choices.every((choice) => choice.disabled));
  finish({ target: app.choices[2], animationName: 'shuffle-card' });
  assert.ok(app.choices.every((choice) => !choice.disabled));
});

test('reduced-motion shuffle immediately restores choices', () => {
  const app = createTarotHarness({ reducedMotion: true });
  app.drawAndShowReport();
  app.nodes['tarot-redraw-btn'].listeners.get('click')();
  assert.ok(app.choices.every((choice) => !choice.disabled));
  assert.equal(app.nodes['tarot-picker'].classList.contains('is-shuffling'), false);
});
