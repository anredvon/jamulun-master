'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const copy = require('../static/js/palm-copy.js');

test('every supported palm line has a clear, conversational reading and reflection prompt', () => {
  const expected = { heart: ['h1', 'h2', 'h3', 'h4', 'h5'], head: ['d1', 'd2', 'd3', 'd4', 'd5'], fate: ['f1', 'f2', 'f3', 'f4'] };
  for (const [line, ids] of Object.entries(expected)) {
    for (const id of ids) {
      const reading = copy.readings[line][id];
      assert.ok(reading, `${line}.${id} reading is missing`);
      assert.match(reading, /[?？]/, `${line}.${id} should offer a reflection prompt`);
      assert.ok(reading.length >= 35 && reading.length <= 120, `${line}.${id} should be concise and specific`);
    }
  }
});

test('summary prompts are concrete and the photo uncertainty copy is explicit', () => {
  assert.equal(copy.reflectionPrompt, '오늘 마음에 걸린 일 하나를 떠올려보고, 내가 바꿀 수 있는 작은 행동을 골라보세요.');
  assert.match(copy.uncertainReading, /사진에서 선 모양을 뚜렷하게 읽기 어려웠어요/);
  assert.match(copy.disclaimer, /전통 손금 이야기/);
});

test('every measurable heart and head shape has a distinct source-backed substantive reading', () => {
  const rules = require('../static/data/palm-reading-rules.json');
  for (const [line, codes] of Object.entries({ heart: ['h1', 'h2', 'h3', 'h4'], head: ['d1', 'd2', 'd3', 'd4'] })) {
    const readings = codes.map((code) => rules.find((rule) => rule.line_type === line && rule.feature_code === code));
    assert.ok(readings.every(Boolean), `${line} needs a rule for each measured shape`);
    assert.equal(new Set(readings.map((rule) => rule.reading_text)).size, codes.length, `${line} readings should differ by measured shape`);
    assert.ok(readings.every((rule) => rule.reading_text.length >= 160), `${line} readings should contain more than a generic symbol definition`);
    assert.ok(readings.every((rule) => rule.source_locator && rule.reflection_prompt.length >= 40), `${line} rules need source and a concrete prompt`);
  }
});

test('life and fate line readings provide line-specific actions, not only a broad symbolism disclaimer', () => {
  const rules = require('../static/data/palm-reading-rules.json');
  for (const [line, code] of [['life', 'thumb_base_arc'], ['fate', 'central_vertical_visible']]) {
    const rule = rules.find((item) => item.line_type === line && item.feature_code === code);
    assert.ok(rule, `${line} needs a rule for its supported observed feature`);
    assert.ok(rule.reading_text.length >= 150, `${line} should contain a specific interpretation and practical example`);
    assert.ok(rule.reflection_prompt.length >= 55, `${line} should end in a concrete action`);
    assert.ok(rule.source_locator);
  }
});
