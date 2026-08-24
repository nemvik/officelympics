import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildOakBingoMatch,
  calculateOakBingoScore,
  completedOakBingoLineIndexes,
  countCompletedOakBingoLines,
  createOakBingoPracticeResult,
  createOakBingoState,
  discardOakBingoPokemon,
  formatOakBingoCondition,
  normalizeOakBingoResult,
  OAK_BINGO,
  oakBingoConditionKey,
  oakBingoPlacementScore,
  placeOakBingoPokemon,
  pokemonMatchesOakBingoCondition
} from "../duel/games/oak-bingo.mjs";
import { POKEMON_SNAPSHOT, POKEMON_SNAPSHOT_META } from "../duel/games/pokemon/snapshot.mjs";
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

function independentMatch(pokemon, condition) {
  if (condition.kind === "type") return pokemon.types.includes(condition.value);
  if (condition.kind === "weight-below") return pokemon.weight < condition.threshold;
  if (condition.kind === "weight-above") return pokemon.weight > condition.threshold;
  if (condition.kind === "speed-above") return pokemon.speed > condition.threshold;
  if (condition.kind === "hp-above") return pokemon.hp > condition.threshold;
  if (condition.kind === "height-below") return pokemon.height < condition.threshold;
  if (condition.kind === "color") return pokemon.color === condition.value;
  if (condition.kind === "type-count") return pokemon.types.length === condition.count;
  if (condition.kind === "evolution-stage") return pokemon.evolutionStage === condition.value;
  return false;
}

function hasIndependentSolution(conditions, sequence) {
  const uniquePokemon = Array.from(new Set(sequence)).map(function (id) { return POKEMON_BY_ID.get(id); }).filter(Boolean);
  const candidateIds = conditions.map(function (condition) {
    return uniquePokemon.filter(function (pokemon) {
      return independentMatch(pokemon, condition);
    }).map(function (pokemon) { return pokemon.id; });
  });
  const order = conditions.map(function (_, index) { return index; }).sort(function (first, second) {
    return candidateIds[first].length - candidateIds[second].length;
  });

  function search(position, used) {
    if (position === order.length) return true;
    return candidateIds[order[position]].some(function (pokemonId) {
      if (used.has(pokemonId)) return false;
      used.add(pokemonId);
      const solved = search(position + 1, used);
      used.delete(pokemonId);
      return solved;
    });
  }

  return search(0, new Set());
}

test("Oakovo PokéBingo generuje ze stejného seedu stejnou desku i sekvenci", function () {
  const first = buildOakBingoMatch("oakova-laborator");
  const second = buildOakBingoMatch("oakova-laborator");
  const different = buildOakBingoMatch("jiny-vyzkum");

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.equal(first.conditions.length, OAK_BINGO.cellCount);
  assert.equal(first.sequence.length, OAK_BINGO.sequenceLength);
  assert.equal(new Set(first.sequence).size, OAK_BINGO.sequenceLength);
  assert.equal(first.solution.length, OAK_BINGO.cellCount);
  assert.equal(first.distractors.length, 3);
});

test("Každá deska má devět unikátních podmínek a používá pouze Pokémony 1–151", function () {
  Array.from({ length: 250 }, function (_, index) { return "kontrola-" + index; }).forEach(function (seed) {
    const match = buildOakBingoMatch(seed);
    assert.equal(new Set(match.conditions.map(oakBingoConditionKey)).size, OAK_BINGO.cellCount);
    assert.equal(new Set(match.conditions.map(function (condition) { return condition.kind; })).size, OAK_BINGO.cellCount);
    assert.ok(match.conditions.every(function (condition) { return formatOakBingoCondition(condition) !== "Neplatná podmínka"; }));
    assert.ok(match.sequence.every(function (pokemonId) {
      return Number.isInteger(pokemonId) && pokemonId >= 1 && pokemonId <= 151 && POKEMON_BY_ID.has(pokemonId);
    }));
  });
});

test("Nezávislý backtracking najde kompletní řešení v dodané sekvenci pro každý vzorek seedů", function () {
  Array.from({ length: 500 }, function (_, index) { return "solver-" + index; }).forEach(function (seed) {
    const match = buildOakBingoMatch(seed);
    assert.equal(hasIndependentSolution(match.conditions, match.sequence), true, "neřešitelný seed " + seed);
    match.solution.forEach(function (pokemonId, cellIndex) {
      assert.equal(independentMatch(POKEMON_BY_ID.get(pokemonId), match.conditions[cellIndex]), true);
    });
  });
});

test("Validátor podmínek pokrývá typy, rozměry, staty, barvu, počet typů i evoluci", function () {
  const bulbasaur = POKEMON_BY_ID.get(1);
  const diglett = POKEMON_BY_ID.get(50);
  const electrode = POKEMON_BY_ID.get(101);
  const chansey = POKEMON_BY_ID.get(113);
  const snorlax = POKEMON_BY_ID.get(143);
  const dragonite = POKEMON_BY_ID.get(149);

  assert.equal(pokemonMatchesOakBingoCondition(bulbasaur, { kind: "type", value: "grass" }), true);
  assert.equal(pokemonMatchesOakBingoCondition(bulbasaur, { kind: "type", value: "fire" }), false);
  assert.equal(pokemonMatchesOakBingoCondition(diglett, { kind: "weight-below", threshold: 50 }), true);
  assert.equal(pokemonMatchesOakBingoCondition(snorlax, { kind: "weight-above", threshold: 2000 }), true);
  assert.equal(pokemonMatchesOakBingoCondition(diglett, { kind: "height-below", threshold: 5 }), true);
  assert.equal(pokemonMatchesOakBingoCondition(electrode, { kind: "speed-above", threshold: 110 }), true);
  assert.equal(pokemonMatchesOakBingoCondition(chansey, { kind: "hp-above", threshold: 150 }), true);
  assert.equal(pokemonMatchesOakBingoCondition(bulbasaur, { kind: "color", value: "green" }), true);
  assert.equal(pokemonMatchesOakBingoCondition(bulbasaur, { kind: "type-count", count: 2 }), true);
  assert.equal(pokemonMatchesOakBingoCondition(electrode, { kind: "type-count", count: 1 }), true);
  assert.equal(pokemonMatchesOakBingoCondition(bulbasaur, { kind: "evolution-stage", value: "base" }), true);
  assert.equal(pokemonMatchesOakBingoCondition(dragonite, { kind: "evolution-stage", value: "final" }), true);
  assert.equal(pokemonMatchesOakBingoCondition(null, { kind: "color", value: "green" }), false);
  assert.equal(pokemonMatchesOakBingoCondition(bulbasaur, { kind: "unknown" }), false);
});

test("Neplatné ani obsazené políčko kartu neumístí a platné umístění je nevratné", function () {
  const match = buildOakBingoMatch("pravidla-umisteni");
  const initial = createOakBingoState();
  const current = POKEMON_BY_ID.get(match.sequence[0]);
  const validCell = match.conditions.findIndex(function (condition) {
    return pokemonMatchesOakBingoCondition(current, condition);
  });
  const invalidCell = match.conditions.findIndex(function (condition) {
    return !pokemonMatchesOakBingoCondition(current, condition);
  });
  assert.ok(validCell >= 0);
  assert.ok(invalidCell >= 0);

  const invalid = placeOakBingoPokemon(initial, match, invalidCell, 1000);
  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reason, "incompatible");
  assert.equal(invalid.state, initial);
  assert.deepEqual(initial, createOakBingoState());

  const placed = placeOakBingoPokemon(initial, match, validCell, 1000);
  assert.equal(placed.accepted, true);
  assert.equal(placed.state.processed, 1);
  assert.equal(placed.state.placements[validCell], current.id);
  assert.equal(initial.placements[validCell], null);

  const occupied = placeOakBingoPokemon(placed.state, match, validCell, 500);
  assert.equal(occupied.accepted, false);
  assert.equal(occupied.reason, "occupied");
  assert.equal(occupied.state, placed.state);
  assert.equal(placeOakBingoPokemon(placed.state, match, -1, 500).reason, "invalid-cell");
});

test("Časový bonus klesá lineárně a úplná perfektní mřížka dává přesně 3 800 bodů", function () {
  assert.equal(oakBingoPlacementScore(0), 200);
  assert.equal(oakBingoPlacementScore(2500), 175);
  assert.equal(oakBingoPlacementScore(5000), 150);
  assert.equal(oakBingoPlacementScore(10_000), 100);
  assert.equal(oakBingoPlacementScore(50_000), 100);
  assert.equal(oakBingoPlacementScore(-10), 200);
  assert.equal(oakBingoPlacementScore(NaN), 100);
  assert.equal(calculateOakBingoScore(Array(9).fill(200), Array(9).fill(1)), OAK_BINGO.maximumScore);
});

test("Garantované řešení lze skutečně odehrát a hra skončí plnou mřížkou s maximem", function () {
  const match = buildOakBingoMatch("perfektni-profesor");
  let state = createOakBingoState();

  while (!state.finished) {
    const pokemonId = match.sequence[state.processed];
    const targetCell = match.solution.indexOf(pokemonId);
    const outcome = targetCell >= 0
      ? placeOakBingoPokemon(state, match, targetCell, 0)
      : discardOakBingoPokemon(state, match, "manual");
    assert.equal(outcome.accepted, true);
    state = outcome.state;
  }

  assert.equal(state.placements.every(Boolean), true);
  assert.equal(state.completedLines.length, 8);
  assert.equal(state.score, OAK_BINGO.maximumScore);
  assert.ok(state.processed >= 9 && state.processed <= 12);
});

test("Počítání linek rozlišuje tři řádky, tři sloupce a dvě diagonály", function () {
  assert.deepEqual(completedOakBingoLineIndexes([1, 1, 1, null, null, null, null, null, null]), [0]);
  assert.deepEqual(completedOakBingoLineIndexes([1, null, null, 1, null, null, 1, null, null]), [3]);
  assert.deepEqual(completedOakBingoLineIndexes([1, null, null, null, 1, null, null, null, 1]), [6]);
  assert.deepEqual(completedOakBingoLineIndexes([null, null, 1, null, 1, null, 1, null, null]), [7]);
  assert.equal(countCompletedOakBingoLines(Array(9).fill(1)), 8);
  assert.equal(countCompletedOakBingoLines([]), 0);
});

test("Tři zahození spotřebují tři žetony, další ruční pokus neprojde a timeout kartu ztratí", function () {
  const match = buildOakBingoMatch("zahazovani");
  let state = createOakBingoState();
  for (let index = 0; index < OAK_BINGO.discardLimit; index += 1) {
    const outcome = discardOakBingoPokemon(state, match, "manual");
    assert.equal(outcome.accepted, true);
    assert.equal(outcome.usedDiscard, true);
    state = outcome.state;
  }
  assert.equal(state.discardsRemaining, 0);
  assert.equal(state.discardsUsed, 3);
  const refused = discardOakBingoPokemon(state, match, "manual");
  assert.equal(refused.accepted, false);
  assert.equal(refused.reason, "no-discards");
  assert.equal(refused.state.processed, 3);

  const timedOut = discardOakBingoPokemon(state, match, "timeout");
  assert.equal(timedOut.accepted, true);
  assert.equal(timedOut.usedDiscard, false);
  assert.equal(timedOut.state.lost, 1);
  assert.equal(timedOut.state.processed, 4);
  state = timedOut.state;
  while (!state.finished) state = discardOakBingoPokemon(state, match, "timeout").state;
  assert.equal(state.processed, OAK_BINGO.sequenceLength);
  assert.equal(discardOakBingoPokemon(state, match, "timeout").accepted, false);
});

test("Normalizace odmítá nečíselná skóre, pole a omezuje všechna výsledková pole", function () {
  assert.equal(normalizeOakBingoResult(null), null);
  assert.equal(normalizeOakBingoResult([]), null);
  assert.equal(normalizeOakBingoResult({ score: [] }), null);
  assert.equal(normalizeOakBingoResult({ score: NaN }), null);
  assert.equal(normalizeOakBingoResult({ score: Infinity }), null);
  assert.equal(normalizeOakBingoResult({ score: -Infinity }), null);
  assert.deepEqual(normalizeOakBingoResult({
    score: -100,
    placed: -5,
    lines: -8,
    averageReactionMs: -1,
    discardsUsed: -2,
    placements: Array(10_000).fill("od soupeře")
  }), {
    score: 0,
    placed: 0,
    lines: 0,
    averageReactionMs: 0,
    discardsUsed: 0
  });
  assert.deepEqual(normalizeOakBingoResult({
    score: Number.MAX_VALUE,
    placed: Number.MAX_VALUE,
    lines: Number.MAX_VALUE,
    averageReactionMs: Infinity,
    discardsUsed: Number.MAX_VALUE
  }), {
    score: OAK_BINGO.maximumScore,
    placed: 9,
    lines: 8,
    averageReactionMs: OAK_BINGO.cardDurationMs,
    discardsUsed: 3
  });
});

test("Oakovo PokéBingo je registrovaná lokální hra s proměnlivým deterministickým botem", function () {
  assert.ok(GAME_IDS.includes("oak-bingo"));
  assert.equal(getGameDefinition("oak-bingo").title, "Oakovo PokéBingo");
  assert.equal(getGame("oak-bingo").result.mode, "local");
  assert.deepEqual(normalizeGameResult("oak-bingo", { score: Number.MAX_VALUE }).score, OAK_BINGO.maximumScore);

  const first = createOakBingoPracticeResult("bot-profesor");
  const throughRegistry = createPracticeResult("oak-bingo", "bot-profesor");
  assert.deepEqual(first, throughRegistry);
  assert.deepEqual(throughRegistry, createPracticeResult("oak-bingo", "bot-profesor"));
  assert.notDeepEqual(throughRegistry, createPracticeResult("oak-bingo", "bot-asistent"));
  assert.ok(first.score >= 0 && first.score <= OAK_BINGO.maximumScore);
  assert.ok(first.placed >= 5 && first.placed <= 9);
  assert.ok(first.lines >= 0 && first.lines <= 8);
  assert.ok(first.averageReactionMs >= 650 && first.averageReactionMs <= 4150);
  assert.match(formatGameResult("oak-bingo", first), /^\d\/9 polí · \d kompletní(ch|) lini(e|í) · průměr \d+(,\d+)? s$/);
});

test("Sdílený snapshot nese úplnou evoluční pozici a runtime hry nenačítá PokeAPI", async function () {
  assert.equal(POKEMON_SNAPSHOT_META.evolutionStageKind, "full_species_chain_position");
  assert.deepEqual(new Set(POKEMON_SNAPSHOT.map(function (pokemon) { return pokemon.evolutionStage; })),
    new Set(["base", "middle", "final", "single"]));
  assert.equal(POKEMON_BY_ID.get(25).evolutionStage, "middle", "Pikachu má v celém řetězci pre-evoluci Pichu");
  assert.equal(POKEMON_BY_ID.get(113).evolutionStage, "middle", "Chansey má Happiny i Blissey");

  const source = await readFile(new URL("../duel/games/oak-bingo.mjs", import.meta.url), "utf8");
  const css = await readFile(new URL("../duel/duel.css", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.match(source, /from "\.\/pokemon\/snapshot\.mjs"/);
  assert.match(source, /<button class="oak-bingo-discard" type="button">/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /window\.addEventListener\("keydown"/);
  assert.match(source, /window\.removeEventListener\("keydown"/);
  assert.match(css, /\.oak-bingo-board > button:focus-visible/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
