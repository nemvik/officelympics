import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildHarcovPriceRounds,
  createHarcovPricePracticeResult,
  formatHarcovDate,
  formatHarcovPrice,
  harcovPriceRoundScore,
  HARCOV_MEALS,
  HARCOV_PRICE,
  HARCOV_PRICE_SOURCE,
  normalizeHarcovPriceResult,
  roundHarcovPrice
} from "../duel/games/harcov-price.mjs";
import {
  createPracticeResult,
  formatGameResult,
  GAME_IDS,
  getGame,
  getGameDefinition,
  normalizeGameResult
} from "../duel/games/registry.mjs";

test("Harcovský dataset obsahuje 80 jídel bez polévky z 20 dnů", function () {
  assert.equal(HARCOV_MEALS.length, 80);
  assert.equal(new Set(HARCOV_MEALS.map(function (meal) { return meal.date; })).size, 20);
  assert.equal(new Set(HARCOV_MEALS.map(function (meal) { return meal.date + meal.name; })).size, HARCOV_MEALS.length);
  assert.equal(new Set(HARCOV_MEALS.map(function (meal) { return meal.price; })).size, HARCOV_MEALS.length);
  assert.ok(HARCOV_MEALS.every(function (meal) {
    return /^2026-(08|09)-\d{2}$/.test(meal.date)
      && meal.name && meal.portion && Number.isSafeInteger(meal.price)
      && meal.price > 10_000 && !/pol[eé]vk/i.test(meal.name);
  }));
  assert.deepEqual(HARCOV_MEALS[0], {
    date: "2026-08-17",
    name: "Uzené kuřecí stehno, bramborová kaše, zelný salát",
    portion: "220g",
    price: 17566
  });
  assert.equal(HARCOV_MEALS.at(-1).price, 15696);
  assert.equal(HARCOV_PRICE_SOURCE.menuDays, 20);
  assert.equal(HARCOV_PRICE_SOURCE.firstDate, "2026-08-17");
  assert.equal(HARCOV_PRICE_SOURCE.lastDate, "2026-09-11");
});

test("Harcov na korunu generuje deterministická kola se čtyřmi cenami", function () {
  const first = buildHarcovPriceRounds("hladovy-kolega");
  const second = buildHarcovPriceRounds("hladovy-kolega");
  const different = buildHarcovPriceRounds("jiny-obed");
  const sourcePrices = new Set(HARCOV_MEALS.map(function (meal) { return meal.price; }));

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.equal(first.length, HARCOV_PRICE.rounds);
  assert.equal(new Set(first.map(function (round) { return round.id; })).size, HARCOV_PRICE.rounds);
  assert.deepEqual(first.map(function (round) { return round.answerIndex; }).sort(), [0, 0, 1, 1, 2, 2, 3, 3]);

  first.forEach(function (round) {
    assert.equal(round.options.length, HARCOV_PRICE.optionCount);
    assert.equal(new Set(round.options).size, HARCOV_PRICE.optionCount);
    assert.equal(new Set(round.options.map(roundHarcovPrice)).size, HARCOV_PRICE.optionCount);
    assert.equal(round.options[round.answerIndex], round.price);
    assert.ok(round.options.every(function (price) { return sourcePrices.has(price); }));
  });
});

test("Harcovský kvíz formátuje ceny a plynule boduje rychlost", function () {
  assert.equal(HARCOV_PRICE.roundingCzk, 10);
  assert.equal(roundHarcovPrice(19723), 200);
  assert.equal(roundHarcovPrice(16300), 160);
  assert.equal(roundHarcovPrice(14510), 150);
  assert.equal(formatHarcovPrice(19723), "200 Kč");
  assert.equal(formatHarcovPrice(16300), "160 Kč");
  assert.equal(formatHarcovPrice(-1), "—");
  assert.equal(formatHarcovDate("2026-08-27"), "čtvrtek 27. srpna 2026");
  assert.equal(formatHarcovDate("2026-02-31"), "Neznámý den");
  assert.equal(harcovPriceRoundScore(0), 1000);
  assert.ok(harcovPriceRoundScore(1_000) > harcovPriceRoundScore(8_000));
  assert.equal(harcovPriceRoundScore(HARCOV_PRICE.roundDurationMs), 250);
  assert.equal(harcovPriceRoundScore(Infinity), 0);
});

test("Harcov na korunu je registrovaný lokální duel s omezeným výsledkem", function () {
  assert.ok(GAME_IDS.includes("harcov-price"));
  assert.equal(getGameDefinition("harcov-price").title, "Harcov na korunu");
  assert.equal(getGame("harcov-price").result.mode, "local");
  assert.equal(normalizeHarcovPriceResult(null), null);
  assert.equal(normalizeHarcovPriceResult({ score: Infinity }), null);
  assert.deepEqual(normalizeGameResult("harcov-price", {
    score: Number.MAX_VALUE,
    correct: Number.MAX_VALUE,
    mistakes: Number.MAX_VALUE,
    timeouts: Number.MAX_VALUE,
    average: Infinity
  }), {
    score: HARCOV_PRICE.maximumScore,
    correct: HARCOV_PRICE.rounds,
    mistakes: HARCOV_PRICE.rounds,
    timeouts: HARCOV_PRICE.rounds,
    average: HARCOV_PRICE.roundDurationMs
  });

  const bot = createHarcovPricePracticeResult("menza-bot");
  assert.deepEqual(bot, createPracticeResult("harcov-price", "menza-bot"));
  assert.deepEqual(bot, createHarcovPricePracticeResult("menza-bot"));
  assert.ok(bot.correct >= 4 && bot.correct <= 7);
  assert.equal(bot.correct + bot.mistakes + bot.timeouts, HARCOV_PRICE.rounds);
  assert.ok(bot.score >= bot.correct * 250 && bot.score <= bot.correct * 1000);
  assert.match(formatGameResult("harcov-price", bot), /^\d\/8 cen · průměr \d,\d s$/);
});

test("Harcovská hra používá jen uložený snapshot jídelníčku", async function () {
  const source = await readFile(new URL("../duel/games/harcov-price.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.match(source, /Veřejná cena bez přihlášení/);
});
