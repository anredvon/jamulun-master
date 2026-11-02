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
