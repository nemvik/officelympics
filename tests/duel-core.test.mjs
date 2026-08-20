import test from "node:test";
import assert from "node:assert/strict";

import {
  BATTLESHIP,
  CURLING,
  TASK_STACK,
  addTaskGarbage,
  altTabReactionScore,
  battleshipShotResult,
  buildAltTabRounds,
  buildBattleshipFleet,
  buildPanicSchedule,
  buildTaskBag,
  calculateCurlingScore,
  clampShotVelocity,
  clearTaskRows,
  createCurlingStone,
  deadlineProgress,
  deadlineRoundConfig,
  deadlineRoundScore,
  stepCurling
} from "../duel/game-core.mjs";

test("Alt+Tab má osm deterministických kol a přesně pět návštěv šéfa", function () {
  const first = buildAltTabRounds("kontrola-seed");
  const second = buildAltTabRounds("kontrola-seed");
  assert.deepEqual(first, second);
  assert.equal(first.length, 8);
  assert.equal(first.filter(function (round) { return round.kind === "boss"; }).length, 5);
  assert.ok(first.every(function (round) { return round.wait >= 1050 && round.wait <= 2300; }));
  assert.equal(altTabReactionScore(200), 900);
  assert.equal(altTabReactionScore(500), 600);
  assert.equal(altTabReactionScore(Number.NaN), 0);
});

test("Námořní bitva staví dvě platné lodě bez překryvu", function () {
  const fleet = buildBattleshipFleet("lodni-seed", 0);
  assert.deepEqual(fleet.map(function (ship) { return ship.length; }), [3, 2]);
  const cells = fleet.flat();
  assert.equal(new Set(cells).size, BATTLESHIP.totalDecks);
  assert.ok(cells.every(function (cell) { return cell >= 0 && cell < BATTLESHIP.size * BATTLESHIP.size; }));

  const shots = new Set(fleet[0]);
  const sunkShip = battleshipShotResult(fleet, shots, fleet[0][0]);
  assert.equal(sunkShip.hit, true);
  assert.equal(sunkShip.sunk, true);
  assert.equal(sunkShip.fleetSunk, false);

  fleet[1].forEach(function (cell) { shots.add(cell); });
  assert.equal(battleshipShotResult(fleet, shots, fleet[1][0]).fleetSunk, true);
});

test("Task Stack používá férový sedmidílný balíček", function () {
  const first = buildTaskBag("task-seed", 0);
  const second = buildTaskBag("task-seed", 0);
  assert.deepEqual(first, second);
  assert.equal(first.length, 7);
  assert.equal(new Set(first).size, 7);
});

test("Task Stack maže plné řádky a přidává urgentní práci s mezerou", function () {
  const empty = Array.from({ length: TASK_STACK.rows - 2 }, function () { return Array(TASK_STACK.columns).fill(0); });
  const board = empty.concat([
    Array(TASK_STACK.columns).fill("I"),
    Array(TASK_STACK.columns).fill("O")
  ]);
  const cleared = clearTaskRows(board);
  assert.equal(cleared.cleared, 2);
  assert.equal(cleared.board.length, TASK_STACK.rows);
  assert.ok(cleared.board.every(function (row) { return row.every(function (cell) { return cell === 0; }); }));

  const garbage = addTaskGarbage(cleared.board, 2, 4);
  assert.equal(garbage.overflow, false);
  assert.equal(garbage.board.length, TASK_STACK.rows);
  assert.equal(garbage.board.at(-1)[4], 0);
  assert.equal(garbage.board.at(-1).filter(Boolean).length, TASK_STACK.columns - 1);
});

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

test("Běžný tah na curlingu dojede přibližně ke koši", function () {
  const stone = createCurlingStone(0, 0);
  stone.vy = -462;
  let moving = true;
  let steps = 0;

  while (moving && steps < 3000) {
    moving = stepCurling([stone], 1 / 120);
    steps += 1;
  }

  assert.ok(Math.abs(stone.y - CURLING.targetY) < 35, "koule skončila na y=" + stone.y);
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
