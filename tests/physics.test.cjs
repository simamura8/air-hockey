const { test } = require("node:test");
const assert = require("node:assert/strict");
const H = require("../physics.js");
const targets = (s) => s.paddles.map((p) => ({ x: p.x, y: p.y }));
test("A goal scores once and resets the puck, with a delayed serve", () => {
  const s = H.create();
  s.delay = 0;
  s.puck = { x: 300, y: -13, vx: 0, vy: -400 };
  H.step(s, targets(s), 1 / 120);
  assert.deepEqual(s.scores, [1, 0]);
  assert.equal(s.puck.y, H.H / 2);
  for (let i = 0; i < 60; i++) H.step(s, targets(s), 1 / 120);
  assert.deepEqual(s.scores, [1, 0]);
  assert.equal(s.puck.y, H.H / 2);
});
test("The fifth goal ends the game and cannot score again", () => {
  const s = H.create();
  s.delay = 0;
  s.scores[1] = 4;
  s.puck = { x: 300, y: H.H + 13, vx: 0, vy: 400 };
  H.step(s, targets(s), 1 / 120);
  for (let i = 0; i < 500; i++) H.step(s, targets(s), 1 / 120);
  assert.equal(s.winner, 1);
  assert.deepEqual(s.scores, [0, 5]);
});
test("Outside the goal the puck rebounds from the end rail", () => {
  const s = H.create();
  s.delay = 0;
  s.puck = { x: 80, y: 15, vx: 0, vy: -400 };
  H.step(s, targets(s), 1 / 120);
  assert.ok(s.puck.vy > 0);
  assert.deepEqual(s.scores, [0, 0]);
});
test("Paddles remain in their own half and obey the speed limit", () => {
  const s = H.create();
  const before = { ...s.paddles[0] };
  H.step(
    s,
    [
      { x: -5000, y: -5000 },
      { x: 9000, y: 9000 },
    ],
    1 / 120,
  );
  assert.ok(
    Math.hypot(s.paddles[0].x - before.x, s.paddles[0].y - before.y) <=
      1150 / 120 + 1e-8,
  );
  for (let i = 0; i < 300; i++)
    H.step(
      s,
      [
        { x: -5000, y: -5000 },
        { x: 9000, y: 9000 },
      ],
      1 / 120,
    );
  assert.ok(s.paddles[0].y >= H.H / 2 + H.R);
  assert.ok(s.paddles[1].y <= H.H / 2 - H.R);
});
test("A stationary paddle reflects a puck without sticking or gaining unbounded speed", () => {
  const s = H.create();
  s.delay = 0;
  s.puck = { x: 300, y: 663, vx: 0, vy: 500 };
  H.step(s, targets(s), 1 / 120);
  assert.ok(s.puck.vy < 0);
  assert.ok(Math.hypot(s.puck.vx, s.puck.vy) <= 900);
  assert.ok(
    Math.hypot(s.puck.x - s.paddles[0].x, s.puck.y - s.paddles[0].y) >=
      H.R + H.P - 1e-8,
  );
});
