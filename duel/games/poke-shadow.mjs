import { createRng } from "../game-core.mjs";
import { POKEMON_SNAPSHOT } from "./pokemon/snapshot.mjs";
import { defineGame, NOOP, normalizeScoreResult, pointsWord, safeSmallInteger } from "./shared.mjs";

export const POKE_SHADOW = Object.freeze({
  rounds: 8,
  optionCount: 4,
  typeHintMs: 5000,
  sizeHintMs: 10000,
  roundDurationMs: 15000,
  revealDurationMs: 1200,
  spriteLoadTimeoutMs: 3000,
  maximumScore: 8000
});

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

const POKEMON_BY_ID = new Map(POKEMON_SNAPSHOT.map(function (pokemon) {
  return [pokemon.id, pokemon];
}));

export const pokeShadowGame = defineGame({
  id: "poke-shadow",
  meta: {
    icon: "◓",
    title: "PokéStín",
    teaser: "Poznej Pokémona podle siluety",
    difficulty: "postřeh",
    instruction: "Poznej během patnácti sekund osm Pokémonů podle siluety. Typ, výška a váha se postupně odhalí.",
    scoreLabel: "bodů za Pokédex"
  },
  start: startPokeShadow,
  result: {
    mode: "local",
    createPractice: createPokeShadowPracticeResult,
    normalize: normalizePokeShadowResult,
    format: formatPokeShadowResult
  }
});

export function pokeShadowScore(elapsedMs) {
  if (!Number.isFinite(elapsedMs)) return 0;
  const elapsed = Math.min(POKE_SHADOW.roundDurationMs, Math.max(0, elapsedMs));
  const range = 1000 - 100;
  return Math.round(1000 - elapsed / POKE_SHADOW.roundDurationMs * range);
}

export function createPokeShadowPracticeResult(seed) {
  const random = createRng("practice-result:poke-shadow:" + seed);
  const correct = 4 + Math.floor(random() * 4);
  const reactions = Array.from({ length: correct }, function () {
    return Math.round(2125 + random() * 9125);
  });
  return {
    score: reactions.reduce(function (total, reaction) {
      return total + pokeShadowScore(reaction);
    }, 0),
    correct,
    average: Math.round(reactions.reduce(function (total, reaction) {
      return total + reaction;
    }, 0) / reactions.length)
  };
}

export function normalizePokeShadowResult(result) {
  const normalized = normalizeScoreResult(result, POKE_SHADOW.maximumScore);
  if (!normalized) return null;
  normalized.correct = safeSmallInteger(result.correct, POKE_SHADOW.rounds);
  normalized.average = safeSmallInteger(result.average, POKE_SHADOW.roundDurationMs);
  normalized.score = Math.min(normalized.score, normalized.correct * 1000);
  normalized.correct = Math.min(normalized.correct, Math.floor(normalized.score / 100));
  if (!normalized.correct) {
    normalized.score = 0;
    normalized.average = 0;
  }
  return normalized;
}

export function formatPokeShadowResult(result) {
  const average = safeSmallInteger(result && result.average, POKE_SHADOW.roundDurationMs);
  const correct = safeSmallInteger(result && result.correct, POKE_SHADOW.rounds);
  return correct + "/" + POKE_SHADOW.rounds + " Pokémonů poznáno · "
    + (average ? "průměr " + formatDecimal(average / 1000) + " s" : "bez správného tipu");
}

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

function validPokemonPool(records) {
  const uniqueById = new Map();
  (Array.isArray(records) ? records : []).forEach(function (pokemon) {
    if (!pokemon || !Number.isInteger(pokemon.id) || pokemon.id < 1 || pokemon.id > 151) return;
    if (typeof pokemon.name !== "string" || !pokemon.name || !Array.isArray(pokemon.types) || !pokemon.types.length) return;
    if (!uniqueById.has(pokemon.id)) uniqueById.set(pokemon.id, pokemon);
  });
  return Array.from(uniqueById.values());
}

function similarityScore(answer, candidate) {
  let score = 0;
  if (candidate.types[0] === answer.types[0]) score += 100;
  else if (candidate.types.some(function (type) { return answer.types.includes(type); })) score += 25;
  if (candidate.shape === answer.shape) score += 45;
  if (candidate.color === answer.color) score += 35;
  return score;
}

function pickDistractors(answer, pool, random) {
  const ranked = pool.filter(function (pokemon) {
    return pokemon.id !== answer.id;
  }).map(function (pokemon) {
    return { pokemon, similarity: similarityScore(answer, pokemon), tie: random() };
  });

  ranked.sort(function (first, second) {
    return second.similarity - first.similarity || first.tie - second.tie || first.pokemon.id - second.pokemon.id;
  });
  const preferred = ranked.filter(function (candidate) { return candidate.similarity > 0; });
  const fallback = ranked.filter(function (candidate) { return candidate.similarity === 0; });
  return preferred.concat(fallback).slice(0, POKE_SHADOW.optionCount - 1).map(function (candidate) {
    return candidate.pokemon.id;
  });
}

function buildAnswerPositions(count, random) {
  const positions = [];
  while (positions.length < count) positions.push(...shuffle([0, 1, 2, 3], random));
  return positions.slice(0, count);
}

export function buildPokeShadowRounds(seed, count = POKE_SHADOW.rounds, records = POKEMON_SNAPSHOT) {
  const pool = validPokemonPool(records);
  if (pool.length < POKE_SHADOW.optionCount) throw new Error("PokéStín potřebuje alespoň čtyři platné Pokémony.");
  const roundCount = Math.min(pool.length, Math.max(0, Math.floor(Number(count) || 0)));
  const random = createRng("poke-shadow:" + seed);
  const answers = shuffle(pool, random).slice(0, roundCount);
  const answerPositions = buildAnswerPositions(roundCount, random);

  return answers.map(function (answer, index) {
    const distractors = shuffle(pickDistractors(answer, pool, random), random);
    const options = distractors.slice();
    options.splice(answerPositions[index], 0, answer.id);
    return { id: index, answerId: answer.id, options };
  });
}

function formatDecimal(value) {
  return Number(value).toFixed(1).replace(".", ",");
}

function typeLabel(types) {
  return types.map(function (type) { return TYPE_LABELS[type] || type; }).join(" + ");
}

export function startPokeShadow(context) {
  const rounds = buildPokeShadowRounds(context.seed);
  const reactionTimes = [];
  const previousRenderGameToText = window.render_game_to_text;
  const previousAdvanceTime = window.advanceTime;
  const preloadedSprites = [];
  let roundIndex = -1;
  let phase = "idle";
  let elapsedMs = 0;
  let revealRemainingMs = 0;
  let spriteLoadRemainingMs = 0;
  let score = 0;
  let correct = 0;
  let typeHintShown = false;
  let sizeHintShown = false;
  let finished = false;
  let lastTick = performance.now();

  context.setRoundLabel(POKE_SHADOW.rounds + " kol · 15 sekund na stín");
  context.stage.innerHTML = `
    <div class="poke-shadow-shell" data-phase="idle">
      <div class="poke-shadow-topline">
        <div class="poke-shadow-rounds" role="group" aria-label="Průběh kol"></div>
        <strong class="poke-shadow-score">0 bodů</strong>
      </div>
      <div class="poke-shadow-arena">
        <section class="poke-shadow-visual" aria-labelledby="poke-shadow-question">
          <div class="poke-shadow-clock" aria-label="Časový limit patnáct sekund">
            <span aria-hidden="true">Zbývá</span><b aria-hidden="true">15,0</b><small aria-hidden="true">s</small>
          </div>
          <div class="poke-shadow-timer" aria-hidden="true"><span></span></div>
          <div class="poke-shadow-portrait" role="img" aria-label="Silueta neznámého Pokémona">
            <img class="poke-shadow-sprite" alt="" draggable="false">
            <span class="poke-shadow-fallback" aria-hidden="true">?</span>
          </div>
          <p class="poke-shadow-identity">Neznámý Pokémon</p>
        </section>
        <section class="poke-shadow-panel">
          <span class="eyebrow">Pokédexový test</span>
          <h3 id="poke-shadow-question">Kdo se skrývá ve stínu?</h3>
          <div class="poke-shadow-hints" aria-live="polite" aria-atomic="true">
            <p data-poke-hint="type"><span aria-hidden="true">◆</span><b>Typ se ukáže za 5 s</b></p>
            <p data-poke-hint="size"><span aria-hidden="true">↕</span><b>Výška a váha za 10 s</b></p>
          </div>
          <div class="poke-shadow-options" role="group" aria-label="Možnosti odpovědi"></div>
          <p class="poke-shadow-feedback" role="status" aria-live="polite" aria-atomic="true">Máš jediný pokus. Vol klávesami 1–4 nebo tlačítkem.</p>
        </section>
      </div>
    </div>`;

  const shell = context.stage.querySelector(".poke-shadow-shell");
  const roundDots = context.stage.querySelector(".poke-shadow-rounds");
  const scoreLabel = context.stage.querySelector(".poke-shadow-score");
  const clock = context.stage.querySelector(".poke-shadow-clock b");
  const timerBar = context.stage.querySelector(".poke-shadow-timer span");
  const portrait = context.stage.querySelector(".poke-shadow-portrait");
  const sprite = context.stage.querySelector(".poke-shadow-sprite");
  const identity = context.stage.querySelector(".poke-shadow-identity");
  const hints = context.stage.querySelector(".poke-shadow-hints");
  const typeHint = context.stage.querySelector('[data-poke-hint="type"]');
  const sizeHint = context.stage.querySelector('[data-poke-hint="size"]');
  const options = context.stage.querySelector(".poke-shadow-options");
  const feedback = context.stage.querySelector(".poke-shadow-feedback");

  rounds.forEach(function (_, index) {
    const dot = document.createElement("i");
    dot.setAttribute("aria-label", "Kolo " + (index + 1));
    roundDots.append(dot);
  });

  Array.from(new Set(rounds.map(function (round) {
    return POKEMON_BY_ID.get(round.answerId).sprite;
  }))).forEach(function (source) {
    const image = new Image();
    image.decoding = "async";
    image.src = source;
    preloadedSprites.push(image);
  });

  function currentRound() {
    return rounds[roundIndex] || null;
  }

  function currentPokemon() {
    const round = currentRound();
    return round ? POKEMON_BY_ID.get(round.answerId) : null;
  }

  function updateScore() {
    scoreLabel.textContent = score + " " + pointsWord(score);
    context.publishScore(score);
  }

  function renderClock() {
    const remaining = Math.max(0, POKE_SHADOW.roundDurationMs - elapsedMs);
    clock.textContent = formatDecimal(remaining / 1000);
    timerBar.style.transform = "scaleX(" + remaining / POKE_SHADOW.roundDurationMs + ")";
  }

  function revealType(pokemon) {
    if (typeHintShown) return;
    typeHintShown = true;
    typeHint.classList.add("is-revealed");
    typeHint.querySelector("b").textContent = (pokemon.types.length > 1 ? "Typy: " : "Typ: ") + typeLabel(pokemon.types);
  }

  function revealSize(pokemon) {
    if (sizeHintShown) return;
    sizeHintShown = true;
    sizeHint.classList.add("is-revealed");
    sizeHint.querySelector("b").textContent = "Výška " + formatDecimal(pokemon.height / 10)
      + " m · hmotnost " + formatDecimal(pokemon.weight / 10) + " kg";
  }

  function updateHints() {
    const pokemon = currentPokemon();
    if (!pokemon) return;
    if (elapsedMs >= POKE_SHADOW.typeHintMs) revealType(pokemon);
    if (elapsedMs >= POKE_SHADOW.sizeHintMs) revealSize(pokemon);
  }

  function setOptionsDisabled(disabled) {
    options.querySelectorAll("button").forEach(function (button) { button.disabled = disabled; });
  }

  function renderOptions(round) {
    options.replaceChildren();
    round.options.forEach(function (pokemonId, index) {
      const pokemon = POKEMON_BY_ID.get(pokemonId);
      const button = document.createElement("button");
      button.type = "button";
      button.disabled = phase !== "playing";
      button.dataset.pokeOption = String(pokemonId);
      button.setAttribute("aria-label", (index + 1) + ". " + pokemon.name);
      const shortcut = document.createElement("small");
      shortcut.setAttribute("aria-hidden", "true");
      shortcut.textContent = String(index + 1);
      const label = document.createElement("b");
      label.textContent = pokemon.name;
      button.append(shortcut, label);
      options.append(button);
    });
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    shell.dataset.phase = phase;
    window.clearInterval(tickTimer);
    setOptionsDisabled(true);
    feedback.textContent = "Pokédex zavřen. Osm stínů už zná svůj verdikt.";
    const average = reactionTimes.length
      ? Math.round(reactionTimes.reduce(function (total, reaction) { return total + reaction; }, 0) / reactionTimes.length)
      : 0;
    context.finish({ score, correct, average });
  }

  function focusFirstOption() {
    const firstOption = options.querySelector("button");
    if (!firstOption) return;
    firstOption.focus({ preventScroll: true });
    const bounds = firstOption.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > window.innerHeight
      || bounds.left < 0 || bounds.right > window.innerWidth) {
      firstOption.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
    }
  }

  function beginPlayableRound(expectedRoundIndex) {
    if (finished || phase !== "loading" || roundIndex !== expectedRoundIndex) return;
    phase = "playing";
    shell.dataset.phase = phase;
    spriteLoadRemainingMs = 0;
    elapsedMs = 0;
    setOptionsDisabled(false);
    feedback.textContent = "Kolo " + (roundIndex + 1) + " z " + rounds.length + ". Můžeš odpovědět jen jednou.";
    renderClock();
    focusFirstOption();
    lastTick = performance.now();
  }

  function startRound(index) {
    if (finished || !rounds[index]) return;
    roundIndex = index;
    phase = "loading";
    shell.dataset.phase = phase;
    elapsedMs = 0;
    revealRemainingMs = 0;
    spriteLoadRemainingMs = POKE_SHADOW.spriteLoadTimeoutMs;
    typeHintShown = false;
    sizeHintShown = false;
    const round = rounds[index];
    const pokemon = POKEMON_BY_ID.get(round.answerId);

    portrait.classList.remove("is-revealed", "is-missing");
    portrait.setAttribute("aria-label", "Silueta neznámého Pokémona");
    sprite.src = pokemon.sprite;
    identity.textContent = "Neznámý Pokémon · stín " + (index + 1) + "/" + rounds.length;
    hints.setAttribute("aria-live", "off");
    typeHint.classList.remove("is-revealed");
    typeHint.querySelector("b").textContent = "Typ se ukáže za 5 s";
    sizeHint.classList.remove("is-revealed");
    sizeHint.querySelector("b").textContent = "Výška a váha za 10 s";
    hints.setAttribute("aria-live", "polite");
    feedback.textContent = "Načítám siluetu pro kolo " + (index + 1) + " z " + rounds.length + ".";
    Array.from(roundDots.children).forEach(function (dot) { dot.classList.remove("is-current"); });
    roundDots.children[index].classList.add("is-current");
    renderOptions(round);
    renderClock();
    if (sprite.complete) {
      if (sprite.naturalWidth > 0) onSpriteLoad();
      else onSpriteError();
    }
  }

  function resolveRound(selectedId, timedOut = false) {
    if (finished || phase !== "playing") return;
    const round = currentRound();
    const pokemon = currentPokemon();
    const isCorrect = !timedOut && selectedId === round.answerId;
    phase = "revealed";
    shell.dataset.phase = phase;
    revealRemainingMs = POKE_SHADOW.revealDurationMs;
    setOptionsDisabled(true);
    hints.setAttribute("aria-live", "off");
    revealType(pokemon);
    revealSize(pokemon);
    portrait.classList.add("is-revealed");
    portrait.setAttribute("aria-label", "Pokémon " + pokemon.name);
    identity.textContent = "#" + String(pokemon.id).padStart(3, "0") + " · " + pokemon.name;

    options.querySelectorAll("button").forEach(function (button) {
      const optionId = Number(button.dataset.pokeOption);
      if (optionId === round.answerId) button.classList.add("is-correct");
      else if (!timedOut && optionId === selectedId) button.classList.add("is-wrong");
    });
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add(isCorrect ? "is-good" : "is-bad");

    if (isCorrect) {
      const reaction = Math.round(elapsedMs);
      const points = pokeShadowScore(reaction);
      score += points;
      correct += 1;
      reactionTimes.push(reaction);
      feedback.textContent = "Správně za " + formatDecimal(reaction / 1000) + " s · +" + points + " bodů.";
      updateScore();
    } else if (timedOut) {
      feedback.textContent = "Čas vypršel. Správně je " + pokemon.name + " · 0 bodů.";
    } else {
      feedback.textContent = "Vedle. Správně je " + pokemon.name + " · 0 bodů.";
    }
  }

  function stepTime(milliseconds) {
    if (finished || !Number.isFinite(Number(milliseconds))) return;
    let remainingStep = Math.min(120_000, Math.max(0, Number(milliseconds)));

    while (remainingStep > 0 && !finished) {
      if (phase === "loading") {
        const step = Math.min(remainingStep, spriteLoadRemainingMs);
        spriteLoadRemainingMs -= step;
        remainingStep -= step;
        if (spriteLoadRemainingMs <= 0) {
          portrait.classList.add("is-missing");
          beginPlayableRound(roundIndex);
        }
      } else if (phase === "playing") {
        const untilTimeout = POKE_SHADOW.roundDurationMs - elapsedMs;
        const step = Math.min(remainingStep, untilTimeout);
        elapsedMs += step;
        remainingStep -= step;
        updateHints();
        renderClock();
        if (elapsedMs >= POKE_SHADOW.roundDurationMs) resolveRound(null, true);
      } else if (phase === "revealed") {
        const step = Math.min(remainingStep, revealRemainingMs);
        revealRemainingMs -= step;
        remainingStep -= step;
        if (revealRemainingMs <= 0) {
          if (roundIndex + 1 >= rounds.length) finish();
          else startRound(roundIndex + 1);
        }
      } else {
        return;
      }
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

  function renderGameToText() {
    const round = currentRound();
    const pokemon = currentPokemon();
    return JSON.stringify({
      game: "poke-shadow",
      phase,
      round: roundIndex + 1,
      rounds: rounds.length,
      loadingMs: phase === "loading" ? Math.round(spriteLoadRemainingMs) : 0,
      remainingMs: phase === "playing" ? Math.round(POKE_SHADOW.roundDurationMs - elapsedMs) : 0,
      score,
      hints: {
        type: typeHintShown && pokemon ? typeLabel(pokemon.types) : null,
        size: sizeHintShown && pokemon ? { heightMetres: pokemon.height / 10, weightKilograms: pokemon.weight / 10 } : null
      },
      revealedPokemon: phase === "revealed" && pokemon ? { id: pokemon.id, name: pokemon.name } : null,
      choices: phase === "playing" && round ? round.options.map(function (pokemonId) {
        return POKEMON_BY_ID.get(pokemonId).name;
      }) : [],
      feedback: feedback.textContent
    });
  }

  function chooseOption(pokemonId) {
    if (phase !== "playing" || !Number.isInteger(pokemonId)) return;
    const expectedRoundIndex = roundIndex;
    syncClock();
    if (phase !== "playing" || roundIndex !== expectedRoundIndex) return;
    const button = options.querySelector('[data-poke-option="' + pokemonId + '"]');
    if (!button || button.disabled) return;
    resolveRound(pokemonId, false);
  }

  function onOptionClick(event) {
    const button = event.target.closest("[data-poke-option]");
    if (!button || !options.contains(button)) return;
    chooseOption(Number(button.dataset.pokeOption));
  }

  function onKeyDown(event) {
    if (phase !== "playing" || !/^[1-4]$/.test(event.key)) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    const button = options.children[Number(event.key) - 1];
    if (!button || button.disabled) return;
    event.preventDefault();
    chooseOption(Number(button.dataset.pokeOption));
  }

  function onSpriteLoad() {
    portrait.classList.remove("is-missing");
    beginPlayableRound(roundIndex);
  }

  function onSpriteError() {
    portrait.classList.add("is-missing");
    beginPlayableRound(roundIndex);
  }

  options.addEventListener("click", onOptionClick);
  sprite.addEventListener("load", onSpriteLoad);
  sprite.addEventListener("error", onSpriteError);
  window.addEventListener("keydown", onKeyDown);
  window.render_game_to_text = renderGameToText;
  window.advanceTime = advanceTime;
  updateScore();
  startRound(0);
  lastTick = performance.now();
  const tickTimer = window.setInterval(syncClock, 50);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      window.clearInterval(tickTimer);
      options.removeEventListener("click", onOptionClick);
      sprite.removeEventListener("load", onSpriteLoad);
      sprite.removeEventListener("error", onSpriteError);
      window.removeEventListener("keydown", onKeyDown);
      preloadedSprites.forEach(function (image) { image.removeAttribute("src"); });
      preloadedSprites.length = 0;
      sprite.removeAttribute("src");
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
