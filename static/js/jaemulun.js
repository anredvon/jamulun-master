// ============================================================
//  jaemulun.js — 테스트 진행 JS
//
//  담당하는 일:
//    1. 페이지 로드 시 /api/start 호출 → 세션 생성 + 질문 수신
//    2. 질문 카드 렌더링 (emoji, 텍스트, 선택지 버튼)
//    3. 선택지 클릭 → /api/answer 호출 → 다음 질문으로 이동
//    4. 모든 질문 완료 → 완료 박스 표시
//    5. 결과 보기 버튼 → /api/finish 호출 → /result/:id 이동
//
//  이 파일은 test.html 에서만 로드됨.
//  window.JAEMULUN_TEST_TYPE 은 test.html 인라인 <script>에서 주입됨.
// ============================================================

(() => {
  'use strict';

  // ──────────────────────────────────────────
  //  1. 초기화 — 필요한 DOM 요소 확보
  // ──────────────────────────────────────────
  const testType = window.JAEMULUN_TEST_TYPE;

  // test.html 이 아닌 곳에서 로드되면 아무것도 하지 않음
  if (!testType) return;

  /** DOM 요소 맵 — 반복 querySelector 방지 */
  const el = {
    loadingBox:    document.getElementById('loading-box'),
    errorBox:      document.getElementById('error-box'),
    errorMessage:  document.getElementById('error-message'),
    questionCard:  document.getElementById('question-card'),
    finishBox:     document.getElementById('finish-box'),
    finishBtn:     document.getElementById('finish-btn'),
    testTitle:     document.getElementById('test-title'),
    testSubtitle:  document.getElementById('test-subtitle'),
    badge:         document.getElementById('question-badge'),
    category:      document.getElementById('question-category'),
    questionText:  document.getElementById('question-text'),
    questionSub:   document.getElementById('question-sub'),
    choiceList:    document.getElementById('choice-list'),
    progressText:  document.getElementById('progress-text'),
    progressFill:  document.getElementById('progress-fill'),
  };

  /**
   * 앱 상태 (단일 state 객체로 관리)
   * sessionId: 서버에서 발급된 세션 ID
   * questions:  이 세션에 배정된 질문 배열
   * currentIdx: 현재 보여주고 있는 질문 인덱스
   */
  const state = {
    sessionId:   null,
    questions:   [],
    currentIdx:  0,
  };


  // ──────────────────────────────────────────
  //  2. 유틸리티 함수
  // ──────────────────────────────────────────

  /** DOM 요소 숨기기 */
  function hide(elem) {
    if (elem) elem.classList.add('is-hidden');
  }

  /** DOM 요소 보이기 */
  function show(elem) {
    if (elem) elem.classList.remove('is-hidden');
  }

  /**
   * 오류 상태 표시.
   * 로딩 박스 숨기고 오류 메시지 보여줌.
   */
  function showError(message) {
    hide(el.loadingBox);
    hide(el.questionCard);
    if (el.errorMessage) el.errorMessage.textContent = message;
    show(el.errorBox);
  }

  /**
   * 진행 바 업데이트.
   * current: 현재 완료 수, total: 전체 문항 수
   */
  function updateProgress(current, total) {
    if (el.progressText) {
      el.progressText.textContent = `${current} / ${total}`;
    }
    if (el.progressFill) {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      el.progressFill.style.width = `${pct}%`;
    }
  }

  /** 선택지 버튼 전체 비활성화/활성화 (API 호출 중 중복 클릭 방지) */
  function setChoicesDisabled(disabled) {
    document.querySelectorAll('.choice-btn').forEach((btn) => {
      btn.disabled = disabled;
    });
  }


  // ──────────────────────────────────────────
  //  3. 질문 카드 렌더링
  // ──────────────────────────────────────────

  /**
   * 현재 인덱스의 질문을 화면에 렌더링.
   * 마지막 질문 이후(currentIdx >= questions.length)이면 완료 박스 표시.
   */
  function renderQuestion() {
    const total = state.questions.length;
    const q     = state.questions[state.currentIdx];

    if (!q) {
      // 모든 질문 완료 → 완료 화면 표시
      hide(el.questionCard);
      show(el.finishBox);
      updateProgress(total, total);
      return;
    }

    // 진행 중인 질문 카드 표시
    show(el.questionCard);
    hide(el.finishBox);

    // 제목 영역 업데이트
    if (el.testTitle)    el.testTitle.textContent    = '질문에 답하고 결과를 확인해보세요';
    if (el.testSubtitle) el.testSubtitle.textContent = '세션마다 랜덤으로 뽑힌 질문 세트입니다.';

    // 질문 뱃지/카테고리
    if (el.badge)    el.badge.textContent    = `${state.currentIdx + 1}번 질문`;
    if (el.category) el.category.textContent = q.category || 'general';

    // 질문 본문
    if (el.questionText) el.questionText.textContent = `${q.emoji || '💸'} ${q.text}`;
    if (el.questionSub)  el.questionSub.textContent  = q.sub  || '가장 가까운 항목을 선택해 주세요.';

    // 진행 바 (답변 완료 수 기준)
    updateProgress(state.currentIdx, total);

    // 선택지 버튼 동적 생성
    if (el.choiceList) {
      el.choiceList.innerHTML = '';  // 기존 선택지 초기화

      (q.choices || []).forEach((choice) => {
        const btn = document.createElement('button');
        btn.className          = 'choice-btn';
        btn.textContent        = choice.text;
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-label', choice.text);

        // 클릭 시 답변 제출
        btn.addEventListener('click', () => {
          submitAnswer(q.id, choice.id, total);
        });

        el.choiceList.appendChild(btn);
      });
    }
  }


  // ──────────────────────────────────────────
  //  4. API 통신 함수
  // ──────────────────────────────────────────

  /**
   * 테스트 시작 — /api/start POST
   * 세션 생성 + 질문 목록 수신 후 첫 질문 렌더링
   */
  async function startTest() {
    try {
      const res = await fetch('/api/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ test_type: testType }),
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

      if (!data.questions || data.questions.length === 0) {
        showError('등록된 질문이 없습니다. 관리자에게 문의해주세요. (seed_db.py 실행 필요)');
        return;
      }

      // 상태 업데이트
      state.sessionId = data.session_id;
      state.questions = data.questions;
      state.currentIdx = 0;

      // 로딩 박스 숨기고 첫 질문 표시
      hide(el.loadingBox);
      renderQuestion();

    } catch (err) {
      console.error('[jaemulun] startTest 오류:', err);
      showError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
    }
  }

  /**
   * 답변 제출 — /api/answer POST
   * 성공 시 다음 질문으로 이동
   *
   * @param {number} questionId  현재 질문 ID
   * @param {number} choiceId    선택한 선택지 ID
   * @param {number} total       전체 질문 수 (진행 바용)
   */
  async function submitAnswer(questionId, choiceId, total) {
    // 중복 클릭 방지
    setChoicesDisabled(true);

    try {
      const res = await fetch('/api/answer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          session_id:  state.sessionId,
          question_id: questionId,
          choice_id:   choiceId,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(data.message || '답변 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
        setChoicesDisabled(false);
        return;
      }

      // 다음 질문으로 이동
      state.currentIdx += 1;
      renderQuestion();

    } catch (err) {
      console.error('[jaemulun] submitAnswer 오류:', err);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      setChoicesDisabled(false);
    }
  }

  /**
   * 테스트 완료 처리 — /api/finish POST
   * 결과 계산 후 /result/:id 페이지로 이동
   */
  async function finishTest() {
    if (!state.sessionId) {
      alert('세션 정보가 없습니다. 테스트를 다시 시작해주세요.');
      return;
    }

    // 버튼 비활성화 (중복 호출 방지)
    if (el.finishBtn) {
      el.finishBtn.disabled    = true;
      el.finishBtn.textContent = '결과 계산 중…';
    }

    try {
      const res = await fetch('/api/finish', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ session_id: state.sessionId }),
      });

      const data = await res.json();

      if (data.ok) {
        // 결과 페이지로 이동
        location.href = `/result/${state.sessionId}`;
      } else {
        alert('결과 계산 중 오류가 발생했습니다.');
        if (el.finishBtn) {
          el.finishBtn.disabled    = false;
          el.finishBtn.textContent = '결과 보기 →';
        }
      }
    } catch (err) {
      console.error('[jaemulun] finishTest 오류:', err);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      if (el.finishBtn) {
        el.finishBtn.disabled    = false;
        el.finishBtn.textContent = '결과 보기 →';
      }
    }
  }


  // ──────────────────────────────────────────
  //  5. 이벤트 바인딩 + 실행
  // ──────────────────────────────────────────

  // "결과 보기" 버튼 클릭 시 finishTest 호출
  el.finishBtn?.addEventListener('click', finishTest);

  // 페이지 로드 시 자동으로 테스트 시작
  startTest();

})();
