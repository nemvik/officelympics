import { createRng } from "../game-core.mjs";
import { POKEMON_SNAPSHOT } from "./pokemon/snapshot.mjs";
import { defineGame, normalizeScoreResult } from "./shared.mjs";

export const KANTO_TRUMF = Object.freeze({
  rounds: 6,
  handSize: 7,
  choiceDurationMs: 8000,
  revealDurationMs: 2200,
  maximumScore: 12,
  nonceBytes: 16
});

export const KANTO_TRUMF_DISCIPLINES = Object.freeze([
  Object.freeze({ id: "hp", label: "HP" }),
  Object.freeze({ id: "attack", label: "Útok" }),
  Object.freeze({ id: "defense", label: "Obrana" }),
  Object.freeze({ id: "speed", label: "Rychlost" }),
  Object.freeze({ id: "height", label: "Výška" }),
  Object.freeze({ id: "weight", label: "Váha" })
]);

export const KANTO_TRUMF_MESSAGE_TYPES = Object.freeze({
  commit: "game:kanto-trumf-commit",
  reveal: "game:kanto-trumf-reveal"
});

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const NONCE_PATTERN = /^[a-f0-9]{32}$/;
const DISCIPLINE_BY_ID = new Map(KANTO_TRUMF_DISCIPLINES.map(function (discipline) {
  return [discipline.id, discipline];
}));
const POKEMON_BY_ID = new Map(POKEMON_SNAPSHOT.map(function (pokemon) {
  return [pokemon.id, pokemon];
}));

export const kantoTrumfGame = defineGame({
  id: "kanto-trumf",
  meta: {
    icon: "🃏",
    title: "Kanto Trumf",
    teaser: "Šest tajných soubojů nad stejnou rukou",
    difficulty: "taktika",
    instruction: "Vyber Pokémona pro aktuální disciplínu. Volba se odhalí až po uzamčení obou hráčů.",
    scoreLabel: "trumfových bodů"
  },
  start: startKantoTrumf,
  result: {
    mode: "shared",
    normalize: normalizeKantoTrumfResult,
    format: formatKantoTrumfResult
  }
});

function shuffle(values, random) {
  const shuffled = values.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const value = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = value;
  }
  return shuffled;
}

function isValidKantoPokemon(pokemon) {
  return pokemon && Number.isInteger(pokemon.id) && pokemon.id >= 1 && pokemon.id <= 151
    && typeof pokemon.name === "string" && pokemon.name.trim()
    && typeof pokemon.sprite === "string" && pokemon.sprite
    && KANTO_TRUMF_DISCIPLINES.every(function (discipline) {
      return Number.isFinite(pokemon[discipline.id]) && pokemon[discipline.id] > 0;
    });
}

function validPokemonPool(records) {
  const uniqueById = new Map();
  (Array.isArray(records) ? records : []).forEach(function (pokemon) {
    if (isValidKantoPokemon(pokemon) && !uniqueById.has(pokemon.id)) {
      uniqueById.set(pokemon.id, pokemon);
    }
  });
  return Array.from(uniqueById.values()).sort(function (first, second) {
    return first.id - second.id;
  });
}

export function buildKantoTrumfSetup(seed, records = POKEMON_SNAPSHOT) {
  const pool = validPokemonPool(records);
  if (pool.length < KANTO_TRUMF.handSize) {
    throw new Error("Kanto Trumf potřebuje alespoň sedm platných Pokémonů.");
  }
  const random = createRng("kanto-trumf:" + String(seed));
  return {
    pokemonIds: shuffle(pool, random).slice(0, KANTO_TRUMF.handSize).map(function (pokemon) {
      return pokemon.id;
    }),
    disciplines: shuffle(KANTO_TRUMF_DISCIPLINES.map(function (discipline) {
      return discipline.id;
    }), random)
  };
}

export function kantoTrumfStatValue(pokemon, disciplineId) {
  if (!pokemon || !DISCIPLINE_BY_ID.has(disciplineId)) return null;
  const value = pokemon[disciplineId];
  return Number.isFinite(value) ? value : null;
}

function formatDecimal(value) {
  return Number(value).toFixed(1).replace(/\.0$/, "").replace(".", ",");
}

export function formatKantoTrumfValue(pokemon, disciplineId) {
  const value = kantoTrumfStatValue(pokemon, disciplineId);
  if (value === null) return "—";
  if (disciplineId === "height") return formatDecimal(value / 10) + " m";
  if (disciplineId === "weight") return formatDecimal(value / 10) + " kg";
  return String(value);
}

export function scoreKantoTrumfRound(firstPokemon, secondPokemon, disciplineId) {
  const firstValue = kantoTrumfStatValue(firstPokemon, disciplineId);
  const secondValue = kantoTrumfStatValue(secondPokemon, disciplineId);
  if (!Number.isInteger(firstPokemon && firstPokemon.id) || !Number.isInteger(secondPokemon && secondPokemon.id)
    || firstValue === null || secondValue === null) {
    throw new TypeError("Kolo Kanto Trumfu dostalo neplatná data.");
  }
  if (firstPokemon.id === secondPokemon.id) {
    return { points: [0, 0], winner: null, kind: "ditto", values: [firstValue, secondValue] };
  }
  if (firstValue === secondValue) {
    return { points: [1, 1], winner: null, kind: "tie", values: [firstValue, secondValue] };
  }
  const winner = firstValue > secondValue ? 0 : 1;
  return {
    points: winner === 0 ? [2, 0] : [0, 2],
    winner,
    kind: "win",
    values: [firstValue, secondValue]
  };
}

export function consumeKantoTrumfCards(usedByRole, pokemonIdsByRole) {
  if (!Array.isArray(usedByRole) || usedByRole.length !== 2
    || usedByRole.some(function (used) { return !(used instanceof Set); })
    || !Array.isArray(pokemonIdsByRole) || pokemonIdsByRole.length !== 2
    || pokemonIdsByRole.some(function (pokemonId, role) {
      return !Number.isInteger(pokemonId) || pokemonId < 1 || pokemonId > 151 || usedByRole[role].has(pokemonId);
    })) return false;
  pokemonIdsByRole.forEach(function (pokemonId, role) { usedByRole[role].add(pokemonId); });
  return true;
}

function sanitizeAvailableIds(availableIds) {
  return Array.from(new Set((Array.isArray(availableIds) ? availableIds : []).filter(function (pokemonId) {
    return Number.isInteger(pokemonId) && pokemonId >= 1 && pokemonId <= 151;
  }))).sort(function (first, second) { return first - second; });
}

export function pickKantoTrumfTimeoutCard(seed, role, round, availableIds) {
  const pool = sanitizeAvailableIds(availableIds);
  if (!pool.length) return null;
  const random = createRng("kanto-trumf-timeout:" + String(seed) + ":" + role + ":" + round);
  return pool[Math.floor(random() * pool.length)];
}

export function pickKantoTrumfBotCard(seed, round, disciplineId, availableIds, records = POKEMON_SNAPSHOT) {
  if (!DISCIPLINE_BY_ID.has(disciplineId)) return null;
  const byId = new Map(validPokemonPool(records).map(function (pokemon) { return [pokemon.id, pokemon]; }));
  const ranked = sanitizeAvailableIds(availableIds).map(function (pokemonId) {
    return byId.get(pokemonId);
  }).filter(Boolean).sort(function (first, second) {
    return second[disciplineId] - first[disciplineId] || first.id - second.id;
  });
  if (!ranked.length) return null;

  const candidateCount = Math.min(3, ranked.length);
  const random = createRng("kanto-trumf-bot:" + String(seed) + ":" + round);
  const candidateIndex = Math.min(candidateCount - 1, Math.floor(random() * random() * candidateCount));
  return ranked[candidateIndex].id;
}

function isPlainMessage(message) {
  return message && typeof message === "object" && !Array.isArray(message);
}

function isValidChoiceIdentity(round, role, pokemonId, nonce) {
  return Number.isInteger(round) && round >= 0 && round < KANTO_TRUMF.rounds
    && (role === 0 || role === 1)
    && Number.isInteger(pokemonId) && pokemonId >= 1 && pokemonId <= 151
    && typeof nonce === "string" && NONCE_PATTERN.test(nonce);
}

export async function hashKantoTrumfChoice(round, role, pokemonId, nonce) {
  if (!isValidChoiceIdentity(round, role, pokemonId, nonce)) {
    throw new TypeError("Commit Kanto Trumfu má neplatná vstupní data.");
  }
  if (!globalThis.crypto || !globalThis.crypto.subtle || typeof globalThis.crypto.subtle.digest !== "function") {
    throw new Error("Pro bezpečný commit je potřeba Web Crypto API.");
  }
  const payload = "kanto-trumf:v1|" + round + "|" + role + "|" + pokemonId + "|" + nonce;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), function (byte) {
    return byte.toString(16).padStart(2, "0");
  }).join("");
}

export function validateKantoTrumfCommit(message, expected) {
  return Boolean(isPlainMessage(message)
    && message.type === KANTO_TRUMF_MESSAGE_TYPES.commit
    && expected && expected.received !== true
    && message.role === expected.role
    && message.round === expected.round
    && typeof message.hash === "string"
    && HASH_PATTERN.test(message.hash));
}

function validRevealEnvelope(message, expected) {
  const allowedIds = expected && Array.isArray(expected.allowedIds) ? expected.allowedIds : [];
  const usedIds = expected && expected.usedIds instanceof Set ? expected.usedIds : new Set();
  return Boolean(isPlainMessage(message)
    && message.type === KANTO_TRUMF_MESSAGE_TYPES.reveal
    && expected && expected.commitsReady === true && expected.received !== true
    && message.role === expected.role
    && message.round === expected.round
    && isValidChoiceIdentity(message.round, message.role, message.pokemonId, message.nonce)
    && allowedIds.includes(message.pokemonId)
    && !usedIds.has(message.pokemonId)
    && typeof expected.commitHash === "string"
    && HASH_PATTERN.test(expected.commitHash));
}

export async function validateKantoTrumfReveal(message, expected) {
  if (!validRevealEnvelope(message, expected)) return false;
  const actualHash = await hashKantoTrumfChoice(
    message.round,
    message.role,
    message.pokemonId,
    message.nonce
  );
  return actualHash === expected.commitHash;
}

export function normalizeKantoTrumfResult(result) {
  return normalizeScoreResult(result, KANTO_TRUMF.maximumScore);
}

export function formatKantoTrumfResult(result) {
  const normalized = normalizeKantoTrumfResult(result);
  const score = normalized ? normalized.score : 0;
  return score + "/" + KANTO_TRUMF.maximumScore + " trumfových bodů";
}

function secureNonce() {
  if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
    throw new Error("Pro bezpečný nonce je potřeba Web Crypto API.");
  }
  const bytes = new Uint8Array(KANTO_TRUMF.nonceBytes);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
}

export function startKantoTrumf(context) {
  const setup = buildKantoTrumfSetup(context.seed);
  const localRole = context.localRole === 1 ? 1 : 0;
  const remoteRole = 1 - localRole;
  const isPractice = context.mode === "practice";
  const scores = [0, 0];
  const usedByRole = [new Set(), new Set()];
  const previousRenderGameToText = window.render_game_to_text;
  const previousAdvanceTime = window.advanceTime;
  const preloadedSprites = [];
  let roundIndex = 0;
  let phase = "idle";
  let selectedPokemonId = null;
  let choicesByRole = [null, null];
  let commitsByRole = [null, null];
  let revealsByRole = [null, null];
  let revealPendingByRole = [false, false];
  let queuedRemoteReveal = null;
  let bufferedRemoteCommit = null;
  let localCommitPending = false;
  let cryptoFailed = false;
  let roundElapsedMs = 0;
  let revealRemainingMs = 0;
  let botLockAtMs = 0;
  let finished = false;
  let lastTick = performance.now();
  let tickTimer = 0;

  context.stage.innerHTML = `
    <div class="kanto-trumf-shell" data-phase="idle">
      <div class="kanto-trumf-topline">
        <div class="kanto-trumf-disciplines">
          <section class="kanto-trumf-discipline is-current" aria-label="Aktuální disciplína">
            <span>Teď se hraje</span><strong class="kanto-trumf-current"></strong><small>Vyšší hodnota bere 2 body</small>
          </section>
          <span class="kanto-trumf-arrow" aria-hidden="true">→</span>
          <section class="kanto-trumf-discipline is-next" aria-label="Následující disciplína">
            <span>Následuje</span><strong class="kanto-trumf-next"></strong><small class="kanto-trumf-next-note"></small>
          </section>
        </div>
        <div class="kanto-trumf-clock" aria-label="Zbývá osm sekund na volbu">
          <span>Zbývá</span><b>8,0</b><small>s</small><i aria-hidden="true"><span></span></i>
        </div>
      </div>

      <div class="kanto-trumf-locks" aria-label="Stav voleb">
        <span class="kanto-trumf-local-lock">Ty · vybíráš</span>
        <span class="kanto-trumf-lock-mark" aria-hidden="true">◆</span>
        <span class="kanto-trumf-remote-lock">Soupeř · vybírá</span>
      </div>

      <section class="kanto-trumf-reveal" aria-label="Výsledek kola" hidden></section>

      <section class="kanto-trumf-hand" aria-labelledby="kanto-trumf-hand-title">
        <div class="kanto-trumf-hand-heading">
          <div><span class="eyebrow">Tvoje ruka</span><h3 id="kanto-trumf-hand-title">Vyber kartu a uzamkni ji</h3></div>
          <span class="kanto-trumf-round-count"></span>
        </div>
        <div class="kanto-trumf-cards" role="group" aria-label="Sedm Pokémon karet"></div>
      </section>

      <div class="kanto-trumf-actions">
        <p class="kanto-trumf-status" role="status" aria-live="polite" aria-atomic="true">Volbu můžeš před uzamčením změnit.</p>
        <button class="kanto-trumf-confirm" type="button" disabled>Uzamknout kartu</button>
      </div>
    </div>`;

  const shell = context.stage.querySelector(".kanto-trumf-shell");
  const currentDisciplineLabel = context.stage.querySelector(".kanto-trumf-current");
  const nextDisciplineLabel = context.stage.querySelector(".kanto-trumf-next");
  const nextDisciplineNote = context.stage.querySelector(".kanto-trumf-next-note");
  const clock = context.stage.querySelector(".kanto-trumf-clock");
  const clockValue = clock.querySelector("b");
  const clockBar = clock.querySelector("i span");
  const localLockLabel = context.stage.querySelector(".kanto-trumf-local-lock");
  const remoteLockLabel = context.stage.querySelector(".kanto-trumf-remote-lock");
  const revealPanel = context.stage.querySelector(".kanto-trumf-reveal");
  const handTitle = context.stage.querySelector("#kanto-trumf-hand-title");
  const roundCount = context.stage.querySelector(".kanto-trumf-round-count");
  const cards = context.stage.querySelector(".kanto-trumf-cards");
  const status = context.stage.querySelector(".kanto-trumf-status");
  const confirmButton = context.stage.querySelector(".kanto-trumf-confirm");

  setup.pokemonIds.forEach(function (pokemonId) {
    const image = new Image();
    image.decoding = "async";
    image.src = POKEMON_BY_ID.get(pokemonId).sprite;
    preloadedSprites.push(image);
  });

  function currentDisciplineId() {
    return setup.disciplines[roundIndex];
  }

  function nextDisciplineId() {
    return setup.disciplines[roundIndex + 1] || null;
  }

  function disciplineLabel(disciplineId) {
    const discipline = DISCIPLINE_BY_ID.get(disciplineId);
    return discipline ? discipline.label : "—";
  }

  function roleName(role) {
    if (role === localRole) return "Ty";
    return Array.isArray(context.names) && context.names[role] ? context.names[role] : "Soupeř";
  }

  function availableForRole(role) {
    return setup.pokemonIds.filter(function (pokemonId) { return !usedByRole[role].has(pokemonId); });
  }

  function isLocalLocked() {
    return isPractice
      ? choicesByRole[localRole] !== null
      : localCommitPending || commitsByRole[localRole] !== null;
  }

  function isRemoteLocked() {
    return isPractice ? choicesByRole[remoteRole] !== null : commitsByRole[remoteRole] !== null;
  }

  function renderClock() {
    const remaining = Math.max(0, KANTO_TRUMF.choiceDurationMs - roundElapsedMs);
    clockValue.textContent = phase === "revealed" ? "✓" : formatDecimal(remaining / 1000);
    clock.querySelector("small").hidden = phase === "revealed";
    clockBar.style.transform = "scaleX(" + (phase === "revealed" ? 1 : remaining / KANTO_TRUMF.choiceDurationMs) + ")";
    clock.classList.toggle("is-urgent", phase === "choosing" && remaining <= 2500);
    clock.classList.toggle("is-revealed", phase === "revealed");
    clock.setAttribute("aria-label", phase === "revealed"
      ? "Karty byly odhaleny"
      : "Zbývá " + Math.ceil(remaining / 1000) + " sekund na volbu");
  }

  function appendStat(parent, label, value, className) {
    const stat = document.createElement("span");
    stat.className = className;
    const title = document.createElement("small");
    title.textContent = label;
    const number = document.createElement("b");
    number.textContent = value;
    stat.append(title, number);
    parent.append(stat);
  }

  function buildCard(pokemonId, index) {
    const pokemon = POKEMON_BY_ID.get(pokemonId);
    const spent = usedByRole[localRole].has(pokemonId);
    const locked = isLocalLocked();
    const selected = selectedPokemonId === pokemonId;
    const nextId = nextDisciplineId();
    const accessibleState = spent
      ? "spotřebovaná karta"
      : selected && locked ? "uzamčená karta" : selected ? "vybraná karta" : "dostupná karta";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "kanto-trumf-card";
    button.dataset.pokemonId = String(pokemonId);
    button.dataset.cardIndex = String(index + 1);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", (index + 1) + ". " + pokemon.name
      + ", " + disciplineLabel(currentDisciplineId()) + " " + formatKantoTrumfValue(pokemon, currentDisciplineId())
      + (nextId
        ? ", následuje " + disciplineLabel(nextId) + " " + formatKantoTrumfValue(pokemon, nextId)
        : ", bez další disciplíny")
      + ", " + accessibleState);
    button.disabled = spent || locked || phase !== "choosing";
    if (spent) button.classList.add("is-spent");
    if (selected) button.classList.add("is-selected");
    if (selected && locked) button.classList.add("is-locked");

    const shortcut = document.createElement("span");
    shortcut.className = "kanto-trumf-shortcut";
    shortcut.setAttribute("aria-hidden", "true");
    shortcut.textContent = String(index + 1);
    const image = document.createElement("img");
    image.src = pokemon.sprite;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;
    const name = document.createElement("strong");
    name.textContent = pokemon.name;
    const stats = document.createElement("span");
    stats.className = "kanto-trumf-card-stats";
    appendStat(stats, disciplineLabel(currentDisciplineId()), formatKantoTrumfValue(pokemon, currentDisciplineId()), "is-current");
    appendStat(stats, nextId ? disciplineLabel(nextId) : "Další", nextId ? formatKantoTrumfValue(pokemon, nextId) : "konec", "is-next");
    const state = document.createElement("em");
    state.textContent = spent ? "Spotřebováno" : selected && locked ? "Uzamčeno" : selected ? "Vybráno" : "Dostupná";
    button.append(shortcut, image, name, stats, state);
    return button;
  }

  function renderHand(focusPokemonId = null) {
    const activeCard = document.activeElement && document.activeElement.closest
      ? document.activeElement.closest("[data-pokemon-id]")
      : null;
    const preservedFocusId = focusPokemonId === null && activeCard && cards.contains(activeCard)
      ? Number(activeCard.dataset.pokemonId)
      : focusPokemonId;
    const fragment = document.createDocumentFragment();
    setup.pokemonIds.forEach(function (pokemonId, index) {
      fragment.append(buildCard(pokemonId, index));
    });
    cards.replaceChildren(fragment);
    const locked = isLocalLocked();
    confirmButton.disabled = phase !== "choosing" || locked || selectedPokemonId === null;
    confirmButton.textContent = locked ? "Karta uzamčena" : "Uzamknout kartu";
    localLockLabel.textContent = locked ? "Ty · uzamčeno" : selectedPokemonId === null ? "Ty · vybíráš" : "Ty · připraveno";
    remoteLockLabel.textContent = isRemoteLocked() ? "Soupeř · uzamčeno" : "Soupeř · vybírá";
    localLockLabel.classList.toggle("is-locked", locked);
    remoteLockLabel.classList.toggle("is-locked", isRemoteLocked());
    if (preservedFocusId !== null) {
      const focusedCard = cards.querySelector('[data-pokemon-id="' + preservedFocusId + '"]');
      if (focusedCard && !focusedCard.disabled) focusedCard.focus({ preventScroll: true });
    }
  }

  function createRevealCard(role, pokemon) {
    const card = document.createElement("article");
    card.className = "kanto-trumf-reveal-card " + (role === localRole ? "is-local" : "is-remote");
    const owner = document.createElement("small");
    owner.textContent = roleName(role);
    const image = document.createElement("img");
    image.src = pokemon.sprite;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;
    const name = document.createElement("strong");
    name.textContent = pokemon.name;
    const value = document.createElement("b");
    value.textContent = disciplineLabel(currentDisciplineId()) + ": "
      + formatKantoTrumfValue(pokemon, currentDisciplineId());
    card.append(owner, image, name, value);
    return card;
  }

  function resultMessage(result, pokemonByRole) {
    if (result.kind === "ditto") {
      return "Ditto kolize! Oba jste zvolili " + pokemonByRole[0].name + ". Nikdo neboduje.";
    }
    if (result.kind === "tie") {
      return "Přesná shoda hodnot. Každý získává 1 bod.";
    }
    const winnerRole = result.winner;
    return winnerRole === localRole
      ? "Máš vyšší hodnotu. Získáváš 2 body."
      : roleName(winnerRole) + " má vyšší hodnotu a získává 2 body.";
  }

  function renderReveal(pokemonByRole, result) {
    const versus = document.createElement("span");
    versus.className = "kanto-trumf-reveal-versus";
    versus.textContent = "VS";
    versus.setAttribute("aria-hidden", "true");
    const outcome = document.createElement("p");
    outcome.textContent = resultMessage(result, pokemonByRole);
    revealPanel.replaceChildren(
      createRevealCard(localRole, pokemonByRole[localRole]),
      versus,
      createRevealCard(remoteRole, pokemonByRole[remoteRole]),
      outcome
    );
    revealPanel.hidden = false;
  }

  function updateRoundHeader() {
    const currentId = currentDisciplineId();
    const nextId = nextDisciplineId();
    currentDisciplineLabel.textContent = disciplineLabel(currentId);
    nextDisciplineLabel.textContent = nextId ? disciplineLabel(nextId) : "Konec zápasu";
    nextDisciplineNote.textContent = nextId ? "Mysli o kartu dopředu" : "Sedmá karta zůstane v ruce";
    roundCount.textContent = "Kolo " + (roundIndex + 1) + "/" + KANTO_TRUMF.rounds;
    context.setRoundLabel("Kolo " + (roundIndex + 1) + "/" + KANTO_TRUMF.rounds + " · " + disciplineLabel(currentId));
  }

  function renderGameToText() {
    const currentId = currentDisciplineId();
    const nextId = nextDisciplineId();
    const revealed = phase === "revealed" && revealsByRole.every(Boolean)
      ? [0, 1].map(function (role) {
        const pokemon = POKEMON_BY_ID.get(revealsByRole[role].pokemonId);
        return { role, id: pokemon.id, name: pokemon.name, value: formatKantoTrumfValue(pokemon, currentId) };
      })
      : null;
    return JSON.stringify({
      game: "kanto-trumf",
      interaction: "DOM buttons; no coordinate system",
      phase,
      round: roundIndex + 1,
      rounds: KANTO_TRUMF.rounds,
      discipline: disciplineLabel(currentId),
      nextDiscipline: nextId ? disciplineLabel(nextId) : null,
      remainingMs: phase === "choosing" ? Math.round(Math.max(0, KANTO_TRUMF.choiceDurationMs - roundElapsedMs)) : 0,
      scores: { local: scores[localRole], remote: scores[remoteRole] },
      locks: { local: isLocalLocked(), remote: isRemoteLocked() },
      selectedPokemon: selectedPokemonId === null ? null : {
        id: selectedPokemonId,
        name: POKEMON_BY_ID.get(selectedPokemonId).name
      },
      availableCards: availableForRole(localRole).map(function (pokemonId) {
        const pokemon = POKEMON_BY_ID.get(pokemonId);
        return {
          id: pokemon.id,
          name: pokemon.name,
          current: formatKantoTrumfValue(pokemon, currentId),
          next: nextId ? formatKantoTrumfValue(pokemon, nextId) : null
        };
      }),
      revealed,
      feedback: status.textContent
    });
  }

  function finishGame() {
    if (finished) return;
    finished = true;
    phase = "finished";
    shell.dataset.phase = phase;
    window.clearInterval(tickTimer);
    status.textContent = "Šest disciplín je rozhodnuto. Pokédex počítá konečný výsledek.";
    context.finishShared(scores.map(function (score) { return { score }; }));
  }

  function startRound(nextRoundIndex) {
    if (finished) return;
    if (nextRoundIndex >= KANTO_TRUMF.rounds) {
      finishGame();
      return;
    }
    roundIndex = nextRoundIndex;
    phase = "choosing";
    selectedPokemonId = null;
    choicesByRole = [null, null];
    commitsByRole = [null, null];
    revealsByRole = [null, null];
    revealPendingByRole = [false, false];
    queuedRemoteReveal = null;
    localCommitPending = false;
    cryptoFailed = false;
    roundElapsedMs = 0;
    revealRemainingMs = 0;
    const botRandom = createRng("kanto-trumf-bot-delay:" + String(context.seed) + ":" + roundIndex);
    botLockAtMs = 700 + Math.round(botRandom() * 1100);
    shell.dataset.phase = phase;
    revealPanel.hidden = true;
    revealPanel.replaceChildren();
    handTitle.textContent = "Vyber kartu a uzamkni ji";
    if (bufferedRemoteCommit && bufferedRemoteCommit.round === roundIndex) {
      commitsByRole[remoteRole] = bufferedRemoteCommit.hash;
      bufferedRemoteCommit = null;
      status.textContent = "Soupeř už uzamkl kartu. Jeho volba zůstává skrytá.";
    } else {
      bufferedRemoteCommit = null;
      status.textContent = "Volbu můžeš před uzamčením změnit. Soupeř ji neuvidí.";
    }
    updateRoundHeader();
    renderClock();
    renderHand();
    context.setScores(scores[localRole], scores[remoteRole]);
    const firstAvailable = cards.querySelector("button:not(:disabled)");
    if (firstAvailable) firstAvailable.focus({ preventScroll: true });
  }

  function resolveRound(pokemonIdsByRole) {
    if (finished || phase !== "choosing") return;
    const pokemonByRole = pokemonIdsByRole.map(function (pokemonId) { return POKEMON_BY_ID.get(pokemonId); });
    if (pokemonByRole.some(function (pokemon) { return !pokemon; })) return;
    const result = scoreKantoTrumfRound(pokemonByRole[0], pokemonByRole[1], currentDisciplineId());
    if (!consumeKantoTrumfCards(usedByRole, pokemonIdsByRole)) return;
    [0, 1].forEach(function (role) {
      scores[role] += result.points[role];
      revealsByRole[role] = revealsByRole[role] || { pokemonId: pokemonIdsByRole[role] };
    });
    phase = "revealed";
    revealRemainingMs = KANTO_TRUMF.revealDurationMs;
    shell.dataset.phase = phase;
    handTitle.textContent = "Karty jsou spotřebované";
    status.textContent = resultMessage(result, pokemonByRole);
    renderReveal(pokemonByRole, result);
    renderClock();
    renderHand();
    context.setScores(scores[localRole], scores[remoteRole]);
  }

  function maybeResolvePractice() {
    if (!isPractice || choicesByRole.some(function (choice) { return choice === null; })) return;
    resolveRound(choicesByRole.slice());
  }

  function lockPracticeChoice(role, pokemonId, timedOut) {
    if (finished || phase !== "choosing" || choicesByRole[role] !== null
      || !availableForRole(role).includes(pokemonId)) return false;
    choicesByRole[role] = pokemonId;
    if (role === localRole) {
      selectedPokemonId = pokemonId;
      status.textContent = timedOut
        ? "Čas vypršel. Dostupná karta byla bezpečně uzamčena automaticky."
        : "Tvoje karta je uzamčená. Čekám na soupeře.";
    } else if (!isLocalLocked()) {
      status.textContent = "Soupeř už uzamkl kartu. Jeho volba zůstává skrytá.";
    }
    renderHand();
    maybeResolvePractice();
    return true;
  }

  function maybeSendReveal() {
    if (isPractice || finished || phase !== "choosing" || commitsByRole.some(function (hash) { return !hash; })) return;
    if (!choicesByRole[localRole] || revealsByRole[localRole]) return;
    const secret = choicesByRole[localRole];
    const message = {
      type: KANTO_TRUMF_MESSAGE_TYPES.reveal,
      round: roundIndex,
      role: localRole,
      pokemonId: secret.pokemonId,
      nonce: secret.nonce
    };
    revealsByRole[localRole] = { pokemonId: secret.pokemonId, nonce: secret.nonce };
    context.send(message);
    status.textContent = "Oba commity jsou potvrzené. Ověřuji současné odhalení karet.";
    maybeResolveOnline();
  }

  function maybeResolveOnline() {
    if (isPractice || finished || phase !== "choosing" || revealsByRole.some(function (reveal) { return !reveal; })) return;
    resolveRound(revealsByRole.map(function (reveal) { return reveal.pokemonId; }));
  }

  async function commitOnlineChoice(pokemonId, timedOut) {
    if (finished || phase !== "choosing" || isLocalLocked() || !availableForRole(localRole).includes(pokemonId)) return;
    selectedPokemonId = pokemonId;
    localCommitPending = true;
    cryptoFailed = false;
    status.textContent = timedOut
      ? "Čas vypršel. Vytvářím bezpečný commit automatické volby."
      : "Vytvářím bezpečný commit. Volbu už nelze změnit.";
    renderHand();
    const capturedRound = roundIndex;

    try {
      const nonce = secureNonce();
      const hash = await hashKantoTrumfChoice(capturedRound, localRole, pokemonId, nonce);
      if (finished || phase !== "choosing" || roundIndex !== capturedRound || !localCommitPending) return;
      choicesByRole[localRole] = { pokemonId, nonce };
      commitsByRole[localRole] = hash;
      localCommitPending = false;
      renderHand();
      context.send({
        type: KANTO_TRUMF_MESSAGE_TYPES.commit,
        round: capturedRound,
        role: localRole,
        hash
      });
      status.textContent = isRemoteLocked()
        ? "Oba hráči uzamkli. Odesílám odhalení."
        : "Tvoje karta je uzamčená. Čekám na soupeřův commit.";
      maybeSendReveal();
    } catch (error) {
      if (finished || roundIndex !== capturedRound) return;
      localCommitPending = false;
      cryptoFailed = true;
      status.textContent = "Bezpečné uzamčení se nezdařilo. Zkus kartu potvrdit znovu.";
      renderHand();
    }
  }

  function confirmSelected(timedOut = false) {
    if (!timedOut) syncClock();
    if (finished || phase !== "choosing" || isLocalLocked()) return;
    const pokemonId = selectedPokemonId === null && timedOut
      ? pickKantoTrumfTimeoutCard(context.seed, localRole, roundIndex, availableForRole(localRole))
      : selectedPokemonId;
    if (!availableForRole(localRole).includes(pokemonId)) return;
    selectedPokemonId = pokemonId;
    if (isPractice) lockPracticeChoice(localRole, pokemonId, timedOut);
    else void commitOnlineChoice(pokemonId, timedOut);
  }

  function lockPracticeBot() {
    if (!isPractice || finished || phase !== "choosing" || choicesByRole[remoteRole] !== null) return;
    const pokemonId = pickKantoTrumfBotCard(
      context.seed,
      roundIndex,
      currentDisciplineId(),
      availableForRole(remoteRole)
    );
    if (pokemonId !== null) lockPracticeChoice(remoteRole, pokemonId, false);
  }

  function stepTime(milliseconds) {
    if (finished || !Number.isFinite(Number(milliseconds))) return;
    const step = Math.min(120_000, Math.max(0, Number(milliseconds)));
    if (phase === "choosing") {
      roundElapsedMs = Math.min(KANTO_TRUMF.choiceDurationMs, roundElapsedMs + step);
      if (isPractice && roundElapsedMs >= botLockAtMs) lockPracticeBot();
      if (phase === "choosing" && roundElapsedMs >= KANTO_TRUMF.choiceDurationMs
        && !isLocalLocked() && !cryptoFailed) {
        selectedPokemonId = pickKantoTrumfTimeoutCard(
          context.seed,
          localRole,
          roundIndex,
          availableForRole(localRole)
        );
        confirmSelected(true);
      }
      renderClock();
    } else if (phase === "revealed") {
      revealRemainingMs -= step;
      if (revealRemainingMs <= 0) startRound(roundIndex + 1);
    }
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

  function selectCard(pokemonId) {
    syncClock();
    if (finished || phase !== "choosing" || isLocalLocked() || !availableForRole(localRole).includes(pokemonId)) return;
    selectedPokemonId = pokemonId;
    const pokemon = POKEMON_BY_ID.get(pokemonId);
    status.textContent = pokemon.name + " je vybraný. Potvrzením volbu uzamkneš.";
    renderHand(pokemonId);
  }

  function onCardsClick(event) {
    const button = event.target.closest("[data-pokemon-id]");
    if (!button || !cards.contains(button)) return;
    selectCard(Number(button.dataset.pokemonId));
  }

  function onConfirmClick() {
    confirmSelected(false);
  }

  function onKeyDown(event) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (event.key.toLowerCase() === "f" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (!document.fullscreenElement && typeof context.stage.requestFullscreen === "function") {
        event.preventDefault();
        context.stage.requestFullscreen().catch(function () {});
      }
      return;
    }
    const targetCard = event.target.closest ? event.target.closest("[data-pokemon-id]") : null;
    const confirmsSelection = event.target === confirmButton
      || targetCard && Number(targetCard.dataset.pokemonId) === selectedPokemonId;
    if (event.key === "Enter" && confirmsSelection && phase === "choosing"
      && !isLocalLocked() && selectedPokemonId !== null) {
      event.preventDefault();
      confirmSelected(false);
      return;
    }
    if (!/^[1-7]$/.test(event.key) || phase !== "choosing" || isLocalLocked()) return;
    const pokemonId = setup.pokemonIds[Number(event.key) - 1];
    if (!availableForRole(localRole).includes(pokemonId)) return;
    event.preventDefault();
    selectCard(pokemonId);
  }

  async function receiveReveal(message) {
    const expectation = {
      role: remoteRole,
      round: roundIndex,
      commitsReady: commitsByRole.every(Boolean),
      received: Boolean(revealsByRole[remoteRole]),
      allowedIds: setup.pokemonIds,
      usedIds: usedByRole[remoteRole],
      commitHash: commitsByRole[remoteRole]
    };
    if (finished || phase !== "choosing" || !validRevealEnvelope(message, expectation)) return;
    if (revealPendingByRole[remoteRole]) {
      queuedRemoteReveal = message;
      return;
    }

    const capturedRound = roundIndex;
    const capturedCommit = commitsByRole[remoteRole];
    revealPendingByRole[remoteRole] = true;
    let valid = false;
    try {
      valid = await validateKantoTrumfReveal(message, {
        role: remoteRole,
        round: capturedRound,
        commitsReady: commitsByRole.every(Boolean),
        received: Boolean(revealsByRole[remoteRole]),
        allowedIds: setup.pokemonIds,
        usedIds: usedByRole[remoteRole],
        commitHash: capturedCommit
      });
    } catch (error) {
      valid = false;
    }
    if (finished || phase !== "choosing" || roundIndex !== capturedRound
      || commitsByRole[remoteRole] !== capturedCommit || revealsByRole[remoteRole]) return;
    revealPendingByRole[remoteRole] = false;
    if (!valid) {
      const queued = queuedRemoteReveal;
      queuedRemoteReveal = null;
      if (queued) void receiveReveal(queued);
      return;
    }
    queuedRemoteReveal = null;
    revealsByRole[remoteRole] = { pokemonId: message.pokemonId, nonce: message.nonce };
    maybeResolveOnline();
  }

  function receiveNetwork(message) {
    if (isPractice || finished) return;
    if (message && message.type === KANTO_TRUMF_MESSAGE_TYPES.commit) {
      if (phase === "choosing" && validateKantoTrumfCommit(message, {
        role: remoteRole,
        round: roundIndex,
        received: Boolean(commitsByRole[remoteRole])
      })) {
        commitsByRole[remoteRole] = message.hash;
        status.textContent = isLocalLocked()
          ? "Oba hráči uzamkli. Připravuji odhalení."
          : "Soupeř už uzamkl kartu. Jeho volba zůstává skrytá.";
        renderHand();
        maybeSendReveal();
        return;
      }
      if ((phase === "choosing" || phase === "revealed")
        && roundIndex + 1 < KANTO_TRUMF.rounds
        && validateKantoTrumfCommit(message, {
          role: remoteRole,
          round: roundIndex + 1,
          received: Boolean(bufferedRemoteCommit)
        })) {
        bufferedRemoteCommit = { round: message.round, hash: message.hash };
      }
      return;
    }
    if (phase === "choosing" && message && message.type === KANTO_TRUMF_MESSAGE_TYPES.reveal) {
      void receiveReveal(message);
    }
  }

  cards.addEventListener("click", onCardsClick);
  confirmButton.addEventListener("click", onConfirmClick);
  window.addEventListener("keydown", onKeyDown);
  window.render_game_to_text = renderGameToText;
  window.advanceTime = advanceTime;
  context.setScores(0, 0);
  startRound(0);
  lastTick = performance.now();
  tickTimer = window.setInterval(syncClock, 50);

  return {
    receiveNetwork,
    cleanup: function () {
      finished = true;
      bufferedRemoteCommit = null;
      queuedRemoteReveal = null;
      window.clearInterval(tickTimer);
      cards.removeEventListener("click", onCardsClick);
      confirmButton.removeEventListener("click", onConfirmClick);
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
