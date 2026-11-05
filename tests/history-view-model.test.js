'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHistoryView } = require('../static/js/history-view-model.js');

test('view includes every supported record and keeps score optional', () => {
  const view = buildHistoryView([
    { id: 'q', type: 'quote', label: '투자 한 줄', title: '투자자', summary: '기다림도 선택입니다.' },
    { id: 'p', type: 'palm', label: '오늘의 손금', title: '재물의 씨앗' },
    { id: 't', type: 'tarot', label: '오늘의 타로', title: '별', score: 71 },
    { id: 'f', type: 'future', label: '재물 흐름 체크', title: '차근차근', score: 68 }
  ]);

  assert.equal(view.count, 4);
  assert.deepEqual(view.rows.map((row) => row.type), ['quote', 'palm', 'tarot', 'future']);
  assert.equal(Object.hasOwn(view.rows[0], 'score'), false);
  assert.equal(Object.hasOwn(view.rows[1], 'score'), false);
  assert.equal(view.rows[2].score, 71);
});

test('check history records retain their own feature icon types while sharing one filter category', () => {
  const view = buildHistoryView([
    { id: 'future', type: 'future' },
    { id: 'spending', type: 'spending' },
    { id: 'money', type: 'money' }
  ]);

  assert.deepEqual(view.rows.map((row) => row.category), ['check', 'check', 'check']);
  assert.deepEqual(view.rows.map((row) => row.iconType), ['future', 'spending', 'money']);
});

test('latest score is the newest numeric future result, not another activity', () => {
  const view = buildHistoryView([
    { id: 'q', type: 'quote', score: 99 },
    { id: 't', type: 'tarot', score: 88 },
    { id: 'f', type: 'future', score: 63 },
    { id: 'old-f', type: 'future', score: 54 }
  ]);

  assert.equal(view.latestFutureScore, 63);
});

test('weekly trend contains only the seven newest future records with finite scores', () => {
  const entries = [
    { id: 'quote', type: 'quote', score: 100 },
    { id: 'bad', type: 'future', score: 'unknown' },
    ...Array.from({ length: 9 }, (_, index) => ({ id: `f${index}`, type: 'future', score: 58 - index })),
    { id: 'palm', type: 'palm', score: 2 }
  ];
  const view = buildHistoryView(entries);

  assert.deepEqual(view.futureTrend.map((item) => item.score), [52, 53, 54, 55, 56, 57, 58]);
});

test('future trend remains empty and latest score is null without numeric future scores', () => {
  const view = buildHistoryView([{ id: 'p', type: 'palm' }, { id: 'f', type: 'future', score: null }]);

  assert.equal(view.latestFutureScore, null);
  assert.deepEqual(view.futureTrend, []);
});

test('empty input returns an empty history view', () => {
  assert.deepEqual(buildHistoryView([]), {
    count: 0,
    categoryCounts: { all: 0, tarot: 0, palm: 0, lotto: 0, check: 0, quote: 0 },
    latestFutureScore: null,
    rows: [],
    futureTrend: []
  });
});
