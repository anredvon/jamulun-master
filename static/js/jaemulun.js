// ============================================================
//  jaemulun.js — 테스트 진행 JS (토스 미니앱 스타일)
//
//  흐름:
//    1. 페이지 로드 → /api/start 호출 → 세션+질문 수신
//    2. 질문 카드 렌더링 (이모지 원 + 라디오 버튼 스타일 선택지)
//    3. 선택 → 선택지 하이라이트 → 0.3초 후 /api/answer → 다음 질문
//    4. 완료 → 완료 박스 표시
//    5. "결과 보기" → 분석 중 오버레이 → /api/finish → /result/:id
// ============================================================

(() => {
  'use strict';

  const testType = window.JAEMULUN_TEST_TYPE;
  if (!testType) return;

  // ── DOM 요소 ──────────────────────────────────────────
  const el = {
    loadingBox:       document.getElementById('loading-box'),
    errorBox:         document.getElementById('error-box'),
    errorMessage:     document.getElementById('error-message'),
    questionCard:     document.getElementById('question-card'),
    finishBox:        document.getElementById('finish-box'),
    finishBtn:        document.getElementById('finish-btn'),
    progressText:     document.getElementById('progress-text'),
    progressFill:     document.getElementById('progress-fill'),
    questionEmoji:    document.getElementById('question-emoji'),
    questionText:     document.getElementById('question-text'),
    questionSub:      document.getElementById('question-sub'),
    choiceList:       document.getElementById('choice-list'),
    analyzingOverlay: document.getElementById('analyzing-overlay'),
  };

  // ── 상태 ──────────────────────────────────────────────
  const state = {
    sessionId:   null,
    questions:   [],
    currentIdx:  0,
    isSubmitting: false,
  };

  // ── 유틸 ──────────────────────────────────────────────
  const show = (e) => e?.classList.remove('is-hidden');
  const hide = (e) => e?.classList.add('is-hidden');

  function showError(msg) {
    hide(el.loadingBox);
    hide(el.questionCard);
    if (el.errorMessage) el.errorMessage.textContent = msg;
    show(el.errorBox);
  }

  function updateProgress(current, total) {
    if (el.progressText) el.progressText.textContent = `${current} / ${total}`;
    if (el.progressFill) {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      el.progressFill.style.width = `${pct}%`;
    }
  }

  // ── 질문 렌더링 ───────────────────────────────────────
  function renderQuestion() {
    const total = state.questions.length;
    const q = state.questions[state.currentIdx];

    if (!q) {
      // 모든 질문 완료
      hide(el.questionCard);
      show(el.finishBox);
      updateProgress(total, total);
      return;
    }

    show(el.questionCard);
    hide(el.finishBox);

    // 이모지
    if (el.questionEmoji) el.questionEmoji.textContent = q.emoji || '💰';

    // 질문 텍스트 (emoji 제외하고 text만 — emoji는 원형으로 따로 표시)
    if (el.questionText) el.questionText.textContent = q.text || '';
    if (el.questionSub) el.questionSub.textContent = q.sub || '가장 가까운 항목을 선택해 주세요.';

    // 진행 바 (현재 보는 질문 번호 기준)
    updateProgress(state.currentIdx + 1, total);

    // 선택지 렌더링 (라디오 버튼 스타일)
    if (el.choiceList) {
      el.choiceList.innerHTML = '';
      (q.choices || []).forEach((choice) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice.text;
        btn.addEventListener('click', () => handleChoiceClick(btn, q.id, choice.id, total));
        el.choiceList.appendChild(btn);
      });
    }
  }

  // ── 선택지 클릭 처리 ──────────────────────────────────
  function handleChoiceClick(clickedBtn, questionId, choiceId, total) {
    if (state.isSubmitting) return;

    // 선택된 버튼 하이라이트
    document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
    clickedBtn.classList.add('selected');

    // 0.3초 후 답변 제출 (선택 애니메이션 보이도록)
    setTimeout(() => submitAnswer(questionId, choiceId, total), 300);
  }

  // ── API: 테스트 시작 ──────────────────────────────────
  async function startTest() {
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_type: testType }),
      });

      if (!res.ok) {
        showError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      const data = await res.json();

      if (!data.ok) {
        showError(data.message || '질문을 불러오지 못했습니다.');
        return;
      }

      if (!data.questions?.length) {
        showError('등록된 질문이 없습니다. 관리자에게 문의해주세요. (seed_db.py 실행 필요)');
        return;
      }

      state.sessionId = data.session_id;
      state.questions = data.questions;
      state.currentIdx = 0;

      hide(el.loadingBox);
      renderQuestion();

    } catch (err) {
      console.error('[jaemulun] startTest 오류:', err);
      showError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
    }
  }

  // ── API: 답변 제출 ────────────────────────────────────
  async function submitAnswer(questionId, choiceId, total) {
    if (state.isSubmitting) return;
    state.isSubmitting = true;

    // 전체 선택지 비활성화
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);

    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id:  state.sessionId,
          question_id: questionId,
          choice_id:   choiceId,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(data.message || '답변 저장 중 오류가 발생했습니다.');
        document.querySelectorAll('.choice-btn').forEach(b => b.disabled = false);
        state.isSubmitting = false;
        return;
      }

      // 다음 질문으로
      state.currentIdx += 1;
      state.isSubmitting = false;
      renderQuestion();

    } catch (err) {
      console.error('[jaemulun] submitAnswer 오류:', err);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      document.querySelectorAll('.choice-btn').forEach(b => b.disabled = false);
      state.isSubmitting = false;
    }
  }

  // ── API: 결과 계산 ────────────────────────────────────
  async function finishTest() {
    if (!state.sessionId) return;

    // 분석 중 오버레이 표시 (이미지 4번 스타일)
    show(el.analyzingOverlay);

    try {
      const res = await fetch('/api/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: state.sessionId }),
      });

      const data = await res.json();

      if (data.ok) {
        // 최소 2초 오버레이 노출 후 결과 페이지 이동
        setTimeout(() => {
          location.href = `/result/${state.sessionId}`;
        }, 2000);
      } else {
        hide(el.analyzingOverlay);
        alert('결과 계산 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      console.error('[jaemulun] finishTest 오류:', err);
      hide(el.analyzingOverlay);
      alert('네트워크 오류가 발생했습니다.');
    }
  }

  // ── 이벤트 바인딩 ─────────────────────────────────────
  el.finishBtn?.addEventListener('click', finishTest);

  // 시작
  startTest();

})();
