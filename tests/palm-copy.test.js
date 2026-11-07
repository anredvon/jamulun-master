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

test('palm readings keep the approved fortune-reader voice and stay grounded in the visible line', () => {
  const rules = require('../static/data/palm-reading-rules.json');
  assert.equal(rules.length, 14);
  const fate = rules.find((rule) => rule.line_type === 'fate' && rule.feature_code === 'central_vertical_visible');
  assert.equal(fate.reading_text,
    '손바닥 가운데로 올라오는 선이 보이네요. 손금에서는 이런 선을 운명선으로 보고, 일과 사회생활의 흐름이나 주변 환경이 내 길에 미치는 영향을 살펴요. 맡은 일을 쉽게 놓지 않고 주변의 기대까지 자기 몫으로 끌어안는 모습으로 읽힙니다. 요즘 책임이 유난히 무겁다면, 내가 정말 이어가고 싶은 일과 거절하지 못해 붙들고 있는 일을 한번 나눠보세요.');
  assert.equal(fate.reflection_prompt, '요즘 이어가고 싶은 일과, 주변의 기대 때문에 붙들고 있는 일은 무엇인가요? 둘을 나눠 적고, 이번 주에 이어갈 한 가지를 골라보세요.');
  assert.ok(rules.every((rule) => rule.source_locator && rule.source_key));
  assert.ok(rules.every((rule) => !/지금 분석은|사진에서는 .*확인하지 않으므로|과학적 성격/.test(rule.reading_text)));
});

test('Tarot and palm reading prose has a legible iPhone type size and line spacing', () => {
  const tarotCss = require('node:fs').readFileSync(require('node:path').join(__dirname, '../static/css/tarot.css'), 'utf8');
  const palmCss = require('node:fs').readFileSync(require('node:path').join(__dirname, '../static/css/palm.css'), 'utf8');
  const baseCss = require('node:fs').readFileSync(require('node:path').join(__dirname, '../static/css/jaemulun.css'), 'utf8');
  assert.match(tarotCss, /\.tarot-report-card p\s*\{[^}]*font-size:\s*16px/);
  assert.match(tarotCss, /\.tarot-report-card p\s*\{[^}]*line-height:\s*1\.7/);
  assert.match(palmCss, /\.palm-reading-item p\s*\{[^}]*font-size:\s*16px/);
  assert.match(palmCss, /\.palm-reading-item p\s*\{[^}]*line-height:\s*1\.7/);
  assert.match(baseCss, /font-family:'Pretendard Variable','Pretendard',-apple-system/);
});
