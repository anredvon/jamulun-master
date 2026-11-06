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
    explicitBack = false,
    destinationIsHome = false,
  } = {}) {
    if (button !== 0 || modified || defaultPrevented || !sameOrigin || targetBlank || download || external || sameDocument) return null;
    if (explicitBack) return 'back';
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
      let storedIntent = null;
      try {
        storedIntent = window.sessionStorage?.getItem(fallbackTransitionKey) || null;
        window.sessionStorage?.removeItem(fallbackTransitionKey);
      } catch (_) {
        // Storage can be unavailable in private or embedded browser contexts.
      }
      if (storedIntent) {
        playFallbackEntry(classifyTransition({
          intent: storedIntent,
          destinationIsHome: window.location.pathname === homePath,
        }));
        return;
      }

      const navigationType = window.performance?.getEntriesByType?.('navigation')?.[0]?.type;
      if (navigationType === 'back_forward') playFallbackEntry('back');
    }

    restoreFallbackEntry();
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) playFallbackEntry('back');
    });

    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof window.Element ? event.target : event.target?.parentElement;
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
        explicitBack: link.matches('.lotto-back'),
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
          // Navigation remains functional even when transition state cannot be stored.
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
