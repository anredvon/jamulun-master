((root, factory) => {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.window === root) root.MoneyFlowPalmCombinations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const HEART = new Map(['h1', 'h2', 'h3', 'h4', 'h5'].map((id, index) => [id, index]));
  const HEAD = new Map(['d1', 'd2', 'd3', 'd4', 'd5'].map((id, index) => [id, index]));
  const FATE = new Map(['f1', 'f2', 'f3', 'f4'].map((id, index) => [id, index]));

  function comboId(heartId, headId, fateId) {
    if (!HEART.has(heartId) || !HEAD.has(headId) || !FATE.has(fateId)) {
      throw new TypeError('invalid palm line type');
    }
    return HEART.get(heartId) * 20 + HEAD.get(headId) * 4 + FATE.get(fateId) + 1;
  }

  return { comboId };
});
