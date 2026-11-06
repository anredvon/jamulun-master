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
    let pendingIntent = null;
    let pendingDestination = null;

    function addTransitionType(event, phase) {
      const activation = event.activation || window.navigation?.activation;
      const destination = phase === 'swap' ? activation?.entry?.url || pendingDestination : activation?.entry?.url;
      let destinationIsHome = false;
      try {
        destinationIsHome = Boolean(destination && new URL(destination, window.location.href).pathname === homePath);
      } catch (_) {
        destinationIsHome = false;
      }

      const navigationType = activation?.navigationType;
      let pendingMatchesDestination = false;
      try {
        pendingMatchesDestination = Boolean(pendingIntent && destination && pendingDestination &&
          new URL(destination, window.location.href).href === new URL(pendingDestination, window.location.href).href);
      } catch (_) {
        pendingMatchesDestination = false;
      }
      const intent = (pendingMatchesDestination ? pendingIntent : null) ||
        (navigationType === 'traverse' ? 'traverse' : navigationType === 'push' ? 'push' : null);
      const type = classifyTransition({
        intent,
        fromIndex: activation?.from?.index,
        toIndex: activation?.entry?.index,
        destinationIsHome,
      });
      if (type && event.viewTransition?.types?.add) {
        try {
          event.viewTransition.types.add(type);
        } catch (_) {
          // Unsupported or cancelled view transitions should never block navigation.
        }
      }
      if (phase === 'swap') {
        pendingIntent = null;
        pendingDestination = null;
      }
    }

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
        explicitBack: link.matches('.app-header-back, .lotto-back'),
        destinationIsHome: destination.pathname === homePath,
      });
      if (!intent) return;

      pendingIntent = intent;
      pendingDestination = destination.href;
    }, true);

    window.addEventListener('pageswap', (event) => addTransitionType(event, 'swap'));
    window.addEventListener('pagereveal', (event) => addTransitionType(event, 'reveal'));
  }

  const pageTransitions = { classifyLinkIntent, classifyTransition };
  if (typeof module !== 'undefined' && module.exports) module.exports = pageTransitions;
  if (root && root.document) {
    root.MoneyFlowPageTransitions = pageTransitions;
    installPageTransitions(root);
  }
})(typeof window !== 'undefined' ? window : globalThis);
