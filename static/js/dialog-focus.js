(() => {
  'use strict';

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function create(document) {
    let activeDialog = null;
    let returnFocus = null;

    function getFocusable(dialog) {
      return Array.from(dialog.querySelectorAll(FOCUSABLE)).filter((element) => {
        if (element.disabled || element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
        return !element.closest?.('[hidden], .is-hidden, [aria-hidden="true"]');
      });
    }

    function open(dialog, initialFocus) {
      if (!dialog) return;
      returnFocus = document.activeElement;
      activeDialog = dialog;
      const target = initialFocus || getFocusable(dialog)[0] || dialog;
      target.focus();
    }

    function close() {
      const target = returnFocus;
      activeDialog = null;
      returnFocus = null;
      if (target && target.isConnected !== false && typeof target.focus === 'function') target.focus();
    }

    function handleKeydown(event) {
      if (!activeDialog || event.key !== 'Tab') return;
      const focusable = getFocusable(activeDialog);
      if (!focusable.length) {
        event.preventDefault();
        activeDialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !activeDialog.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !activeDialog.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    }

    return { open, close, handleKeydown };
  }

  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.MoneyFlowDialogFocus = api;
})();
