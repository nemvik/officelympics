import { createRng } from "../game-core.mjs";
import { POKEMON_SNAPSHOT } from "./pokemon/snapshot.mjs";
import { defineGame, normalizeScoreResult } from "./shared.mjs";

export const SAFARI_DRAFT = Object.freeze({
  rounds: 6,
  offerSize: 4,
  choiceDurationMs: 10_000,
  revealDurationMs: 3200,
  maximumScore: 36,
  nonceBytes: 16
});

export const SAFARI_DRAFT_BALLS = Object.freeze([
  Object.freeze({ id: "poke", label: "Poké Ball", multiplier: 1, strength: 1, initial: 3, shortcut: "Q" }),
  Object.freeze({ id: "great", label: "Great Ball", multiplier: 1.45, strength: 2, initial: 2, shortcut: "W" }),
  Object.freeze({ id: "ultra", label: "Ultra Ball", multiplier: 2.2, strength: 3, initial: 1, shortcut: "E" })
]);

export const SAFARI_DRAFT_MESSAGE_TYPES = Object.freeze({
  commit: "game:safari-draft-commit",
  reveal: "game:safari-draft-reveal"
});

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const NONCE_PATTERN = /^[a-f0-9]{32}$/;
const BALL_BY_ID = new Map(SAFARI_DRAFT_BALLS.map(function (ball) { return [ball.id, ball]; }));
const POKEMON_BY_ID = new Map(POKEMON_SNAPSHOT.map(function (pokemon) { return [pokemon.id, pokemon]; }));
const TYPE_LABELS = Object.freeze({
  bug: "Hmyz", dragon: "Drak", electric: "Elektřina", fairy: "Víla", fighting: "Boj",
  fire: "Oheň", flying: "Létání", ghost: "Duch", grass: "Tráva", ground: "Země",
  ice: "Led", normal: "Normální", poison: "Jed", psychic: "Psychika", rock: "Kámen",
  steel: "Ocel", water: "Voda"
});

export const safariDraftGame = defineGame({
  id: "safari-draft",
  meta: {
    icon: "🦁",
    title: "Safari Draft",
    teaser: "Šest tajných lovů s omezenou zásobou míčků",
    difficulty: "taktika a štěstí",
    instruction: "Tajně vyber jednoho Pokémona a míček. Vzácnější úlovky mají vyšší bodovou hodnotu.",
    scoreLabel: "safari bodů"
  },
  start: startSafariDraft,
  result: {
    mode: "shared",
    normalize: normalizeSafariDraftResult,
    format: formatSafariDraftResult
  }
});

function shuffle(values, random) {
  const result = values.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function clampSafariCaptureRate(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 1;
  return Math.min(255, Math.max(1, numeric));
}

export function safariDraftCapturePoints(captureRate) {
  return Math.min(6, Math.max(1, Math.ceil((256 - clampSafariCaptureRate(captureRate)) / 43)));
}

export function safariDraftCaptureChance(captureRate, ballId) {
  const ball = BALL_BY_ID.get(ballId);
  if (!ball) return null;
  const baseChance = 0.12 + 0.68 * clampSafariCaptureRate(captureRate) / 255;
  return Math.min(0.95, baseChance * ball.multiplier);
}

function isValidSafariPokemon(pokemon) {
  return Boolean(pokemon && Number.isInteger(pokemon.id) && pokemon.id >= 1 && pokemon.id <= 151
    && typeof pokemon.name === "string" && pokemon.name.trim()
    && typeof pokemon.sprite === "string" && pokemon.sprite
    && Array.isArray(pokemon.types) && pokemon.types.length
    && Number.isFinite(pokemon.captureRate));
}

function validPokemonPool(records) {
  const byId = new Map();
  (Array.isArray(records) ? records : []).forEach(function (pokemon) {
    if (isValidSafariPokemon(pokemon) && !byId.has(pokemon.id)) byId.set(pokemon.id, pokemon);
  });
  return Array.from(byId.values()).sort(function (first, second) { return first.id - second.id; });
}

function takeUnused(queue, used) {
  while (queue.length) {
    const pokemon = queue.shift();
    if (!used.has(pokemon.id)) {
      used.add(pokemon.id);
      return pokemon.id;
    }
  }
  return null;
}

export function buildSafariDraftOffers(seed, records = POKEMON_SNAPSHOT) {
  const pool = validPokemonPool(records);
  const required = SAFARI_DRAFT.rounds * SAFARI_DRAFT.offerSize;
  if (pool.length < required) throw new Error("Safari Draft potřebuje alespoň 24 platných Pokémonů.");

  const random = createRng("safari-draft-offers:" + String(seed));
  const common = shuffle(pool.filter(function (pokemon) {
    return safariDraftCapturePoints(pokemon.captureRate) <= 2;
  }), random);
  const rare = shuffle(pool.filter(function (pokemon) {
    return safariDraftCapturePoints(pokemon.captureRate) >= 5;
  }), random);
  const middle = shuffle(pool.filter(function (pokemon) {
    const points = safariDraftCapturePoints(pokemon.captureRate);
    return points >= 3 && points <= 4;
  }), random);
  const fallback = shuffle(pool, random);
  const used = new Set();
  const offers = [];

  for (let round = 0; round < SAFARI_DRAFT.rounds; round += 1) {
    const ids = [];
    const commonId = takeUnused(common, used);
    const rareId = takeUnused(rare, used);
    if (commonId !== null) ids.push(commonId);
    if (rareId !== null) ids.push(rareId);
    while (ids.length < SAFARI_DRAFT.offerSize) {
      const middleId = takeUnused(middle, used);
      if (middleId === null) break;
      ids.push(middleId);
    }
    while (ids.length < SAFARI_DRAFT.offerSize) {
      const fallbackId = takeUnused(fallback, used);
      if (fallbackId === null) throw new Error("Safari Draft nedokázal sestavit nabídku bez duplicit.");
      ids.push(fallbackId);
    }
    offers.push(shuffle(ids, createRng("safari-draft-order:" + String(seed) + ":" + round)));
  }

  return offers;
}

export function createSafariDraftInventory() {
  return Object.fromEntries(SAFARI_DRAFT_BALLS.map(function (ball) { return [ball.id, ball.initial]; }));
}

function inventoryCount(inventory, ballId) {
  if (!isPlainObject(inventory) || !BALL_BY_ID.has(ballId)) return 0;
  const count = inventory[ballId];
  return Number.isInteger(count) && count > 0 ? count : 0;
}

function isValidChoice(choice) {
  return Boolean(isPlainObject(choice)
    && Number.isInteger(choice.pokemonId) && choice.pokemonId >= 1 && choice.pokemonId <= 151
    && BALL_BY_ID.has(choice.ballId));
}

export function consumeSafariDraftBalls(inventoriesByRole, choicesByRole) {
  if (!Array.isArray(inventoriesByRole) || inventoriesByRole.length !== 2
    || !Array.isArray(choicesByRole) || choicesByRole.length !== 2
    || choicesByRole.some(function (choice, role) {
      return !isValidChoice(choice) || inventoryCount(inventoriesByRole[role], choice.ballId) < 1;
    })) return false;
  choicesByRole.forEach(function (choice, role) {
    inventoriesByRole[role][choice.ballId] -= 1;
  });
  return true;
}

function sanitizeOfferIds(offerIds, byId = POKEMON_BY_ID) {
  return Array.from(new Set((Array.isArray(offerIds) ? offerIds : []).filter(function (pokemonId) {
    return Number.isInteger(pokemonId) && pokemonId >= 1 && pokemonId <= 151 && byId.has(pokemonId);
  })));
}

export function pickSafariDraftTimeoutChoice(seed, role, round, offerIds, inventory) {
  const pool = sanitizeOfferIds(offerIds).sort(function (first, second) { return first - second; });
  const ball = SAFARI_DRAFT_BALLS.find(function (candidate) {
    return inventoryCount(inventory, candidate.id) > 0;
  });
  if (!pool.length || !ball || (role !== 0 && role !== 1)
    || !Number.isInteger(round) || round < 0 || round >= SAFARI_DRAFT.rounds) return null;
  const random = createRng("safari-draft-timeout:" + String(seed) + ":" + role + ":" + round);
  return { pokemonId: pool[Math.floor(random() * pool.length)], ballId: ball.id };
}

export function safariDraftCaptureRoll(seed, round, role, pokemonId, ballId) {
  if (!Number.isInteger(round) || round < 0 || round >= SAFARI_DRAFT.rounds
    || (role !== 0 && role !== 1) || !Number.isInteger(pokemonId)
    || pokemonId < 1 || pokemonId > 151 || !BALL_BY_ID.has(ballId)) {
    throw new TypeError("Deterministický pokus dostal neplatná data.");
  }
  return createRng("safari-draft-capture:v1|" + String(seed) + "|" + round + "|" + role
    + "|" + pokemonId + "|" + ballId)();
}

export function resolveSafariDraftRound(seed, round, choicesByRole, records = POKEMON_SNAPSHOT) {
  const byId = new Map(validPokemonPool(records).map(function (pokemon) { return [pokemon.id, pokemon]; }));
  if (!Number.isInteger(round) || round < 0 || round >= SAFARI_DRAFT.rounds
    || !Array.isArray(choicesByRole) || choicesByRole.length !== 2
    || choicesByRole.some(function (choice) { return !isValidChoice(choice) || !byId.has(choice.pokemonId); })) {
    throw new TypeError("Kolo Safari Draftu dostalo neplatnou volbu.");
  }

  const sameTarget = choicesByRole[0].pokemonId === choicesByRole[1].pokemonId;
  const firstBall = BALL_BY_ID.get(choicesByRole[0].ballId);
  const secondBall = BALL_BY_ID.get(choicesByRole[1].ballId);
  let collision = "different-targets";
  let eligible = [true, true];
  if (sameTarget && firstBall.strength === secondBall.strength) {
    collision = "same-ball";
    eligible = [false, false];
  } else if (sameTarget) {
    collision = "stronger-ball";
    eligible = firstBall.strength > secondBall.strength ? [true, false] : [false, true];
  }

  const attempts = choicesByRole.map(function (choice, role) {
    const pokemon = byId.get(choice.pokemonId);
    const chance = safariDraftCaptureChance(pokemon.captureRate, choice.ballId);
    const roll = eligible[role] ? safariDraftCaptureRoll(seed, round, role, choice.pokemonId, choice.ballId) : null;
    const caught = eligible[role] && roll < chance;
    return {
      role,
      pokemonId: choice.pokemonId,
      ballId: choice.ballId,
      eligible: eligible[role],
      chance,
      roll,
      caught,
      points: caught ? safariDraftCapturePoints(pokemon.captureRate) : 0
    };
  });

  return {
    collision,
    attempts,
    points: attempts.map(function (attempt) { return attempt.points; })
  };
}

function bestExpectedValue(offerIds, ballId, byId) {
  return sanitizeOfferIds(offerIds, byId).reduce(function (best, pokemonId) {
    const pokemon = byId.get(pokemonId);
    return Math.max(best, safariDraftCaptureChance(pokemon.captureRate, ballId)
      * safariDraftCapturePoints(pokemon.captureRate));
  }, 0);
}

function futureExpectedValue(offers, inventory, byId, index = 0, memo = new Map()) {
  if (index >= offers.length) return 0;
  const key = index + "|" + SAFARI_DRAFT_BALLS.map(function (ball) {
    return inventoryCount(inventory, ball.id);
  }).join(":");
  if (memo.has(key)) return memo.get(key);
  let best = -Infinity;
  SAFARI_DRAFT_BALLS.forEach(function (ball) {
    if (inventoryCount(inventory, ball.id) < 1) return;
    const nextInventory = { ...inventory, [ball.id]: inventory[ball.id] - 1 };
    best = Math.max(best, bestExpectedValue(offers[index], ball.id, byId)
      + futureExpectedValue(offers, nextInventory, byId, index + 1, memo));
  });
  const result = Number.isFinite(best) ? best : 0;
  memo.set(key, result);
  return result;
}

export function pickSafariDraftBotChoice(
  seed,
  round,
  offerIds,
  inventory,
  futureOffers = [],
  records = POKEMON_SNAPSHOT
) {
  const byId = new Map(validPokemonPool(records).map(function (pokemon) { return [pokemon.id, pokemon]; }));
  const pool = sanitizeOfferIds(offerIds, byId);
  if (!pool.length || !Number.isInteger(round) || round < 0 || round >= SAFARI_DRAFT.rounds) return null;

  const options = [];
  SAFARI_DRAFT_BALLS.forEach(function (ball) {
    if (inventoryCount(inventory, ball.id) < 1) return;
    const nextInventory = { ...inventory, [ball.id]: inventory[ball.id] - 1 };
    const futureValue = futureExpectedValue(Array.isArray(futureOffers) ? futureOffers : [], nextInventory, byId);
    pool.forEach(function (pokemonId) {
      const pokemon = byId.get(pokemonId);
      const currentValue = safariDraftCaptureChance(pokemon.captureRate, ball.id)
        * safariDraftCapturePoints(pokemon.captureRate);
      options.push({ pokemonId, ballId: ball.id, currentValue, totalValue: currentValue + futureValue });
    });
  });
  if (!options.length) return null;

  const bestTotal = Math.max(...options.map(function (option) { return option.totalValue; }));
  const tolerance = Math.max(0.04, bestTotal * 0.01);
  const finalists = options.filter(function (option) { return option.totalValue >= bestTotal - tolerance; })
    .sort(function (first, second) {
      return second.totalValue - first.totalValue || second.currentValue - first.currentValue
        || first.pokemonId - second.pokemonId || first.ballId.localeCompare(second.ballId);
    });
  const random = createRng("safari-draft-bot:" + String(seed) + ":" + round);
  const selected = finalists[Math.floor(random() * finalists.length)];
  return { pokemonId: selected.pokemonId, ballId: selected.ballId };
}

function isValidChoiceIdentity(round, role, pokemonId, ballId, nonce) {
  return Number.isInteger(round) && round >= 0 && round < SAFARI_DRAFT.rounds
    && (role === 0 || role === 1)
    && Number.isInteger(pokemonId) && pokemonId >= 1 && pokemonId <= 151
    && BALL_BY_ID.has(ballId)
    && typeof nonce === "string" && NONCE_PATTERN.test(nonce);
}

export async function hashSafariDraftChoice(round, role, pokemonId, ballId, nonce) {
  if (!isValidChoiceIdentity(round, role, pokemonId, ballId, nonce)) {
    throw new TypeError("Commit Safari Draftu má neplatná vstupní data.");
  }
  if (!globalThis.crypto || !globalThis.crypto.subtle || typeof globalThis.crypto.subtle.digest !== "function") {
    throw new Error("Pro bezpečný commit je potřeba Web Crypto API.");
  }
  const payload = "safari-draft:v1|" + round + "|" + role + "|" + pokemonId + "|" + ballId + "|" + nonce;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), function (byte) {
    return byte.toString(16).padStart(2, "0");
  }).join("");
}

export function validateSafariDraftCommit(message, expected) {
  return Boolean(isPlainObject(message)
    && message.type === SAFARI_DRAFT_MESSAGE_TYPES.commit
    && expected && expected.received !== true
    && message.role === expected.role
    && message.round === expected.round
    && typeof message.hash === "string" && HASH_PATTERN.test(message.hash));
}

function validRevealEnvelope(message, expected) {
  const allowedIds = expected && Array.isArray(expected.allowedIds) ? expected.allowedIds : [];
  return Boolean(isPlainObject(message)
    && message.type === SAFARI_DRAFT_MESSAGE_TYPES.reveal
    && expected && expected.commitsReady === true && expected.received !== true
    && message.role === expected.role && message.round === expected.round
    && isValidChoiceIdentity(message.round, message.role, message.pokemonId, message.ballId, message.nonce)
    && allowedIds.includes(message.pokemonId)
    && inventoryCount(expected.inventory, message.ballId) > 0
    && typeof expected.commitHash === "string" && HASH_PATTERN.test(expected.commitHash));
}

export async function validateSafariDraftReveal(message, expected) {
  if (!validRevealEnvelope(message, expected)) return false;
  const hash = await hashSafariDraftChoice(
    message.round,
    message.role,
    message.pokemonId,
    message.ballId,
    message.nonce
  );
  return hash === expected.commitHash;
}

export function normalizeSafariDraftResult(result) {
  return normalizeScoreResult(result, SAFARI_DRAFT.maximumScore);
}

export function formatSafariDraftResult(result) {
  const normalized = normalizeSafariDraftResult(result);
  return (normalized ? normalized.score : 0) + "/" + SAFARI_DRAFT.maximumScore + " safari bodů";
}

function secureNonce() {
  if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
    throw new Error("Pro bezpečný nonce je potřeba Web Crypto API.");
  }
  const bytes = new Uint8Array(SAFARI_DRAFT.nonceBytes);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
}

function formatPercent(value) {
  return Math.round(value * 100) + "%";
}

function formatRoll(value) {
  return (value * 100).toFixed(1).replace(".", ",") + "%";
}

function ballLabel(ballId) {
  const ball = BALL_BY_ID.get(ballId);
  return ball ? ball.label : "Neznámý míček";
}

function typeLabel(type) {
  return TYPE_LABELS[type] || type;
}

export function startSafariDraft(context) {
  const offers = buildSafariDraftOffers(context.seed);
  const localRole = context.localRole === 1 ? 1 : 0;
  const remoteRole = 1 - localRole;
  const isPractice = context.mode === "practice";
  const scores = [0, 0];
  const inventoriesByRole = [createSafariDraftInventory(), createSafariDraftInventory()];
  const previousRenderGameToText = window.render_game_to_text;
  const previousAdvanceTime = window.advanceTime;
  const preloadedSprites = [];
  let roundIndex = 0;
  let phase = "idle";
  let selectedPokemonId = null;
  let selectedBallId = null;
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
  let lastRoundResult = null;
  let finished = false;
  let lastTick = performance.now();
  let tickTimer = 0;

  context.stage.innerHTML = `
    <div class="safari-draft-shell" data-phase="idle">
      <header class="safari-draft-topline">
        <div class="safari-draft-heading">
          <span class="eyebrow">Safari zóna · tajný draft</span>
          <h3>Vyber cíl a míček</h3>
          <p>Vzácnější Pokémon = více bodů. Míček se spotřebuje vždy.</p>
        </div>
        <div class="safari-draft-clock" aria-label="Zbývá deset sekund na volbu">
          <span>Zbývá</span><b>10,0</b><small>s</small><i aria-hidden="true"><span></span></i>
        </div>
      </header>

      <div class="safari-draft-locks" aria-label="Stav tajných voleb">
        <span class="safari-draft-local-lock">Ty · vybíráš</span>
        <span aria-hidden="true">✦</span>
        <span class="safari-draft-remote-lock">Soupeř · vybírá</span>
      </div>

      <section class="safari-draft-reveal" aria-label="Výsledek kola" hidden></section>

      <section class="safari-draft-target-section" aria-labelledby="safari-draft-target-title">
        <div class="safari-draft-section-title">
          <div><span class="eyebrow">Divoká čtveřice</span><h3 id="safari-draft-target-title">Koho zkusíš chytit?</h3></div>
          <strong class="safari-draft-round-label"></strong>
        </div>
        <div class="safari-draft-targets" role="group" aria-label="Čtyři divocí Pokémoni"></div>
      </section>

      <section class="safari-draft-kit" aria-labelledby="safari-draft-kit-title">
        <div class="safari-draft-kit-main">
          <div class="safari-draft-section-title">
            <div><span class="eyebrow">Tvoje výbava</span><h3 id="safari-draft-kit-title">Zvol zbývající míček</h3></div>
          </div>
          <div class="safari-draft-balls" role="group" aria-label="Tvoje míčky"></div>
        </div>
        <aside class="safari-draft-opponent-kit" aria-label="Soupeřův zbývající inventář">
          <span>Soupeřova výbava</span><div></div>
        </aside>
      </section>

      <div class="safari-draft-actions">
        <p class="safari-draft-status" role="status" aria-live="polite" aria-atomic="true">Volbu můžeš měnit až do potvrzení.</p>
        <button class="safari-draft-confirm" type="button" disabled>Uzamknout volbu</button>
      </div>
    </div>`;

  const shell = context.stage.querySelector(".safari-draft-shell");
  const heading = context.stage.querySelector(".safari-draft-heading h3");
  const clock = context.stage.querySelector(".safari-draft-clock");
  const clockValue = clock.querySelector("b");
  const clockBar = clock.querySelector("i span");
  const localLockLabel = context.stage.querySelector(".safari-draft-local-lock");
  const remoteLockLabel = context.stage.querySelector(".safari-draft-remote-lock");
  const revealPanel = context.stage.querySelector(".safari-draft-reveal");
  const targetTitle = context.stage.querySelector("#safari-draft-target-title");
  const roundLabel = context.stage.querySelector(".safari-draft-round-label");
  const targets = context.stage.querySelector(".safari-draft-targets");
  const balls = context.stage.querySelector(".safari-draft-balls");
  const opponentInventory = context.stage.querySelector(".safari-draft-opponent-kit div");
  const status = context.stage.querySelector(".safari-draft-status");
  const confirmButton = context.stage.querySelector(".safari-draft-confirm");

  offers.flat().forEach(function (pokemonId) {
    const image = new Image();
    image.decoding = "async";
    image.src = POKEMON_BY_ID.get(pokemonId).sprite;
    preloadedSprites.push(image);
  });

  function currentOffer() {
    return offers[roundIndex] || [];
  }

  function roleName(role) {
    if (role === localRole) return "Ty";
    return Array.isArray(context.names) && context.names[role] ? context.names[role] : "Soupeř";
  }

  function isLocalLocked() {
    return isPractice
      ? choicesByRole[localRole] !== null
      : localCommitPending || commitsByRole[localRole] !== null;
  }

  function isRemoteLocked() {
    return isPractice ? choicesByRole[remoteRole] !== null : commitsByRole[remoteRole] !== null;
  }

  function selectedPokemon() {
    return selectedPokemonId === null ? null : POKEMON_BY_ID.get(selectedPokemonId);
  }

  function renderClock() {
    const remaining = Math.max(0, SAFARI_DRAFT.choiceDurationMs - roundElapsedMs);
    clockValue.textContent = phase === "revealed" ? "✓" : (remaining / 1000).toFixed(1).replace(".", ",");
    clock.querySelector("small").hidden = phase === "revealed";
    clockBar.style.transform = "scaleX(" + (phase === "revealed" ? 1 : remaining / SAFARI_DRAFT.choiceDurationMs) + ")";
    clock.classList.toggle("is-urgent", phase === "choosing" && remaining <= 3000);
    clock.classList.toggle("is-revealed", phase === "revealed");
    clock.setAttribute("aria-label", phase === "revealed"
      ? "Volby byly odhaleny"
      : "Zbývá " + Math.ceil(remaining / 1000) + " sekund na volbu");
  }

  function buildTargetCard(pokemonId, index) {
    const pokemon = POKEMON_BY_ID.get(pokemonId);
    const selected = selectedPokemonId === pokemonId;
    const locked = isLocalLocked();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "safari-draft-target";
    button.dataset.pokemonId = String(pokemonId);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", (index + 1) + ". " + pokemon.name + ", typy "
      + pokemon.types.map(typeLabel).join(" a ") + ", " + safariDraftCapturePoints(pokemon.captureRate)
      + " bodů" + (selected ? ", vybráno" : ""));
    button.disabled = phase !== "choosing" || locked;
    if (selected) button.classList.add("is-selected");

    const shortcut = document.createElement("span");
    shortcut.className = "safari-draft-shortcut";
    shortcut.setAttribute("aria-hidden", "true");
    shortcut.textContent = String(index + 1);
    const points = document.createElement("span");
    points.className = "safari-draft-points";
    points.textContent = safariDraftCapturePoints(pokemon.captureRate) + " b";
    const image = document.createElement("img");
    image.src = pokemon.sprite;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;
    const name = document.createElement("strong");
    name.textContent = pokemon.name;
    const types = document.createElement("span");
    types.className = "safari-draft-types";
    pokemon.types.forEach(function (type) {
      const tag = document.createElement("small");
      tag.textContent = typeLabel(type);
      tag.dataset.type = type;
      types.append(tag);
    });
    const hint = document.createElement("em");
    hint.textContent = selected ? "Vybraný cíl" : "Vybrat cíl";
    button.append(shortcut, points, image, name, types, hint);
    return button;
  }

  function buildBallButton(ball) {
    const count = inventoryCount(inventoriesByRole[localRole], ball.id);
    const selected = selectedBallId === ball.id;
    const locked = isLocalLocked();
    const pokemon = selectedPokemon();
    const chance = pokemon ? safariDraftCaptureChance(pokemon.captureRate, ball.id) : null;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "safari-draft-ball safari-draft-ball--" + ball.id;
    button.dataset.ballId = ball.id;
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", ball.label + ", zbývá " + count
      + (chance === null ? ", nejdřív vyber cíl" : ", šance " + formatPercent(chance))
      + (selected ? ", vybráno" : ""));
    button.disabled = phase !== "choosing" || locked || count < 1;
    if (selected) button.classList.add("is-selected");
    const key = document.createElement("span");
    key.className = "safari-draft-ball-key";
    key.textContent = ball.shortcut;
    key.setAttribute("aria-hidden", "true");
    const orb = document.createElement("span");
    orb.className = "safari-draft-ball-orb";
    orb.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    const label = document.createElement("strong");
    label.textContent = ball.label;
    const detail = document.createElement("small");
    detail.textContent = "Zbývá " + count + " · " + (chance === null ? "vyber cíl" : formatPercent(chance));
    text.append(label, detail);
    button.append(key, orb, text);
    return button;
  }

  function renderOpponentInventory() {
    const fragment = document.createDocumentFragment();
    SAFARI_DRAFT_BALLS.forEach(function (ball) {
      const item = document.createElement("span");
      item.className = "safari-draft-opponent-ball safari-draft-opponent-ball--" + ball.id;
      item.textContent = ball.label.replace(" Ball", "") + " × " + inventoryCount(inventoriesByRole[remoteRole], ball.id);
      fragment.append(item);
    });
    opponentInventory.replaceChildren(fragment);
  }

  function renderChoices(focusSelector = null) {
    const active = document.activeElement;
    const preservedSelector = focusSelector || (active && active.dataset
      ? active.dataset.pokemonId ? '[data-pokemon-id="' + active.dataset.pokemonId + '"]'
        : active.dataset.ballId ? '[data-ball-id="' + active.dataset.ballId + '"]' : null
      : null);
    const targetFragment = document.createDocumentFragment();
    currentOffer().forEach(function (pokemonId, index) { targetFragment.append(buildTargetCard(pokemonId, index)); });
    targets.replaceChildren(targetFragment);
    const ballFragment = document.createDocumentFragment();
    SAFARI_DRAFT_BALLS.forEach(function (ball) { ballFragment.append(buildBallButton(ball)); });
    balls.replaceChildren(ballFragment);
    renderOpponentInventory();

    const locked = isLocalLocked();
    confirmButton.disabled = phase !== "choosing" || locked
      || selectedPokemonId === null || selectedBallId === null;
    confirmButton.textContent = locked ? "Volba uzamčena" : "Uzamknout volbu";
    localLockLabel.textContent = locked ? "Ty · uzamčeno"
      : selectedPokemonId !== null && selectedBallId !== null ? "Ty · připraveno" : "Ty · vybíráš";
    remoteLockLabel.textContent = isRemoteLocked() ? "Soupeř · uzamčeno" : "Soupeř · vybírá";
    localLockLabel.classList.toggle("is-locked", locked);
    remoteLockLabel.classList.toggle("is-locked", isRemoteLocked());
    if (preservedSelector) {
      const nextFocus = context.stage.querySelector(preservedSelector);
      if (nextFocus && !nextFocus.disabled) nextFocus.focus({ preventScroll: true });
    }
  }

  function resultMessage(result) {
    if (result.collision === "same-ball") return "Stejný cíl i míček: Pokémon utekl oběma.";
    if (result.collision === "stronger-ball") {
      const winner = result.attempts.find(function (attempt) { return attempt.eligible; });
      return roleName(winner.role) + " má silnější míček a získává jediný pokus.";
    }
    const catches = result.attempts.filter(function (attempt) { return attempt.caught; }).length;
    return catches === 2 ? "Oba rozdílné pokusy vyšly. Dvojitý úlovek!"
      : catches === 1 ? "Jeden ze dvou rozdílných pokusů vyšel."
        : "Různé cíle, ale oba Pokémoni unikli.";
  }

  function createRevealChoice(role, choice, attempt) {
    const pokemon = POKEMON_BY_ID.get(choice.pokemonId);
    const card = document.createElement("article");
    card.className = "safari-draft-reveal-choice" + (attempt.caught ? " is-caught" : " is-missed");
    const owner = document.createElement("small");
    owner.textContent = roleName(role);
    const image = document.createElement("img");
    image.src = pokemon.sprite;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;
    const text = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = pokemon.name;
    const ball = document.createElement("b");
    ball.textContent = ballLabel(choice.ballId) + " · šance " + formatPercent(attempt.chance);
    const outcome = document.createElement("em");
    outcome.textContent = attempt.eligible
      ? "Hod " + formatRoll(attempt.roll) + " · " + (attempt.caught ? "chycen, +" + attempt.points + " b" : "unikl, +0 b")
      : "Bez pokusu · míček spotřebován";
    text.append(name, ball, outcome);
    card.append(owner, image, text);
    return card;
  }

  function renderReveal(choices, result) {
    const versus = document.createElement("span");
    versus.className = "safari-draft-versus";
    versus.textContent = "VS";
    versus.setAttribute("aria-hidden", "true");
    const summary = document.createElement("p");
    summary.textContent = resultMessage(result);
    revealPanel.replaceChildren(
      createRevealChoice(localRole, choices[localRole], result.attempts[localRole]),
      versus,
      createRevealChoice(remoteRole, choices[remoteRole], result.attempts[remoteRole]),
      summary
    );
    revealPanel.hidden = false;
  }

  function renderGameToText() {
    const selected = selectedPokemon();
    return JSON.stringify({
      game: "safari-draft",
      interaction: "DOM buttons; no coordinate system",
      phase,
      round: roundIndex + 1,
      rounds: SAFARI_DRAFT.rounds,
      remainingMs: phase === "choosing"
        ? Math.round(Math.max(0, SAFARI_DRAFT.choiceDurationMs - roundElapsedMs)) : 0,
      scores: { local: scores[localRole], remote: scores[remoteRole] },
      locks: { local: isLocalLocked(), remote: isRemoteLocked() },
      inventories: {
        local: { ...inventoriesByRole[localRole] },
        remote: { ...inventoriesByRole[remoteRole] }
      },
      selected: selected ? { pokemonId: selected.id, name: selected.name, ballId: selectedBallId } : null,
      offer: currentOffer().map(function (pokemonId) {
        const pokemon = POKEMON_BY_ID.get(pokemonId);
        return {
          id: pokemon.id,
          name: pokemon.name,
          types: pokemon.types.slice(),
          points: safariDraftCapturePoints(pokemon.captureRate),
          chances: Object.fromEntries(SAFARI_DRAFT_BALLS.filter(function (ball) {
            return inventoryCount(inventoriesByRole[localRole], ball.id) > 0;
          }).map(function (ball) {
            return [ball.id, safariDraftCaptureChance(pokemon.captureRate, ball.id)];
          }))
        };
      }),
      reveal: phase === "revealed" && lastRoundResult ? {
        collision: lastRoundResult.collision,
        attempts: lastRoundResult.attempts
      } : null,
      feedback: status.textContent
    });
  }

  function finishGame() {
    if (finished) return;
    finished = true;
    phase = "finished";
    shell.dataset.phase = phase;
    window.clearInterval(tickTimer);
    status.textContent = "Safari zóna se zavírá. Výsledky šesti kol jsou hotové.";
    context.finishShared(scores.map(function (score) { return { score }; }));
  }

  function startRound(nextRoundIndex) {
    if (finished) return;
    if (nextRoundIndex >= SAFARI_DRAFT.rounds) {
      finishGame();
      return;
    }
    roundIndex = nextRoundIndex;
    phase = "choosing";
    selectedPokemonId = null;
    selectedBallId = null;
    choicesByRole = [null, null];
    commitsByRole = [null, null];
    revealsByRole = [null, null];
    revealPendingByRole = [false, false];
    queuedRemoteReveal = null;
    localCommitPending = false;
    cryptoFailed = false;
    roundElapsedMs = 0;
    revealRemainingMs = 0;
    lastRoundResult = null;
    const botRandom = createRng("safari-draft-bot-delay:" + String(context.seed) + ":" + roundIndex);
    botLockAtMs = 700 + Math.round(botRandom() * 1100);
    shell.dataset.phase = phase;
    revealPanel.hidden = true;
    revealPanel.replaceChildren();
    heading.textContent = "Vyber cíl a míček";
    targetTitle.textContent = "Koho zkusíš chytit?";
    roundLabel.textContent = "Kolo " + (roundIndex + 1) + "/" + SAFARI_DRAFT.rounds;
    context.setRoundLabel("Kolo " + (roundIndex + 1) + "/" + SAFARI_DRAFT.rounds + " · Safari Draft");
    if (bufferedRemoteCommit && bufferedRemoteCommit.round === roundIndex) {
      commitsByRole[remoteRole] = bufferedRemoteCommit.hash;
      bufferedRemoteCommit = null;
      status.textContent = "Soupeř už uzamkl volbu. Cíl ani míček z commitu neuvidíš.";
    } else {
      bufferedRemoteCommit = null;
      status.textContent = "Volbu můžeš měnit až do potvrzení.";
    }
    renderClock();
    renderChoices();
    context.setScores(scores[localRole], scores[remoteRole]);
    const firstTarget = targets.querySelector("button:not(:disabled)");
    if (firstTarget) firstTarget.focus({ preventScroll: true });
  }

  function resolveRound(choices) {
    if (finished || phase !== "choosing") return;
    if (!consumeSafariDraftBalls(inventoriesByRole, choices)) return;
    const result = resolveSafariDraftRound(context.seed, roundIndex, choices);
    [0, 1].forEach(function (role) { scores[role] += result.points[role]; });
    lastRoundResult = result;
    phase = "revealed";
    revealRemainingMs = SAFARI_DRAFT.revealDurationMs;
    shell.dataset.phase = phase;
    heading.textContent = "Volby jsou odhalené";
    targetTitle.textContent = "Divoká čtveřice utíká dál";
    status.textContent = resultMessage(result);
    renderReveal(choices, result);
    renderClock();
    renderChoices();
    context.setScores(scores[localRole], scores[remoteRole]);
  }

  function maybeResolvePractice() {
    if (!isPractice || choicesByRole.some(function (choice) { return choice === null; })) return;
    resolveRound(choicesByRole.map(function (choice) {
      return { pokemonId: choice.pokemonId, ballId: choice.ballId };
    }));
  }

  function lockPracticeChoice(role, choice, timedOut) {
    if (finished || phase !== "choosing" || choicesByRole[role] !== null || !isValidChoice(choice)
      || !currentOffer().includes(choice.pokemonId)
      || inventoryCount(inventoriesByRole[role], choice.ballId) < 1) return false;
    choicesByRole[role] = { pokemonId: choice.pokemonId, ballId: choice.ballId };
    if (role === localRole) {
      selectedPokemonId = choice.pokemonId;
      selectedBallId = choice.ballId;
      status.textContent = timedOut
        ? "Čas vypršel. Nejslabší dostupný míček a platný cíl byly uzamčeny automaticky."
        : "Tvoje volba je uzamčená. Čekám na soupeře.";
    } else if (!isLocalLocked()) {
      status.textContent = "Soupeř už uzamkl volbu. Jeho cíl i míček zůstávají tajné.";
    }
    renderChoices();
    maybeResolvePractice();
    return true;
  }

  function maybeSendReveal() {
    if (isPractice || finished || phase !== "choosing" || commitsByRole.some(function (hash) { return !hash; })) return;
    const secret = choicesByRole[localRole];
    if (!secret || revealsByRole[localRole]) return;
    const message = {
      type: SAFARI_DRAFT_MESSAGE_TYPES.reveal,
      round: roundIndex,
      role: localRole,
      pokemonId: secret.pokemonId,
      ballId: secret.ballId,
      nonce: secret.nonce
    };
    revealsByRole[localRole] = { pokemonId: secret.pokemonId, ballId: secret.ballId, nonce: secret.nonce };
    context.send(message);
    status.textContent = "Oba commity jsou potvrzené. Ověřuji odhalení cíle i míčku.";
    maybeResolveOnline();
  }

  function maybeResolveOnline() {
    if (isPractice || finished || phase !== "choosing" || revealsByRole.some(function (reveal) { return !reveal; })) return;
    resolveRound(revealsByRole.map(function (reveal) {
      return { pokemonId: reveal.pokemonId, ballId: reveal.ballId };
    }));
  }

  async function commitOnlineChoice(choice, timedOut) {
    if (finished || phase !== "choosing" || isLocalLocked() || !isValidChoice(choice)
      || !currentOffer().includes(choice.pokemonId)
      || inventoryCount(inventoriesByRole[localRole], choice.ballId) < 1) return;
    selectedPokemonId = choice.pokemonId;
    selectedBallId = choice.ballId;
    localCommitPending = true;
    cryptoFailed = false;
    status.textContent = timedOut
      ? "Čas vypršel. Vytvářím bezpečný commit automatické volby."
      : "Vytvářím bezpečný commit. Volbu už nelze změnit.";
    renderChoices();
    const capturedRound = roundIndex;

    try {
      const nonce = secureNonce();
      const hash = await hashSafariDraftChoice(
        capturedRound,
        localRole,
        choice.pokemonId,
        choice.ballId,
        nonce
      );
      if (finished || phase !== "choosing" || roundIndex !== capturedRound || !localCommitPending) return;
      choicesByRole[localRole] = { pokemonId: choice.pokemonId, ballId: choice.ballId, nonce };
      commitsByRole[localRole] = hash;
      localCommitPending = false;
      renderChoices();
      context.send({
        type: SAFARI_DRAFT_MESSAGE_TYPES.commit,
        round: capturedRound,
        role: localRole,
        hash
      });
      status.textContent = isRemoteLocked()
        ? "Oba hráči uzamkli. Odesílám odhalení."
        : "Tvoje volba je uzamčená. Čekám na soupeřův commit.";
      maybeSendReveal();
    } catch (error) {
      if (finished || roundIndex !== capturedRound) return;
      localCommitPending = false;
      cryptoFailed = true;
      status.textContent = "Bezpečné uzamčení se nezdařilo. Zkus volbu potvrdit znovu.";
      renderChoices();
    }
  }

  function confirmSelected(timedOut = false) {
    if (!timedOut) syncClock();
    if (finished || phase !== "choosing" || isLocalLocked()) return;
    const choice = timedOut
      ? pickSafariDraftTimeoutChoice(
        context.seed,
        localRole,
        roundIndex,
        currentOffer(),
        inventoriesByRole[localRole]
      )
      : { pokemonId: selectedPokemonId, ballId: selectedBallId };
    if (!choice || !currentOffer().includes(choice.pokemonId)
      || inventoryCount(inventoriesByRole[localRole], choice.ballId) < 1) return;
    selectedPokemonId = choice.pokemonId;
    selectedBallId = choice.ballId;
    if (isPractice) lockPracticeChoice(localRole, choice, timedOut);
    else void commitOnlineChoice(choice, timedOut);
  }

  function lockPracticeBot() {
    if (!isPractice || finished || phase !== "choosing" || choicesByRole[remoteRole] !== null) return;
    const choice = pickSafariDraftBotChoice(
      context.seed,
      roundIndex,
      currentOffer(),
      inventoriesByRole[remoteRole],
      offers.slice(roundIndex + 1)
    );
    if (choice) lockPracticeChoice(remoteRole, choice, false);
  }

  function stepTime(milliseconds) {
    if (finished || !Number.isFinite(Number(milliseconds))) return;
    const step = Math.min(120_000, Math.max(0, Number(milliseconds)));
    if (phase === "choosing") {
      roundElapsedMs = Math.min(SAFARI_DRAFT.choiceDurationMs, roundElapsedMs + step);
      if (isPractice && roundElapsedMs >= botLockAtMs) lockPracticeBot();
      if (phase === "choosing" && roundElapsedMs >= SAFARI_DRAFT.choiceDurationMs
        && !isLocalLocked() && !cryptoFailed) confirmSelected(true);
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

  function selectTarget(pokemonId) {
    syncClock();
    if (finished || phase !== "choosing" || isLocalLocked() || !currentOffer().includes(pokemonId)) return;
    selectedPokemonId = pokemonId;
    const pokemon = POKEMON_BY_ID.get(pokemonId);
    status.textContent = pokemon.name + " je vybraný. Teď zvol míček; u každého vidíš šanci.";
    renderChoices('[data-pokemon-id="' + pokemonId + '"]');
  }

  function selectBall(ballId) {
    syncClock();
    if (finished || phase !== "choosing" || isLocalLocked()
      || inventoryCount(inventoriesByRole[localRole], ballId) < 1) return;
    selectedBallId = ballId;
    const pokemon = selectedPokemon();
    status.textContent = pokemon
      ? ballLabel(ballId) + " dává na " + pokemon.name + " šanci "
        + formatPercent(safariDraftCaptureChance(pokemon.captureRate, ballId)) + "."
      : ballLabel(ballId) + " je připravený. Ještě vyber cíl.";
    renderChoices('[data-ball-id="' + ballId + '"]');
  }

  function onTargetsClick(event) {
    const button = event.target.closest("[data-pokemon-id]");
    if (button && targets.contains(button)) selectTarget(Number(button.dataset.pokemonId));
  }

  function onBallsClick(event) {
    const button = event.target.closest("[data-ball-id]");
    if (button && balls.contains(button)) selectBall(button.dataset.ballId);
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
    if (event.key === "Enter" && phase === "choosing" && !isLocalLocked()
      && selectedPokemonId !== null && selectedBallId !== null) {
      event.preventDefault();
      confirmSelected(false);
      return;
    }
    if (/^[1-4]$/.test(event.key) && phase === "choosing" && !isLocalLocked()) {
      event.preventDefault();
      selectTarget(currentOffer()[Number(event.key) - 1]);
      return;
    }
    const shortcutBall = SAFARI_DRAFT_BALLS.find(function (ball) {
      return ball.shortcut.toLowerCase() === event.key.toLowerCase();
    });
    if (shortcutBall && phase === "choosing" && !isLocalLocked()
      && inventoryCount(inventoriesByRole[localRole], shortcutBall.id) > 0) {
      event.preventDefault();
      selectBall(shortcutBall.id);
    }
  }

  async function receiveReveal(message) {
    const expectation = {
      role: remoteRole,
      round: roundIndex,
      commitsReady: commitsByRole.every(Boolean),
      received: Boolean(revealsByRole[remoteRole]),
      allowedIds: currentOffer(),
      inventory: inventoriesByRole[remoteRole],
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
      valid = await validateSafariDraftReveal(message, expectation);
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
    revealsByRole[remoteRole] = {
      pokemonId: message.pokemonId,
      ballId: message.ballId,
      nonce: message.nonce
    };
    maybeResolveOnline();
  }

  function receiveNetwork(message) {
    if (isPractice || finished) return;
    if (message && message.type === SAFARI_DRAFT_MESSAGE_TYPES.commit) {
      if (phase === "choosing" && validateSafariDraftCommit(message, {
        role: remoteRole,
        round: roundIndex,
        received: Boolean(commitsByRole[remoteRole])
      })) {
        commitsByRole[remoteRole] = message.hash;
        status.textContent = isLocalLocked()
          ? "Oba hráči uzamkli. Připravuji odhalení."
          : "Soupeř už uzamkl. Cíl ani míček z commitu nezjistíš.";
        renderChoices();
        maybeSendReveal();
        return;
      }
      const canBufferNextRound = phase === "revealed"
        || (phase === "choosing" && Boolean(revealsByRole[localRole]) && revealPendingByRole[remoteRole]);
      if (canBufferNextRound && roundIndex + 1 < SAFARI_DRAFT.rounds
        && validateSafariDraftCommit(message, {
          role: remoteRole,
          round: roundIndex + 1,
          received: Boolean(bufferedRemoteCommit)
        })) {
        bufferedRemoteCommit = { round: message.round, hash: message.hash };
      }
      return;
    }
    if (phase === "choosing" && message && message.type === SAFARI_DRAFT_MESSAGE_TYPES.reveal) {
      void receiveReveal(message);
    }
  }

  targets.addEventListener("click", onTargetsClick);
  balls.addEventListener("click", onBallsClick);
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
      localCommitPending = false;
      window.clearInterval(tickTimer);
      targets.removeEventListener("click", onTargetsClick);
      balls.removeEventListener("click", onBallsClick);
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
