import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInboxZeroRounds,
  createInboxZeroPracticeResult,
  inboxZeroMessageScore,
  INBOX_ZERO,
  INBOX_ZERO_ACTIONS,
  INBOX_ZERO_MESSAGES,
  normalizeInboxZeroResult
} from "../duel/games/inbox-zero.mjs";
import {
  createPracticeResult,
  formatGameResult,
  GAME_IDS,
  getGame,
  getGameDefinition,
  normalizeGameResult
} from "../duel/games/registry.mjs";

test("Inbox Zero připraví deset unikátních a vyvážených zpráv", function () {
  const first = buildInboxZeroRounds("inbox-seed");
  const second = buildInboxZeroRounds("inbox-seed");
  const different = buildInboxZeroRounds("jiny-inbox");
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.equal(first.length, INBOX_ZERO.rounds);
  assert.equal(new Set(first.map(function (round) { return round.id; })).size, INBOX_ZERO.rounds);
  assert.equal(new Set(first.map(function (round) { return round.action; })).size, INBOX_ZERO_ACTIONS.length);
  assert.ok(first.every(function (round) {
    return INBOX_ZERO_MESSAGES.some(function (message) { return message.id === round.id; })
      && round.sender && round.subject && round.preview;
  }));
  const counts = Object.fromEntries(INBOX_ZERO_ACTIONS.map(function (action) {
    return [action.id, first.filter(function (round) { return round.action === action.id; }).length];
  }));
  assert.ok(Math.max(...Object.values(counts)) - Math.min(...Object.values(counts)) <= 1);
});

test("Inbox Zero dává za rychlou správnou reakci více bodů", function () {
  assert.equal(inboxZeroMessageScore(0), 600);
  assert.ok(inboxZeroMessageScore(500) > inboxZeroMessageScore(3_500));
  assert.equal(inboxZeroMessageScore(INBOX_ZERO.roundDurationMs), 150);
  assert.equal(inboxZeroMessageScore(Infinity), 0);
});

test("Inbox Zero normalizuje výsledek a vytváří stejného practice bota", function () {
  assert.ok(GAME_IDS.includes("inbox-zero"));
  assert.equal(getGameDefinition("inbox-zero").title, "Inbox Zero");
  assert.equal(getGame("inbox-zero").result.mode, "local");
  assert.equal(normalizeInboxZeroResult(null), null);
  assert.equal(normalizeInboxZeroResult({ score: Infinity }), null);
  assert.deepEqual(normalizeGameResult("inbox-zero", {
    score: Number.MAX_VALUE,
    correct: Number.MAX_VALUE,
    mistakes: Number.MAX_VALUE,
    timeouts: Number.MAX_VALUE,
    average: Infinity
  }), {
    score: INBOX_ZERO.maximumScore,
    correct: INBOX_ZERO.rounds,
    mistakes: INBOX_ZERO.rounds,
    timeouts: INBOX_ZERO.rounds,
    average: INBOX_ZERO.roundDurationMs
  });
  const bot = createInboxZeroPracticeResult("mail-bot");
  assert.deepEqual(bot, createPracticeResult("inbox-zero", "mail-bot"));
  assert.deepEqual(bot, createInboxZeroPracticeResult("mail-bot"));
  assert.ok(bot.correct >= 7 && bot.correct <= 9);
  assert.match(formatGameResult("inbox-zero", bot), /^\d+\/10 e-mailů · \d+ (přešlap|přešlapy|přešlapů)$/);
});
