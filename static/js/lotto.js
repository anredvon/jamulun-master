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
  const $experience = $('lotto-experience');
  const $entry = $('lotto-entry');
  const $theater = $('lotto-theater');
  const $resultArea = $('lotto-result-area');
  const $resultDraw = $('lotto-result-draw-button');
  const $entryError = $('lotto-entry-error');
  $stageNumbers.setAttribute('role', 'list');
  const $progressFill = $('lotto-progress-fill');
  const $stars = $('lotto-stage-stars');
  const state = { draws: [], round: null, date: null, remaining: 3, busy: false, speed: 0.2, view: 'entry' };
  const BALL_CLASSES = ['yellow', 'blue', 'red', 'gray', 'green'];
  const PLAIN_TEXT = '로또번호는 무작위 생성된 오락용 번호이며 당첨을 보장하지 않습니다.';
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const colorName = (n) => BALL_CLASSES[Math.min(4, Math.floor((n - 1) / 10))];
  const actionIcon = (name) => {
    const paths = {
      share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
      download: '<path d="M12 3.5v11m0 0 4-4m-4 4-4-4M4.5 17v3h15v-3"/>',
      history: '<circle cx="12" cy="12" r="8.25"/><path d="M12 7.5v4.8l3.2 1.9"/>'
    };
    return '<svg class="lotto-icon" aria-hidden="true" viewBox="0 0 24 24">' + paths[name] + '</svg>';
  };
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
    if (article.dataset) article.dataset.sequence = String(draw.sequence);
    article.setAttribute('data-sequence', String(draw.sequence));
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
    shareLink.innerHTML = actionIcon('share') + '<span>공유하기</span>';
    shareLink.addEventListener('click', () => shareResultLink(draw, shareLink));
    shareImage.innerHTML = actionIcon('download') + '<span>이미지 저장</span>';
    const history = document.createElement('a');
    history.className = 'lotto-action-link';
    history.href = '/lotto/history';
    history.innerHTML = actionIcon('history') + '<span>내 기록</span>';
    actions.append(shareImage, shareLink, history);
    article.append(heading, round, numbers, footer, actions);
    return article;
  }

  function render() {
    $('lotto-round').textContent = '제' + (state.round || '—') + '회';
    $('lotto-remaining').textContent = '남은 추첨 ' + state.remaining + '/3';
    $('lotto-draw-date').textContent = state.date ? formatDrawDate(state.date) + ' 추첨' : '';
    if ($('lotto-round-result')) $('lotto-round-result').textContent = '제 ' + (state.round || '—') + ' 회';
    if ($('lotto-result-quota')) $('lotto-result-quota').textContent = state.remaining <= 0 ? '이번 회차 추첨 완료' : '남은 추첨 ' + state.remaining + '/3';
    if ($('lotto-stage-round')) $('lotto-stage-round').textContent = '제' + (state.round || '—') + '회 행운 번호';
    $list.replaceChildren();
    const orderedDraws = state.draws.slice().sort((a, b) => a.sequence - b.sequence);
    orderedDraws.forEach(saveHistory);
    if (orderedDraws.length) $list.append(renderCard(orderedDraws[orderedDraws.length - 1]));
    const label = state.busy ? '행운 번호를 추첨하고 있어요…'
      : state.remaining <= 0 ? '이번 회차 추첨 3회 완료'
      : (state.draws.length ? '다시 추첨하기 (' + state.remaining + '회 남음)' : '행운 번호 추첨하기 ✨');
    $draw.disabled = state.busy || state.remaining <= 0;
    $draw.textContent = label;
    if ($resultDraw) {
      $resultDraw.disabled = state.busy || state.remaining <= 0;
      $resultDraw.textContent = label;
    }
    const view = state.busy && state.view === 'drawing'
      ? 'drawing' : (state.draws.length ? 'result' : 'entry');
    state.view = view;
    setView(state.view);
    if (!state.busy && $message) notice(state.remaining <= 0
      ? '이번 회차의 번호를 모두 받았어요. 다음 회차에 다시 만나요!'
      : state.draws.length ? '번호가 자동 저장됐어요. 다시 추첨하거나 친구와 공유해보세요.'
      : '추첨 버튼을 눌러 이번 주 번호를 받아보세요. 번호는 무작위로 생성돼요.');
  }

  function setView(view) {
    state.view = view;
    if (!$experience || !$entry || !$theater || !$resultArea) return;
    $experience.dataset.state = view;
    $entry.hidden = view !== 'entry';
    $theater.hidden = view !== 'drawing';
    $resultArea.hidden = view !== 'result';
  }

  async function refresh() {
    const data = await fetchJson('/api/lotto/status');
    state.draws = data.draws;
    state.round = data.round;
    state.date = data.draw_date;
    state.remaining = data.remaining;
    state.view = state.draws.length ? 'result' : 'entry';
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

    if (!reducedMotion && canvasAnimation.isVisible()) {
      canvasAnimation.start();
      let continueReveal = true;
      try {
        continueReveal = await sleepWhileVisible(1250);
        for (let i = 0; i < draw.numbers.length; i += 1) {
          if (!continueReveal || !canvasAnimation.isVisible()) break;
          $stageNumbers.append(ballNode(draw.numbers[i]));
          $progressFill.style.width = ((i + 1) / 6 * 92) + '%';
          continueReveal = await sleepWhileVisible(410);
        }
        if (continueReveal && canvasAnimation.isVisible()) {
          popStars();
          continueReveal = await sleepWhileVisible(900);
        }
      } finally {
        canvasAnimation.stop();
      }
      if (!continueReveal || !canvasAnimation.isVisible()) {
        $stars.replaceChildren();
        draw.numbers.slice($stageNumbers.children.length)
          .forEach((n) => $stageNumbers.append(ballNode(n)));
      }
    } else {
      draw.numbers.forEach((n) => $stageNumbers.append(ballNode(n)));
      await sleep(160);
    }

    $progressFill.style.width = '100%';
    state.speed = 0.2;
    $progress.hidden = true;
    $stage.hidden = false;
    $stage.innerHTML = '<strong>행운 번호가<br>도착했어요!</strong><span>당신의 이번 주 숫자를 확인해보세요 ✨</span>';
    await sleep(reducedMotion ? 0 : 320);
    state.busy = false;
    state.view = 'result';
    render();
    const resultTitle = $('lotto-results-title');
    resultTitle?.focus?.({ preventScroll: true });
    const card = [...$list.querySelectorAll('.lotto-result-card')].find((node) => node.dataset?.sequence === String(draw.sequence));
    if (card) card.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
  }

  async function sleepWhileVisible(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (!canvasAnimation.isVisible()) return false;
      await sleep(Math.min(50, end - Date.now()));
    }
    return canvasAnimation.isVisible();
  }

  // Draw result is committed on the server *before* visual animation.
  async function performDraw() {
    if (state.busy || state.remaining <= 0) return;
    if ($entryError) {
      $entryError.hidden = true;
      $entryError.textContent = '';
    }
    state.busy = true;
    state.view = state.draws.length ? 'result' : 'entry';
    render();
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
      setView('drawing');
      await animateResult(draw);
    } catch (error) {
      state.view = state.draws.length ? 'result' : 'entry';
      notice(error.message, true);
      if (!state.draws.length && $entryError) {
        $entryError.textContent = error.message;
        $entryError.hidden = false;
      }
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
    if (!canvas || !canvas.getContext) return { start() {}, stop() {}, isVisible() { return false; } };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { start() {}, stop() {}, isVisible() { return false; } };
    const W = canvas.width, mid = W / 2;
    const balls = Array.from({ length: 45 }, (_, i) => {
      const angle = i * 2.39996;
      const radius = Math.sqrt((i+.5)/45) * 220;
      return { n: i+1, angle, radius, speed: 0.9 + (i%7)*.035, depth: i/45, size: 24 + (i%4)*1.4 };
    });
    let last = 0;
    let frameId = null;
    let active = false;
    let stageVisible = true;
    let visibilityObserved = false;
    const fills = ['#F9D064','#88C5EF','#F08A9F','#C8CFDC','#A5D997'];
    const isVisible = () => !document.hidden && (!visibilityObserved || stageVisible);
    const canAnimate = () => active && !reducedMotion && isVisible();
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
        const a = b.angle + t * b.speed * (0.00042 + speed*0.00118);
        const z = Math.sin(a * 1.15 + b.depth*5.7);
        return { ...b, x:mid + Math.cos(a)*b.radius, y:mid + Math.sin(a)*b.radius*.84, z };
      }).sort((a, b) => a.z - b.z);
      projected.forEach((b) => {
        const r = b.size * (0.82 + (b.z + 1) * 0.12);
        const fill = fills[Math.min(4, Math.floor((b.n-1)/10))];
        const light = t * 0.00075 + b.depth * Math.PI * 2;
        const hx = b.x - Math.cos(light) * r * 0.34;
        const hy = b.y - r * 0.38 - Math.sin(light) * r * 0.16;
        ctx.save();
        ctx.globalAlpha = 0.25 + (b.z + 1) * 0.17;
        ctx.fillStyle = '#080411';
        ctx.beginPath();ctx.ellipse(b.x+r*.12,b.y+r*.67,r*.82,r*.29,0,0,Math.PI*2);ctx.fill();
        ctx.restore();
        const g = ctx.createRadialGradient(hx,hy,r*.03,b.x+r*.08,b.y+r*.13,r*1.18);
        g.addColorStop(0,'#FFFFFF');g.addColorStop(.14,'#FFFFFF');g.addColorStop(.34,fill);g.addColorStop(.76,fill);g.addColorStop(1,'#282238');
        ctx.save();
        ctx.shadowColor = '#090513';ctx.shadowBlur = 10;ctx.shadowOffsetY = 4;
        ctx.beginPath();ctx.arc(b.x,b.y,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
        ctx.shadowColor = 'transparent';ctx.shadowBlur = 0;ctx.shadowOffsetY = 0;
        ctx.lineWidth = 1.3;ctx.strokeStyle = '#fff9';ctx.stroke();
        ctx.beginPath();ctx.ellipse(hx,hy,r*.34,r*.16,light*.12,0,Math.PI*2);ctx.fillStyle = '#ffffffa8';ctx.fill();
        ctx.fillStyle='#292235';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='700 ' + Math.round(r*.78) + 'px system-ui';
        ctx.shadowColor = '#fff9';ctx.shadowBlur = 2;
        ctx.fillText(String(b.n), b.x, b.y+1);
        ctx.restore();
      });
      scheduleFrame();
    }
    document.addEventListener('visibilitychange', sync);
    if (typeof window.IntersectionObserver === 'function') {
      const observer = new window.IntersectionObserver((entries) => {
        // The machine is mounted inside a hidden section; ignore that initial offscreen report.
        if (state.view === 'drawing') {
          visibilityObserved = true;
          stageVisible = entries.some((entry) => entry.isIntersecting);
        }
        sync();
      });
      observer.observe($('lotto-machine'));
    }
    return {
      start() { active = true; sync(); },
      stop() { active = false; sync(); },
      isVisible
    };
  }

  const canvasAnimation = createCanvasAnimation();
  $draw.addEventListener('click', () => performDraw());
  $resultDraw?.addEventListener('click', () => performDraw());
  refresh().catch((error) => {
    notice('현재 로또 서비스를 불러올 수 없어요. 새로고침 후 다시 시도해 주세요.', true);
    if ($entryError) {
      $entryError.textContent = '로또 정보를 불러오지 못했어요. 연결을 확인한 뒤 새로고침해 주세요.';
      $entryError.hidden = false;
    }
    $draw.disabled = true;
    $draw.textContent = '연결 상태 확인 필요';
    console.error('lotto init:', error);
  });
})();
