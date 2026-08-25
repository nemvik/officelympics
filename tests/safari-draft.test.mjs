import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildSafariDraftOffers,
  clampSafariCaptureRate,
  consumeSafariDraftBalls,
  createSafariDraftInventory,
  formatSafariDraftResult,
  hashSafariDraftChoice,
  normalizeSafariDraftResult,
  pickSafariDraftBotChoice,
  pickSafariDraftTimeoutChoice,
  resolveSafariDraftRound,
  SAFARI_DRAFT,
  SAFARI_DRAFT_BALLS,
  SAFARI_DRAFT_MESSAGE_TYPES,
  safariDraftCaptureChance,
  safariDraftCapturePoints,
  safariDraftCaptureRoll,
  validateSafariDraftCommit,
  validateSafariDraftReveal
} from "../duel/games/safari-draft.mjs";
import { POKEMON_SNAPSHOT } from "../duel/games/pokemon/snapshot.mjs";
import {
  createPracticeResult,
  formatGameResult,
  GAME_IDS,
  getGame,
  getGameDefinition,
  normalizeGameResult
} from "../duel/games/registry.mjs";

const POKEMON_BY_ID = new Map(POKEMON_SNAPSHOT.map(function (pokemon) {
  return [pokemon.id, pokemon];
}));

test("Safari Draft generuje deterministických šest čtyřčlenných nabídek", function () {
  const first = buildSafariDraftOffers("safari-seed");
  const second = buildSafariDraftOffers("safari-seed");
  const different = buildSafariDraftOffers("jiné-safari");

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.equal(first.length, SAFARI_DRAFT.rounds);
  assert.ok(first.every(function (offer) {
    return offer.length === SAFARI_DRAFT.offerSize && new Set(offer).size === SAFARI_DRAFT.offerSize;
  }));
});

test("Safari Draft nechává dvacet sekund na volbu", function () {
  assert.equal(SAFARI_DRAFT.choiceDurationMs, 20_000);
});

test("Všech 24 nabízených Pokémonů je unikátních, lokálních a z Kanta", function () {
  const offers = buildSafariDraftOffers("unikátní-safari");
  const ids = offers.flat();
  assert.equal(ids.length, SAFARI_DRAFT.rounds * SAFARI_DRAFT.offerSize);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(function (pokemonId) {
    return pokemonId >= 1 && pokemonId <= 151 && POKEMON_BY_ID.has(pokemonId);
  }));
});

test("Každé kolo má běžného i vzácného Pokémona a fallback neduplikuje", function () {
  const offers = buildSafariDraftOffers("kategorie");
  offers.forEach(function (offer) {
    const points = offer.map(function (pokemonId) {
      return safariDraftCapturePoints(POKEMON_BY_ID.get(pokemonId).captureRate);
    });
    assert.ok(points.some(function (value) { return value <= 2; }), "chybí běžný cíl");
    assert.ok(points.some(function (value) { return value >= 5; }), "chybí vzácný cíl");
  });

  const fallbackRecords = Array.from({ length: 24 }, function (_, index) {
    return {
      id: index + 1,
      name: "Test " + (index + 1),
      sprite: "https://example.test/" + (index + 1) + ".png",
      types: ["normal"],
      captureRate: 100
    };
  });
  const fallback = buildSafariDraftOffers("fallback", fallbackRecords).flat();
  assert.equal(fallback.length, 24);
  assert.equal(new Set(fallback).size, 24);
});

test("Snapshot obsahuje platný PokeAPI capture rate pro všech 151 druhů", function () {
  assert.equal(POKEMON_SNAPSHOT.length, 151);
  assert.equal(POKEMON_BY_ID.get(10).captureRate, 255);
  assert.equal(POKEMON_BY_ID.get(150).captureRate, 3);
  POKEMON_SNAPSHOT.forEach(function (pokemon) {
    assert.ok(Number.isInteger(pokemon.captureRate));
    assert.ok(pokemon.captureRate >= 1 && pokemon.captureRate <= 255);
  });
});

test("Capture rate se bezpečně omezuje a šance respektuje multiplikátory i strop", function () {
  assert.equal(clampSafariCaptureRate(null), 1);
  assert.equal(clampSafariCaptureRate(NaN), 1);
  assert.equal(clampSafariCaptureRate(-Infinity), 1);
  assert.equal(clampSafariCaptureRate(Infinity), 255);
  assert.equal(clampSafariCaptureRate(-100), 1);
  assert.equal(clampSafariCaptureRate(999), 255);

  assert.equal(safariDraftCaptureChance(255, "poke"), 0.8);
  assert.equal(safariDraftCaptureChance(255, "great"), 0.95);
  assert.equal(safariDraftCaptureChance(255, "ultra"), 0.95);
  assert.equal(safariDraftCaptureChance(-999, "poke"), 0.12 + 0.68 / 255);
  assert.equal(safariDraftCaptureChance(45, "great"), (0.12 + 0.68 * 45 / 255) * 1.45);
  assert.equal(safariDraftCaptureChance(45, "missing"), null);
});

test("Bodová hodnota capture rate je vždy v rozsahu 1 až 6", function () {
  assert.equal(safariDraftCapturePoints(255), 1);
  assert.equal(safariDraftCapturePoints(190), 2);
  assert.equal(safariDraftCapturePoints(120), 4);
  assert.equal(safariDraftCapturePoints(45), 5);
  assert.equal(safariDraftCapturePoints(3), 6);
  assert.equal(safariDraftCapturePoints(-Infinity), 6);
  assert.equal(safariDraftCapturePoints(Infinity), 1);
});

test("Různé cíle dávají oběma hráčům vlastní deterministický pokus", function () {
  const choices = [{ pokemonId: 25, ballId: "poke" }, { pokemonId: 26, ballId: "great" }];
  const first = resolveSafariDraftRound("různé", 0, choices);
  const second = resolveSafariDraftRound("různé", 0, choices);
  assert.deepEqual(first, second);
  assert.equal(first.collision, "different-targets");
  assert.deepEqual(first.attempts.map(function (attempt) { return attempt.eligible; }), [true, true]);
  assert.ok(first.attempts.every(function (attempt) {
    return attempt.roll >= 0 && attempt.roll < 1;
  }));
});

test("Stejný cíl se silnějším míčkem dává pokus jen silnější roli", function () {
  const result = resolveSafariDraftRound("silnější", 2, [
    { pokemonId: 150, ballId: "poke" },
    { pokemonId: 150, ballId: "ultra" }
  ]);
  assert.equal(result.collision, "stronger-ball");
  assert.deepEqual(result.attempts.map(function (attempt) { return attempt.eligible; }), [false, true]);
  assert.equal(result.attempts[0].roll, null);
  assert.equal(result.attempts[0].points, 0);
});

test("Stejný cíl i druh míčku nechá Pokémona utéct oběma", function () {
  const result = resolveSafariDraftRound("shoda", 3, [
    { pokemonId: 42, ballId: "great" },
    { pokemonId: 42, ballId: "great" }
  ]);
  assert.equal(result.collision, "same-ball");
  assert.deepEqual(result.points, [0, 0]);
  assert.deepEqual(result.attempts.map(function (attempt) {
    return { eligible: attempt.eligible, roll: attempt.roll, caught: attempt.caught };
  }), [
    { eligible: false, roll: null, caught: false },
    { eligible: false, roll: null, caught: false }
  ]);
});

test("Inventář se spotřebuje atomicky bez ohledu na kolizi", function () {
  const inventories = [createSafariDraftInventory(), createSafariDraftInventory()];
  const sameBallCollision = [{ pokemonId: 25, ballId: "ultra" }, { pokemonId: 25, ballId: "ultra" }];
  assert.equal(consumeSafariDraftBalls(inventories, sameBallCollision), true);
  assert.deepEqual(inventories.map(function (inventory) { return inventory.ultra; }), [0, 0]);

  const before = structuredClone(inventories);
  assert.equal(consumeSafariDraftBalls(inventories, sameBallCollision), false);
  assert.deepEqual(inventories, before);
  assert.equal(consumeSafariDraftBalls(inventories, [
    { pokemonId: 1, ballId: "missing" },
    { pokemonId: 2, ballId: "poke" }
  ]), false);
  assert.deepEqual(inventories, before);
});

test("Deterministický hod pokrývá úspěšný i neúspěšný pokus", function () {
  const chance = safariDraftCaptureChance(POKEMON_BY_ID.get(25).captureRate, "poke");
  const successRoll = safariDraftCaptureRoll("success", 0, 0, 25, "poke");
  const failureRoll = safariDraftCaptureRoll("failure", 0, 0, 25, "poke");
  assert.ok(successRoll < chance);
  assert.ok(failureRoll >= chance);
  assert.equal(resolveSafariDraftRound("success", 0, [
    { pokemonId: 25, ballId: "poke" },
    { pokemonId: 26, ballId: "poke" }
  ]).attempts[0].caught, true);
  assert.equal(resolveSafariDraftRound("failure", 0, [
    { pokemonId: 25, ballId: "poke" },
    { pokemonId: 26, ballId: "poke" }
  ]).attempts[0].caught, false);
});

test("Timeout vždy použije nejslabší dostupný míček a seedovaný platný cíl", function () {
  const inventory = createSafariDraftInventory();
  const first = pickSafariDraftTimeoutChoice("timeout", 0, 4, [151, 25, 42, 25, 999], inventory);
  assert.deepEqual(first, pickSafariDraftTimeoutChoice("timeout", 0, 4, [151, 25, 42, 25, 999], inventory));
  assert.ok([25, 42, 151].includes(first.pokemonId));
  assert.equal(first.ballId, "poke");
  inventory.poke = 0;
  assert.equal(pickSafariDraftTimeoutChoice("timeout", 0, 4, [25], inventory).ballId, "great");
  inventory.great = 0;
  assert.equal(pickSafariDraftTimeoutChoice("timeout", 0, 4, [25], inventory).ballId, "ultra");
  assert.equal(pickSafariDraftTimeoutChoice("timeout", 0, 9, [25], inventory), null);
  assert.equal(pickSafariDraftTimeoutChoice("timeout", 0, 4, [], inventory), null);
});

test("Practice bot je deterministický, plánuje celý inventář a nepálí vždy Ultra Ball první", function () {
  const offers = buildSafariDraftOffers("a");
  const inventory = createSafariDraftInventory();
  const choices = offers.map(function (offer, round) {
    const choice = pickSafariDraftBotChoice("a", round, offer, inventory, offers.slice(round + 1));
    assert.deepEqual(choice, pickSafariDraftBotChoice("a", round, offer, inventory, offers.slice(round + 1)));
    assert.ok(offer.includes(choice.pokemonId));
    assert.ok(inventory[choice.ballId] > 0);
    inventory[choice.ballId] -= 1;
    return choice;
  });
  assert.equal(choices[0].ballId, "poke");
  assert.deepEqual(inventory, { poke: 0, great: 0, ultra: 0 });
  assert.deepEqual(choices.map(function (choice) { return choice.ballId; }).sort(),
    ["great", "great", "poke", "poke", "poke", "ultra"]);
});

test("Commit skrývá cíl i míček a validátor odmítá duplicitu, roli, kolo a hash", async function () {
  const nonce = "ab".repeat(SAFARI_DRAFT.nonceBytes);
  const hash = await hashSafariDraftChoice(2, 0, 25, "great", nonce);
  const commit = { type: SAFARI_DRAFT_MESSAGE_TYPES.commit, round: 2, role: 0, hash };
  assert.deepEqual(Object.keys(commit).sort(), ["hash", "role", "round", "type"]);
  assert.equal(validateSafariDraftCommit(commit, { role: 0, round: 2, received: false }), true);
  assert.equal(validateSafariDraftCommit(commit, { role: 0, round: 2, received: true }), false);
  assert.equal(validateSafariDraftCommit(commit, { role: 0, round: 3, received: false }), false);
  assert.equal(validateSafariDraftCommit(commit, { role: 1, round: 2, received: false }), false);
  assert.equal(validateSafariDraftCommit({ ...commit, hash: "x".repeat(64) }, { role: 0, round: 2 }), false);
  assert.equal(validateSafariDraftCommit({ ...commit, round: 2.5 }, { role: 0, round: 2 }), false);
  assert.equal(validateSafariDraftCommit({ ...commit, v: 2, matchId: "match" }, {
    role: 0, round: 2, received: false
  }), true);
  assert.notEqual(hash, await hashSafariDraftChoice(2, 0, 26, "great", nonce));
  assert.notEqual(hash, await hashSafariDraftChoice(2, 0, 25, "ultra", nonce));
});

test("Reveal ověří pořadí, hash, nonce, nabídku, míček, inventář, roli i kolo", async function () {
  const nonce = "cd".repeat(SAFARI_DRAFT.nonceBytes);
  const hash = await hashSafariDraftChoice(1, 1, 42, "great", nonce);
  const reveal = {
    type: SAFARI_DRAFT_MESSAGE_TYPES.reveal,
    round: 1,
    role: 1,
    pokemonId: 42,
    ballId: "great",
    nonce
  };
  const expected = {
    role: 1,
    round: 1,
    commitsReady: true,
    received: false,
    allowedIds: [7, 42, 151],
    inventory: createSafariDraftInventory(),
    commitHash: hash
  };
  assert.equal(await validateSafariDraftReveal(reveal, expected), true);
  assert.equal(await validateSafariDraftReveal(reveal, { ...expected, commitsReady: false }), false);
  assert.equal(await validateSafariDraftReveal(reveal, { ...expected, received: true }), false);
  assert.equal(await validateSafariDraftReveal({ ...reveal, round: 2 }, expected), false);
  assert.equal(await validateSafariDraftReveal({ ...reveal, role: 0 }, expected), false);
  assert.equal(await validateSafariDraftReveal({ ...reveal, pokemonId: 999 }, expected), false);
  assert.equal(await validateSafariDraftReveal({ ...reveal, pokemonId: 41 }, expected), false);
  assert.equal(await validateSafariDraftReveal({ ...reveal, ballId: "master" }, expected), false);
  assert.equal(await validateSafariDraftReveal({ ...reveal, nonce: "x".repeat(32) }, expected), false);
  assert.equal(await validateSafariDraftReveal({ ...reveal, nonce: "ef".repeat(SAFARI_DRAFT.nonceBytes) }, expected), false);
  assert.equal(await validateSafariDraftReveal(reveal, {
    ...expected,
    inventory: { ...expected.inventory, great: 0 }
  }), false);
  assert.equal(await validateSafariDraftReveal(reveal, { ...expected, commitHash: "0".repeat(64) }), false);
  assert.equal(await validateSafariDraftReveal({ ...reveal, v: 2, matchId: "match" }, expected), true);
});

test("Dvojí použití spotřebovaného míčku je odmítnuté i při platném hashi", async function () {
  const nonce = "ef".repeat(SAFARI_DRAFT.nonceBytes);
  const hash = await hashSafariDraftChoice(4, 1, 25, "ultra", nonce);
  assert.equal(await validateSafariDraftReveal({
    type: SAFARI_DRAFT_MESSAGE_TYPES.reveal,
    round: 4,
    role: 1,
    pokemonId: 25,
    ballId: "ultra",
    nonce
  }, {
    role: 1,
    round: 4,
    commitsReady: true,
    received: false,
    allowedIds: [25, 42, 88, 151],
    inventory: { poke: 1, great: 1, ultra: 0 },
    commitHash: hash
  }), false);
});

test("Výsledková hranice bezpečně omezuje celé skóre na 0 až 36", function () {
  assert.equal(normalizeSafariDraftResult(null), null);
  assert.equal(normalizeSafariDraftResult({ score: NaN }), null);
  assert.equal(normalizeSafariDraftResult({ score: Infinity }), null);
  assert.equal(normalizeSafariDraftResult({ score: -Infinity }), null);
  assert.deepEqual(normalizeSafariDraftResult({ score: -999 }), { score: 0 });
  assert.deepEqual(normalizeSafariDraftResult({ score: 18.6 }), { score: 19 });
  assert.deepEqual(normalizeSafariDraftResult({ score: Number.MAX_VALUE }), { score: SAFARI_DRAFT.maximumScore });
  assert.equal(formatSafariDraftResult({ score: 19 }), "19/36 safari bodů");
});

test("Safari Draft je registrovaná shared hra bez samostatného practice výsledku", function () {
  assert.ok(GAME_IDS.includes("safari-draft"));
  assert.equal(getGameDefinition("safari-draft").title, "Safari Draft");
  assert.equal(getGame("safari-draft").result.mode, "shared");
  assert.deepEqual(normalizeGameResult("safari-draft", { score: 999 }), { score: 36 });
  assert.equal(formatGameResult("safari-draft", { score: 36 }), "36/36 safari bodů");
  assert.throws(function () { createPracticeResult("safari-draft", "seed"); }, /sdílený výsledek/);
});

test("Runtime Safari Draftu používá pouze lokální snapshot bez fetch requestů", async function () {
  const gameSource = await readFile(new URL("../duel/games/safari-draft.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(gameSource, /\bfetch\s*\(/);
  assert.deepEqual(SAFARI_DRAFT_BALLS.map(function (ball) { return ball.initial; }), [3, 2, 1]);
});
