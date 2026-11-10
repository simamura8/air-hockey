/* Game rules shared by the browser and Node's physics tests. All units are table pixels. */
(function (root) {
  'use strict';
  const W = 600, H = 840, R = 34, P = 14, GOAL = 220, WIN = 5;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  function serve(s, direction) {
    s.puck = { x: W / 2, y: H / 2, vx: 160 * (Math.random() < .5 ? -1 : 1), vy: 320 * direction };
    s.delay = 1;
  }
  function create() {
    const s = { paddles: [{ x: 300, y: 710, vx: 0, vy: 0 }, { x: 300, y: 130, vx: 0, vy: 0 }], scores: [0, 0], winner: -1, delay: 1, puck: null };
    serve(s, 1); return s;
  }
  function move(s, i, target, dt) {
    const p = s.paddles[i];
    const x = clamp(target.x, R + 8, W - R - 8);
    const y = clamp(target.y, i === 0 ? H / 2 + R : R + 8, i === 0 ? H - R - 8 : H / 2 - R);
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    const f = d ? Math.min(1, 1150 * dt / d) : 0;
    p.vx = dx * f / dt; p.vy = dy * f / dt;
    p.x += dx * f; p.y += dy * f;
  }
  function step(s, targets, dt) {
    s.paddles.forEach((_, i) => move(s, i, targets[i], dt));
    if (s.winner >= 0) return;
    if (s.delay > 0) { s.delay = Math.max(0, s.delay - dt); return; }
    const b = s.puck;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < P) { b.x = P; b.vx = Math.abs(b.vx); }
    if (b.x > W - P) { b.x = W - P; b.vx = -Math.abs(b.vx); }
    // The whole puck must fit between the two posts.
    const inGoal = Math.abs(b.x - W / 2) < GOAL / 2 - P;
    if (!inGoal) {
      if (b.y < P) { b.y = P; b.vy = Math.abs(b.vy); }
      if (b.y > H - P) { b.y = H - P; b.vy = -Math.abs(b.vy); }
    }
    for (const p of s.paddles) {
      const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
      if (d < R + P) {
        const nx = d ? dx / d : 0, ny = d ? dy / d : (p.y > H / 2 ? -1 : 1);
        b.x = p.x + nx * (R + P); b.y = p.y + ny * (R + P);
        const relative = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny;
        if (relative < 0) { b.vx -= 1.85 * relative * nx; b.vy -= 1.85 * relative * ny; }
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > 900) { b.vx *= 900 / speed; b.vy *= 900 / speed; }
      }
    }
    if (b.y < -P || b.y > H + P) {
      const scorer = b.y < 0 ? 0 : 1;
      s.scores[scorer]++;
      if (s.scores[scorer] >= WIN) s.winner = scorer;
      else serve(s, scorer === 0 ? -1 : 1);
    }
  }
  const api = { W, H, R, P, GOAL, WIN, clamp, create, step };
  if (typeof module !== 'undefined') module.exports = api;
  root.Hockey = api;
})(globalThis);
