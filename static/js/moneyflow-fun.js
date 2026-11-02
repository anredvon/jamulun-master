(() => {
  'use strict';
  const result = window.MONEYFLOW_RESULT || {};
  const score = Number(result.score || 0);

  const suggestions = {
    future: {
      high: [
        '지금 이어가고 있는 돈 습관 중 하나를 오늘도 해봐요.',
        '새 계획을 더하기보다 현재의 루틴이 무리 없는지 살펴봐요.',
        '이번 달 저축 계획이 생활비에 부담되지 않는지 확인해봐요.'
      ],
      mid: [
        '오늘 들어온 돈과 나간 돈을 한 번만 확인해봐요.',
        '미뤄둔 돈 관련 할 일 중 가장 작은 것 하나를 해봐요.',
        '이번 주 꼭 필요한 지출 하나와 미뤄도 되는 지출 하나를 나눠봐요.'
      ],
      low: [
        '큰 결정보다 예정된 지출 하나를 먼저 확인해봐요.',
        '계획에 없던 결제가 있다면 지금 꼭 필요한지 살펴봐요.',
        '돈 생각이 복잡하다면 오늘 쓸 수 있는 금액만 간단히 정해봐요.'
      ]
    },
    spending: {
      high: [
        '오늘 가장 만족스러운 소비 하나를 기억해두고 그 기준을 계속 가져가봐요.',
        '필요한 것과 원하는 것을 나누는 나만의 기준을 적어봐요.',
        '잘 고른 소비 하나가 있다면 왜 만족스러웠는지 잠깐 떠올려봐요.'
      ],
      mid: [
        '사고 싶은 것 하나는 장바구니에만 담고 조금 뒤에 다시 봐요.',
        '결제하기 전에 딱 한 번 “지금 필요한가?”만 물어봐요.',
        '오늘 소비 중 하나만 가격을 한 번 더 비교해봐요.'
      ],
      low: [
        '예정에 없던 결제 하나는 내일까지 기다려보고 다시 생각해봐요.',
        '결제 버튼을 누르기 전 10분 쉬고 필요한 이유를 떠올려봐요.',
        '오늘은 작은 금액이라도 안 써도 되는 지출 하나만 건너뛰어봐요.'
      ]
    },
    money: {
      high: [
        '지금 잘 지키고 있는 돈 습관 하나를 오늘도 이어가봐요.',
        '큰 변화를 더하기 전에 현재의 지출 계획이 무리 없는지 봐요.',
        '작은 여유가 생긴다면 미래의 나를 위해 조금 남겨두는 것도 좋아요.'
      ],
      mid: [
        '오늘 돈을 쓸 일이 생기면 한 번만 더 비교해보고 결정해봐요.',
        '예정에 없던 지출 하나만 잠깐 미뤄보면 흐름이 더 편안해질 거예요.',
        '오늘의 소비 중 만족도가 가장 높을 것 하나를 먼저 골라봐요.'
      ],
      low: [
        '오늘은 지갑을 조금 천천히 열어봐요. 급하지 않은 지출 하나만 미뤄도 충분해요.',
        '큰 금전 결정은 잠깐 쉬고 꼭 필요한 것부터 챙겨봐요.',
        '오늘 사용할 금액의 기준을 먼저 정해봐요.'
      ]
    }
  };

  const level = score >= 70 ? 'high' : score >= 45 ? 'mid' : 'low';
  const group = suggestions[result.type] || suggestions.future;
  const pool = group[level];
  const dayKey = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul'}).format(new Date());
  const seed = [...`${dayKey}-${result.type || 'future'}-${result.title || ''}-${level}`].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const suggestion = pool[seed % pool.length];
  const text = document.getElementById('money-mission-text');
  const title = document.getElementById('money-mission-title');
  const btn = document.getElementById('money-mission-btn');
  if (text) text.textContent = suggestion;
  if (title) title.textContent = result.type === 'spending' ? '오늘의 소비 돌아보기' : result.type === 'money' ? '오늘의 선택 한 가지' : '오늘 이어갈 작은 습관';
  if (!btn) return;

  const key = `moneyflow_suggestion_${dayKey}_${result.type || 'future'}_${level}`;
  const paint = done => {
    btn.classList.toggle('is-done', done);
    btn.innerHTML = done ? '기억해뒀어요 <span aria-hidden="true">💜</span>' : '기억해둘게 <span aria-hidden="true">💜</span>';
  };
  try { paint(localStorage.getItem(key) === 'done'); } catch (_) {}
  btn.addEventListener('click', () => {
    try { localStorage.setItem(key, 'done'); } catch (_) {}
    paint(true);
  });
})();
