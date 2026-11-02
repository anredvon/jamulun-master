/* Money Flow Lotto: authoritative server draws + decorative Canvas animation. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  if (!$('lotto-machine')) return;

  const $list = $('lotto-results-list');
  const $draw = $('lotto-draw-button');
  const $message = $('lotto-message');
  const $stage = $('lotto-stage-intro');
  const $progress = $('lotto-stage-progress');
  const $stageNumbers = $('lotto-stage-numbers');
  const $progressFill = $('lotto-progress-fill');
  const $stars = $('lotto-stage-stars');
  const state = { draws: [], round: null, date: null, remaining: 3, busy: false, speed: 0.2 };
  const BALL_CLASSES = ['yellow', 'blue', 'red', 'gray', 'green'];
  const PLAIN_TEXT = '로또번호는 무작위 생성된 오락용 번호이며 당첨을 보장하지 않습니다.';
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const colorName = (n) => BALL_CLASSES[Math.min(4, Math.floor((n - 1) / 10))];
  const formatDrawDate = (s) => s ? new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric'
  }).format(new Date(s + 'T12:00:00+09:00')) : '';

  function notice(text, error = false) {
    $message.textContent = text;
    $message.classList.toggle('is-error', error);
  }

  function showShareLinkFallback(url) {
    notice('링크를 자동으로 복사할 수 없어요. 아래 링크를 길게 눌러 공유하세요.');
    const link = document.createElement('a');
    link.className = 'lotto-share-fallback-link';
    link.href = url;
    link.textContent = url;
    link.setAttribute('aria-label', '로또 번호 공유 링크');
    $message.append(link);
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
    let data;
    try { data = await response.json(); } catch (_) { throw new Error('서버 응답을 읽을 수 없습니다.'); }
    if (!response.ok || !data.ok) {
      const codes = {
        LIMIT_REACHED: '이번 회차는 최대 3번까지 추첨할 수 있어요.',
        BUSY_RETRY: '추첨 요청이 몰리고 있어요. 잠시 후 다시 시도해 주세요.',
        CONFLICT_RETRY: '요청이 겹쳤어요. 잠시 후 다시 시도해 주세요.'
      };
      const err = new Error(codes[data.code] || '연결에 문제가 생겼어요. 다시 시도해 주세요.');
      err.code = data.code;
      throw err;
    }
    return data;
  }

  function ballNode(n) {
    const ball = document.createElement('span');
    ball.className = 'lotto-ball lotto-ball-' + colorName(n);
    ball.textContent = String(n);
    ball.setAttribute('aria-label', n + '번');
    ball.setAttribute('role', 'listitem');
    return ball;
  }

  function saveHistory(draw) {
    const store = window.MoneyFlowHistory;
    if (!store || !store.add) return;
    store.add({
      id: 'lotto-' + draw.result_id,
      type: 'lotto', label: '이번 주 로또번호',
      title: '제' + draw.round + '회 ' + draw.sequence + '번째 추첨',
      summary: draw.numbers.join(' · '),
      createdAt: draw.created_at || new Date().toISOString()
    });
  }

  function renderCard(draw) {
    const article = document.createElement('article');
    article.className = 'lotto-result-card';
    const heading = document.createElement('div');
    heading.className = 'lotto-card-top';
    const left = document.createElement('strong');
    left.textContent = '✦ 이번 주의 행운번호';
    const right = document.createElement('span');
    right.textContent = 'LOTTO 6/45';
    heading.append(left, right);

    const round = document.createElement('div');
    round.className = 'lotto-card-round';
    round.textContent = '제' + draw.round + '회 · ' + draw.sequence + '번째 추첨';
    const numbers = document.createElement('div');
    numbers.className = 'lotto-number-row';
    numbers.setAttribute('aria-label', '로또번호 ' + draw.numbers.join(', '));
    numbers.setAttribute('role', 'list');
    draw.numbers.forEach((n) => numbers.append(ballNode(n)));
    const footer = document.createElement('div');
    footer.className = 'lotto-card-footer';
    footer.textContent = '이번 주에도 작은 행운이 함께하길 ✨';

    const actions = document.createElement('div');
    actions.className = 'lotto-card-actions';
    const shareImage = document.createElement('button');
    shareImage.type = 'button';
    shareImage.textContent = '이미지 저장';
    shareImage.addEventListener('click', () => exportImage(draw, shareImage));
    const shareLink = document.createElement('button');
    shareLink.type = 'button';
    shareLink.textContent = '링크 공유';
    shareLink.addEventListener('click', () => shareResultLink(draw, shareLink));
    actions.append(shareImage, shareLink);
    article.append(heading, round, numbers, footer, actions);
    return article;
  }

  function render() {
    $('lotto-round').textContent = '제' + (state.round || '—') + '회';
    $('lotto-remaining').textContent = '남은 추첨 ' + state.remaining + '/3';
    $('lotto-draw-date').textContent = state.date ? formatDrawDate(state.date) + ' 추첨' : '';
    $list.replaceChildren();
    state.draws.slice().sort((a, b) => a.sequence - b.sequence).forEach((r) => {
      $list.append(renderCard(r));
      saveHistory(r);
    });
    $draw.disabled = state.busy || state.remaining <= 0;
    $draw.textContent = state.busy ? '추첨하고 있어요…'
      : state.remaining <= 0 ? '이번 회차 추첨 3회 완료'
      : state.draws.length
        ? '✦ 다시 추첨하기 (' + state.remaining + '회 남음)'
        : '✦ 이번 주 번호 뽑기 (' + state.remaining + '회 남음)';
    if (!state.busy) notice(state.remaining <= 0
      ? '이번 회차의 세 번호 조합을 모두 받았어요. 다음 회차에 다시 만나요!'
      : state.draws.length ? '번호가 자동 저장됐어요. 다시 추첨하거나 친구와 공유해보세요.'
      : '추첨 버튼을 눌러 이번 주 번호를 받아보세요. 번호는 무작위로 생성돼요.');
  }

  async function refresh() {
    const data = await fetchJson('/api/lotto/status');
    state.draws = data.draws;
    state.round = data.round;
    state.date = data.draw_date;
    state.remaining = data.remaining;
    render();
    return data;
  }

  function popStars() {
    if (reducedMotion) return;
    $stars.replaceChildren();
    for (let i = 0; i < 18; i += 1) {
      const spark = document.createElement('span');
      spark.className = 'lotto-sparkle';
      spark.style.left = (25 + Math.random() * 50) + '%';
      spark.style.top = (30 + Math.random() * 45) + '%';
      spark.style.setProperty('--dx', (Math.random() * 180 - 90) + 'px');
      spark.style.setProperty('--dy', (Math.random() * 180 - 90) + 'px');
      $stars.append(spark);
    }
    setTimeout(() => $stars.replaceChildren(), 950);
  }

  async function animateResult(draw) {
    state.speed = 1;
    $stage.hidden = true;
    $progress.hidden = false;
    $stageNumbers.replaceChildren();
    $progressFill.style.width = '0%';

    if (!reducedMotion) {
      canvasAnimation.start();
      try {
        await sleep(1250);
        for (let i = 0; i < draw.numbers.length; i += 1) {
          $stageNumbers.append(ballNode(draw.numbers[i]));
          $progressFill.style.width = ((i + 1) / 6 * 92) + '%';
          await sleep(410);
        }
        popStars();
        await sleep(900);
      } finally {
        canvasAnimation.stop();
      }
    } else {
      draw.numbers.forEach((n) => $stageNumbers.append(ballNode(n)));
      await sleep(160);
    }

    $progressFill.style.width = '100%';
    state.speed = 0.2;
    $progress.hidden = true;
    $stage.hidden = false;
    const card = [...$list.querySelectorAll('.lotto-result-card')].at(-1);
    if (card) card.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
  }

  // Draw result is committed on the server *before* visual animation.
  async function performDraw() {
    if (state.busy || state.remaining <= 0) return;
    state.busy = true;
    render();
    notice(state.draws.length ? '새로운 번호를 추첨하고 있어요.' : '이번 주 첫 번째 로또번호를 추첨해요!');
    // Reuse this UUID if a fetch is retried in the same running request.
    const key = crypto.randomUUID ? crypto.randomUUID() : fallbackUuid();
    try {
      const draw = await fetchJson('/api/lotto/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotency_key: key })
      });
      // If the animation closes unexpectedly, /status will still recover the draw.
      state.draws = [...state.draws.filter((r) => r.result_id !== draw.result_id), draw];
      state.remaining = draw.remaining;
      state.round = draw.round;
      state.date = draw.draw_date;
      render();
      await animateResult(draw);
    } catch (error) {
      notice(error.message, true);
      // The request may have reached the server. Query status before allowing another attempt.
      try { await refresh(); } catch (_) { /* show the original error */ }
    } finally {
      state.busy = false;
      render();
    }
  }

  function fallbackUuid() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }

  function buildImage(draw) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
    bg.addColorStop(0, '#634489'); bg.addColorStop(0.48, '#392354'); bg.addColorStop(1, '#201434');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
    const glow = ctx.createRadialGradient(540, 535, 25, 540, 535, 560);
    glow.addColorStop(0, '#b58c8038'); glow.addColorStop(1, '#b58c8000');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1200);
    ctx.strokeStyle = '#f8e3a160'; ctx.lineWidth = 3; ctx.strokeRect(55, 55, 970, 1240);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F7DEA2'; ctx.font = '700 32px sans-serif'; ctx.fillText('✦ MONEY FLOW · LOTTO 6/45 ✦', 540, 185);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 69px sans-serif'; ctx.fillText('이번 주 나의 로또번호', 540, 356);
    ctx.fillStyle = '#DDD0F4'; ctx.font = '38px sans-serif'; ctx.fillText('제' + draw.round + '회 · ' + draw.sequence + '번째 추첨', 540, 445);
    const fills = ['#FAD267', '#8BC8EE', '#F49BA9', '#CBD3DF', '#A2D99C'];
    draw.numbers.forEach((n, i) => {
      const x = 117 + i * 169, y = 660;
      const g = ctx.createRadialGradient(x-20, y-25, 3, x, y, 68);
      g.addColorStop(0, '#FFFFFF');
      g.addColorStop(.4, fills[Math.min(4, Math.floor((n - 1) / 10))]);
      g.addColorStop(1, '#7B6396');
      ctx.beginPath();ctx.arc(x, y, 66, 0, 2*Math.PI);ctx.fillStyle = g;ctx.fill();
      ctx.fillStyle = '#292337'; ctx.font = '900 47px sans-serif'; ctx.fillText(String(n), x, y+16);
    });
    ctx.fillStyle = '#F9E3B1'; ctx.font = '32px sans-serif'; ctx.fillText('당신의 한 주에도 작은 행운이 함께하길 ✨', 540, 915);
    ctx.fillStyle = '#D2C6E4'; ctx.font = '26px sans-serif'; ctx.fillText('오락용 무작위 번호 · 당첨 예측 및 보장 아님', 540, 1190);
    return canvas;
  }

  function exportImage(draw, button) {
    button.disabled = true;
    const canvas = buildImage(draw);
    canvas.toBlob(async (blob) => {
      try {
        if (!blob) throw new Error('이미지를 만들 수 없습니다.');
        const name = 'moneyflow-lotto-' + draw.round + '-' + draw.sequence + '.png';
        const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
        let canShareFile = false;
        try {
          canShareFile = Boolean(file && navigator.share && navigator.canShare?.({ files: [file] }));
        } catch (_) {
          canShareFile = false;
        }
        if (canShareFile) {
          try {
            await navigator.share({ files: [file], title: '이번 주 로또번호', text: PLAIN_TEXT });
            return;
          } catch (error) {
            if (error.name === 'AbortError') return;
          }
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = name; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        notice('이미지를 저장했어요. 카카오톡이나 메시지로 공유할 수 있어요.');
      } catch (error) {
        if (error.name !== 'AbortError') notice('이미지 공유가 지원되지 않아요. 다시 시도해 주세요.', true);
      } finally {
        button.disabled = false;
      }
    }, 'image/png');
  }

  async function shareResultLink(draw, button) {
    button.disabled = true;
    try {
      const payload = await fetchJson('/api/lotto/share', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: draw.result_id })
      });
      const url = new URL(payload.url, location.origin).href;
      const text = '제' + draw.round + '회 나의 로또번호: ' + draw.numbers.join(', ') + '. ' + PLAIN_TEXT;
      if (navigator.share) {
        try { await navigator.share({ title: '머니플로우 로또번호', text, url }); return; }
        catch (e) { if (e.name === 'AbortError') return; }
      }
      try {
        if (typeof navigator.clipboard?.writeText === 'function') {
          await navigator.clipboard.writeText(text + '\n' + url);
          notice('번호와 공유 링크를 복사했어요.');
          return;
        }
      } catch (_) {
        // Keep a selectable link visible when clipboard access is denied.
      }
      showShareLinkFallback(url);
    } catch (_) {
      notice('공유 링크를 만들 수 없어요. 잠시 후 다시 시도해 주세요.', true);
    } finally {
      button.disabled = false;
    }
  }

  function createCanvasAnimation() {
    const canvas = $('lotto-canvas');
    if (!canvas || !canvas.getContext) return { start() {}, stop() {} };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { start() {}, stop() {} };
    const W = canvas.width, mid = W / 2;
    const balls = Array.from({ length: 45 }, (_, i) => {
      const angle = i * 2.39996;
      const radius = Math.sqrt((i+.5)/45) * 164;
      return { n: i+1, angle, radius, speed: (i%2 ? -1 : 1) * (0.45 + (i%6)*.09), depth: i/45 };
    });
    let last = 0;
    let frameId = null;
    let active = false;
    let stageVisible = true;
    const fills = ['#F9D064','#88C5EF','#F08A9F','#C8CFDC','#A5D997'];
    const canAnimate = () => active && !reducedMotion && !document.hidden && stageVisible;
    const cancelFrame = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    };
    const scheduleFrame = () => {
      if (canAnimate() && frameId === null) frameId = requestAnimationFrame(frame);
    };
    function sync() {
      if (canAnimate()) scheduleFrame();
      else cancelFrame();
    }
    function frame(t) {
      frameId = null;
      if (!canAnimate()) return;
      if (t - last < 30) { scheduleFrame(); return; }
      last = t;
      ctx.clearRect(0, 0, W, W);
      const speed = state.speed;
      const projected = balls.map((b) => {
        const a = b.angle + t * b.speed * (0.00025 + speed*0.0009);
        const z = Math.sin(a * 1.3 + b.depth*11);
        return { ...b, x:mid + Math.cos(a)*b.radius, y:mid + Math.sin(a)*b.radius*.76, z };
      }).sort((a, b) => a.z - b.z);
      projected.forEach((b) => {
        const r = 15 + (b.z + 1) * 3;
        const fill = fills[Math.min(4, Math.floor((b.n-1)/10))];
        const g = ctx.createRadialGradient(b.x-r*.35,b.y-r*.4,2,b.x,b.y,r);
        g.addColorStop(0,'#FFFFFF');g.addColorStop(.45,fill);g.addColorStop(1,'#66507D');
        ctx.beginPath();ctx.arc(b.x,b.y,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
        ctx.fillStyle='#342B42';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='bold ' + Math.round(r*.82) + 'px system-ui';
        ctx.fillText(String(b.n), b.x, b.y+1);
      });
      scheduleFrame();
    }
    document.addEventListener('visibilitychange', sync);
    if (typeof window.IntersectionObserver === 'function') {
      const observer = new window.IntersectionObserver((entries) => {
        stageVisible = entries.some((entry) => entry.isIntersecting);
        sync();
      });
      observer.observe($('lotto-machine'));
    }
    return {
      start() { active = true; sync(); },
      stop() { active = false; sync(); }
    };
  }

  const canvasAnimation = createCanvasAnimation();
  $draw.addEventListener('click', () => performDraw());
  refresh().catch((error) => {
    notice('현재 로또 서비스를 불러올 수 없어요. 새로고침 후 다시 시도해 주세요.', true);
    $draw.disabled = true;
    $draw.textContent = '연결 상태 확인 필요';
    console.error('lotto init:', error);
  });
})();
