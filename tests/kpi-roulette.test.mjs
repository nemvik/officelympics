import test from "node:test";
import assert from "node:assert/strict";

import {
  buildKpiRoulettePlan,
  createKpiRoulettePracticeResult,
  formatKpiRouletteResult,
  isViktorName,
  KPI_ROULETTE,
  normalizeKpiRouletteResult
} from "../duel/games/kpi-roulette.mjs";
import {
  createPracticeResult,
  formatGameResult,
  GAME_IDS,
  getGame,
  getGameDefinition,
  normalizeGameResult
} from "../duel/games/registry.mjs";

function score(plan) {
  return plan.reduce(function (sum, value) { return sum + value; }, 0);
}

test("KPI ruleta rozpozná přesně jméno Viktor bez ohledu na velikost písmen", function () {
  assert.equal(isViktorName("Viktor"), true);
  assert.equal(isViktorName("  VIKTOR  "), true);
  assert.equal(isViktorName("viktor"), true);
  assert.equal(isViktorName("Viktorie"), false);
  assert.equal(isViktorName("Viktor 2"), false);
  assert.equal(isViktorName(null), false);
});

test("Plán je deterministický a každé otočení odpovídá hodnotě na kole", function () {
  const first = buildKpiRoulettePlan("audit-seed", 0, "Petra");
  const second = buildKpiRoulettePlan("audit-seed", 0, "Petra");
  const different = buildKpiRoulettePlan("jiny-audit", 0, "Petra");
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.equal(first.length, KPI_ROULETTE.rounds);
  assert.ok(first.every(function (value) {
    return Number.isInteger(value)
      && value >= KPI_ROULETTE.minimumSpin
      && value <= KPI_ROULETTE.maximumSpin;
  }));
});

test("Viktorův těsný rozsah vždy překoná běžného hráče i practice bota", function () {
  for (let index = 0; index < 500; index += 1) {
    const seed = "kontrola-" + index;
    const viktorScore = score(buildKpiRoulettePlan(seed, index % 2, "Viktor"));
    const otherScore = score(buildKpiRoulettePlan(seed, 1 - (index % 2), "Alex"));
    const botScore = createKpiRoulettePracticeResult(seed).score;
    assert.ok(viktorScore >= 42 && viktorScore <= 45);
    assert.ok(otherScore >= 34 && otherScore <= 41);
    assert.ok(botScore >= 34 && botScore <= 41);
    assert.ok(viktorScore > otherScore);
    assert.ok(viktorScore > botScore);
  }
});

test("Výsledek KPI rulety je omezený a odvozuje jackpoty z otočení", function () {
  assert.equal(normalizeKpiRouletteResult(null), null);
  assert.equal(normalizeKpiRouletteResult({ score: NaN }), null);
  assert.deepEqual(normalizeKpiRouletteResult({
    score: Number.MAX_VALUE,
    spins: [-100, 3, 7, 9, 10, 999, 8, 8],
    jackpots: Number.MAX_VALUE
  }), {
    score: KPI_ROULETTE.maximumScore,
    spins: [3, 3, 7, 9, 10, 10],
    jackpots: 3
  });
  assert.deepEqual(normalizeKpiRouletteResult({ score: -9 }), {
    score: 0,
    spins: [],
    jackpots: 0
  });
});

test("KPI ruleta je registrovaná a používá stejný practice kontrakt jako registr", function () {
  assert.ok(GAME_IDS.includes("kpi-roulette"));
  assert.equal(getGameDefinition("kpi-roulette").title, "KPI ruleta");
  assert.equal(getGameDefinition("kpi-roulette").category, "perception");
  assert.equal(getGame("kpi-roulette").result.mode, "local");

  const bot = createKpiRoulettePracticeResult("bot-seed");
  assert.deepEqual(bot, createPracticeResult("kpi-roulette", "bot-seed"));
  assert.deepEqual(bot, normalizeGameResult("kpi-roulette", bot));
  assert.equal(formatKpiRouletteResult(bot), formatGameResult("kpi-roulette", bot));
  assert.match(formatGameResult("kpi-roulette", bot), /^6\/6 otočení · \d+ jackpot/);
});
