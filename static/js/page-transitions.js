(function (root) {
  'use strict';

  function classifyTransition({ intent = null, fromIndex = null, toIndex = null, destinationIsHome = false } = {}) {
    if (intent === 'back') return 'back';
    if (intent === 'home' || (intent === 'push' && destinationIsHome)) return 'home-up';
    if (intent === 'forward' || intent === 'push') return 'forward';
    if (intent !== 'traverse' || !Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex === toIndex) return null;
    return toIndex < fromIndex ? 'back' : 'forward';
  }

  function classifyLinkIntent({
    button = 0,
    modified = false,
    defaultPrevented = false,
    sameOrigin = true,
    targetBlank = false,
    download = false,
    external = false,
    sameDocument = false,
    destinationIsHome = false,
  } = {}) {
    if (button !== 0 || modified || defaultPrevented || !sameOrigin || targetBlank || download || external || sameDocument) return null;
    return destinationIsHome ? 'home' : 'forward';
  }

  function installPageTransitions(window) {
    const document = window.document;
    const homePath = document.documentElement.dataset.homeUrl;
    const fallbackTransitionKey = 'moneyflow-page-transition';
    let fallbackNavigationPending = false;

    function playFallbackEntry(type) {
      if (!type || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      document.documentElement.dataset.transitionEnter = type;
      window.setTimeout(() => {
        delete document.documentElement.dataset.transitionEnter;
      }, 320);
    }

    function restoreFallbackEntry() {
      const navigationType = window.performance?.getEntriesByType?.('navigation')?.[0]?.type;
      let storedIntent = null;
      try {
        storedIntent = window.sessionStorage?.getItem(fallbackTransitionKey) || null;
        window.sessionStorage?.removeItem(fallbackTransitionKey);
      } catch (_) {
        // Storage can be unavailable in private or embedded browser contexts.
      }
      // Browser history owns Back/Forward motion, including iOS's interactive edge-swipe.
      if (navigationType === 'back_forward') return;

      if (storedIntent) {
        playFallbackEntry(classifyTransition({
          intent: storedIntent,
          destinationIsHome: window.location.pathname === homePath,
        }));
        return;
      }

    }

    // BFCache restores keep this document alive. Leave their interactive browser transition untouched.
    restoreFallbackEntry();
    window.addEventListener('pagehide', () => {
      delete document.documentElement.dataset.transitionExit;
      delete document.documentElement.dataset.transitionEnter;
    });
    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      fallbackNavigationPending = false;
      delete document.documentElement.dataset.transitionExit;
      delete document.documentElement.dataset.transitionEnter;
    });

    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof window.Element ? event.target : event.target?.parentElement;
      const backControl = target?.closest('[data-history-back]');
      if (backControl) {
        event.preventDefault();
        window.history?.back();
        return;
      }
      const link = target?.closest('a[href]');
      if (!link) return;

      let destination;
      try {
        destination = new URL(link.href, window.location.href);
      } catch (_) {
        return;
      }
      const intent = classifyLinkIntent({
        button: event.button,
        modified: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
        defaultPrevented: event.defaultPrevented,
        sameOrigin: destination.origin === window.location.origin,
        targetBlank: link.target === '_blank',
        download: link.hasAttribute('download'),
        external: link.relList.contains('external'),
        sameDocument: destination.pathname === window.location.pathname && destination.search === window.location.search,
        destinationIsHome: destination.pathname === homePath,
      });
      if (!intent) return;

      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        event.preventDefault();
        if (fallbackNavigationPending) return;
        fallbackNavigationPending = true;
        const transitionType = classifyTransition({
          intent,
          destinationIsHome: destination.pathname === homePath,
        });
        try {
          window.sessionStorage?.setItem(fallbackTransitionKey, transitionType || 'forward');
        } catch (_) {
          // Navigation remains functional even when session storage is unavailable.
        }
        if (transitionType) document.documentElement.dataset.transitionExit = transitionType;
        window.setTimeout(() => window.location.assign(destination.href), transitionType === 'home-up' ? 150 : 140);
      }
    }, true);

  }

  const pageTransitions = { classifyLinkIntent, classifyTransition };
  if (typeof module !== 'undefined' && module.exports) module.exports = pageTransitions;
  if (root && root.document) {
    root.MoneyFlowPageTransitions = pageTransitions;
    installPageTransitions(root);
  }
})(typeof window !== 'undefined' ? window : globalThis);
