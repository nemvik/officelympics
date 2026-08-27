import test from "node:test";
import assert from "node:assert/strict";

import {
  ACCESS_DENIED,
  ACCESS_DENIED_LEVELS,
  ACCESS_DENIED_SYMBOLS,
  accessDeniedRoundScore,
  buildAccessDeniedRounds,
  classifyAccessGuess,
  createAccessDeniedPracticeResult,
  evaluateAccessCode,
  normalizeAccessDeniedResult
} from "../duel/games/access-denied.mjs";
import {
  createPracticeResult,
  formatGameResult,
  GAME_IDS,
  getGame,
  getGameDefinition,
  normalizeGameResult
} from "../duel/games/registry.mjs";

test("Access Denied připraví tři deterministické kódy s mírnou křivkou obtížnosti", function () {
  const first = buildAccessDeniedRounds("access-seed");
  const second = buildAccessDeniedRounds("access-seed");
  const different = buildAccessDeniedRounds("jiny-access-seed");
  const knownSymbols = new Set(ACCESS_DENIED_SYMBOLS.map(function (symbol) { return symbol.id; }));

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.equal(first.length, ACCESS_DENIED.rounds);

  first.forEach(function (round, index) {
    const level = ACCESS_DENIED_LEVELS[index];
    assert.equal(round.codeLength, level.codeLength);
    assert.equal(round.code.length, level.codeLength);
    assert.equal(round.keypad.length, level.symbolCount);
    assert.equal(new Set(round.keypad).size, round.keypad.length);
    assert.ok(round.code.every(function (symbolId) { return knownSymbols.has(symbolId) && round.keypad.includes(symbolId); }));

    assert.equal(round.allowDuplicates, false);
    assert.equal(new Set(round.code).size, round.code.length);
  });
  assert.deepEqual(first.map(function (round) { return round.codeLength; }), [3, 3, 4]);
  assert.deepEqual(first.map(function (round) { return round.keypad.length; }), [4, 5, 5]);
});

test("Access Denied vyhodnocuje přesné i přesunuté symboly bez dvojího započítání", function () {
  assert.deepEqual(
    classifyAccessGuess(["clip", "coffee", "clip", "folder"], ["clip", "clip", "folder", "coffee"]),
    { exact: 1, misplaced: 3, statuses: ["exact", "misplaced", "misplaced", "misplaced"] }
  );
  assert.deepEqual(
    evaluateAccessCode(["clip", "coffee", "clip", "folder"], ["clip", "clip", "folder", "coffee"]),
    { exact: 1, misplaced: 3 }
  );
  assert.deepEqual(
    evaluateAccessCode(["clip", "clip", "folder"], ["clip", "clip", "clip"]),
    { exact: 2, misplaced: 0 }
  );
  assert.deepEqual(
    evaluateAccessCode(["key", "idea"], ["key", "idea"]),
    { exact: 2, misplaced: 0 }
  );
  assert.deepEqual(evaluateAccessCode(null, ["clip"]), { exact: 0, misplaced: 0 });
});

test("Access Denied odměňuje rychlejší řešení s menším počtem pokusů", function () {
  assert.equal(accessDeniedRoundScore(0, 1), 1_500);
  assert.ok(accessDeniedRoundScore(2_000, 2) > accessDeniedRoundScore(12_000, 2));
  assert.ok(accessDeniedRoundScore(8_000, 2) > accessDeniedRoundScore(8_000, 6));
  assert.equal(accessDeniedRoundScore(Infinity, 1), 0);
  assert.ok(accessDeniedRoundScore(ACCESS_DENIED.roundDurationMs, ACCESS_DENIED.maxAttempts) >= 250);
});

test("Access Denied je registrovaný a bezpečně normalizuje výsledek i practice bota", function () {
  assert.ok(GAME_IDS.includes("access-denied"));
  assert.equal(getGameDefinition("access-denied").title, "Access Denied");
  assert.equal(getGame("access-denied").result.mode, "local");
  assert.equal(normalizeAccessDeniedResult(null), null);
  assert.equal(normalizeAccessDeniedResult({ score: Infinity }), null);
  assert.deepEqual(normalizeGameResult("access-denied", {
    score: Number.MAX_VALUE,
    cracked: Number.MAX_VALUE,
    attempts: Number.MAX_VALUE,
    timeouts: Number.MAX_VALUE,
    average: Infinity
  }), {
    score: ACCESS_DENIED.maximumScore,
    cracked: ACCESS_DENIED.rounds,
    attempts: ACCESS_DENIED.rounds * ACCESS_DENIED.maxAttempts,
    timeouts: ACCESS_DENIED.rounds,
    average: ACCESS_DENIED.roundDurationMs
  });

  const bot = createAccessDeniedPracticeResult("access-bot");
  assert.deepEqual(bot, createAccessDeniedPracticeResult("access-bot"));
  assert.deepEqual(bot, createPracticeResult("access-denied", "access-bot"));
  assert.ok(bot.cracked >= 2 && bot.cracked <= ACCESS_DENIED.rounds);
  assert.ok(bot.score >= 0 && bot.score <= ACCESS_DENIED.maximumScore);
  assert.match(formatGameResult("access-denied", bot), /^\d+\/3 kódy · \d+ (pokus|pokusy|pokusů)$/);
});
