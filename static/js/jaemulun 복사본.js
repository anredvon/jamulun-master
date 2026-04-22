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
    nextBtn: document.getElementById('next-btn'),
    analyzingOverlay: document.getElementById('analyzing-overlay')
  };

  const state = {
    sessionId: null,
    questions: [],
    currentIdx: 0,
    selectedChoiceId: null,
    isSubmitting: false
  };

  const show = (node) => node && node.classList.remove('is-hidden');
  const hide = (node) => node && node.classList.add('is-hidden');

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) return { ok: false, message: data?.message || '요청 처리에 실패했습니다.' };
    return data || { ok: false, message: '응답 형식이 올바르지 않습니다.' };
  }

  function showError(message) {
    hide(el.loadingBox);
    hide(el.questionBox);
    hide(el.finishBox);
    if (el.errorMessage) el.errorMessage.textContent = message;
    show(el.errorBox);
  }

  function updateProgress() {
    const current = Math.min(state.currentIdx + 1, state.questions.length || 1);
    const total = state.questions.length || 1;
    el.progressText.textContent = `${current} / ${total}`;
    el.progressFill.style.width = `${Math.round((current / total) * 100)}%`;
    el.questionTag.textContent = `QUESTION ${current}`;
  }

  function setNextEnabled(enabled, isLast = false) {
    el.nextBtn.disabled = !enabled;
    el.nextBtn.classList.toggle('is-disabled', !enabled);
    el.nextBtn.textContent = isLast ? '결과 확인' : '다음';
  }

  function renderQuestion() {
    const total = state.questions.length;
    const q = state.questions[state.currentIdx];
    if (!q) {
      hide(el.questionBox);
      show(el.finishBox);
      return;
    }

    state.selectedChoiceId = null;
    hide(el.loadingBox);
    hide(el.errorBox);
    hide(el.finishBox);
    show(el.questionBox);

    updateProgress();
    el.questionEmoji.textContent = q.emoji || '💰';
    el.questionText.textContent = q.text || '';
    el.questionSub.textContent = q.sub || '가장 가까운 항목을 선택해 주세요.';
    el.choiceList.innerHTML = '';

    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F'];
    q.choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.dataset.choiceId = String(choice.id);
      btn.dataset.order = alphabet[idx] || String(idx + 1);
      btn.textContent = choice.text;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.choice-btn').forEach((node) => node.classList.remove('selected'));
        btn.classList.add('selected');
        state.selectedChoiceId = choice.id;
        setNextEnabled(true, state.currentIdx === total - 1);
      });
      el.choiceList.appendChild(btn);
    });

    setNextEnabled(false, state.currentIdx === total - 1);
  }

  async function startTest() {
    try {
      const data = await fetchJson('/api/start', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ test_type: testType })
      });

      if (!data.ok || !data.questions?.length || !data.session_id) {
        showError(data.message || '질문을 불러오지 못했습니다.');
        return;
      }

      state.sessionId = data.session_id;
      state.questions = data.questions;
      state.currentIdx = 0;
      renderQuestion();
    } catch (err) {
      showError('네트워크 오류가 발생했습니다.');
    }
  }

  async function submitCurrentAnswer() {
    if (state.isSubmitting || !state.selectedChoiceId) return;
    const q = state.questions[state.currentIdx];
    if (!q) return;

    state.isSubmitting = true;
    setNextEnabled(false, state.currentIdx === state.questions.length - 1);

    try {
      const answerData = await fetchJson('/api/answer', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          session_id: state.sessionId,
          question_id: q.id,
          choice_id: state.selectedChoiceId
        })
      });

      if (!answerData.ok) {
        showError(answerData.message || '답변 저장에 실패했습니다.');
        return;
      }

      state.currentIdx += 1;
      if (state.currentIdx >= state.questions.length) {
        hide(el.questionBox);
        show(el.finishBox);
      } else {
        renderQuestion();
      }
    } catch (_) {
      showError('답변 저장 중 오류가 발생했습니다.');
    } finally {
      state.isSubmitting = false;
    }
  }

  async function finishTest() {
    show(el.analyzingOverlay);
    try {
      const data = await fetchJson('/api/finish', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ session_id: state.sessionId })
      });

      if (!data.ok || !data.session_id) {
        hide(el.analyzingOverlay);
        showError(data.message || '결과 계산에 실패했습니다.');
        return;
      }

      window.location.href = `/result/${data.session_id}`;
    } catch (_) {
      hide(el.analyzingOverlay);
      showError('결과 계산 중 오류가 발생했습니다.');
    }
  }

  el.nextBtn?.addEventListener('click', submitCurrentAnswer);
  el.finishBtn?.addEventListener('click', finishTest);
  startTest();
})();
