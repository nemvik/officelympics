import { createRng } from "../game-core.mjs";
import { POKEMON_EVOLUTION_EDGES, POKEMON_SNAPSHOT } from "./pokemon/snapshot.mjs";
import { czechCount, defineGame, normalizeScoreResult } from "./shared.mjs";

export const EVOLUTION_MEMORY = Object.freeze({
  pairCount: 8,
  cardCount: 16,
  flipDurationMs: 15_000,
  evaluationDurationMs: 900,
  botMinimumDelayMs: 520,
  botMaximumDelayMs: 940,
  maximumActionNumber: 100_000
});

export const EVOLUTION_MEMORY_MESSAGE_TYPE = "game:evolution-memory-flip";

const POKEMON_BY_ID = new Map(POKEMON_SNAPSHOT.map(function (pokemon) {
  return [pokemon.id, pokemon];
}));
const DIRECT_EVOLUTION_KEYS = new Set(POKEMON_EVOLUTION_EDGES.map(function (edge) {
  return edge.parentId + ":" + edge.childId;
}));

export const evolutionMemoryGame = defineGame({
  id: "evolution-memory",
  meta: {
    icon: "🧬",
    title: "Evoluční pexeso",
    teaser: "Spoj osm navazujících evolucí",
    difficulty: "paměť",
    instruction: "Odhal dvě karty a spoj Pokémona s jeho přímou evolucí. Správný pár dává další tah.",
    scoreLabel: "nalezených párů"
  },
  start: startEvolutionMemory,
  result: {
    mode: "shared",
    normalize: normalizeEvolutionMemoryResult,
    format: formatEvolutionMemoryResult
  }
});

function shuffle(values, random) {
  const shuffled = values.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

function isValidPokemon(pokemon) {
  return pokemon && Number.isInteger(pokemon.id) && pokemon.id >= 1 && pokemon.id <= 151
    && typeof pokemon.name === "string" && pokemon.name.trim()
    && typeof pokemon.sprite === "string" && pokemon.sprite;
}

function eligibleEvolutionEdges(records, edges) {
  const pokemonById = new Map((Array.isArray(records) ? records : []).filter(isValidPokemon).map(function (pokemon) {
    return [pokemon.id, pokemon];
  }));
  const seen = new Set();
  const eligible = (Array.isArray(edges) ? edges : []).filter(function (edge) {
    if (!edge || edge.branched !== false || !Number.isInteger(edge.parentId) || !Number.isInteger(edge.childId)
      || edge.parentId < 1 || edge.parentId > 151 || edge.childId < 1 || edge.childId > 151
      || edge.parentId === edge.childId || !pokemonById.has(edge.parentId) || !pokemonById.has(edge.childId)) return false;
    const key = edge.parentId + ":" + edge.childId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { eligible, pokemonById };
}

export function buildEvolutionMemoryBoard(
  seed,
  records = POKEMON_SNAPSHOT,
  edges = POKEMON_EVOLUTION_EDGES
) {
  const pool = eligibleEvolutionEdges(records, edges);
  const randomPairs = createRng("evolution-memory:pairs:" + String(seed));
  const usedIds = new Set();
  const selected = [];

  shuffle(pool.eligible, randomPairs).some(function (edge) {
    if (usedIds.has(edge.parentId) || usedIds.has(edge.childId)) return false;
    usedIds.add(edge.parentId);
    usedIds.add(edge.childId);
    selected.push(edge);
    return selected.length === EVOLUTION_MEMORY.pairCount;
  });

  if (selected.length !== EVOLUTION_MEMORY.pairCount) {
    throw new Error("Evoluční pexeso potřebuje osm disjunktních přímých evolucí.");
  }

  const cards = selected.flatMap(function (edge) {
    const pairId = edge.parentId + ":" + edge.childId;
    return [edge.parentId, edge.childId].map(function (pokemonId) {
      const pokemon = pool.pokemonById.get(pokemonId);
      return { id: pokemon.id, name: pokemon.name, sprite: pokemon.sprite, pairId };
    });
  });
  const randomLayout = createRng("evolution-memory:layout:" + String(seed));
  return Object.freeze(shuffle(cards, randomLayout).map(function (card) {
    return Object.freeze(card);
  }));
}

export function evolutionMemoryStartingPlayer(seed) {
  return createRng("evolution-memory:start:" + String(seed))() < 0.5 ? 0 : 1;
}

export function isEvolutionMemoryPair(first, second) {
  if (!first || !second || !Number.isInteger(first.id) || !Number.isInteger(second.id) || first.id === second.id) {
    return false;
  }
  const direct = DIRECT_EVOLUTION_KEYS.has(first.id + ":" + second.id)
    || DIRECT_EVOLUTION_KEYS.has(second.id + ":" + first.id);
  if (!direct) return false;
  return first.pairId === undefined || second.pairId === undefined || first.pairId === second.pairId;
}

export function createEvolutionMemoryState(seed) {
  return {
    turnOwner: evolutionMemoryStartingPlayer(seed),
    action: 0,
    phase: "await-first",
    flipped: [],
    matched: new Set(),
    scores: [0, 0]
  };
}

function validState(state) {
  return state && (state.turnOwner === 0 || state.turnOwner === 1)
    && Number.isInteger(state.action) && state.action >= 0
    && ["await-first", "await-second", "evaluating", "finished"].includes(state.phase)
    && Array.isArray(state.flipped) && state.matched instanceof Set
    && Array.isArray(state.scores) && state.scores.length === 2;
}

export function availableEvolutionMemoryCardIndexes(state, cardCount = EVOLUTION_MEMORY.cardCount) {
  if (!validState(state) || !Number.isInteger(cardCount) || cardCount < 1 || cardCount > EVOLUTION_MEMORY.cardCount) {
    return [];
  }
  return Array.from({ length: cardCount }, function (_, index) { return index; }).filter(function (index) {
    return !state.matched.has(index) && !state.flipped.includes(index);
  });
}

export function applyEvolutionMemoryFlip(state, board, actor, index) {
  if (!validState(state) || !Array.isArray(board) || board.length !== EVOLUTION_MEMORY.cardCount
    || actor !== state.turnOwner || !["await-first", "await-second"].includes(state.phase)
    || !Number.isInteger(index) || index < 0 || index >= board.length
    || state.matched.has(index) || state.flipped.includes(index)
    || state.action >= EVOLUTION_MEMORY.maximumActionNumber) return false;

  state.flipped.push(index);
  state.action += 1;
  state.phase = state.flipped.length === 1 ? "await-second" : "evaluating";
  return true;
}

export function resolveEvolutionMemoryPair(state, board) {
  if (!validState(state) || !Array.isArray(board) || board.length !== EVOLUTION_MEMORY.cardCount
    || state.phase !== "evaluating" || state.flipped.length !== 2) return null;

  const indexes = state.flipped.slice();
  const owner = state.turnOwner;
  const match = isEvolutionMemoryPair(board[indexes[0]], board[indexes[1]]);
  if (match) {
    indexes.forEach(function (index) { state.matched.add(index); });
    state.scores[owner] = Math.min(EVOLUTION_MEMORY.pairCount, state.scores[owner] + 1);
  } else {
    state.turnOwner = 1 - state.turnOwner;
  }
  state.flipped = [];
  state.phase = state.matched.size === EVOLUTION_MEMORY.cardCount ? "finished" : "await-first";
  return { match, owner, indexes, finished: state.phase === "finished" };
}

function isPlainMessage(message) {
  return message && typeof message === "object" && !Array.isArray(message);
}

export function validateEvolutionMemoryFlipMessage(message, expectedAction) {
  return Boolean(isPlainMessage(message)
    && message.type === EVOLUTION_MEMORY_MESSAGE_TYPE
    && Number.isInteger(expectedAction) && expectedAction >= 0
    && expectedAction < EVOLUTION_MEMORY.maximumActionNumber
    && message.action === expectedAction
    && Number.isInteger(message.index) && message.index >= 0 && message.index < EVOLUTION_MEMORY.cardCount);
}

export function applyEvolutionMemoryNetworkFlip(state, board, remoteRole, message) {
  if (!validState(state) || !validateEvolutionMemoryFlipMessage(message, state.action)) return false;
  return applyEvolutionMemoryFlip(state, board, remoteRole, message.index);
}

function sanitizeIndexes(indexes) {
  return Array.from(new Set((Array.isArray(indexes) ? indexes : []).filter(function (index) {
    return Number.isInteger(index) && index >= 0 && index < EVOLUTION_MEMORY.cardCount;
  }))).sort(function (first, second) { return first - second; });
}

function seededIndex(seed, action, purpose, indexes) {
  if (!indexes.length) return null;
  const random = createRng("evolution-memory:" + purpose + ":" + String(seed) + ":" + action);
  return indexes[Math.floor(random() * indexes.length)];
}

export function pickEvolutionMemoryTimeoutCard(seed, state) {
  if (!validState(state)) return null;
  return seededIndex(
    seed,
    state.action,
    "timeout:" + state.turnOwner + ":" + state.phase,
    availableEvolutionMemoryCardIndexes(state)
  );
}

export function pickEvolutionMemoryBotCard(seed, action, availableIndexes, memory, firstIndex = null) {
  const available = sanitizeIndexes(availableIndexes);
  const known = memory instanceof Map ? memory : new Map();
  if (!available.length || !Number.isInteger(action) || action < 0) return null;

  if (Number.isInteger(firstIndex) && known.has(firstIndex)) {
    const firstPokemon = { id: known.get(firstIndex) };
    const knownPartners = available.filter(function (index) {
      return known.has(index) && isEvolutionMemoryPair(firstPokemon, { id: known.get(index) });
    });
    if (knownPartners.length) {
      return seededIndex(seed, action, "bot-known-partner:" + firstIndex, knownPartners);
    }
  } else if (firstIndex === null) {
    const knownPairs = [];
    available.forEach(function (first, position) {
      if (!known.has(first)) return;
      available.slice(position + 1).forEach(function (second) {
        if (known.has(second) && isEvolutionMemoryPair({ id: known.get(first) }, { id: known.get(second) })) {
          knownPairs.push([first, second]);
        }
      });
    });
    if (knownPairs.length) {
      const pairIndexes = knownPairs.map(function (pair) { return pair[0]; });
      return seededIndex(seed, action, "bot-known-pair", pairIndexes);
    }
  }

  const unknown = available.filter(function (index) { return !known.has(index); });
  return seededIndex(seed, action, "bot-explore:" + String(firstIndex), unknown.length ? unknown : available);
}

export function normalizeEvolutionMemoryResult(result) {
  return normalizeScoreResult(result, EVOLUTION_MEMORY.pairCount);
}

export function formatEvolutionMemoryResult(result) {
  const normalized = normalizeEvolutionMemoryResult(result);
  const score = normalized ? normalized.score : 0;
  return score + " " + czechCount(score, "nalezený pár", "nalezené páry", "nalezených párů");
}

export function startEvolutionMemory(context) {
  const board = buildEvolutionMemoryBoard(context.seed);
  const state = createEvolutionMemoryState(context.seed);
  const localRole = context.localRole === 1 ? 1 : 0;
  const remoteRole = 1 - localRole;
  const isPractice = context.mode === "practice";
  const botRole = remoteRole;
  const botMemory = new Map();
  const preloadedSprites = [];
  const previousRenderGameToText = window.render_game_to_text;
  const previousAdvanceTime = window.advanceTime;
  let turnElapsedMs = 0;
  let evaluationRemainingMs = 0;
  let botElapsedMs = 0;
  let botDelayMs = 0;
  const queuedRemoteFlips = [];
  let finished = false;
  let lastTick = performance.now();
  let tickTimer = 0;

  context.stage.innerHTML = `
    <div class="evolution-memory-shell" data-phase="await-first">
      <div class="evolution-memory-topline">
        <section class="evolution-memory-turn" aria-label="Aktivní hráč">
          <span class="eyebrow">Na tahu</span>
          <strong></strong>
          <small>Otoč první kartu</small>
        </section>
        <div class="evolution-memory-scores" aria-label="Průběžné skóre">
          <article class="is-local"><span>Ty</span><strong>0</strong></article>
          <b aria-hidden="true">:</b>
          <article class="is-remote"><span>Soupeř</span><strong>0</strong></article>
        </div>
        <div class="evolution-memory-clock" aria-label="Zbývá 15 sekund">
          <span>Na otočení</span><b>15</b><small>s</small><i aria-hidden="true"><span></span></i>
        </div>
      </div>
      <div class="evolution-memory-board" role="group" aria-label="Šestnáct karet evolučního pexesa"></div>
      <p class="evolution-memory-status" role="status" aria-live="polite" aria-atomic="true"></p>
    </div>`;

  const shell = context.stage.querySelector(".evolution-memory-shell");
  const turnName = context.stage.querySelector(".evolution-memory-turn strong");
  const turnInstruction = context.stage.querySelector(".evolution-memory-turn small");
  const localScore = context.stage.querySelector(".evolution-memory-scores .is-local strong");
  const remoteScore = context.stage.querySelector(".evolution-memory-scores .is-remote strong");
  const remoteScoreName = context.stage.querySelector(".evolution-memory-scores .is-remote span");
  const clock = context.stage.querySelector(".evolution-memory-clock");
  const clockValue = clock.querySelector("b");
  const clockUnit = clock.querySelector("small");
  const clockBar = clock.querySelector("i span");
  const cards = context.stage.querySelector(".evolution-memory-board");
  const status = context.stage.querySelector(".evolution-memory-status");

  function roleName(role) {
    if (role === localRole) return "Ty";
    if (isPractice && role === botRole) return "EvoBot";
    return Array.isArray(context.names) && context.names[role] ? context.names[role] : "Soupeř";
  }

  remoteScoreName.textContent = roleName(remoteRole);

  board.forEach(function (card, index) {
    const image = new Image();
    image.decoding = "async";
    image.src = card.sprite;
    preloadedSprites.push(image);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "evolution-memory-card";
    button.dataset.cardIndex = String(index);
    cards.append(button);
  });

  function cardIsVisible(index) {
    return state.matched.has(index) || state.flipped.includes(index);
  }

  function renderCard(button, index) {
    const card = board[index];
    const matched = state.matched.has(index);
    const visible = cardIsVisible(index);
    button.className = "evolution-memory-card";
    button.classList.toggle("is-revealed", visible && !matched);
    button.classList.toggle("is-matched", matched);
    button.disabled = finished || state.phase === "evaluating" || state.phase === "finished"
      || state.turnOwner !== localRole || matched || state.flipped.includes(index);
    button.setAttribute("aria-pressed", String(visible));

    if (!visible) {
      const back = document.createElement("span");
      back.className = "evolution-memory-card-back";
      back.setAttribute("aria-hidden", "true");
      back.textContent = "?";
      button.replaceChildren(back);
      button.setAttribute("aria-label", "Zakrytá karta " + (index + 1));
      return;
    }

    const image = document.createElement("img");
    image.src = card.sprite;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;
    const name = document.createElement("strong");
    name.textContent = card.name;
    const marker = document.createElement("span");
    marker.className = "evolution-memory-card-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = matched ? "✓" : "●";
    button.replaceChildren(image, name, marker);
    button.setAttribute("aria-label", card.name + (matched ? ", nalezená karta" : ", odkrytá karta"));
  }

  function renderClock() {
    if (state.phase === "finished") {
      clockValue.textContent = "✓";
      clockUnit.hidden = true;
      clockBar.style.transform = "scaleX(1)";
      clock.classList.remove("is-urgent");
      clock.classList.add("is-evaluating");
      clock.setAttribute("aria-label", "Všechny páry jsou nalezené");
      return;
    }
    if (state.phase === "evaluating") {
      clockValue.textContent = "…";
      clockUnit.hidden = true;
      clockBar.style.transform = "scaleX(1)";
      clock.classList.remove("is-urgent");
      clock.classList.add("is-evaluating");
      clock.setAttribute("aria-label", "Vyhodnocuji dvojici");
      return;
    }
    const remaining = Math.max(0, EVOLUTION_MEMORY.flipDurationMs - turnElapsedMs);
    clockValue.textContent = String(Math.ceil(remaining / 1000));
    clockUnit.hidden = false;
    clockBar.style.transform = "scaleX(" + remaining / EVOLUTION_MEMORY.flipDurationMs + ")";
    clock.classList.toggle("is-urgent", remaining <= 5000);
    clock.classList.remove("is-evaluating");
    clock.setAttribute("aria-label", "Zbývá " + Math.ceil(remaining / 1000) + " sekund na otočení");
  }

  function render() {
    shell.dataset.phase = state.phase;
    turnName.textContent = state.phase === "finished" ? "Dohráno" : roleName(state.turnOwner);
    turnInstruction.textContent = state.phase === "finished"
      ? "Všechny páry nalezeny"
      : state.phase === "evaluating"
      ? "Vyhodnocuji dvojici"
      : state.phase === "await-second" ? "Otoč druhou kartu" : "Otoč první kartu";
    localScore.textContent = String(state.scores[localRole]);
    remoteScore.textContent = String(state.scores[remoteRole]);
    Array.from(cards.children).forEach(renderCard);
    renderClock();
    context.setScores(state.scores[localRole], state.scores[remoteRole]);
    context.setRoundLabel("Nalezeno " + (state.matched.size / 2) + "/" + EVOLUTION_MEMORY.pairCount
      + (state.phase === "finished" ? " · hotovo" : state.phase === "evaluating" ? " · vyhodnocení"
        : state.phase === "await-second" ? " · druhá karta" : " · první karta"));
  }

  function resetActionClock() {
    turnElapsedMs = 0;
    botElapsedMs = 0;
    const random = createRng("evolution-memory:bot-delay:" + String(context.seed) + ":" + state.action);
    botDelayMs = EVOLUTION_MEMORY.botMinimumDelayMs
      + Math.round(random() * (EVOLUTION_MEMORY.botMaximumDelayMs - EVOLUTION_MEMORY.botMinimumDelayMs));
  }

  function finishGame() {
    if (finished) return;
    finished = true;
    queuedRemoteFlips.length = 0;
    window.clearInterval(tickTimer);
    status.textContent = "Všech osm evolučních párů je nalezených. Pokédex uzavírá duel.";
    render();
    context.finishShared(state.scores.map(function (score) { return { score }; }));
  }

  function performFlip(actor, action, index, shouldSend, source) {
    if (finished || action !== state.action || !applyEvolutionMemoryFlip(state, board, actor, index)) return false;
    if (shouldSend && context.mode === "online") {
      context.send({ type: EVOLUTION_MEMORY_MESSAGE_TYPE, action, index });
    }
    botMemory.set(index, board[index].id);
    resetActionClock();

    if (state.phase === "evaluating") {
      evaluationRemainingMs = EVOLUTION_MEMORY.evaluationDurationMs;
      status.textContent = roleName(actor) + " odkryl " + board[index].name + ". Vyhodnocuji evoluční dvojici.";
    } else if (source === "timeout") {
      status.textContent = "Čas vypršel. " + roleName(actor) + " automaticky odkrývá " + board[index].name + ".";
    } else {
      status.textContent = roleName(actor) + " odkryl " + board[index].name + ". Teď vybírá druhou kartu.";
    }
    render();
    return true;
  }

  function predictedOwnerAfterEvaluation() {
    if (state.phase !== "evaluating" || state.flipped.length !== 2) return null;
    return isEvolutionMemoryPair(board[state.flipped[0]], board[state.flipped[1]])
      ? state.turnOwner
      : 1 - state.turnOwner;
  }

  function canQueueRemoteFlip(message) {
    const queuePosition = queuedRemoteFlips.length;
    if (queuePosition >= 2 || !validateEvolutionMemoryFlipMessage(message, state.action + queuePosition)
      || predictedOwnerAfterEvaluation() !== remoteRole || state.matched.has(message.index)) return false;
    const currentPairMatches = isEvolutionMemoryPair(board[state.flipped[0]], board[state.flipped[1]]);
    return (!currentPairMatches || !state.flipped.includes(message.index))
      && !queuedRemoteFlips.some(function (queued) { return queued.index === message.index; });
  }

  function resolveCurrentPair() {
    if (finished || state.phase !== "evaluating") return;
    const revealedCards = state.flipped.map(function (index) { return board[index]; });
    const result = resolveEvolutionMemoryPair(state, board);
    if (!result) return;
    resetActionClock();
    status.textContent = result.match
      ? roleName(result.owner) + " našel pár " + revealedCards[0].name + " + " + revealedCards[1].name + " a pokračuje."
      : revealedCards[0].name + " a " + revealedCards[1].name + " netvoří pár. Tah přechází na " + roleName(state.turnOwner) + ".";
    render();
    if (result.finished) {
      finishGame();
      return;
    }
    const queued = queuedRemoteFlips.splice(0);
    queued.some(function (message) {
      return !performFlip(remoteRole, message.action, message.index, false, "network");
    });
  }

  function performBotFlip() {
    if (!isPractice || finished || state.turnOwner !== botRole
      || !["await-first", "await-second"].includes(state.phase)) return false;
    const firstIndex = state.phase === "await-second" ? state.flipped[0] : null;
    const index = pickEvolutionMemoryBotCard(
      context.seed,
      state.action,
      availableEvolutionMemoryCardIndexes(state),
      botMemory,
      firstIndex
    );
    return index !== null && performFlip(botRole, state.action, index, false, "bot");
  }

  function performTimeoutFlip() {
    const actor = state.turnOwner;
    if (actor !== localRole && !(isPractice && actor === botRole)) return false;
    const index = pickEvolutionMemoryTimeoutCard(context.seed, state);
    return index !== null && performFlip(actor, state.action, index, actor === localRole, "timeout");
  }

  function stepTime(milliseconds) {
    if (finished || !Number.isFinite(Number(milliseconds))) return;
    const step = Math.min(120_000, Math.max(0, Number(milliseconds)));
    if (state.phase === "evaluating") {
      evaluationRemainingMs -= step;
      if (evaluationRemainingMs <= 0) resolveCurrentPair();
      else renderClock();
      return;
    }
    if (!["await-first", "await-second"].includes(state.phase)) return;
    turnElapsedMs = Math.min(EVOLUTION_MEMORY.flipDurationMs, turnElapsedMs + step);
    if (isPractice && state.turnOwner === botRole) {
      botElapsedMs += step;
      if (botElapsedMs >= botDelayMs && performBotFlip()) return;
    }
    if (turnElapsedMs >= EVOLUTION_MEMORY.flipDurationMs && performTimeoutFlip()) return;
    renderClock();
  }

  function syncClock() {
    if (finished) return;
    const now = performance.now();
    const elapsed = now - lastTick;
    lastTick = now;
    stepTime(elapsed);
  }

  function advanceTime(milliseconds) {
    stepTime(milliseconds);
    lastTick = performance.now();
  }

  function renderGameToText() {
    return JSON.stringify({
      game: "evolution-memory",
      interaction: "DOM buttons; no coordinate system",
      phase: state.phase,
      action: state.action,
      activeRole: state.turnOwner,
      localActive: state.turnOwner === localRole && ["await-first", "await-second"].includes(state.phase),
      remainingMs: ["await-first", "await-second"].includes(state.phase)
        ? Math.round(Math.max(0, EVOLUTION_MEMORY.flipDurationMs - turnElapsedMs))
        : 0,
      scores: { local: state.scores[localRole], remote: state.scores[remoteRole] },
      cards: board.map(function (card, index) {
        const cardState = state.matched.has(index) ? "matched" : state.flipped.includes(index) ? "revealed" : "hidden";
        return { index, state: cardState, pokemon: cardState === "hidden" ? null : card.name };
      }),
      feedback: status.textContent
    });
  }

  function onCardsClick(event) {
    const button = event.target.closest("[data-card-index]");
    if (!button || !cards.contains(button)) return;
    syncClock();
    performFlip(localRole, state.action, Number(button.dataset.cardIndex), true, "manual");
  }

  function onKeyDown(event) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (event.key.toLowerCase() === "f" && !event.metaKey && !event.ctrlKey && !event.altKey
      && !document.fullscreenElement && typeof context.stage.requestFullscreen === "function") {
      event.preventDefault();
      context.stage.requestFullscreen().catch(function () {});
    }
  }

  function receiveNetwork(message) {
    if (isPractice || finished) return;
    if (state.phase === "evaluating") {
      if (canQueueRemoteFlip(message)) queuedRemoteFlips.push({ action: message.action, index: message.index });
      return;
    }
    if (!validateEvolutionMemoryFlipMessage(message, state.action)) return;
    performFlip(remoteRole, message && message.action, message && message.index, false, "network");
  }

  cards.addEventListener("click", onCardsClick);
  window.addEventListener("keydown", onKeyDown);
  window.render_game_to_text = renderGameToText;
  window.advanceTime = advanceTime;
  context.setScores(0, 0);
  resetActionClock();
  status.textContent = state.turnOwner === localRole
    ? "Začínáš. Odkryj první ze šestnácti karet."
    : roleName(state.turnOwner) + " začíná. Sleduj odhalené karty a zapamatuj si je.";
  render();
  if (state.turnOwner === localRole) {
    const firstCard = cards.querySelector("button:not(:disabled)");
    if (firstCard) firstCard.focus({ preventScroll: true });
  }
  lastTick = performance.now();
  tickTimer = window.setInterval(syncClock, 50);

  return {
    receiveNetwork,
    cleanup: function () {
      finished = true;
      queuedRemoteFlips.length = 0;
      window.clearInterval(tickTimer);
      cards.removeEventListener("click", onCardsClick);
      window.removeEventListener("keydown", onKeyDown);
      preloadedSprites.forEach(function (image) { image.removeAttribute("src"); });
      preloadedSprites.length = 0;
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
