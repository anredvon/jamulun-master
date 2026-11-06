const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { classifyLinkIntent, classifyTransition } = require('../static/js/page-transitions.js');

function loadTransitionsInBrowserMock({
  reducedMotion = false,
  navigationType = 'navigate',
  referrer = '',
  historyState = { retained: 'existing-state' },
} = {}) {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const storage = new Map();
  let timeoutCallback = null;
  class Element {}
  const window = {
    document: {
      documentElement: { dataset: { homeUrl: '/home' } },
      referrer,
      addEventListener: (name, listener) => documentListeners.set(name, listener),
    },
    Element,
    URL,
    location: {
      href: 'https://moneyflow.example/tarot',
      origin: 'https://moneyflow.example',
      pathname: '/tarot',
      assign(href) { this.href = href; this.pathname = new URL(href).pathname; },
    },
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    performance: { getEntriesByType: () => [{ type: navigationType }] },
    history: {
      state: historyState,
      replaceState(state) { this.state = state; },
    },
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout: (callback) => { timeoutCallback = callback; return 1; },
    addEventListener: (name, listener) => windowListeners.set(name, listener),
  };
  const source = fs.readFileSync(path.join(__dirname, '../static/js/page-transitions.js'), 'utf8');
  vm.runInNewContext(source, { window, URL, module: undefined });
  return { window, documentListeners, windowListeners, Element, storage, runTimeout: () => timeoutCallback?.() };
}

function simulateLink(browser, { href, modifiers = false } = {}) {
  const link = {
    href, target: '', hasAttribute: () => false,
    relList: { contains: () => false }, matches: () => false,
  };
  const target = new browser.Element();
  target.closest = (selector) => selector === 'a[href]' ? link : null;
  const click = { target, button: 0, defaultPrevented: false, metaKey: modifiers, ctrlKey: false, shiftKey: false, altKey: false,
    preventDefault() { this.defaultPrevented = true; } };
  browser.documentListeners.get('click')(click);
  return click;
}

test('same-origin Home links receive explicit Home intent', () => {
  assert.equal(classifyLinkIntent({ destinationIsHome: true }), 'home');
});

test('browser entry point exposes classifiers and installs click and pagehide listeners', () => {
  const { window, documentListeners, windowListeners } = loadTransitionsInBrowserMock();
  assert.equal(typeof window.MoneyFlowPageTransitions.classifyTransition, 'function');
  assert.equal(typeof window.MoneyFlowPageTransitions.classifyLinkIntent, 'function');
  assert.equal(typeof documentListeners.get('click'), 'function');
  assert.equal(typeof windowListeners.get('pagehide'), 'function');
  assert.equal(windowListeners.has('pageshow'), false);
});

test('forward navigation plays an exit and entry motion without a cross-document transition API', () => {
  const browser = loadTransitionsInBrowserMock();
  const click = simulateLink(browser, { href: 'https://moneyflow.example/check' });
  assert.equal(click.defaultPrevented, true);
  assert.equal(browser.window.document.documentElement.dataset.transitionExit, 'forward');
  assert.equal(browser.storage.get('moneyflow-page-transition'), 'forward');
  browser.runTimeout();
  assert.equal(browser.window.location.href, 'https://moneyflow.example/check');
});

test('the visible Home control uses the upward Home transition', () => {
  const browser = loadTransitionsInBrowserMock();
  const click = simulateLink(browser, { href: 'https://moneyflow.example/home' });
  assert.equal(click.defaultPrevented, true);
  assert.equal(browser.window.document.documentElement.dataset.transitionExit, 'home-up');
  assert.equal(browser.storage.get('moneyflow-page-transition'), 'home-up');
});

test('matched browser Back after Home entry uses the inverse vertical motion', () => {
  const browser = loadTransitionsInBrowserMock({
    navigationType: 'back_forward',
    referrer: 'https://moneyflow.example/home',
    historyState: {
      retained: 'existing-state',
      moneyflowOutgoingTransition: 'home-up',
      moneyflowOutgoingDestination: 'https://moneyflow.example/home',
    },
  });
  assert.equal(browser.window.document.documentElement.dataset.transitionEnter, 'home-down');
});

test('matched browser Forward after a backward feature entry uses the inverse horizontal motion', () => {
  const browser = loadTransitionsInBrowserMock({
    navigationType: 'back_forward',
    referrer: 'https://moneyflow.example/tarot',
    historyState: {
      moneyflowOutgoingTransition: 'back',
      moneyflowOutgoingDestination: 'https://moneyflow.example/tarot',
    },
  });
  assert.equal(browser.window.document.documentElement.dataset.transitionEnter, 'forward');
});

test('unmatched history metadata falls back to horizontal Back motion', () => {
  const browser = loadTransitionsInBrowserMock({
    navigationType: 'back_forward',
    referrer: 'https://moneyflow.example/history',
    historyState: {
      moneyflowOutgoingTransition: 'home-up',
      moneyflowOutgoingDestination: 'https://moneyflow.example/home',
    },
  });
  assert.equal(browser.window.document.documentElement.dataset.transitionEnter, 'back');
});

test('BFCache restoration leaves the interactive browser transition in control', () => {
  const browser = loadTransitionsInBrowserMock();
  assert.equal(browser.windowListeners.has('pageshow'), false);
  assert.equal(browser.window.document.documentElement.dataset.transitionEnter, undefined);
});

test('pagehide clears the outgoing transform before the browser caches the page', () => {
  const browser = loadTransitionsInBrowserMock();
  simulateLink(browser, { href: 'https://moneyflow.example/home' });
  assert.equal(browser.window.document.documentElement.dataset.transitionExit, 'home-up');
  browser.windowListeners.get('pagehide')({ persisted: true });
  assert.equal(browser.window.document.documentElement.dataset.transitionExit, undefined);
});

test('navigation metadata preserves existing history state', () => {
  const browser = loadTransitionsInBrowserMock();
  simulateLink(browser, { href: 'https://moneyflow.example/home' });
  assert.equal(browser.window.history.state.retained, 'existing-state');
  assert.equal(browser.window.history.state.moneyflowOutgoingTransition, 'home-up');
  assert.equal(browser.window.history.state.moneyflowOutgoingDestination, 'https://moneyflow.example/home');
});

test('the Today bottom-navigation destination remains a horizontal feature transition', () => {
  const browser = loadTransitionsInBrowserMock();
  simulateLink(browser, { href: 'https://moneyflow.example/today' });
  assert.equal(browser.window.document.documentElement.dataset.transitionExit, 'forward');
  assert.equal(browser.window.history.state.moneyflowOutgoingTransition, 'forward');
});

test('reduced motion and modified clicks retain normal browser navigation', () => {
  const browser = loadTransitionsInBrowserMock({ reducedMotion: true });
  const click = simulateLink(browser, { href: 'https://moneyflow.example/check' });
  assert.equal(click.defaultPrevented, false);
  assert.equal(browser.window.document.documentElement.dataset.transitionExit, undefined);
  assert.equal(browser.storage.has('moneyflow-page-transition'), false);

  const ordinary = loadTransitionsInBrowserMock();
  assert.equal(simulateLink(ordinary, { href: 'https://moneyflow.example/check', modifiers: true }).defaultPrevented, false);
});

test('browser history traversal classifies earlier entries as back', () => {
  assert.equal(classifyTransition({ intent: 'traverse', fromIndex: 5, toIndex: 2 }), 'back');
});

test('external, new-tab, download, modified, and same-document links are ignored', () => {
  const ignored = [
    { sameOrigin: false }, { targetBlank: true }, { download: true },
    { modified: true }, { sameDocument: true }, { defaultPrevented: true },
  ];
  for (const link of ignored) assert.equal(classifyLinkIntent(link), null);
});
