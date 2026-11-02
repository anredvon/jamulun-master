'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('daily feature remains Tarot and does not create date-based content drift', () => {
  const elements = {
    'today-feature-title': { textContent: '' },
    'today-feature-copy': { textContent: '' },
    'today-feature-link': { href: '', firstChild: { textContent: '' } },
    'today-feature-date': { textContent: '' }
  };
  const source = fs.readFileSync('static/js/today.js', 'utf8');
  vm.runInNewContext(source, { document: { getElementById: (id) => elements[id] }, Date });
  assert.equal(elements['today-feature-title'].textContent, '오늘의 타로카드 한 장');
  assert.equal(elements['today-feature-link'].href, '/tarot');
  assert.match(elements['today-feature-copy'].textContent, /매일 타로카드 한 장으로/);
});
