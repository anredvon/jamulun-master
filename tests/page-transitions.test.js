const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { classifyLinkIntent, classifyTransition } = require('../static/js/page-transitions.js');

function loadTransitionsInBrowserMock({ referrer = '', historyLength = 1 } = {}) {
  const documentListeners = new Map();
  const windowListeners = new Map();
  let historyBackCount = 0;
  class Element {}
  const window = {
    document: {
      documentElement: { dataset: { homeUrl: '/home' } },
      referrer,
      addEventListener: (name, listener) => documentListeners.set(name, listener),
    },
    Element,
    URL,
    location: { href: 'https://moneyflow.example/tarot', origin: 'https://moneyflow.example' },
    history: { length: historyLength, back: () => historyBackCount++ },
    addEventListener: (name, listener) => windowListeners.set(name, listener),
  };
  const source = fs.readFileSync(path.join(__dirname, '../static/js/page-transitions.js'), 'utf8');
  vm.runInNewContext(source, { window, URL, module: undefined });
  return { window, documentListeners, windowListeners, Element, historyBackCount: () => historyBackCount };
}

function simulateLinkNavigation({ href, activationHref = href, explicitBack = false, historyBack = false, referrer = '' }) {
  const browser = loadTransitionsInBrowserMock({ referrer, historyLength: historyBack ? 3 : 1 });
  const link = {
    href,
    target: '',
    hasAttribute: (name) => historyBack && name === 'data-history-back',
    relList: { contains: () => false },
    matches: (selector) => explicitBack && selector === '.app-header-back, .lotto-back',
  };
  const target = new browser.Element();
  target.closest = (selector) => selector === 'a[href]' ? link : null;
  const click = { target, button: 0, defaultPrevented: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
    preventDefault() { this.defaultPrevented = true; } };
  browser.documentListeners.get('click')(click);
  const types = new Set();
  browser.windowListeners.get('pageswap')({
    activation: { navigationType: 'push', from: { index: 0 }, entry: { index: 1, url: activationHref } },
    viewTransition: { types: { add: (type) => types.add(type) } },
  });
  return { browser, types, click };
}

test('same-origin Home links receive explicit Home intent', () => {
  assert.equal(classifyLinkIntent({ destinationIsHome: true }), 'home');
});

test('browser entry point exposes classifiers and installs navigation listeners', () => {
  const { window, documentListeners, windowListeners } = loadTransitionsInBrowserMock();
  assert.equal(typeof window.MoneyFlowPageTransitions.classifyTransition, 'function');
  assert.equal(typeof window.MoneyFlowPageTransitions.classifyLinkIntent, 'function');
  assert.equal(typeof documentListeners.get('click'), 'function');
  assert.equal(typeof windowListeners.get('pageswap'), 'function');
  assert.equal(typeof windowListeners.get('pagereveal'), 'function');
  assert.doesNotThrow(() => windowListeners.get('pageswap')({ activation: null }));
  assert.doesNotThrow(() => windowListeners.get('pagereveal')({ activation: null }));
});

test('delegated Home clicks set the home-up type without cancelling navigation', () => {
  const { types } = simulateLinkNavigation({ href: 'https://moneyflow.example/home' });
  assert.deepEqual([...types], ['home-up']);
});

test('a stale click intent cannot label a different navigation destination', () => {
  const { types } = simulateLinkNavigation({
    href: 'https://moneyflow.example/home',
    activationHref: 'https://moneyflow.example/history',
  });
  assert.deepEqual([...types], ['forward']);
});

test('delegated explicit back clicks set the back type when returning Home', () => {
  const { types } = simulateLinkNavigation({ href: 'https://moneyflow.example/home', explicitBack: true });
  assert.deepEqual([...types], ['back']);
});

test('history back control returns to a same-origin referrer and marks a back transition', () => {
  const { browser, types, click } = simulateLinkNavigation({
    href: 'https://moneyflow.example/home',
    activationHref: 'https://moneyflow.example/check',
    explicitBack: true,
    historyBack: true,
    referrer: 'https://moneyflow.example/check',
  });
  assert.equal(click.defaultPrevented, true);
  assert.equal(browser.historyBackCount(), 1);
  assert.deepEqual([...types], ['back']);
});

test('explicit back links take precedence over their Home destination', () => {
  assert.equal(classifyLinkIntent({ explicitBack: true, destinationIsHome: true }), 'back');
});

test('ordinary same-origin route links receive forward intent', () => {
  assert.equal(classifyLinkIntent({ destinationIsHome: false }), 'forward');
});

test('external, new-tab, download, modified, and same-document links are ignored', () => {
  const ignored = [
    { sameOrigin: false },
    { targetBlank: true },
    { download: true },
    { modified: true },
    { sameDocument: true },
    { defaultPrevented: true },
  ];
  for (const link of ignored) assert.equal(classifyLinkIntent(link), null);
});

test('an explicit Home link uses the upward Home transition', () => {
  assert.equal(classifyTransition({ intent: 'home', destinationIsHome: true }), 'home-up');
});

test('ordinary same-origin navigation moves forward', () => {
  assert.equal(classifyTransition({ intent: 'forward', destinationIsHome: false }), 'forward');
});

test('an explicit back control uses the reverse horizontal transition', () => {
  assert.equal(classifyTransition({ intent: 'back', destinationIsHome: true }), 'back');
});

test('browser history traversal to an earlier entry moves backward, including to Home', () => {
  assert.equal(classifyTransition({ intent: 'traverse', fromIndex: 5, toIndex: 2, destinationIsHome: true }), 'back');
});

test('browser history traversal to a later entry moves forward', () => {
  assert.equal(classifyTransition({ intent: 'traverse', fromIndex: 2, toIndex: 5, destinationIsHome: false }), 'forward');
});

test('reloads and same-entry traversals use the generic fallback', () => {
  assert.equal(classifyTransition({ intent: 'traverse', fromIndex: 3, toIndex: 3, destinationIsHome: false }), null);
  assert.equal(classifyTransition({ intent: null, fromIndex: 3, toIndex: 3, destinationIsHome: false }), null);
});

test('missing navigation metadata does not invent a directional transition', () => {
  assert.equal(classifyTransition({ intent: null, fromIndex: null, toIndex: null, destinationIsHome: false }), null);
});
