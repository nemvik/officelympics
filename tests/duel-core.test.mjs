import test from "node:test";
import assert from "node:assert/strict";

import {
  CURLING,
  buildPanicSchedule,
  calculateCurlingScore,
  clampShotVelocity,
  createCurlingStone,
  deadlineProgress,
  deadlineRoundConfig,
  deadlineRoundScore,
  stepCurling
} from "../duel/game-core.mjs";

test("Office Panic vytváří stejný a platný rozpis ze stejného seedu", function () {
  const first = buildPanicSchedule("stejny-seed");
  const second = buildPanicSchedule("stejny-seed");
  assert.deepEqual(first, second);
  assert.ok(first.length >= 20);
  assert.ok(first.every(function (item) {
    return item.at > 0 && item.at < 20_000 && item.slot >= 0 && item.slot < 9 && item.eventIndex >= 0 && item.eventIndex < 9;
  }));
});

test("Deadline postupuje vpřed a za překročení limitu dává nulu", function () {
  const config = deadlineRoundConfig("deadline-seed", 0);
  const early = deadlineProgress(config, 1000);
  const late = deadlineProgress(config, 2000);
  assert.ok(early > 0);
  assert.ok(late > early);
  assert.equal(deadlineRoundScore(100), 100);
  assert.equal(deadlineRoundScore(99), 95);
  assert.equal(deadlineRoundScore(100.01), 0);
});

test("Curling omezuje nepřiměřeně silný hod", function () {
  const shot = clampShotVelocity(10_000, -10_000);
  assert.ok(Math.hypot(shot.vx, shot.vy) <= CURLING.maxShotSpeed + 0.001);
});

test("Curlingová koule se třením zastaví", function () {
  const stone = createCurlingStone(0, 0);
  stone.vy = -500;
  let moving = true;
  let steps = 0;

  while (moving && steps < 3000) {
    moving = stepCurling([stone], 1 / 120);
    steps += 1;
  }

  assert.equal(moving, false);
  assert.ok(steps < 3000);
  assert.equal(stone.vx, 0);
  assert.equal(stone.vy, 0);
  assert.ok(stone.y < CURLING.launchY);
});

test("Curling počítá pouze kameny vítěze bližší než soupeřův nejlepší", function () {
  const stones = [
    { owner: 0, x: CURLING.targetX + 10, y: CURLING.targetY },
    { owner: 0, x: CURLING.targetX + 30, y: CURLING.targetY },
    { owner: 1, x: CURLING.targetX + 45, y: CURLING.targetY },
    { owner: 0, x: CURLING.targetX + 70, y: CURLING.targetY }
  ];
  const result = calculateCurlingScore(stones);
  assert.equal(result.winner, 0);
  assert.deepEqual(result.scores, [2, 0]);
});

test("Curling vrátí nula nula, když jsou všechny koule mimo kruh", function () {
  const result = calculateCurlingScore([
    { owner: 0, x: 50, y: 700 },
    { owner: 1, x: 650, y: 700 }
  ]);
  assert.deepEqual(result.scores, [0, 0]);
  assert.equal(result.winner, null);
});
