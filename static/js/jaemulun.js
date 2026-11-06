(() => {
  'use strict';

  function shareData() {
    const testLabel = window.JAEMULUN_TEST_LABEL || '머니플로우';
    return {
      text: `${testLabel} 해봤어?\n오늘 돈 흐름 한번 가볍게 봐봐 👇`,
      url: window.JAEMULUN_SHARE_URL
        ? new URL(window.JAEMULUN_SHARE_URL, location.origin).href
        : `${location.origin}/`
    };
  }

  window.shareTwitter = function shareTwitter() {
    const { text, url } = shareData();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
  };

  window.shareThreads = function shareThreads() {
    const { text, url } = shareData();
    window.open(`https://www.threads.net/intent/post?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener,noreferrer');
  };

  window.shareKakao = function shareKakao() {
    const { text, url } = shareData();
    if (navigator.share) {
      navigator.share({ title: '머니플로우', text, url }).catch(() => {});
      return;
    }
    const payload = `${text}\n${url}`;
    if (navigator.clipboard) navigator.clipboard.writeText(payload).then(() => alert('공유할 내용이 복사되었어요.')).catch(() => alert(payload));
    else alert(payload);
  };

  const testType = window.JAEMULUN_TEST_TYPE;
  if (!testType || !document.getElementById('question-box')) return;

  const el = {
    loadingBox: document.getElementById('loading-box'), errorBox: document.getElementById('error-box'), errorMessage: document.getElementById('error-message'),
    questionBox: document.getElementById('question-box'), finishBox: document.getElementById('finish-box'), finishBtn: document.getElementById('finish-btn'),
    progressText: document.getElementById('progress-text'), progressFill: document.getElementById('progress-fill'), questionTag: document.getElementById('question-tag'),
    questionText: document.getElementById('question-text'), questionSub: document.getElementById('question-sub'), choiceList: document.getElementById('choice-list'), analyzingOverlay: document.getElementById('analyzing-overlay'),
    nextBtn: document.getElementById('next-btn'), hint: document.getElementById('quiz-hint')
  };

  const state = { sessionId: null, historyKey: null, historyStep: 0, questions: [], currentIdx: 0, isSubmitting: false, isTransitioning: false, transitionTimers: [], answers: new Map(), selectedChoiceId: null, pendingSubmission: null, restoreExpected: null, pendingAdvance: false };
  const show = (n) => n && n.classList.remove('is-hidden');
  const hide = (n) => n && n.classList.add('is-hidden');
  async function fetchJson(url, opt = {}) {
    const res = await fetch(url, opt);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || '요청을 처리하지 못했어요.');
    return data;
  }

  function moveQuestion(direction) {
    state.transitionTimers.forEach(window.clearTimeout);
    state.transitionTimers = [];
    state.isTransitioning = false;
    const card = el.questionBox?.querySelector('.question-card');
    if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return renderQuestion();
    state.isTransitioning = true;
    card.classList.remove('quiz-step-in', 'quiz-step-out');
    card.classList.add('quiz-step-out');
    state.transitionTimers.push(window.setTimeout(() => {
      card.classList.remove('quiz-step-out');
      renderQuestion();
      card.classList.add(direction === 'back' ? 'quiz-step-in-back' : 'quiz-step-in');
      state.transitionTimers.push(window.setTimeout(() => { card.classList.remove('quiz-step-in', 'quiz-step-in-back'); state.isTransitioning = false; }, 230));
    }, 120));
  }

  function advanceAfterAnswer() {
    state.pendingAdvance = false;
    const nextStep = state.currentIdx + 1;
    window.history.pushState({ moneyflowQuiz: true, quizStep: nextStep, quizSessionKey: state.historyKey }, '', window.location.href);
    state.historyStep = nextStep;
    state.currentIdx = nextStep;
    moveQuestion('forward');
  }

  function renderQuestion() {
    const q = state.questions[state.currentIdx];
    if (!q) { hide(el.questionBox); show(el.finishBox); return; }
    show(el.questionBox);
    hide(el.finishBox);
    el.progressText.textContent = `${state.currentIdx + 1} / ${state.questions.length}`;
    el.progressFill.style.width = `${(state.currentIdx + 1) / state.questions.length * 100}%`;
    el.questionTag.textContent = `${state.currentIdx + 1}번째 질문`;
    el.questionText.textContent = q.text;
    el.questionSub.textContent = q.sub || '';
    el.choiceList.innerHTML = '';
    const savedAnswer = state.answers.get(q.id);
    const pendingSubmission = state.pendingSubmission?.questionId === q.id ? state.pendingSubmission : null;
    const readOnlyChoiceId = savedAnswer?.choiceId || pendingSubmission?.choiceId || null;
    state.selectedChoiceId = readOnlyChoiceId;
    if (el.hint) el.hint.textContent = savedAnswer ? '이전에 고른 답을 확인하고 다음 질문으로 이동할 수 있어요. 답은 수정되지 않아요.' : pendingSubmission ? '응답 저장 여부를 확인할 수 없어요. 같은 선택으로 다시 확인해 주세요.' : '답을 고른 뒤 다음 질문을 눌러주세요.';
    if (el.nextBtn) {
      el.nextBtn.disabled = !(savedAnswer || pendingSubmission);
      el.nextBtn.textContent = pendingSubmission && !savedAnswer ? '저장 다시 확인 →' : '다음 질문 →';
    }
    q.choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<span class="num">${String.fromCharCode(65 + i)}</span><span class="label">${c.text}</span>`;
      if (savedAnswer || pendingSubmission) {
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
        if (readOnlyChoiceId === c.id) {
          btn.classList.add('is-selected');
          btn.setAttribute('aria-pressed', 'true');
        } else btn.setAttribute('aria-pressed', 'false');
      } else {
        btn.setAttribute('aria-pressed', 'false');
        btn.onclick = () => {
          if (state.isSubmitting || state.isTransitioning || state.pendingSubmission?.questionId === q.id) return;
          state.selectedChoiceId = c.id;
          el.choiceList.querySelectorAll('.choice-btn').forEach((choice) => {
            choice.classList.toggle('is-selected', choice === btn);
            choice.setAttribute('aria-pressed', String(choice === btn));
          });
          if (el.nextBtn) el.nextBtn.disabled = false;
        };
      }
      el.choiceList.appendChild(btn);
    });
  }

  async function start() {
    show(el.loadingBox);
    try {
      const data = await fetchJson('/api/start', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({test_type: testType}) });
      state.sessionId = data.session_id; state.questions = data.questions || []; hide(el.loadingBox);
      state.historyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (state.questions.length) window.history.replaceState({ moneyflowQuiz: true, quizStep: 0, quizSessionKey: state.historyKey }, '', window.location.href);
      renderQuestion();
    } catch (err) {
      hide(el.loadingBox); if (el.errorMessage) el.errorMessage.textContent = '잠시 후 다시 시도해 주세요.'; show(el.errorBox);
    }
  }

  el.nextBtn?.addEventListener('click', async () => {
    if (state.isSubmitting || state.isTransitioning) return;
    const q = state.questions[state.currentIdx];
    if (!q) return;
    const existing = state.answers.get(q.id);
    if (existing) {
      window.history.forward();
      return;
    }
    const pending = state.pendingSubmission?.questionId === q.id ? state.pendingSubmission : null;
    const choice = q.choices.find((item) => item.id === (pending?.choiceId || state.selectedChoiceId));
    if (!choice) return;
    state.isSubmitting = true;
    state.pendingSubmission = { questionId: q.id, choiceId: choice.id };
    el.nextBtn.disabled = true;
    if (el.hint) el.hint.textContent = '선택을 저장하고 있어요…';
    try {
      await fetchJson('/api/answer', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({session_id: state.sessionId, question_id: q.id, choice_id: choice.id}) });
      state.answers.set(q.id, { choiceId: choice.id });
      state.pendingSubmission = null;
      state.isSubmitting = false;
      if (state.restoreExpected) state.pendingAdvance = true;
      else advanceAfterAnswer();
    } catch (err) {
      state.isSubmitting = false;
      if (err.message === '이미 답변한 질문입니다.' && state.pendingSubmission?.questionId === q.id) {
        state.answers.set(q.id, { choiceId: state.pendingSubmission.choiceId });
        state.pendingSubmission = null;
        if (state.restoreExpected) state.pendingAdvance = true;
        else advanceAfterAnswer();
        return;
      }
      if (state.pendingSubmission?.questionId === q.id) {
        el.choiceList.querySelectorAll('.choice-btn').forEach((button) => { button.disabled = true; button.setAttribute('aria-disabled', 'true'); });
      }
      el.nextBtn.disabled = false;
      if (el.hint) el.hint.textContent = err.message || '저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
    }
  });

  window.addEventListener('popstate', (event) => {
    if (state.restoreExpected) {
      if (event.state?.moneyflowQuiz && event.state.quizSessionKey === state.restoreExpected.key && Number(event.state.quizStep) === state.restoreExpected.step) {
        state.restoreExpected = null;
        if (state.pendingAdvance) advanceAfterAnswer();
        return;
      }
      if (event.state?.moneyflowQuiz && event.state.quizSessionKey === state.restoreExpected.key && Number(event.state.quizStep) < state.restoreExpected.step) {
        window.history.go(state.restoreExpected.step - Number(event.state.quizStep));
        return;
      }
      state.restoreExpected = null;
      state.pendingAdvance = false;
    }
    if (state.isSubmitting) {
      if (event.state?.moneyflowQuiz && event.state.quizSessionKey === state.historyKey && Number(event.state.quizStep) < state.historyStep) {
        state.restoreExpected = { key: state.historyKey, step: state.historyStep };
        window.history.go(state.historyStep - Number(event.state.quizStep));
      }
      return;
    }
    if (state.isTransitioning) {
      // The active transition will be cancelled and restarted for the latest history entry below.
    }
    if (event.state?.moneyflowQuiz && event.state.quizSessionKey !== state.historyKey) {
      const backLink = document.querySelector('.app-header-back');
      if (backLink) window.location.replace(backLink.href);
      return;
    }
    const nextIndex = event.state?.moneyflowQuiz ? Number(event.state.quizStep) : 0;
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex > state.questions.length || nextIndex === state.currentIdx) return;
    const direction = nextIndex < state.currentIdx ? 'back' : 'forward';
    state.historyStep = nextIndex;
    state.currentIdx = nextIndex;
    moveQuestion(direction);
  });
  document.querySelector('.app-header-back')?.addEventListener('click', (event) => {
    if (state.isSubmitting || state.isTransitioning) {
      event.preventDefault();
      if (el.hint) el.hint.textContent = '화면을 이동하기 전에 선택을 저장하고 있어요.';
      return;
    }
    if (state.currentIdx > 0 && window.history.state?.moneyflowQuiz) {
      event.preventDefault();
      window.history.back();
    }
  });

  el.finishBtn.onclick = async () => {
    show(el.analyzingOverlay);
    const res = await fetchJson('/api/finish', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({session_id: state.sessionId}) });
    location.href = `/result/${res.session_id}`;
  };
  start();
})();
