import test from "node:test";
import assert from "node:assert/strict";

import { tournamentRoundPoints } from "../duel/game-core.mjs";
import { altTabReactionScore, buildAltTabRounds } from "../duel/games/alt-tab-duel.mjs";
import { buildCalendarRounds, calendarSlotScore, CALENDAR_ROUNDS, findCalendarSlots } from "../duel/games/calendar-squeeze.mjs";
import { buildCoffeeRounds, coffeeOrderScore, COFFEE_CATEGORIES, COFFEE_ROUNDS } from "../duel/games/coffee-relay.mjs";
import { deadlineProgress, deadlineRoundConfig, deadlineRoundScore } from "../duel/games/deadline-chicken.mjs";
import { createPongBall, PONG, stepPong } from "../duel/games/inbox-pong.mjs";
import { buildJargonRounds, JARGON_ROUNDS } from "../duel/games/jargon-decoder.mjs";
import { buildEscapeCourse, ESCAPE, rectanglesOverlap } from "../duel/games/meeting-escape.mjs";
import { buildPanicSchedule } from "../duel/games/office-panic.mjs";
import {
  buildPictionaryRounds,
  calculatePictionaryRoundScores,
  PICTIONARY,
  PICTIONARY_PROMPTS
} from "../duel/games/office-pictionary.mjs";
import {
  calculateCurlingScore,
  clampShotVelocity,
  createCurlingStone,
  CURLING,
  stepCurling
} from "../duel/games/paper-curling.mjs";
import { buildPrinterRounds, printerRepairScore, PRINTER_ROUNDS } from "../duel/games/printer-exorcist.mjs";
import {
  GAME_IDS,
  pickTournamentGames
} from "../duel/games/registry.mjs";
import { BATTLESHIP, battleshipShotResult, buildBattleshipFleet } from "../duel/games/spreadsheet-battleship.mjs";
import { addTaskGarbage, buildTaskBag, clearTaskRows, TASK_STACK } from "../duel/games/task-stack.mjs";

test("Turnaj deterministicky losuje tři různé hry a férově boduje remízu", function () {
  const first = pickTournamentGames("turnajovy-seed");
  const second = pickTournamentGames("turnajovy-seed");
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  assert.equal(new Set(first).size, 3);
  assert.ok(first.every(function (game) { return GAME_IDS.includes(game); }));
  assert.deepEqual(tournamentRoundPoints(120, 80), [1, 0]);
  assert.deepEqual(tournamentRoundPoints(80, 120), [0, 1]);
  assert.deepEqual(tournamentRoundPoints(80, 80), [0.5, 0.5]);
});

test("Pictionary připraví tři férová kola a správně rozdělí body", function () {
  const first = buildPictionaryRounds("picture-seed");
  const second = buildPictionaryRounds("picture-seed");
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  assert.equal(new Set(first.flatMap(function (round) { return round.prompts; })).size, 6);
  first.forEach(function (round) {
    assert.equal(round.prompts.length, 2);
    assert.equal(round.choices.length, 2);
    round.choices.forEach(function (choices, role) {
      assert.equal(choices.length, 4);
      assert.equal(new Set(choices).size, 4);
      assert.ok(choices.includes(round.prompts[1 - role]));
      assert.ok(!choices.includes(round.prompts[role]));
      assert.ok(choices.every(function (promptId) {
        return PICTIONARY_PROMPTS.some(function (prompt) { return prompt.id === promptId; });
      }));
    });
  });
  assert.deepEqual(calculatePictionaryRoundScores([true, false]), [PICTIONARY.guessingPoints, PICTIONARY.drawingPoints]);
  assert.deepEqual(calculatePictionaryRoundScores([true, true]), [1000, 1000]);
});

test("Coffee Relay tvoří pět unikátních objednávek a odměňuje přesnost", function () {
  const first = buildCoffeeRounds("coffee-seed");
  const second = buildCoffeeRounds("coffee-seed");
  assert.deepEqual(first, second);
  assert.equal(first.length, COFFEE_ROUNDS);
  const signatures = first.map(function (round) {
    return COFFEE_CATEGORIES.map(function (category) { return round.order[category.id]; }).join(":");
  });
  assert.equal(new Set(signatures).size, COFFEE_ROUNDS);

  const exact = coffeeOrderScore(first[0].order, { ...first[0].order }, 1200, 0);
  assert.equal(exact.correct, true);
  assert.ok(exact.points > coffeeOrderScore(first[0].order, { ...first[0].order }, 5000, 1).points);
  assert.deepEqual(coffeeOrderScore(first[0].order, {}, 500, 0), { correct: false, points: 0 });
});

test("Calendar Squeeze vždy nabídne řešitelnou mezeru", function () {
  assert.deepEqual(findCalendarSlots([false, false, true, false, false, false], 2), [0, 3, 4]);
  const rounds = buildCalendarRounds("calendar-seed");
  assert.equal(rounds.length, CALENDAR_ROUNDS);
  assert.ok(rounds.every(function (round) {
    return round.validStarts.length > 0 && round.validStarts.every(function (start) {
      return round.occupied.slice(start, start + round.duration).every(function (busy) { return !busy; });
    });
  }));
  assert.ok(calendarSlotScore(900, 0) > calendarSlotScore(4200, 2));
});

test("Printer Exorcist střídá závady a rychlou opravu hodnotí výš", function () {
  const rounds = buildPrinterRounds("printer-seed");
  assert.equal(rounds.length, PRINTER_ROUNDS);
  assert.deepEqual(rounds, buildPrinterRounds("printer-seed"));
  assert.ok(rounds.every(function (round, index) {
    return round.actions.length === 4 && new Set(round.actions).size === 4
      && (index === 0 || round.issue !== rounds[index - 1].issue);
  }));
  assert.ok(printerRepairScore(300, 0) > printerRepairScore(2300, 2));
});

test("Inbox Pong vytváří deterministický servis a odráží e-mail od inboxu", function () {
  assert.deepEqual(createPongBall("mail-seed", 0), createPongBall("mail-seed", 0));
  const state = {
    ball: {
      x: PONG.paddleInset + PONG.paddleWidth + PONG.ballRadius + 2,
      y: PONG.height / 2,
      vx: -PONG.startSpeed,
      vy: 0
    },
    paddles: [PONG.height / 2 - PONG.paddleHeight / 2, 0]
  };
  const bounce = stepPong(state, 1 / 30);
  assert.equal(bounce.hit, 0);
  assert.ok(state.ball.vx > 0);

  state.ball = { x: -PONG.ballRadius - 2, y: 10, vx: -200, vy: 0 };
  assert.equal(stepPong(state, 0).scored, 1);
});

test("Meeting Escape připraví stejnou bezpečně rozestoupenou trať", function () {
  const first = buildEscapeCourse("meeting-seed");
  const second = buildEscapeCourse("meeting-seed");
  assert.deepEqual(first, second);
  assert.ok(first.length >= 20);
  assert.ok(first.every(function (item, index) {
    return ["meeting", "reply", "coffee"].includes(item.type)
      && (index === 0 || item.at - first[index - 1].at >= 920);
  }));
  assert.equal(rectanglesOverlap(
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 5, y: 5, width: 10, height: 10 }
  ), true);
  assert.equal(rectanglesOverlap(
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 12, y: 12, width: 2, height: 2 }
  ), false);
  assert.equal(ESCAPE.durationMs, 35_000);
});

test("Jargon Decoder vybírá šest unikátních a skutečně zamíchaných vět", function () {
  const rounds = buildJargonRounds("jargon-seed");
  assert.equal(rounds.length, JARGON_ROUNDS);
  assert.equal(new Set(rounds.map(function (round) { return round.phrase; })).size, JARGON_ROUNDS);
  rounds.forEach(function (round) {
    assert.deepEqual(round.words.slice().sort(), round.answer.slice().sort());
    assert.notDeepEqual(round.words, round.answer);
  });
});

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
