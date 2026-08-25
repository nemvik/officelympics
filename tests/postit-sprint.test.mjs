import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPostitSprintRounds,
  createPostitSprintPracticeResult,
  normalizePostitSprintResult,
  POSTIT_SPRINT,
  postitSprintRoundScore
} from "../duel/games/postit-sprint.mjs";
import {
  createPracticeResult,
  formatGameResult,
  GAME_IDS,
  getGame,
  getGameDefinition,
  normalizeGameResult
} from "../duel/games/registry.mjs";

test("Post-it Sprint generuje tři deterministické zamíchané nástěnky", function () {
  const first = buildPostitSprintRounds("lepikovy-seed");
  const second = buildPostitSprintRounds("lepikovy-seed");
  const different = buildPostitSprintRounds("jiny-lepik");

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.equal(first.length, POSTIT_SPRINT.rounds);
  first.forEach(function (round) {
    assert.equal(round.notes.length, POSTIT_SPRINT.notesPerRound);
    assert.deepEqual(round.notes.map(function (note) { return note.number; }).sort(function (a, b) { return a - b; }),
      Array.from({ length: POSTIT_SPRINT.notesPerRound }, function (_, index) { return index + 1; }));
    assert.notDeepEqual(round.notes.map(function (note) { return note.number; }),
      Array.from({ length: POSTIT_SPRINT.notesPerRound }, function (_, index) { return index + 1; }));
  });
});

test("Post-it Sprint odměňuje dokončení, rychlost a čistý průchod", function () {
  assert.equal(postitSprintRoundScore(0, 0, 12), 1_900);
  assert.ok(postitSprintRoundScore(2_000, 0, 12) > postitSprintRoundScore(8_000, 0, 12));
  assert.ok(postitSprintRoundScore(4_000, 0, 12) > postitSprintRoundScore(4_000, 3, 12));
  assert.equal(postitSprintRoundScore(12_000, 10, 7), 700);
  assert.equal(postitSprintRoundScore(0, 0, -50), 0);
});

test("Post-it Sprint má omezený výsledek a deterministického practice bota", function () {
  assert.ok(GAME_IDS.includes("postit-sprint"));
  assert.equal(getGameDefinition("postit-sprint").title, "Post-it Sprint");
  assert.equal(getGame("postit-sprint").result.mode, "local");
  assert.equal(normalizePostitSprintResult(null), null);
  assert.equal(normalizePostitSprintResult({ score: NaN }), null);
  assert.deepEqual(normalizeGameResult("postit-sprint", {
    score: Number.MAX_VALUE,
    correct: Number.MAX_VALUE,
    completed: Number.MAX_VALUE,
    mistakes: Number.MAX_VALUE,
    average: Infinity
  }), {
    score: POSTIT_SPRINT.maximumScore,
    correct: 36,
    completed: 3,
    mistakes: 99,
    average: POSTIT_SPRINT.roundDurationMs
  });

  const first = createPostitSprintPracticeResult("lepic-bot");
  assert.deepEqual(first, createPracticeResult("postit-sprint", "lepic-bot"));
  assert.deepEqual(first, createPostitSprintPracticeResult("lepic-bot"));
  assert.ok(first.correct >= 29 && first.correct <= 36);
  assert.match(formatGameResult("postit-sprint", first), /^\d+\/36 lepíků · \d+ (chyba|chyby|chyb)$/);
});
