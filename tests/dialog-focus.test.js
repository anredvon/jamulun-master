'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const focusModule = require('../static/js/dialog-focus.js');

function makeElement(document, { disabled = false, hidden = false, ariaHidden = false } = {}) {
  return {
    disabled,
    hidden,
    isConnected: true,
    getAttribute(name) { return name === 'aria-hidden' && ariaHidden ? 'true' : null; },
    closest() { return null; },
    focus() { document.activeElement = this; }
  };
}

function makeDialog(document, focusables = []) {
  return {
    focus() { document.activeElement = this; },
    contains(element) { return element === this || focusables.includes(element); },
    querySelectorAll() { return focusables; }
  };
}

function makeTabEvent({ shiftKey = false } = {}) {
  return {
    key: 'Tab', shiftKey, prevented: false,
    preventDefault() { this.prevented = true; }
  };
}

test('dialog focus manager opens on the requested target and restores the opener', () => {
  const document = {};
  const opener = makeElement(document);
  const initial = makeElement(document);
  document.activeElement = opener;
  const manager = focusModule.create(document);
  const dialog = makeDialog(document, [initial]);

  manager.open(dialog, initial);
  assert.equal(document.activeElement, initial);
  manager.close();
  assert.equal(document.activeElement, opener);
});

test('Tab and Shift+Tab wrap between first and last focusable dialog controls', () => {
  const document = {};
  const first = makeElement(document);
  const last = makeElement(document);
  document.activeElement = makeElement(document);
  const manager = focusModule.create(document);
  manager.open(makeDialog(document, [first, last]), first);

  document.activeElement = last;
  const forward = makeTabEvent();
  manager.handleKeydown(forward);
  assert.equal(forward.prevented, true);
  assert.equal(document.activeElement, first);

  const backward = makeTabEvent({ shiftKey: true });
  manager.handleKeydown(backward);
  assert.equal(backward.prevented, true);
  assert.equal(document.activeElement, last);
});

test('Tab remains within a dialog with no focusable controls', () => {
  const document = {};
  const manager = focusModule.create(document);
  const dialog = makeDialog(document);
  manager.open(dialog, dialog);

  const event = makeTabEvent();
  manager.handleKeydown(event);

  assert.equal(event.prevented, true);
  assert.equal(document.activeElement, dialog);
});

test('disabled and hidden controls are excluded from the focus cycle', () => {
  const document = {};
  const hidden = makeElement(document, { hidden: true });
  const disabled = makeElement(document, { disabled: true });
  const visible = makeElement(document);
  const manager = focusModule.create(document);
  manager.open(makeDialog(document, [hidden, disabled, visible]), visible);
  document.activeElement = visible;

  const event = makeTabEvent();
  manager.handleKeydown(event);

  assert.equal(event.prevented, true);
  assert.equal(document.activeElement, visible);
});
