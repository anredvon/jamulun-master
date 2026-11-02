(() => {
  'use strict';
  const title = document.getElementById('today-feature-title');
  const copy = document.getElementById('today-feature-copy');
  const link = document.getElementById('today-feature-link');
  const dateLabel = document.getElementById('today-feature-date');
  if (!title || !copy || !link || !dateLabel) return;

  const routine = { title: '오늘의 타로카드 한 장', copy: '매일 타로카드 한 장으로 오늘 돌아볼 질문을 찾아보세요.', action: '오늘의 카드 만나기', href: '/tarot' };
  const now = new Date();
  title.textContent = routine.title;
  copy.textContent = routine.copy;
  link.href = routine.href;
  link.firstChild.textContent = `${routine.action} `;
  dateLabel.textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 오늘의 추천`;
})();
