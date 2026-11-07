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
  storedIntent = null,
  historyState = { retained: 'existing-state' },
} = {}) {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const storage = new Map(storedIntent ? [['moneyflow-page-transition', storedIntent]] : []);
  const timeoutCallbacks = [];
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
      length: 2,
      backCalls: 0,
      state: historyState,
      replaceState(state) { this.state = state; },
      back() { this.backCalls += 1; },
    },
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout: (callback) => { timeoutCallbacks.push(callback); return timeoutCallbacks.length; },
    addEventListener: (name, listener) => windowListeners.set(name, listener),
  };
  const source = fs.readFileSync(path.join(__dirname, '../static/js/page-transitions.js'), 'utf8');
  vm.runInNewContext(source, { window, URL, module: undefined });
  return { window, documentListeners, windowListeners, Element, storage, timeoutCallbacks, runTimeout: (index = timeoutCallbacks.length - 1) => timeoutCallbacks[index]?.() };
}

function simulateLink(browser, { href, modifiers = false, historyBack = false, backClass = false } = {}) {
  const link = {
    href, target: '', hasAttribute: () => false,
    relList: { contains: () => false }, matches: (selector) => selector === '.lotto-back' && backClass,
  };
  const target = new browser.Element();
  const backControl = { matches: (selector) => selector === '[data-history-back]' && historyBack };
  target.closest = (selector) => {
    if (selector === '[data-history-back]' && historyBack) return backControl;
    return selector === 'a[href]' ? link : null;
  };
  const click = { target, button: 0, defaultPrevented: false, metaKey: modifiers, ctrlKey: false, shiftKey: false, altKey: false,
    preventDefault() { this.defaultPrevented = true; } };
  browser.documentListeners.get('click')(click);
  return click;
}

test('same-origin Home links receive explicit Home intent', () => {
  assert.equal(classifyLinkIntent({ destinationIsHome: true }), 'home');
});

test('browser entry point exposes classifiers and installs click, pagehide, and pageshow listeners', () => {
  const { window, documentListeners, windowListeners } = loadTransitionsInBrowserMock();
  assert.equal(typeof window.MoneyFlowPageTransitions.classifyTransition, 'function');
  assert.equal(typeof window.MoneyFlowPageTransitions.classifyLinkIntent, 'function');
  assert.equal(typeof documentListeners.get('click'), 'function');
  assert.equal(typeof windowListeners.get('pagehide'), 'function');
  assert.equal(typeof windowListeners.get('pageshow'), 'function');
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

test('a route link styled as a local Back action still moves forward to its destination', () => {
  const browser = loadTransitionsInBrowserMock();
  simulateLink(browser, { href: 'https://moneyflow.example/lotto', backClass: true });
  assert.equal(browser.window.document.documentElement.dataset.transitionExit, 'forward');
  assert.equal(browser.storage.get('moneyflow-page-transition'), 'forward');
});

test('the shared Back control follows browser history without navigating to Home', () => {
  const browser = loadTransitionsInBrowserMock();
  const click = simulateLink(browser, { href: 'https://moneyflow.example/home', historyBack: true });
  assert.equal(click.defaultPrevented, true);
  assert.equal(browser.window.history.backCalls, 1);
  assert.equal(browser.window.location.href, 'https://moneyflow.example/tarot');
  assert.equal(browser.window.document.documentElement.dataset.transitionExit, undefined);
});

test('browser Back after Home entry leaves motion to browser history', () => {
  const browser = loadTransitionsInBrowserMock({
    navigationType: 'back_forward',
    referrer: 'https://moneyflow.example/home',
    historyState: {
      retained: 'existing-state',
      moneyflowOutgoingTransition: 'home-up',
      moneyflowOutgoingDestination: 'https://moneyflow.example/home',
    },
  });
  assert.equal(browser.window.document.documentElement.dataset.transitionEnter, undefined);
});

test('browser Forward after a backward feature entry leaves motion to browser history', () => {
  const browser = loadTransitionsInBrowserMock({
    navigationType: 'back_forward',
    referrer: 'https://moneyflow.example/tarot',
    historyState: {
      moneyflowOutgoingTransition: 'back',
      moneyflowOutgoingDestination: 'https://moneyflow.example/tarot',
    },
  });
  assert.equal(browser.window.document.documentElement.dataset.transitionEnter, undefined);
});

test('unmatched browser history traversal does not add a fallback motion', () => {
  const browser = loadTransitionsInBrowserMock({
    navigationType: 'back_forward',
    referrer: 'https://moneyflow.example/history',
    historyState: {
      moneyflowOutgoingTransition: 'home-up',
      moneyflowOutgoingDestination: 'https://moneyflow.example/home',
    },
  });
  assert.equal(browser.window.document.documentElement.dataset.transitionEnter, undefined);
});

test('history traversal clears a stale pending link transition instead of replaying it', () => {
  const browser = loadTransitionsInBrowserMock({ navigationType: 'back_forward', storedIntent: 'forward' });
  assert.equal(browser.window.document.documentElement.dataset.transitionEnter, undefined);
  assert.equal(browser.storage.has('moneyflow-page-transition'), false);
});

test('BFCache restoration clears the stale navigation lock so the next link remains usable', () => {
  const browser = loadTransitionsInBrowserMock();

  simulateLink(browser, { href: 'https://moneyflow.example/history' });
  browser.runTimeout();
  assert.equal(browser.window.location.pathname, '/history');

  browser.windowListeners.get('pagehide')({ persisted: true });
  browser.window.location.href = 'https://moneyflow.example/tarot';
  browser.window.location.pathname = '/tarot';
  browser.windowListeners.get('pageshow')({ persisted: true });

  const scheduledBeforeNextTap = browser.timeoutCallbacks.length;
  const click = simulateLink(browser, { href: 'https://moneyflow.example/today' });
  assert.equal(click.defaultPrevented, true);
  assert.equal(browser.timeoutCallbacks.length, scheduledBeforeNextTap + 1);
  browser.runTimeout();
  assert.equal(browser.window.location.pathname, '/today');
});

test('BFCache restoration leaves the interactive browser transition in control', () => {
  const browser = loadTransitionsInBrowserMock({ navigationType: 'back_forward' });
  assert.equal(browser.window.document.documentElement.dataset.transitionEnter, undefined);
});

test('pagehide clears the outgoing transform before the browser caches the page', () => {
  const browser = loadTransitionsInBrowserMock();
  simulateLink(browser, { href: 'https://moneyflow.example/home' });
  assert.equal(browser.window.document.documentElement.dataset.transitionExit, 'home-up');
  browser.windowListeners.get('pagehide')({ persisted: true });
  assert.equal(browser.window.document.documentElement.dataset.transitionExit, undefined);
});

test('link motion does not rewrite browser history state', () => {
  const browser = loadTransitionsInBrowserMock();
  simulateLink(browser, { href: 'https://moneyflow.example/home' });
  assert.equal(browser.window.history.state.retained, 'existing-state');
  assert.equal(browser.window.history.state.moneyflowOutgoingTransition, undefined);
  assert.equal(browser.window.history.state.moneyflowOutgoingDestination, undefined);
});

test('the Today bottom-navigation destination remains a horizontal feature transition', () => {
  const browser = loadTransitionsInBrowserMock();
  simulateLink(browser, { href: 'https://moneyflow.example/today' });
  assert.equal(browser.window.document.documentElement.dataset.transitionExit, 'forward');
  assert.equal(browser.window.history.state.moneyflowOutgoingTransition, undefined);
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
