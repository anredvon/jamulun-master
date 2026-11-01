(() => {
  'use strict';
  const title = document.getElementById('today-feature-title');
  const copy = document.getElementById('today-feature-copy');
  const link = document.getElementById('today-feature-link');
  const dateLabel = document.getElementById('today-feature-date');
  if (!title || !copy || !link || !dateLabel) return;

  const routines = [
    { title: '오늘의 타로카드 한 장', copy: '카드 한 장을 골라 오늘의 금전 흐름을 가볍게 살펴보세요.', action: '오늘의 카드 만나기', href: '/tarot' },
    { title: '내 손바닥 선 살펴보기', copy: '사진 속 세 가지 손금을 확인하고 전통 풀이를 재미로 읽어봐요.', action: '손금 보러 가기', href: '/palm' },
    { title: '투자 명언 한 줄 읽기', copy: '출처가 있는 문장을 만나고 오늘의 투자 원칙을 떠올려봐요.', action: '한 줄 뽑기', href: '/investment-quotes' },
    { title: '오늘 돈 흐름 돌아보기', copy: '짧은 질문에 답하며 지금의 돈 관리 습관을 점검해봐요.', action: '체크 시작하기', href: '/intro/future' }
  ];
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dayNumber = Math.floor(Date.parse(`${localDate}T00:00:00`) / 86400000);
  const routine = routines[((dayNumber % routines.length) + routines.length) % routines.length];
  title.textContent = routine.title;
  copy.textContent = routine.copy;
  link.href = routine.href;
  link.firstChild.textContent = `${routine.action} `;
  dateLabel.textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 오늘의 추천`;
})();
