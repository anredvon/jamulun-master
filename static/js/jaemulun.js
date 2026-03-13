/**
 * jaemulun.js  —  프론트엔드 ↔ Flask API 연결 레이어
 */

const API = {
  async start(testType) {
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_type: testType })
    });
    return res.json();  // { session_id }
  },

  async answer(sessionId, questionId, choiceId) {
    const res = await fetch('/api/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, question_id: questionId, choice_id: choiceId })
    });
    return res.json();  // { ok, current_score }
  },

  async finish(sessionId) {
    const res = await fetch('/api/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    });
    return res.json();  // { session_id, final_score, result_title }
  },

  async unlock(sessionId) {
    const res = await fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    });
    return res.json();  // { ok, redirect }
  },

  async share(sessionId, platform = 'kakao') {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, platform })
    });
    return res.json();
  }
};

// ── 광고 시청 완료 시뮬레이션 ──
async function watchAdAndUnlock(sessionId) {
  // 실제 서비스: AdMob / Kakao Ad 콜백 후 호출
  const btn = document.getElementById('ad-btn');
  if (btn) { btn.textContent = '광고 로딩 중...'; btn.disabled = true; }

  await new Promise(r => setTimeout(r, 1500));  // 광고 재생 대기 시뮬레이션

  const data = await API.unlock(sessionId);
  if (data.ok) {
    window.location.href = data.redirect;
  }
}
