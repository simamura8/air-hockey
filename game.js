/* No build step, account, database, or paid backend. The room creator runs physics. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const { W, H, R, P, GOAL, clamp } = Hockey;
  const canvas = $('table'), ctx = canvas.getContext('2d');
  let state = Hockey.create(), role = 'practice', peer = null, conn = null, epoch = 0;
  let playing = true, busy = false, local = { x: 300, y: 710 }, remote = { x: 300, y: 130 };
  let latest = null, lastFrame = 0, accumulator = 0, lastSend = 0, lastReceive = 0;
  let timeout = null, room = '', lastScores = '', pausedRemote = false;
  const keys = new Set();
  const yourIndex = () => role === 'guest' ? 1 : 0;
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  function status(message, error = false) { $('status').textContent = message; $('status-dot').classList.toggle('error', error); }
  function ui() {
    $('create').disabled = busy || role !== 'practice';
    $('join').disabled = busy || role !== 'practice';
    $('room').disabled = busy || role !== 'practice';
    $('leave').hidden = role === 'practice' && !busy;
    $('rematch').hidden = state.winner < 0 || role === 'guest' || !playing;
    $('practice').textContent = role === 'practice' ? '練習をやり直す' : '退出して練習';
    $('mode').textContent = role === 'practice' ? 'PRACTICE' : 'ONLINE';
    $('opponent').textContent = role === 'practice' ? 'CPU' : 'FRIEND';
  }
  function send(data) {
    if (conn?.open && conn.bufferSize < 3 && (conn.dataChannel?.bufferedAmount || 0) < 65536) {
      try { conn.send(data); } catch { fail('通信が切れました。ルームを作り直してください。'); }
    }
  }
  function resetGame() {
    state = Hockey.create(); latest = null; lastScores = '';
    local = { x: 300, y: yourIndex() === 0 ? 710 : 130 };
    remote = { x: 300, y: yourIndex() === 0 ? 130 : 710 };
    pausedRemote = false; ui();
  }
  function clearNetwork() {
    epoch++; clearTimeout(timeout); timeout = null;
    const oldConn = conn, oldPeer = peer;
    conn = null; peer = null;
    oldConn?.close(); oldPeer?.destroy();
    busy = false; room = ''; $('invite').hidden = true;
    history.replaceState(null, '', location.pathname + location.search);
  }
  function practice() {
    clearNetwork(); role = 'practice'; playing = true; resetGame();
    status('ひとりで練習中。下の青いマレットを動かしてみよう。');
  }
  function fail(message) {
    clearNetwork(); role = 'practice'; playing = true; resetGame(); status(message, true);
  }
  function validState(s) {
    return s && Array.isArray(s.scores) && s.scores.length === 2 && s.scores.every(n => Number.isInteger(n) && n >= 0 && n <= 5)
      && [-1, 0, 1].includes(s.winner) && finite(s.delay) && s.delay >= 0 && s.delay <= 1
      && Array.isArray(s.paddles) && s.paddles.length === 2 && s.paddles.every(p => p && finite(p.x) && finite(p.y) && p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H)
      && s.puck && ['x', 'y', 'vx', 'vy'].every(k => finite(s.puck[k]) && Math.abs(s.puck[k]) < 5000);
  }
  function receive(data, c) {
    if (conn !== c || !data || typeof data !== 'object') return;
    if (data.type === 'busy') { fail('このルームは満員です。別のルームを作ってください。'); return; }
    if (role === 'host' && data.type === 'input' && finite(data.x) && finite(data.y)) {
      remote = { x: clamp(data.x, R + 8, W - R - 8), y: clamp(data.y, R + 8, H / 2 - R) };
      lastReceive = performance.now(); pausedRemote = data.paused === true;
    }
    if (role === 'guest' && data.type === 'state' && validState(data.state)) {
      if (!playing) { playing = true; busy = false; clearTimeout(timeout); status('対戦スタート！ あなたは下側の青です。'); }
      lastReceive = performance.now(); pausedRemote = data.paused === true;
      latest = data.state;
      state.scores = latest.scores; state.winner = latest.winner; state.delay = latest.delay;
      ui();
    }
  }
  function bindConnection(c, token) {
    conn = c;
    c.on('data', data => { if (token === epoch) receive(data, c); });
    c.on('open', () => {
      if (token !== epoch || conn !== c) { c.close(); return; }
      lastReceive = performance.now();
      if (role === 'host') {
        busy = false; playing = true; clearTimeout(timeout); resetGame();
        send({ type: 'state', state, paused: document.hidden });
        status('相手が参加しました！ あなたは下側の青です。');
      } else status('ゲームを準備しています…');
      ui();
    });
    c.on('close', () => { if (token === epoch && conn === c) fail('相手が退出しました。ルームを作り直すか、練習できます。'); });
    c.on('error', () => { if (token === epoch && conn === c) fail('接続できませんでした。別の回線でもお試しください。'); });
  }
  function connect(kind, code) {
    if (typeof Peer === 'undefined') { status('通信ライブラリを読み込めませんでした。再読み込みしてください。', true); return; }
    clearNetwork(); role = kind; playing = false; busy = true; resetGame();
    room = code || Array.from(crypto.getRandomValues(new Uint8Array(8)), n => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('');
    const token = epoch;
    const options = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }] } };
    peer = kind === 'host' ? new Peer('simple-air-hockey-v1-' + room, options) : new Peer(options);
    status('通信サーバーに接続しています…'); ui();
    timeout = setTimeout(() => { if (token === epoch) fail('接続がタイムアウトしました。回線を変えるか、もう一度お試しください。'); }, 18000);
    peer.on('open', () => {
      if (token !== epoch) return;
      if (kind === 'host') {
        clearTimeout(timeout); busy = false;
        const url = new URL(location.href); url.hash = room;
        $('invite-url').value = url.href; $('room-code').textContent = room; $('invite').hidden = false;
        status('相手の参加を待っています。このページを開いたまま招待URLを送ってください。');
      } else {
        status('相手につないでいます…');
        bindConnection(peer.connect('simple-air-hockey-v1-' + room, { reliable: true, serialization: 'json' }), token);
      }
      ui();
    });
    peer.on('connection', incoming => {
      if (token !== epoch || kind !== 'host' || conn) {
        incoming.on('open', () => { incoming.send({ type: 'busy' }); setTimeout(() => incoming.close(), 300); });
        incoming.on('error', () => {}); return;
      }
      bindConnection(incoming, token);
      timeout = setTimeout(() => { if (token === epoch && !playing) fail('相手との接続がタイムアウトしました。もう一度ルームを作ってください。'); }, 18000);
    });
    peer.on('error', error => {
      if (token !== epoch) return;
      const messages = { 'peer-unavailable': 'ルームが見つかりません。コードと、作成者がページを開いているかを確認してください。', 'unavailable-id': 'ルームコードが重複しました。もう一度作成してください。' };
      fail(messages[error.type] || '通信サーバーに接続できませんでした。時間をおいてお試しください。');
    });
    peer.on('disconnected', () => {
      if (token !== epoch) return;
      if (!playing) fail('通信サーバーとの接続が切れました。ルームを作り直してください。');
      // Established WebRTC games can continue without the signaling server.
    });
  }
  $('create').addEventListener('click', () => connect('host'));
  $('join-form').addEventListener('submit', e => { e.preventDefault(); const code = $('room').value.trim().toUpperCase(); if (/^[A-Z0-9]{8}$/.test(code)) connect('guest', code); });
  $('practice').addEventListener('click', practice);
  $('leave').addEventListener('click', practice);
  $('rematch').addEventListener('click', () => { resetGame(); status('もう一度！ 5点先取で勝負。'); });
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('invite-url').value); status('招待URLをコピーしました。相手に送ってください。'); }
    catch { $('invite-url').select(); status('招待URLを選択しました。コピーして相手に送ってください。'); }
  });
  function point(e) {
    const rect = canvas.getBoundingClientRect();
    let x = (e.clientX - rect.left) * W / rect.width, y = (e.clientY - rect.top) * H / rect.height;
    if (role === 'guest') { x = W - x; y = H - y; }
    const i = yourIndex();
    local = { x: clamp(x, R + 8, W - R - 8), y: clamp(y, i === 0 ? H / 2 + R : R + 8, i === 0 ? H - R - 8 : H / 2 - R) };
  }
  canvas.addEventListener('pointerdown', e => { canvas.focus({ preventScroll: true }); canvas.setPointerCapture(e.pointerId); point(e); });
  canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || canvas.hasPointerCapture(e.pointerId)) point(e); });
  canvas.addEventListener('keydown', e => { if (e.key.startsWith('Arrow')) { e.preventDefault(); keys.add(e.key); } });
  window.addEventListener('keyup', e => keys.delete(e.key));
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('visibilitychange', () => {
    keys.clear(); lastFrame = 0; accumulator = 0;
    if (conn?.open) {
      send(role === 'host' ? { type: 'state', state, paused: document.hidden } : { type: 'input', ...local, paused: document.hidden });
      if (!document.hidden) { lastReceive = performance.now(); status('対戦を再開しました。'); }
    }
  });
  function circle(x, y, r, fill, stroke, width = 1) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function draw() {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#eaf5f6'; ctx.fillRect(0, 0, W, H);
    ctx.save(); if (role === 'guest') { ctx.translate(W, H); ctx.rotate(Math.PI); }
    // Quiet rink markings keep the puck easy to follow.
    ctx.fillStyle = '#d6e6e8';
    for (let y = 30; y < H; y += 30) for (let x = 30; x < W; x += 30) { ctx.beginPath(); ctx.arc(x, y, .8, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#b8d6db'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    circle(W / 2, H / 2, 96, null, '#b8d6db', 2); circle(W / 2, H / 2, 5, '#b8d6db');
    [0, H].forEach(y => circle(W / 2, y, 125, null, '#b8d6db', 2));
    ctx.lineWidth = 10; ctx.lineCap = 'round';
    [0, 1].forEach(i => { ctx.strokeStyle = i === yourIndex() ? '#27bdc9' : '#ef847c'; const y = i === 0 ? H - 3 : 3; ctx.beginPath(); ctx.moveTo((W - GOAL) / 2, y); ctx.lineTo((W + GOAL) / 2, y); ctx.stroke(); });
    state.paddles.forEach((p, i) => {
      const mine = i === yourIndex(), color = mine ? '#32bdcc' : '#f18177';
      ctx.shadowColor = '#12334430'; ctx.shadowBlur = 15; ctx.shadowOffsetY = 7;
      circle(p.x, p.y, R, color); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      circle(p.x, p.y - 2, R - 7, null, mine ? '#78e2e6' : '#ffb4a8', 2);
      circle(p.x, p.y - 4, 14, mine ? '#20a5b7' : '#de6c65');
    });
    const b = state.puck;
    ctx.shadowColor = '#0f213850'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    circle(b.x, b.y, P, '#152740'); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    circle(b.x - 3, b.y - 4, 4, '#526b85');
    ctx.restore();
    const me = yourIndex(); $('your-score').textContent = state.scores[me]; $('their-score').textContent = state.scores[1 - me];
    const stale = conn?.open && performance.now() - lastReceive > 5000;
    let caption = '';
    if (state.winner >= 0) caption = state.winner === me ? 'YOU WIN! おめでとう！' : 'GOOD GAME! 相手の勝ち';
    else if (!playing) caption = role === 'host' ? '相手の参加を待っています' : '接続しています…';
    else if (pausedRemote || stale) caption = '相手の復帰を待っています';
    else if (state.delay > 0) caption = 'READY?';
    $('caption').textContent = caption; $('caption').hidden = !caption;
    const scores = state.scores.join(':') + state.winner;
    if (lastScores !== scores) { lastScores = scores; ui(); if (state.winner >= 0) status(role === 'guest' ? 'ゲーム終了。再戦はルーム作成者が「もう一度」を押してください。' : 'ゲーム終了！「もう一度」で再戦できます。'); }
  }
  function frame(now) {
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 0; lastFrame = now;
    if (document.activeElement === canvas) {
      const flip = role === 'guest' ? -1 : 1;
      local.x = clamp(local.x + ((keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)) * 650 * dt * flip, R + 8, W - R - 8);
      local.y = clamp(local.y + ((keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)) * 650 * dt * flip, yourIndex() === 0 ? H / 2 + R : R + 8, yourIndex() === 0 ? H - R - 8 : H / 2 - R);
    }
    const stale = conn?.open && now - lastReceive > 5000;
    if (conn?.open && now - lastReceive > 18000 && !document.hidden) fail('相手との通信が途切れました。ルームを作り直してください。');
    if (playing && !document.hidden && !pausedRemote && !stale) {
      if (role !== 'guest') {
        accumulator += dt;
        while (accumulator >= 1 / 120) {
          const cpu = state.paddles[1];
          if (role === 'practice') remote = { x: cpu.x + clamp(state.puck.x - cpu.x, -2.6, 2.6), y: cpu.y + clamp((state.puck.y < H / 2 ? state.puck.y - 55 : 135) - cpu.y, -2.2, 2.2) };
          Hockey.step(state, [local, remote], 1 / 120); accumulator -= 1 / 120;
        }
      } else if (latest) {
        const f = 1 - Math.exp(-22 * dt);
        ['x', 'y', 'vx', 'vy'].forEach(k => state.puck[k] += (latest.puck[k] - state.puck[k]) * f);
        state.paddles[0].x += (latest.paddles[0].x - state.paddles[0].x) * f;
        state.paddles[0].y += (latest.paddles[0].y - state.paddles[0].y) * f;
        state.paddles[1].x += (local.x - state.paddles[1].x) * f;
        state.paddles[1].y += (local.y - state.paddles[1].y) * f;
      }
    } else accumulator = 0;
    if (conn?.open && now - lastSend >= 1000 / 30) {
      lastSend = now;
      send(role === 'host' ? { type: 'state', state, paused: document.hidden } : { type: 'input', ...local, paused: document.hidden });
    }
    draw(); requestAnimationFrame(frame);
  }
  const invited = location.hash.slice(1).toUpperCase();
  if (/^[A-Z0-9]{8}$/.test(invited)) { $('room').value = invited; status('招待されたルームです。「参加 →」を押すと対戦できます。'); }
  ui(); requestAnimationFrame(frame);
})();
