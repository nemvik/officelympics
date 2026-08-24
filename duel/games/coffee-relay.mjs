import { createRng } from "../game-core.mjs";
import {
  czechCount,
  defineGame,
  NOOP,
  normalizeScoreResult,
  pointsWord,
  safeSmallInteger
} from "./shared.mjs";

export const coffeeRelayGame = defineGame({
  id: "coffee",
  meta: {
    icon: "☕",
    title: "Kávová štafeta",
    teaser: "Namíchej objednávku zpaměti",
    difficulty: "paměť",
    instruction: "Zapamatuj si objednávku a namíchej správnou velikost, základ, mléko i přísadu.",
    scoreLabel: "bodů za kofein"
  },
  start: startCoffeeRelay,
  result: {
    mode: "local",
    createPractice: createPracticeResult,
    normalize: normalizeResult,
    format: formatResult
  }
});

function createPracticeResult(seed) {
  const random = createRng("practice-result:coffee:" + seed);
  const served = 3 + Math.floor(random() * 3);
  const mistakes = Math.floor(random() * 4);
  const average = 1900 + Math.floor(random() * 2800);
  return {
    score: served * 610 + Math.floor(random() * 620),
    served,
    mistakes,
    average
  };
}

function normalizeResult(result) {
  const normalized = normalizeScoreResult(result, 4500);
  if (!normalized) return null;
  normalized.served = safeSmallInteger(result.served, 5);
  normalized.mistakes = safeSmallInteger(result.mistakes, 50);
  normalized.average = safeSmallInteger(result.average, 20_000);
  return normalized;
}

function formatResult(result) {
  return result.served + "/5 káv · " + result.mistakes + " "
    + czechCount(result.mistakes, "reklamace", "reklamace", "reklamací");
}

export function startCoffeeRelay(context) {
  const rounds = buildCoffeeRounds(context.seed);
  const timers = [];
  const reactionTimes = [];
  let roundTimer = 0;
  let roundIndex = -1;
  let phase = "idle";
  let selection = {};
  let score = 0;
  let served = 0;
  let mistakes = 0;
  let roundMistakes = 0;
  let solveStartedAt = 0;
  let finished = false;

  context.setRoundLabel(COFFEE_ROUNDS + " objednávek bez papírku");
  context.stage.innerHTML = `
    <div class="coffee-shell">
      <div class="coffee-topline">
        <div class="coffee-rounds" role="group" aria-label="Průběh objednávek"></div>
        <strong class="coffee-score">0 bodů</strong>
      </div>
      <div class="coffee-layout">
        <article class="coffee-ticket" aria-live="polite">
          <span class="eyebrow">Objednávka pro</span>
          <h3 class="coffee-customer">Načítám patro…</h3>
          <ul class="coffee-order"></ul>
          <div class="coffee-ticket-fold">Objednávka založena<br>do šanonu</div>
        </article>
        <section class="coffee-station" aria-label="Kávová stanice">
          <div class="coffee-groups"></div>
          <button class="coffee-serve" type="button" disabled>☕ Vydat objednávku</button>
        </section>
      </div>
      <p class="coffee-feedback" role="status" aria-live="polite">Zapamatuj si čtyři položky a namíchej je zpaměti.</p>
    </div>`;

  const shell = context.stage.querySelector(".coffee-shell");
  const roundDots = context.stage.querySelector(".coffee-rounds");
  const scoreLabel = context.stage.querySelector(".coffee-score");
  const ticket = context.stage.querySelector(".coffee-ticket");
  const customer = context.stage.querySelector(".coffee-customer");
  const orderList = context.stage.querySelector(".coffee-order");
  const groups = context.stage.querySelector(".coffee-groups");
  const serveButton = context.stage.querySelector(".coffee-serve");
  const feedback = context.stage.querySelector(".coffee-feedback");

  rounds.forEach(function () {
    const dot = document.createElement("i");
    dot.setAttribute("aria-hidden", "true");
    roundDots.append(dot);
  });

  COFFEE_CATEGORIES.forEach(function (category) {
    const group = document.createElement("section");
    group.className = "coffee-group";
    const heading = document.createElement("h3");
    heading.textContent = category.label;
    const choices = document.createElement("div");
    category.options.forEach(function (option) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.coffeeCategory = category.id;
      button.dataset.coffeeValue = option.id;
      button.setAttribute("aria-pressed", "false");
      button.disabled = true;
      const emoji = document.createElement("span");
      emoji.setAttribute("aria-hidden", "true");
      emoji.textContent = option.emoji;
      const label = document.createElement("b");
      label.textContent = option.label;
      button.append(emoji, label);
      choices.append(button);
    });
    group.append(heading, choices);
    groups.append(group);
  });

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  }

  function optionFor(category, value) {
    return category.options.find(function (option) { return option.id === value; });
  }

  function updateScore() {
    scoreLabel.textContent = score + " " + pointsWord(score);
    context.publishScore(score);
  }

  function renderOrder(round) {
    customer.textContent = round.customer;
    orderList.replaceChildren();
    COFFEE_CATEGORIES.forEach(function (category) {
      const option = optionFor(category, round.order[category.id]);
      const item = document.createElement("li");
      const emoji = document.createElement("span");
      emoji.setAttribute("aria-hidden", "true");
      emoji.textContent = option.emoji;
      const label = document.createElement("span");
      label.textContent = option.label;
      item.append(emoji, label);
      orderList.append(item);
    });
  }

  function renderSelection() {
    groups.querySelectorAll("[data-coffee-category]").forEach(function (button) {
      const selected = selection[button.dataset.coffeeCategory] === button.dataset.coffeeValue;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = phase !== "mix";
    });
    const complete = COFFEE_CATEGORIES.every(function (category) { return Boolean(selection[category.id]); });
    serveButton.disabled = phase !== "mix" || !complete;
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    window.clearTimeout(roundTimer);
    ticket.classList.remove("is-folded");
    ticket.setAttribute("aria-hidden", "false");
    renderSelection();
    feedback.textContent = "Výdej uzavřen. Kofeinové škody právě počítá účetní oddělení.";
    const average = reactionTimes.length
      ? Math.round(reactionTimes.reduce(function (total, value) { return total + value; }, 0) / reactionTimes.length)
      : 0;
    context.finish({ score, served, mistakes, average });
  }

  function nextRound() {
    if (finished) return;
    if (roundIndex + 1 >= rounds.length) {
      finish();
      return;
    }
    startRound(roundIndex + 1);
  }

  function resolveTimeout(expectedRound) {
    if (finished || phase !== "mix" || roundIndex !== expectedRound) return;
    phase = "resolved";
    ticket.classList.remove("is-folded");
    ticket.setAttribute("aria-hidden", "false");
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add("is-bad");
    feedback.textContent = "Objednávka vystydla. Správná kombinace se na chvíli odtajnila.";
    renderSelection();
    schedule(nextRound, 1350);
  }

  function beginMix(expectedRound) {
    if (finished || phase !== "preview" || roundIndex !== expectedRound) return;
    phase = "mix";
    solveStartedAt = performance.now();
    ticket.classList.add("is-folded");
    ticket.setAttribute("aria-hidden", "true");
    feedback.textContent = "Teď ji namíchej zpaměti. Každá oprava stojí body.";
    renderSelection();
    const firstButton = groups.querySelector("button:not(:disabled)");
    if (firstButton) firstButton.focus({ preventScroll: true });
    roundTimer = schedule(function () { resolveTimeout(expectedRound); }, 9000);
  }

  function startRound(index) {
    if (finished || !rounds[index]) return;
    window.clearTimeout(roundTimer);
    roundIndex = index;
    phase = "preview";
    selection = {};
    roundMistakes = 0;
    shell.classList.remove("is-mistake");
    ticket.classList.remove("is-folded");
    ticket.setAttribute("aria-hidden", "false");
    renderOrder(rounds[index]);
    renderSelection();
    Array.from(roundDots.children).forEach(function (dot) { dot.classList.remove("is-current"); });
    roundDots.children[index].classList.add("is-current");
    feedback.textContent = "Objednávka " + (index + 1) + " z " + rounds.length + " · máš 1,8 sekundy na zapamatování.";
    schedule(function () { beginMix(index); }, 1800);
  }

  function chooseOption(category, value) {
    if (finished || phase !== "mix") return;
    const validCategory = COFFEE_CATEGORIES.find(function (entry) { return entry.id === category; });
    if (!validCategory || !validCategory.options.some(function (option) { return option.id === value; })) return;
    selection[category] = value;
    renderSelection();
  }

  function submitOrder() {
    if (finished || phase !== "mix" || serveButton.disabled) return;
    const elapsed = Math.round(performance.now() - solveStartedAt);
    const result = coffeeOrderScore(rounds[roundIndex].order, selection, elapsed, roundMistakes);

    if (!result.correct) {
      mistakes += 1;
      roundMistakes += 1;
      shell.classList.remove("is-mistake");
      void shell.offsetWidth;
      shell.classList.add("is-mistake");
      feedback.textContent = "Tohle si neobjednali. Uprav recept a zachraň reputaci kuchyňky.";
      return;
    }

    window.clearTimeout(roundTimer);
    phase = "resolved";
    score += result.points;
    served += 1;
    reactionTimes.push(elapsed);
    ticket.classList.remove("is-folded");
    ticket.setAttribute("aria-hidden", "false");
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add("is-good");
    feedback.textContent = elapsed + " ms · +" + result.points + " bodů. Káva dorazí dřív než odpověď z HR.";
    renderSelection();
    updateScore();
    schedule(nextRound, 1050);
  }

  function onGroupClick(event) {
    const button = event.target.closest("[data-coffee-category]");
    if (!button) return;
    chooseOption(button.dataset.coffeeCategory, button.dataset.coffeeValue);
  }

  groups.addEventListener("click", onGroupClick);
  serveButton.addEventListener("click", submitOrder);
  updateScore();
  schedule(function () { startRound(0); }, 450);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      window.clearTimeout(roundTimer);
      groups.removeEventListener("click", onGroupClick);
      serveButton.removeEventListener("click", submitOrder);
    }
  };
}

export const COFFEE_ROUNDS = 5;

export const COFFEE_CATEGORIES = Object.freeze([
  Object.freeze({
    id: "size",
    label: "Velikost",
    options: Object.freeze([
      Object.freeze({ id: "small", emoji: "🤏", label: "Malé" }),
      Object.freeze({ id: "large", emoji: "🫗", label: "Velké" })
    ])
  }),
  Object.freeze({
    id: "base",
    label: "Základ",
    options: Object.freeze([
      Object.freeze({ id: "espresso", emoji: "☕", label: "Espresso" }),
      Object.freeze({ id: "filter", emoji: "🫘", label: "Filtrovaná" }),
      Object.freeze({ id: "decaf", emoji: "🌙", label: "Bez kofeinu" })
    ])
  }),
  Object.freeze({
    id: "milk",
    label: "Mléko",
    options: Object.freeze([
      Object.freeze({ id: "none", emoji: "⚫", label: "Bez mléka" }),
      Object.freeze({ id: "regular", emoji: "🥛", label: "Kravské" }),
      Object.freeze({ id: "oat", emoji: "🌾", label: "Ovesné" })
    ])
  }),
  Object.freeze({
    id: "extra",
    label: "Navíc",
    options: Object.freeze([
      Object.freeze({ id: "plain", emoji: "👌", label: "Nic" }),
      Object.freeze({ id: "sugar", emoji: "🧊", label: "Cukr" }),
      Object.freeze({ id: "syrup", emoji: "🍯", label: "Sirup" })
    ])
  })
]);

export function buildCoffeeRounds(seed, count = COFFEE_ROUNDS) {
  const random = createRng("coffee:" + seed);
  const customers = ["Finance", "Vývoj", "Marketing", "Recepce", "HR", "Obchod", "Provoz"];
  const usedOrders = new Set();
  const rounds = [];

  for (let roundIndex = 0; roundIndex < Math.max(0, count); roundIndex += 1) {
    let order = null;
    let signature = "";

    for (let attempt = 0; attempt < 40; attempt += 1) {
      order = {};
      COFFEE_CATEGORIES.forEach(function (category) {
        const option = category.options[Math.floor(random() * category.options.length)];
        order[category.id] = option.id;
      });
      signature = COFFEE_CATEGORIES.map(function (category) { return order[category.id]; }).join(":");
      if (!usedOrders.has(signature)) break;
    }

    usedOrders.add(signature);
    rounds.push({
      id: roundIndex,
      customer: customers[Math.floor(random() * customers.length)],
      order
    });
  }

  return rounds;
}

export function coffeeOrderScore(expected, selection, elapsedMs, mistakes = 0) {
  const correct = Boolean(expected && selection) && COFFEE_CATEGORIES.every(function (category) {
    return expected[category.id] === selection[category.id];
  });

  if (!correct) return { correct: false, points: 0 };
  const safeElapsed = Math.min(9000, Math.max(0, Number(elapsedMs) || 0));
  const safeMistakes = Math.max(0, Math.floor(Number(mistakes) || 0));
  const points = Math.max(180, Math.round(900 - safeElapsed / 14 - safeMistakes * 130));
  return { correct: true, points };
}
