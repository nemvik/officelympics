import { createRng } from "../game-core.mjs";
import { POKEMON_SNAPSHOT } from "./pokemon/snapshot.mjs";
import { defineGame, NOOP, normalizeScoreResult, safeSmallInteger } from "./shared.mjs";

export const OAK_BINGO = Object.freeze({
  cellCount: 9,
  sequenceLength: 12,
  discardLimit: 3,
  cardDurationMs: 10_000,
  placementBasePoints: 100,
  timeBonusPoints: 100,
  linePoints: 250,
  maximumScore: 3800
});

export const OAK_BINGO_LINES = Object.freeze([
  { indexes: Object.freeze([0, 1, 2]), label: "horní řada" },
  { indexes: Object.freeze([3, 4, 5]), label: "prostřední řada" },
  { indexes: Object.freeze([6, 7, 8]), label: "dolní řada" },
  { indexes: Object.freeze([0, 3, 6]), label: "levý sloupec" },
  { indexes: Object.freeze([1, 4, 7]), label: "prostřední sloupec" },
  { indexes: Object.freeze([2, 5, 8]), label: "pravý sloupec" },
  { indexes: Object.freeze([0, 4, 8]), label: "hlavní diagonála" },
  { indexes: Object.freeze([2, 4, 6]), label: "vedlejší diagonála" }
].map(function (line) { return Object.freeze(line); }));

const TYPE_LABELS = Object.freeze({
  normal: "normální",
  fighting: "bojový",
  flying: "létající",
  poison: "jedovatý",
  ground: "zemní",
  rock: "kamenný",
  bug: "hmyzí",
  ghost: "duchový",
  steel: "ocelový",
  fire: "ohnivý",
  water: "vodní",
  grass: "travní",
  electric: "elektrický",
  psychic: "psychický",
  ice: "ledový",
  dragon: "dračí",
  dark: "temný",
  fairy: "vílí"
});

const COLOR_LABELS = Object.freeze({
  black: "černá",
  blue: "modrá",
  brown: "hnědá",
  gray: "šedá",
  green: "zelená",
  pink: "růžová",
  purple: "fialová",
  red: "červená",
  white: "bílá",
  yellow: "žlutá"
});

const EVOLUTION_LABELS = Object.freeze({
  base: "základní",
  middle: "prostřední",
  final: "finální",
  single: "bez evoluce"
});

const CONDITION_GROUPS = Object.freeze([
  Object.freeze([
    { kind: "type", value: "grass", witnessId: 1 },
    { kind: "type", value: "fire", witnessId: 4 },
    { kind: "type", value: "water", witnessId: 7 },
    { kind: "type", value: "bug", witnessId: 13 },
    { kind: "type", value: "normal", witnessId: 16 },
    { kind: "type", value: "poison", witnessId: 23 },
    { kind: "type", value: "psychic", witnessId: 63 },
    { kind: "type", value: "electric", witnessId: 81 }
  ]),
  Object.freeze([
    { kind: "weight-below", threshold: 50, witnessId: 10 },
    { kind: "weight-below", threshold: 100, witnessId: 10 },
    { kind: "weight-below", threshold: 200, witnessId: 10 }
  ]),
  Object.freeze([
    { kind: "weight-above", threshold: 500, witnessId: 143 },
    { kind: "weight-above", threshold: 1000, witnessId: 143 },
    { kind: "weight-above", threshold: 2000, witnessId: 143 }
  ]),
  Object.freeze([
    { kind: "speed-above", threshold: 70, witnessId: 101 },
    { kind: "speed-above", threshold: 90, witnessId: 101 },
    { kind: "speed-above", threshold: 110, witnessId: 101 }
  ]),
  Object.freeze([
    { kind: "hp-above", threshold: 70, witnessId: 113 },
    { kind: "hp-above", threshold: 90, witnessId: 113 },
    { kind: "hp-above", threshold: 150, witnessId: 113 }
  ]),
  Object.freeze([
    { kind: "height-below", threshold: 5, witnessId: 50 },
    { kind: "height-below", threshold: 8, witnessId: 50 },
    { kind: "height-below", threshold: 10, witnessId: 50 }
  ]),
  Object.freeze([
    { kind: "color", value: "blue", witnessId: 60 },
    { kind: "color", value: "brown", witnessId: 133 },
    { kind: "color", value: "purple", witnessId: 19 },
    { kind: "color", value: "yellow", witnessId: 27 },
    { kind: "color", value: "pink", witnessId: 35 },
    { kind: "color", value: "green", witnessId: 69 },
    { kind: "color", value: "red", witnessId: 45 },
    { kind: "color", value: "white", witnessId: 86 },
    { kind: "color", value: "gray", witnessId: 66 }
  ]),
  Object.freeze([
    { kind: "type-count", count: 1, witnessId: 132 },
    { kind: "type-count", count: 2, witnessId: 74 }
  ]),
  Object.freeze([
    { kind: "evolution-stage", value: "base", witnessId: 147 },
    { kind: "evolution-stage", value: "final", witnessId: 149 }
  ])
]);

const POKEMON_BY_ID = new Map(POKEMON_SNAPSHOT.map(function (pokemon) {
  return [pokemon.id, pokemon];
}));

export const oakBingoGame = defineGame({
  id: "oak-bingo",
  meta: {
    icon: "▦",
    title: "Oakovo PokéBingo",
    teaser: "Třiď Pokémony do profesorovy mřížky",
    difficulty: "postřeh a strategie",
    instruction: "Umísti dvanáct Pokémonů do devíti podmínek. Na každou kartu máš deset sekund a tři zahození.",
    scoreLabel: "bodů z 3 800"
  },
  start: startOakBingo,
  result: {
    mode: "local",
    createPractice: createOakBingoPracticeResult,
    normalize: normalizeOakBingoResult,
    format: formatOakBingoResult
  }
});

function shuffle(values, random) {
  const shuffled = values.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function decimalLabel(value) {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

export function oakBingoConditionKey(condition) {
  if (!condition || typeof condition !== "object") return "invalid";
  if (condition.kind === "type-count") return condition.kind + ":" + condition.count;
  if (condition.threshold !== undefined) return condition.kind + ":" + condition.threshold;
  return condition.kind + ":" + condition.value;
}

export function formatOakBingoCondition(condition) {
  if (!condition || typeof condition !== "object") return "Neplatná podmínka";
  if (condition.kind === "type") return "Typ: " + (TYPE_LABELS[condition.value] || condition.value);
  if (condition.kind === "weight-below") return "Váha pod " + decimalLabel(condition.threshold / 10) + " kg";
  if (condition.kind === "weight-above") return "Váha nad " + decimalLabel(condition.threshold / 10) + " kg";
  if (condition.kind === "speed-above") return "Rychlost nad " + condition.threshold;
  if (condition.kind === "hp-above") return "HP nad " + condition.threshold;
  if (condition.kind === "height-below") return "Výška pod " + decimalLabel(condition.threshold / 10) + " m";
  if (condition.kind === "color") return "Barva: " + (COLOR_LABELS[condition.value] || condition.value);
  if (condition.kind === "type-count") return condition.count === 1 ? "Právě jeden typ" : "Právě dva typy";
  if (condition.kind === "evolution-stage") {
    return condition.value === "base" ? "Základní evoluční fáze" : "Finální evoluční fáze";
  }
  return "Neplatná podmínka";
}

function oakBingoConditionCategory(condition) {
  if (condition.kind.startsWith("weight")) return "HMOTNOST";
  if (condition.kind === "height-below") return "VÝŠKA";
  if (condition.kind === "speed-above" || condition.kind === "hp-above") return "BASE STAT";
  if (condition.kind === "color") return "POKÉDEX BARVA";
  if (condition.kind === "evolution-stage") return "EVOLUCE";
  return "TYP";
}

export function pokemonMatchesOakBingoCondition(pokemon, condition) {
  if (!pokemon || typeof pokemon !== "object" || !condition || typeof condition !== "object") return false;
  if (condition.kind === "type") {
    return Array.isArray(pokemon.types) && pokemon.types.includes(condition.value);
  }
  if (condition.kind === "weight-below") {
    return Number.isFinite(pokemon.weight) && Number.isFinite(condition.threshold) && pokemon.weight < condition.threshold;
  }
  if (condition.kind === "weight-above") {
    return Number.isFinite(pokemon.weight) && Number.isFinite(condition.threshold) && pokemon.weight > condition.threshold;
  }
  if (condition.kind === "speed-above") {
    return Number.isFinite(pokemon.speed) && Number.isFinite(condition.threshold) && pokemon.speed > condition.threshold;
  }
  if (condition.kind === "hp-above") {
    return Number.isFinite(pokemon.hp) && Number.isFinite(condition.threshold) && pokemon.hp > condition.threshold;
  }
  if (condition.kind === "height-below") {
    return Number.isFinite(pokemon.height) && Number.isFinite(condition.threshold) && pokemon.height < condition.threshold;
  }
  if (condition.kind === "color") return pokemon.color === condition.value;
  if (condition.kind === "type-count") {
    return Array.isArray(pokemon.types) && pokemon.types.length === condition.count;
  }
  if (condition.kind === "evolution-stage") return pokemon.evolutionStage === condition.value;
  return false;
}

function validOakBingoPokemon(records) {
  const byId = new Map();
  (Array.isArray(records) ? records : []).forEach(function (pokemon) {
    if (!pokemon || !Number.isInteger(pokemon.id) || pokemon.id < 1 || pokemon.id > 151) return;
    if (!Array.isArray(pokemon.types) || !pokemon.types.length || typeof pokemon.name !== "string") return;
    if (!byId.has(pokemon.id)) byId.set(pokemon.id, pokemon);
  });
  return Array.from(byId.values());
}

export function findOakBingoAssignment(conditions, records = POKEMON_SNAPSHOT) {
  if (!Array.isArray(conditions) || !conditions.length) return null;
  const pokemon = validOakBingoPokemon(records);
  const candidates = conditions.map(function (condition) {
    return pokemon.filter(function (candidate) {
      return pokemonMatchesOakBingoCondition(candidate, condition);
    }).map(function (candidate) { return candidate.id; });
  });
  if (candidates.some(function (ids) { return !ids.length; })) return null;

  const cellsByDifficulty = conditions.map(function (_, index) { return index; }).sort(function (first, second) {
    return candidates[first].length - candidates[second].length || first - second;
  });
  const cellByPokemon = new Map();
  const pokemonByCell = Array(conditions.length).fill(null);

  function augment(cellIndex, visitedPokemon) {
    for (const pokemonId of candidates[cellIndex]) {
      if (visitedPokemon.has(pokemonId)) continue;
      visitedPokemon.add(pokemonId);
      const previousCell = cellByPokemon.get(pokemonId);
      if (previousCell === undefined || augment(previousCell, visitedPokemon)) {
        cellByPokemon.set(pokemonId, cellIndex);
        pokemonByCell[cellIndex] = pokemonId;
        return true;
      }
    }
    return false;
  }

  for (const cellIndex of cellsByDifficulty) {
    if (!augment(cellIndex, new Set())) return null;
  }
  return pokemonByCell;
}

export function buildOakBingoMatch(seed, records = POKEMON_SNAPSHOT) {
  const pool = validOakBingoPokemon(records);
  if (pool.length < OAK_BINGO.sequenceLength) {
    throw new Error("Oakovo PokéBingo potřebuje alespoň dvanáct platných Pokémonů.");
  }
  const byId = new Map(pool.map(function (pokemon) { return [pokemon.id, pokemon]; }));
  const random = createRng(String(seed));
  const selected = CONDITION_GROUPS.map(function (options) {
    return options[Math.floor(random() * options.length)];
  });

  const witnesses = selected.map(function (condition) { return condition.witnessId; });
  if (new Set(witnesses).size !== OAK_BINGO.cellCount || selected.some(function (condition) {
    return !pokemonMatchesOakBingoCondition(byId.get(condition.witnessId), condition);
  })) {
    throw new Error("Garantované podmínky Oakova PokéBinga neodpovídají Pokémon snapshotu.");
  }

  const conditions = shuffle(selected.map(function (condition) {
    const clean = { ...condition };
    delete clean.witnessId;
    return clean;
  }), random);
  if (new Set(conditions.map(oakBingoConditionKey)).size !== OAK_BINGO.cellCount) {
    throw new Error("Oakovo PokéBingo musí vytvořit devět různých podmínek.");
  }

  const assignment = findOakBingoAssignment(conditions, shuffle(pool, random));
  if (!assignment || new Set(assignment).size !== OAK_BINGO.cellCount) {
    throw new Error("Přesný matcher nenašel garantované řešení Oakova PokéBinga.");
  }

  const assigned = new Set(assignment);
  const distractors = pool.filter(function (pokemon) {
    return !assigned.has(pokemon.id) && conditions.some(function (condition) {
      return pokemonMatchesOakBingoCondition(pokemon, condition);
    });
  }).map(function (pokemon) {
    return {
      id: pokemon.id,
      matches: conditions.filter(function (condition) {
        return pokemonMatchesOakBingoCondition(pokemon, condition);
      }).length,
      tie: random()
    };
  }).sort(function (first, second) {
    return second.matches - first.matches || first.tie - second.tie || first.id - second.id;
  }).slice(0, OAK_BINGO.sequenceLength - OAK_BINGO.cellCount).map(function (candidate) {
    return candidate.id;
  });

  if (distractors.length !== OAK_BINGO.sequenceLength - OAK_BINGO.cellCount) {
    throw new Error("Oakovo PokéBingo nemá dostatek rušivých Pokémonů.");
  }

  return {
    conditions,
    sequence: shuffle(assignment.concat(distractors), random),
    solution: assignment,
    distractors
  };
}

export function oakBingoPlacementScore(elapsedMs) {
  const elapsed = Number.isFinite(elapsedMs)
    ? Math.min(OAK_BINGO.cardDurationMs, Math.max(0, elapsedMs))
    : OAK_BINGO.cardDurationMs;
  const bonus = Math.round(OAK_BINGO.timeBonusPoints * (1 - elapsed / OAK_BINGO.cardDurationMs));
  return OAK_BINGO.placementBasePoints + bonus;
}

export function completedOakBingoLineIndexes(placements) {
  const cells = Array.isArray(placements) ? placements : [];
  return OAK_BINGO_LINES.map(function (_, index) { return index; }).filter(function (lineIndex) {
    return OAK_BINGO_LINES[lineIndex].indexes.every(function (cellIndex) { return Boolean(cells[cellIndex]); });
  });
}

export function countCompletedOakBingoLines(placements) {
  return completedOakBingoLineIndexes(placements).length;
}

export function calculateOakBingoScore(placementPoints, placements) {
  const placementScore = (Array.isArray(placementPoints) ? placementPoints : []).slice(0, OAK_BINGO.cellCount)
    .reduce(function (total, points) {
      if (!Number.isFinite(points)) return total;
      return total + Math.min(200, Math.max(0, Math.round(points)));
    }, 0);
  return Math.min(OAK_BINGO.maximumScore,
    placementScore + countCompletedOakBingoLines(placements) * OAK_BINGO.linePoints);
}

export function createOakBingoState() {
  return {
    placements: Array(OAK_BINGO.cellCount).fill(null),
    placementPoints: Array(OAK_BINGO.cellCount).fill(0),
    completedLines: [],
    processed: 0,
    discardsRemaining: OAK_BINGO.discardLimit,
    discardsUsed: 0,
    lost: 0,
    reactionTotalMs: 0,
    score: 0,
    finished: false
  };
}

function rejectedOakBingoAction(state, reason) {
  return { accepted: false, reason, state, gained: 0, newLines: [] };
}

function currentOakBingoPokemon(match, state) {
  if (!match || !Array.isArray(match.sequence) || !Number.isInteger(state && state.processed)) return null;
  return POKEMON_BY_ID.get(match.sequence[state.processed]) || null;
}

export function placeOakBingoPokemon(state, match, cellIndex, elapsedMs) {
  if (!state || state.finished) return rejectedOakBingoAction(state, "finished");
  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= OAK_BINGO.cellCount) {
    return rejectedOakBingoAction(state, "invalid-cell");
  }
  if (state.placements[cellIndex]) return rejectedOakBingoAction(state, "occupied");
  const pokemon = currentOakBingoPokemon(match, state);
  const condition = match && Array.isArray(match.conditions) ? match.conditions[cellIndex] : null;
  if (!pokemon || !condition || !pokemonMatchesOakBingoCondition(pokemon, condition)) {
    return rejectedOakBingoAction(state, "incompatible");
  }

  const safeElapsed = Number.isFinite(elapsedMs)
    ? Math.min(OAK_BINGO.cardDurationMs, Math.max(0, elapsedMs))
    : OAK_BINGO.cardDurationMs;
  const placements = state.placements.slice();
  const placementPoints = state.placementPoints.slice();
  placements[cellIndex] = pokemon.id;
  placementPoints[cellIndex] = oakBingoPlacementScore(safeElapsed);
  const completedLines = completedOakBingoLineIndexes(placements);
  const previousLines = new Set(state.completedLines);
  const newLines = completedLines.filter(function (lineIndex) { return !previousLines.has(lineIndex); });
  const processed = state.processed + 1;
  const finished = processed >= match.sequence.length || placements.every(Boolean);
  const nextState = {
    ...state,
    placements,
    placementPoints,
    completedLines,
    processed,
    reactionTotalMs: state.reactionTotalMs + safeElapsed,
    score: calculateOakBingoScore(placementPoints, placements),
    finished
  };
  return {
    accepted: true,
    reason: "placed",
    state: nextState,
    pokemonId: pokemon.id,
    gained: nextState.score - state.score,
    placementPoints: placementPoints[cellIndex],
    newLines
  };
}

export function discardOakBingoPokemon(state, match, reason = "manual") {
  if (!state || state.finished || !currentOakBingoPokemon(match, state)) {
    return rejectedOakBingoAction(state, "finished");
  }
  const timeout = reason === "timeout";
  if (!timeout && state.discardsRemaining <= 0) return rejectedOakBingoAction(state, "no-discards");

  const usesDiscard = state.discardsRemaining > 0;
  const processed = state.processed + 1;
  const nextState = {
    ...state,
    processed,
    discardsRemaining: state.discardsRemaining - (usesDiscard ? 1 : 0),
    discardsUsed: state.discardsUsed + (usesDiscard ? 1 : 0),
    lost: state.lost + (usesDiscard ? 0 : 1),
    finished: processed >= match.sequence.length
  };
  return {
    accepted: true,
    reason: timeout ? "timeout" : "discarded",
    state: nextState,
    gained: 0,
    newLines: [],
    usedDiscard: usesDiscard
  };
}

export function createOakBingoPracticeResult(seed) {
  const random = createRng(String(seed) + ":practice");
  const placed = 5 + Math.floor(random() * 5);
  const occupiedCells = shuffle(Array.from({ length: OAK_BINGO.cellCount }, function (_, index) {
    return index;
  }), random).slice(0, placed);
  const placements = Array(OAK_BINGO.cellCount).fill(null);
  const placementPoints = Array(OAK_BINGO.cellCount).fill(0);
  let reactionTotalMs = 0;
  occupiedCells.forEach(function (cellIndex, index) {
    const reaction = Math.round(650 + random() * 3500);
    placements[cellIndex] = index + 1;
    placementPoints[cellIndex] = oakBingoPlacementScore(reaction);
    reactionTotalMs += reaction;
  });
  const lines = countCompletedOakBingoLines(placements);
  return {
    score: calculateOakBingoScore(placementPoints, placements),
    placed,
    lines,
    averageReactionMs: Math.round(reactionTotalMs / placed),
    discardsUsed: Math.min(OAK_BINGO.discardLimit, OAK_BINGO.sequenceLength - placed)
  };
}

export function normalizeOakBingoResult(result) {
  if (Array.isArray(result)) return null;
  const normalized = normalizeScoreResult(result, OAK_BINGO.maximumScore);
  if (!normalized) return null;
  normalized.placed = safeSmallInteger(result.placed, OAK_BINGO.cellCount);
  normalized.lines = safeSmallInteger(result.lines, OAK_BINGO_LINES.length);
  normalized.averageReactionMs = safeSmallInteger(result.averageReactionMs, OAK_BINGO.cardDurationMs);
  normalized.discardsUsed = safeSmallInteger(result.discardsUsed, OAK_BINGO.discardLimit);
  if (!normalized.placed) normalized.averageReactionMs = 0;
  return normalized;
}

function czechLineCount(lines) {
  if (lines === 1) return "1 kompletní linie";
  if (lines >= 2 && lines <= 4) return lines + " kompletní linie";
  return lines + " kompletních linií";
}

export function formatOakBingoResult(result) {
  const normalized = normalizeOakBingoResult(result) || {
    placed: 0,
    lines: 0,
    averageReactionMs: 0
  };
  const speed = normalized.averageReactionMs
    ? " · průměr " + decimalLabel(normalized.averageReactionMs / 1000) + " s"
    : "";
  return normalized.placed + "/9 polí · " + czechLineCount(normalized.lines) + speed;
}

function pokemonEvolutionLabel(pokemon) {
  return EVOLUTION_LABELS[pokemon.evolutionStage] || "neznámá";
}

export function startOakBingo(context) {
  const match = buildOakBingoMatch(context.seed);
  let state = createOakBingoState();
  let finished = false;
  let cardStartedAt = 0;
  let virtualOffsetMs = 0;
  let tickTimer = 0;
  let feedbackTimer = 0;
  let invalidCell = null;
  const previousRenderGameToText = window.render_game_to_text;
  const previousAdvanceTime = window.advanceTime;

  context.setRoundLabel("12 karet · 10 sekund");
  context.stage.innerHTML = `
    <div class="oak-bingo-shell">
      <header class="oak-bingo-topline">
        <div class="oak-bingo-progress"><small>KARTA</small><strong data-oak-progress>1 / 12</strong></div>
        <div class="oak-bingo-clock" role="timer" aria-label="Čas na aktuálního Pokémona">
          <span><small>ZBÝVÁ</small><b data-oak-time>10,0 s</b></span>
          <i role="progressbar" aria-label="Zbývající čas" aria-valuemin="0" aria-valuemax="10000" aria-valuenow="10000"><span></span></i>
        </div>
        <div class="oak-bingo-score"><small>SKÓRE</small><strong data-oak-score>0</strong></div>
        <div class="oak-bingo-discards"><small>ZAHOZENÍ</small><strong data-oak-discards>● ● ●</strong></div>
      </header>
      <div class="oak-bingo-arena">
        <section class="oak-bingo-board-panel" aria-labelledby="oak-bingo-board-title">
          <div class="oak-bingo-section-title">
            <div><span>OAKŮV VÝZKUMNÝ LIST</span><h3 id="oak-bingo-board-title">Vyber jediné políčko</h3></div>
            <small>Klávesy 1–9</small>
          </div>
          <div class="oak-bingo-board" role="group" aria-label="Bingo mřížka 3 krát 3"></div>
          <div class="oak-bingo-lines" aria-label="Dokončené bingo linie"></div>
        </section>
        <aside class="oak-bingo-card-panel" aria-labelledby="oak-bingo-card-name">
          <span class="oak-bingo-specimen-label">AKTUÁLNÍ VZOREK</span>
          <div class="oak-bingo-specimen">
            <div class="oak-bingo-portrait">
              <img data-oak-sprite alt="">
              <span aria-hidden="true">?</span>
            </div>
            <div class="oak-bingo-identity">
              <small data-oak-number>#001</small>
              <h3 id="oak-bingo-card-name" data-oak-name>Bulbasaur</h3>
              <div class="oak-bingo-types" data-oak-types></div>
            </div>
          </div>
          <dl class="oak-bingo-facts">
            <div><dt>HP</dt><dd data-oak-hp>—</dd></div>
            <div><dt>Rychlost</dt><dd data-oak-speed>—</dd></div>
            <div><dt>Výška</dt><dd data-oak-height>—</dd></div>
            <div><dt>Váha</dt><dd data-oak-weight>—</dd></div>
            <div><dt>Barva</dt><dd data-oak-color>—</dd></div>
            <div><dt>Fáze</dt><dd data-oak-evolution>—</dd></div>
          </dl>
          <button class="oak-bingo-discard" type="button"><span data-oak-discard-label>Zahodit kartu (3)</span> <kbd>D</kbd></button>
          <p class="oak-bingo-card-help">Umístění je nevratné. Chybný výběr kartu nespotřebuje a čas běží dál.</p>
        </aside>
      </div>
      <div class="oak-bingo-status-row">
        <p class="oak-bingo-feedback" role="status" aria-live="polite"></p>
        <p class="oak-bingo-new-lines" data-oak-new-lines>Kompletní linie: 0 / 8</p>
      </div>
    </div>`;

  const board = context.stage.querySelector(".oak-bingo-board");
  const progress = context.stage.querySelector("[data-oak-progress]");
  const clock = context.stage.querySelector(".oak-bingo-clock");
  const time = context.stage.querySelector("[data-oak-time]");
  const timer = clock.querySelector("[role=progressbar]");
  const timerFill = timer.querySelector("span");
  const score = context.stage.querySelector("[data-oak-score]");
  const discards = context.stage.querySelector("[data-oak-discards]");
  const lineTrack = context.stage.querySelector(".oak-bingo-lines");
  const newLines = context.stage.querySelector("[data-oak-new-lines]");
  const feedback = context.stage.querySelector(".oak-bingo-feedback");
  const discardButton = context.stage.querySelector(".oak-bingo-discard");
  const discardLabel = context.stage.querySelector("[data-oak-discard-label]");
  const sprite = context.stage.querySelector("[data-oak-sprite]");
  const portrait = context.stage.querySelector(".oak-bingo-portrait");
  const number = context.stage.querySelector("[data-oak-number]");
  const name = context.stage.querySelector("[data-oak-name]");
  const types = context.stage.querySelector("[data-oak-types]");
  const hp = context.stage.querySelector("[data-oak-hp]");
  const speed = context.stage.querySelector("[data-oak-speed]");
  const height = context.stage.querySelector("[data-oak-height]");
  const weight = context.stage.querySelector("[data-oak-weight]");
  const color = context.stage.querySelector("[data-oak-color]");
  const evolution = context.stage.querySelector("[data-oak-evolution]");

  match.conditions.forEach(function (condition, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.oakCell = String(index);
    button.innerHTML = `<span class="oak-bingo-shortcut">${index + 1}</span>
      <span class="oak-bingo-rule"><small></small><strong></strong></span>
      <span class="oak-bingo-occupant" hidden><img alt=""><b></b></span>`;
    button.querySelector(".oak-bingo-rule small").textContent = oakBingoConditionCategory(condition);
    button.querySelector(".oak-bingo-rule strong").textContent = formatOakBingoCondition(condition);
    board.append(button);
  });

  OAK_BINGO_LINES.forEach(function (line, index) {
    const marker = document.createElement("span");
    marker.textContent = String(index + 1);
    marker.title = line.label;
    marker.setAttribute("aria-label", line.label + ": nedokončeno");
    lineTrack.append(marker);
  });

  function now() {
    return performance.now() + virtualOffsetMs;
  }

  function currentPokemon() {
    return currentOakBingoPokemon(match, state);
  }

  function placedCount() {
    return state.placements.filter(Boolean).length;
  }

  function showFeedback(message, tone, cellButton) {
    window.clearTimeout(feedbackTimer);
    if (invalidCell) invalidCell.classList.remove("is-invalid");
    invalidCell = null;
    feedback.className = "oak-bingo-feedback" + (tone ? " is-" + tone : "");
    feedback.textContent = message;
    if (cellButton) {
      invalidCell = cellButton;
      cellButton.classList.add("is-invalid");
      feedbackTimer = window.setTimeout(function () {
        cellButton.classList.remove("is-invalid");
        if (invalidCell === cellButton) invalidCell = null;
      }, 480);
    }
  }

  function renderBoard() {
    state.placements.forEach(function (pokemonId, index) {
      const button = board.children[index];
      const pokemon = pokemonId ? POKEMON_BY_ID.get(pokemonId) : null;
      const occupant = button.querySelector(".oak-bingo-occupant");
      button.disabled = Boolean(pokemon) || state.finished || finished;
      button.classList.toggle("is-filled", Boolean(pokemon));
      occupant.hidden = !pokemon;
      if (pokemon) {
        occupant.querySelector("img").src = pokemon.sprite;
        occupant.querySelector("img").alt = "";
        occupant.querySelector("b").textContent = pokemon.name;
      }
      const conditionLabel = formatOakBingoCondition(match.conditions[index]);
      button.setAttribute("aria-label", pokemon
        ? "Políčko " + (index + 1) + ": " + conditionLabel + ", obsazeno Pokémonem " + pokemon.name
        : "Políčko " + (index + 1) + ": " + conditionLabel);
    });
  }

  function renderMetrics(latestLines = []) {
    score.textContent = String(state.score);
    const used = OAK_BINGO.discardLimit - state.discardsRemaining;
    discards.textContent = Array.from({ length: OAK_BINGO.discardLimit }, function (_, index) {
      return index < OAK_BINGO.discardLimit - used ? "●" : "○";
    }).join(" ");
    discards.setAttribute("aria-label", state.discardsRemaining + " zbývající zahození");
    discardButton.disabled = state.discardsRemaining <= 0 || state.finished || finished;
    discardLabel.textContent = state.discardsRemaining > 0
      ? "Zahodit kartu (" + state.discardsRemaining + ")"
      : "Zahození vyčerpána";
    lineTrack.querySelectorAll("span").forEach(function (marker, index) {
      const complete = state.completedLines.includes(index);
      marker.classList.toggle("is-complete", complete);
      marker.classList.toggle("is-new", latestLines.includes(index));
      marker.setAttribute("aria-label", OAK_BINGO_LINES[index].label + ": " + (complete ? "dokončeno" : "nedokončeno"));
    });
    newLines.textContent = latestLines.length
      ? "+" + latestLines.length * OAK_BINGO.linePoints + " · " + latestLines.map(function (index) {
        return OAK_BINGO_LINES[index].label;
      }).join(", ")
      : "Kompletní linie: " + state.completedLines.length + " / 8";
  }

  function renderCurrentPokemon() {
    const pokemon = currentPokemon();
    progress.textContent = state.finished
      ? state.processed + " / " + OAK_BINGO.sequenceLength
      : state.processed + 1 + " / " + OAK_BINGO.sequenceLength;
    if (!pokemon) return;
    portrait.classList.remove("is-missing");
    sprite.src = pokemon.sprite;
    number.textContent = "#" + String(pokemon.id).padStart(3, "0");
    name.textContent = pokemon.name;
    types.replaceChildren();
    pokemon.types.forEach(function (type) {
      const tag = document.createElement("span");
      tag.textContent = TYPE_LABELS[type] || type;
      types.append(tag);
    });
    hp.textContent = String(pokemon.hp);
    speed.textContent = String(pokemon.speed);
    height.textContent = decimalLabel(pokemon.height / 10) + " m";
    weight.textContent = decimalLabel(pokemon.weight / 10) + " kg";
    color.textContent = COLOR_LABELS[pokemon.color] || pokemon.color;
    evolution.textContent = pokemonEvolutionLabel(pokemon);
  }

  function renderClock(elapsedMs) {
    const remaining = Math.max(0, OAK_BINGO.cardDurationMs - elapsedMs);
    time.textContent = (remaining / 1000).toFixed(1).replace(".", ",") + " s";
    timer.setAttribute("aria-valuenow", String(Math.round(remaining)));
    timerFill.style.width = remaining / OAK_BINGO.cardDurationMs * 100 + "%";
    clock.classList.toggle("is-urgent", remaining <= 1500);
  }

  function finishGame(message) {
    if (finished) return;
    finished = true;
    window.clearInterval(tickTimer);
    renderBoard();
    renderMetrics();
    renderClock(OAK_BINGO.cardDurationMs);
    showFeedback(message, "success");
    const placed = placedCount();
    context.finish({
      score: state.score,
      placed,
      lines: state.completedLines.length,
      averageReactionMs: placed ? Math.round(state.reactionTotalMs / placed) : 0,
      discardsUsed: state.discardsUsed
    });
  }

  function beginCurrentCard(startedAt, announcement) {
    if (state.finished) {
      finishGame(announcement || "Výzkumný list je uzavřený.");
      return;
    }
    cardStartedAt = startedAt;
    renderBoard();
    renderMetrics();
    renderCurrentPokemon();
    renderClock(0);
    const pokemon = currentPokemon();
    showFeedback(announcement || "Nová karta: " + pokemon.name + ". Vyber jediné vhodné políčko.", "neutral");
  }

  function acceptAction(outcome, message, nextStartedAt = now()) {
    state = outcome.state;
    context.publishScore(state.score);
    renderBoard();
    renderMetrics(outcome.newLines);
    if (state.finished) {
      const endReason = state.placements.every(Boolean) ? " Mřížka je plná." : " Sekvence skončila.";
      finishGame(message + endReason);
      return;
    }
    const next = currentPokemon();
    beginCurrentCard(nextStartedAt, message + " Další karta: " + next.name + ".");
    if (outcome.newLines.length) renderMetrics(outcome.newLines);
  }

  function processTimeout(timeoutAt) {
    const pokemon = currentPokemon();
    if (!pokemon) return;
    const outcome = discardOakBingoPokemon(state, match, "timeout");
    if (!outcome.accepted) return;
    const message = outcome.usedDiscard
      ? "Čas pro " + pokemon.name + " vypršel — použito jedno zahození."
      : "Čas pro " + pokemon.name + " vypršel — karta je ztracena.";
    acceptAction(outcome, message, timeoutAt);
  }

  function syncClock() {
    if (finished || state.finished) return;
    const currentTime = now();
    let elapsed = currentTime - cardStartedAt;
    while (!finished && !state.finished && elapsed >= OAK_BINGO.cardDurationMs) {
      const timeoutAt = cardStartedAt + OAK_BINGO.cardDurationMs;
      processTimeout(timeoutAt);
      elapsed = currentTime - cardStartedAt;
    }
    if (!finished && !state.finished) renderClock(Math.max(0, elapsed));
  }

  function chooseCell(cellIndex, button) {
    if (finished || state.finished) return;
    const expectedCard = state.processed;
    syncClock();
    if (finished || state.finished || state.processed !== expectedCard) return;
    const pokemon = currentPokemon();
    const outcome = placeOakBingoPokemon(state, match, cellIndex, now() - cardStartedAt);
    if (!outcome.accepted) {
      const message = outcome.reason === "occupied"
        ? "Tohle políčko už je obsazené. Čas běží dál."
        : "Podmínka nesedí pro " + pokemon.name + ". Čas běží dál.";
      showFeedback(message, "error", button);
      return;
    }
    const lineMessage = outcome.newLines.length
      ? " Nová " + outcome.newLines.map(function (index) { return OAK_BINGO_LINES[index].label; }).join(" a ") + "."
      : "";
    acceptAction(outcome,
      pokemon.name + " umístěn · +" + outcome.placementPoints + " bodů." + lineMessage);
  }

  function discardCurrent() {
    if (finished || state.finished || discardButton.disabled) return;
    const expectedCard = state.processed;
    syncClock();
    if (finished || state.finished || state.processed !== expectedCard) return;
    const pokemon = currentPokemon();
    const outcome = discardOakBingoPokemon(state, match, "manual");
    if (outcome.accepted) acceptAction(outcome, pokemon.name + " zahozen.");
  }

  function onBoardClick(event) {
    const button = event.target.closest("[data-oak-cell]");
    if (!button || !board.contains(button) || button.disabled) return;
    chooseCell(Number(button.dataset.oakCell), button);
  }

  function onKeyDown(event) {
    if (finished || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (/^[1-9]$/.test(event.key)) {
      const button = board.children[Number(event.key) - 1];
      if (!button || button.disabled) return;
      event.preventDefault();
      chooseCell(Number(event.key) - 1, button);
    } else if (event.key.toLowerCase() === "d" && !discardButton.disabled) {
      event.preventDefault();
      discardCurrent();
    }
  }

  function onSpriteLoad() {
    portrait.classList.remove("is-missing");
  }

  function onSpriteError() {
    portrait.classList.add("is-missing");
  }

  function renderGameToText() {
    const pokemon = currentPokemon();
    return JSON.stringify({
      game: "oak-bingo",
      processed: state.processed,
      sequenceLength: OAK_BINGO.sequenceLength,
      score: state.score,
      discardsRemaining: state.discardsRemaining,
      remainingMs: finished ? 0 : Math.max(0, Math.round(OAK_BINGO.cardDurationMs - (now() - cardStartedAt))),
      currentPokemon: pokemon ? {
        id: pokemon.id,
        name: pokemon.name,
        types: pokemon.types,
        hp: pokemon.hp,
        speed: pokemon.speed,
        heightMetres: pokemon.height / 10,
        weightKilograms: pokemon.weight / 10,
        color: pokemon.color,
        evolutionStage: pokemon.evolutionStage
      } : null,
      board: match.conditions.map(function (condition, index) {
        const placedPokemon = state.placements[index] ? POKEMON_BY_ID.get(state.placements[index]) : null;
        return {
          cell: index + 1,
          condition: formatOakBingoCondition(condition),
          pokemon: placedPokemon ? placedPokemon.name : null
        };
      }),
      completedLines: state.completedLines.map(function (index) { return OAK_BINGO_LINES[index].label; }),
      feedback: feedback.textContent
    });
  }

  function advanceTime(milliseconds) {
    virtualOffsetMs += Math.max(0, Number(milliseconds) || 0);
    syncClock();
  }

  board.addEventListener("click", onBoardClick);
  discardButton.addEventListener("click", discardCurrent);
  sprite.addEventListener("load", onSpriteLoad);
  sprite.addEventListener("error", onSpriteError);
  window.addEventListener("keydown", onKeyDown);
  window.render_game_to_text = renderGameToText;
  window.advanceTime = advanceTime;
  context.publishScore(0);
  beginCurrentCard(now());
  tickTimer = window.setInterval(syncClock, 50);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      window.clearInterval(tickTimer);
      window.clearTimeout(feedbackTimer);
      if (invalidCell) invalidCell.classList.remove("is-invalid");
      invalidCell = null;
      board.removeEventListener("click", onBoardClick);
      discardButton.removeEventListener("click", discardCurrent);
      sprite.removeEventListener("load", onSpriteLoad);
      sprite.removeEventListener("error", onSpriteError);
      window.removeEventListener("keydown", onKeyDown);
      sprite.removeAttribute("src");
      board.querySelectorAll("img").forEach(function (image) { image.removeAttribute("src"); });
      if (window.render_game_to_text === renderGameToText) {
        if (previousRenderGameToText) window.render_game_to_text = previousRenderGameToText;
        else delete window.render_game_to_text;
      }
      if (window.advanceTime === advanceTime) {
        if (previousAdvanceTime) window.advanceTime = previousAdvanceTime;
        else delete window.advanceTime;
      }
    }
  };
}
