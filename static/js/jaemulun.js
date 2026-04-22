(() => {
  'use strict';

  const testType = window.JAEMULUN_TEST_TYPE;
  if (!testType) return;

  const el = {
    loadingBox: document.getElementById('loading-box'),
    errorBox: document.getElementById('error-box'),
    errorMessage: document.getElementById('error-message'),
    questionBox: document.getElementById('question-box'),
    finishBox: document.getElementById('finish-box'),
    finishBtn: document.getElementById('finish-btn'),
    progressText: document.getElementById('progress-text'),
    progressFill: document.getElementById('progress-fill'),
    questionTag: document.getElementById('question-tag'),
    questionEmoji: document.getElementById('question-emoji'),
    questionText: document.getElementById('question-text'),
    questionSub: document.getElementById('question-sub'),
    choiceList: document.getElementById('choice-list'),
    analyzingOverlay: document.getElementById('analyzing-overlay')
  };

  const state = {
    sessionId: null,
    questions: [],
    currentIdx: 0,
    isSubmitting: false,
    autoTimer: null
  };

  const AUTO_DELAY = 80;

  const show = (n) => n && n.classList.remove('is-hidden');
  const hide = (n) => n && n.classList.add('is-hidden');

  async function fetchJson(url, opt = {}) {
    const res = await fetch(url, opt);
    const data = await res.json();
    return data;
  }

  function renderQuestion() {
    const q = state.questions[state.currentIdx];
    if (!q) {
      hide(el.questionBox);
      show(el.finishBox);
      return;
    }

    show(el.questionBox);

    el.progressText.textContent = `${state.currentIdx + 1} / ${state.questions.length}`;
    el.progressFill.style.width = `${(state.currentIdx + 1) / state.questions.length * 100}%`;

    el.questionEmoji.textContent = q.emoji || '💰';
    el.questionText.textContent = q.text;
    el.questionSub.textContent = q.sub || '';

    el.choiceList.innerHTML = '';

    q.choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `
        <span class="num">${String.fromCharCode(65 + i)}</span>
        <span class="label">${c.text}</span>
      `;

      btn.onclick = () => {
        if (state.isSubmitting) return;

        document.querySelectorAll('.choice-btn').forEach(n => n.classList.remove('is-selected'));
        btn.classList.add('is-selected');

        clearTimeout(state.autoTimer);

        state.autoTimer = setTimeout(async () => {
          state.isSubmitting = true;

          await fetchJson('/api/answer', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              session_id: state.sessionId,
              question_id: q.id,
              choice_id: c.id
            })
          });

          state.currentIdx++;
          state.isSubmitting = false;
          renderQuestion();
        }, AUTO_DELAY);
      };

      el.choiceList.appendChild(btn);
    });
  }

  async function start() {
    clearTimeout(state.autoTimer);
    state.autoTimer = null;
    show(el.loadingBox);

    const data = await fetchJson('/api/start', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ test_type: testType })
    });

    state.sessionId = data.session_id;
    state.questions = data.questions;

    hide(el.loadingBox);
    renderQuestion();
  }

  el.finishBtn.onclick = async () => {
    show(el.analyzingOverlay);

    const res = await fetchJson('/api/finish', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ session_id: state.sessionId })
    });

    location.href = `/result/${res.session_id}`;
  };

  function getShareData() {
  const testType = window.JAEMULUN_TEST_TYPE;
  const testLabel = window.JAEMULUN_TEST_LABEL;

  return {
    text: `${testLabel} 해봤어?\n너도 한번 해봐 👇`,
    url: `${location.origin}/intro/${testType}`
  };
}

function copyLink() {
  const { url } = getShareData();
  navigator.clipboard.writeText(url);
  alert('링크가 복사되었습니다');
}

function shareTwitter() {
  const { text, url } = getShareData();
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
}

function shareInstagram() {
  alert('인스타는 링크 복사 방식으로 공유해주세요');
}

function shareKakao() {
  const { text, url } = getShareData();

  // 카카오 SDK 연결 시 교체
  alert(text + '\n' + url);
}

  start();


})();