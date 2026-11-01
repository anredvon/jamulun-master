'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHistoryStore } = require('../static/js/history-store.js');

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem(key) { return key === 'moneyflow_history_v1' ? value : null; },
    setItem(key, next) { if (key === 'moneyflow_history_v1') value = String(next); },
    raw() { return value; }
  };
}

test('add prepends an entry and fills omitted timestamps', () => {
  const storage = memoryStorage();
  const history = createHistoryStore(storage);

  assert.equal(history.add({ id: 'new', type: 'future', label: '체크', title: '좋은 흐름', score: 71 }), true);
  const [entry] = history.read();
  assert.equal(entry.id, 'new');
  assert.equal(entry.title, '좋은 흐름');
  assert.match(entry.createdAt, /^\d{4}-\d\d-\d\dT/);
  assert.ok(entry.date);
});

test('add replaces an earlier record with the same string ID', () => {
  const history = createHistoryStore(memoryStorage());
  history.add({ id: 42, type: 'future', label: '체크', title: '이전' });
  history.add({ id: '42', type: 'future', label: '체크', title: '최신' });

  assert.equal(history.read().length, 1);
  assert.equal(history.read()[0].title, '최신');
});

test('add retains only the configured newest records', () => {
  const history = createHistoryStore(memoryStorage(), { maxItems: 30 });
  for (let id = 0; id < 35; id += 1) {
    history.add({ id, type: 'future', label: '체크', title: `결과 ${id}` });
  }

  assert.equal(history.read().length, 30);
  assert.equal(history.read()[0].id, 34);
  assert.equal(history.read()[29].id, 5);
});

test('read preserves legacy quiz record fields', () => {
  const legacy = { id: 9, type: 'future', label: '재물 흐름', score: 64, title: '안정 흐름', date: '10월 1일' };
  const history = createHistoryStore(memoryStorage(JSON.stringify([legacy])));

  assert.deepEqual(history.read(), [legacy]);
});

test('malformed JSON reads as empty and does not mutate storage', () => {
  const storage = memoryStorage('{broken');
  const history = createHistoryStore(storage);

  assert.deepEqual(history.read(), []);
  assert.equal(storage.raw(), '{broken');
});

test('unavailable storage returns an empty list and add fails without throwing', () => {
  const history = createHistoryStore(null);

  assert.deepEqual(history.read(), []);
  assert.doesNotThrow(() => assert.equal(history.add({ id: 'x', type: 'quote', label: '명언', title: '한 줄' }), false));
});

test('quota errors return false and preserve the existing record', () => {
  const storage = memoryStorage(JSON.stringify([{ id: 'kept', type: 'future', title: '기존 기록' }]));
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const history = createHistoryStore(storage);

  assert.equal(history.add({ id: 'new', type: 'quote', title: '새 기록' }), false);
  assert.deepEqual(history.read(), [{ id: 'kept', type: 'future', title: '기존 기록' }]);
});

test('scoreless records remain scoreless', () => {
  const history = createHistoryStore(memoryStorage());
  history.add({ id: 'quote-1', type: 'quote', label: '투자 한 줄', title: '투자자', summary: '기다림도 선택입니다.' });

  assert.equal(Object.hasOwn(history.read()[0], 'score'), false);
});
