(() => {
  'use strict';
  const result = window.MONEYFLOW_RESULT || {};
  const missions = {
    future: [
      '오늘 들어온 돈과 나간 돈을 딱 한 번만 확인해보기',
      '이번 주에 미뤄둔 돈 관련 할 일 하나 끝내기',
      '내가 잘하고 있는 돈 습관 하나를 적어보기'
    ],
    spending: [
      '사고 싶은 것 하나를 장바구니에만 담고 24시간 기다려보기',
      '오늘 결제하기 전 딱 한 번 “지금 필요한가?” 물어보기',
      '오늘 가장 만족스러웠던 소비 하나 기억해두기'
    ],
    money: [
      '오늘 예정에 없던 지출 하나만 잠깐 미뤄보기',
      '결제 전 가격을 한 번 더 비교해보기',
      '작은 금액이라도 오늘 한 번 아껴보기'
    ]
  };
  const pool = missions[result.type] || missions.future;
  const dayKey = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul'}).format(new Date());
  const seed = [...`${dayKey}-${result.type || 'future'}`].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const mission = pool[seed % pool.length];
  const text = document.getElementById('money-mission-text');
  const btn = document.getElementById('money-mission-btn');
  if (text) text.textContent = mission;
  if (!btn) return;

  const key = `moneyflow_mission_${dayKey}_${result.type || 'future'}`;
  const paint = done => {
    btn.classList.toggle('is-done', done);
    btn.innerHTML = done ? '오늘의 미션 선택 완료 <span aria-hidden="true">✓</span>' : '오늘 해볼게 <span aria-hidden="true">✓</span>';
  };
  try { paint(localStorage.getItem(key) === 'done'); } catch (_) {}
  btn.addEventListener('click', () => {
    try { localStorage.setItem(key, 'done'); } catch (_) {}
    paint(true);
  });
})();
