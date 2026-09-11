(() => {
  'use strict';

  function shareData() {
    const testLabel = window.JAEMULUN_TEST_LABEL || '머니플로우';
    return {
      text: `${testLabel} 해봤어?\n오늘 돈 흐름 한번 가볍게 봐봐 👇`,
      url: `${location.origin}/`
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
    questionText: document.getElementById('question-text'), questionSub: document.getElementById('question-sub'), choiceList: document.getElementById('choice-list'), analyzingOverlay: document.getElementById('analyzing-overlay')
  };

  const state = { sessionId: null, questions: [], currentIdx: 0, isSubmitting: false, autoTimer: null };
  const AUTO_DELAY = 80;
  const show = (n) => n && n.classList.remove('is-hidden');
  const hide = (n) => n && n.classList.add('is-hidden');
  async function fetchJson(url, opt = {}) { const res = await fetch(url, opt); return res.json(); }

  function renderQuestion() {
    const q = state.questions[state.currentIdx];
    if (!q) { hide(el.questionBox); show(el.finishBox); return; }
    show(el.questionBox);
    el.progressText.textContent = `${state.currentIdx + 1} / ${state.questions.length}`;
    el.progressFill.style.width = `${(state.currentIdx + 1) / state.questions.length * 100}%`;
    el.questionTag.textContent = `${state.currentIdx + 1}번째 질문`;
    el.questionText.textContent = q.text;
    el.questionSub.textContent = q.sub || '';
    el.choiceList.innerHTML = '';
    q.choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<span class="num">${String.fromCharCode(65 + i)}</span><span class="label">${c.text}</span>`;
      btn.onclick = () => {
        if (state.isSubmitting) return;
        document.querySelectorAll('.choice-btn').forEach(n => n.classList.remove('is-selected'));
        btn.classList.add('is-selected'); clearTimeout(state.autoTimer);
        state.autoTimer = setTimeout(async () => {
          state.isSubmitting = true;
          await fetchJson('/api/answer', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({session_id: state.sessionId, question_id: q.id, choice_id: c.id}) });
          state.currentIdx++; state.isSubmitting = false; renderQuestion();
        }, AUTO_DELAY);
      };
      el.choiceList.appendChild(btn);
    });
  }

  async function start() {
    clearTimeout(state.autoTimer); show(el.loadingBox);
    try {
      const data = await fetchJson('/api/start', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({test_type: testType}) });
      state.sessionId = data.session_id; state.questions = data.questions || []; hide(el.loadingBox); renderQuestion();
    } catch (err) {
      hide(el.loadingBox); if (el.errorMessage) el.errorMessage.textContent = '잠시 후 다시 시도해 주세요.'; show(el.errorBox);
    }
  }

  el.finishBtn.onclick = async () => {
    show(el.analyzingOverlay);
    const res = await fetchJson('/api/finish', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({session_id: state.sessionId}) });
    location.href = `/result/${res.session_id}`;
  };
  start();
})();
