'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Today renders one Seoul-date sourced quote without repeating Tarot actions', () => {
  const route = fs.readFileSync('today_routes.py', 'utf8');
  const template = fs.readFileSync('templates/today.html', 'utf8');
  assert.match(route, /ZoneInfo\("Asia\/Seoul"\)/);
  assert.match(route, /today\.toordinal\(\) % len\(valid_quotes\)/);
  assert.match(template, /daily_quote\.text_ko/);
  assert.match(template, /daily_quote\.source_url/);
  assert.doesNotMatch(template, /today-feature-link|url_for\('tarot\.tarot_page'\)/);
});
