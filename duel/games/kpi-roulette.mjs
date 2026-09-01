import { createRng } from "../game-core.mjs";
import {
  czechCount,
  defineGame,
  NOOP,
  normalizeScoreResult
} from "./shared.mjs";

export const KPI_ROULETTE = Object.freeze({
  rounds: 6,
  minimumSpin: 3,
  maximumSpin: 10,
  maximumScore: 60,
  spinDurationMs: 1_150
});

export const KPI_WHEEL_SEGMENTS = Object.freeze([
  Object.freeze({ value: 3, emoji: "📨", label: "Reply all", detail: "Celé patro právě dostalo odpověď určenou jednomu člověku." }),
  Object.freeze({ value: 6, emoji: "🎫", label: "Čistý ticket", detail: "Ticket prošel bez jediného doplňujícího komentáře." }),
  Object.freeze({ value: 9, emoji: "🏠", label: "Home office", detail: "Home office schválen bez kalendářové detektivky." }),
  Object.freeze({ value: 4, emoji: "📊", label: "Nové KPI", detail: "Vzniklo KPI, kterému zatím rozumí jen autor tabulky." }),
  Object.freeze({ value: 8, emoji: "🗓️", label: "Pátek volný", detail: "Páteční meeting záhadně zmizel z kalendáře." }),
  Object.freeze({ value: 5, emoji: "🕒", label: "Včasný konec", detail: "Porada skončila přesně v čase. Svědci jsou v šoku." }),
  Object.freeze({ value: 10, emoji: "💰", label: "Rozpočet", detail: "Rozpočet byl navýšen dřív, než se někdo stihl zeptat proč." }),
  Object.freeze({ value: 7, emoji: "☕", label: "Káva zdarma", detail: "Kávovar dnes nevzal kartu ani poslední zbytky důstojnosti." })
]);

const OUTCOME_BY_VALUE = new Map(KPI_WHEEL_SEGMENTS.map(function (outcome) {
  return [outcome.value, outcome];
}));

export const kpiRouletteGame = defineGame({
  id: "kpi-roulette",
  meta: {
    icon: "🎯",
    title: "KPI ruleta",
    teaser: "Roztoč firemní štěstí a přežij audit",
    difficulty: "čistá náhoda",
    instruction: "Šestkrát roztoč KPI ruletu. Každý výsledek přidá trochu firemní karmy.",
    scoreLabel: "bodů firemní karmy"
  },
  start: startKpiRoulette,
  result: {
    mode: "local",
    createPractice: createKpiRoulettePracticeResult,
    normalize: normalizeKpiRouletteResult,
    format: formatKpiRouletteResult
  }
});

function normalizedPlayerName(name) {
  return String(name || "").normalize("NFKC").trim().toLocaleLowerCase("cs-CZ");
}

export function isViktorName(name) {
  return normalizedPlayerName(name) === "viktor";
}

function splitKpiTotal(total, random) {
  const values = [];
  let remaining = total;

  for (let index = 0; index < KPI_ROULETTE.rounds; index += 1) {
    const slotsAfterThis = KPI_ROULETTE.rounds - index - 1;
    const lowest = Math.max(
      KPI_ROULETTE.minimumSpin,
      remaining - slotsAfterThis * KPI_ROULETTE.maximumSpin
    );
    const highest = Math.min(
      KPI_ROULETTE.maximumSpin,
      remaining - slotsAfterThis * KPI_ROULETTE.minimumSpin
    );
    const value = lowest + Math.floor(random() * (highest - lowest + 1));
    values.push(value);
    remaining -= value;
  }

  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }

  return values;
}

export function buildKpiRoulettePlan(seed, role, name) {
  const safeRole = role === 1 ? 1 : 0;
  const safeName = normalizedPlayerName(name);
  const random = createRng("kpi-roulette:" + seed + ":" + safeRole + ":" + safeName);
  // Viktorův rozsah těsně navazuje na běžný rozsah, ale nikdy se s ním nepřekryje.
  const target = isViktorName(safeName)
    ? 42 + Math.floor(random() * 4)
    : 34 + Math.floor(random() * 8);
  return splitKpiTotal(target, random);
}

export function createKpiRoulettePracticeResult(seed) {
  const spins = buildKpiRoulettePlan("practice:" + seed, 1, "Kolega-bot");
  return {
    score: spins.reduce(function (sum, value) { return sum + value; }, 0),
    spins,
    jackpots: spins.filter(function (value) { return value >= 9; }).length
  };
}

export function normalizeKpiRouletteResult(result) {
  const normalized = normalizeScoreResult(result, KPI_ROULETTE.maximumScore);
  if (!normalized) return null;
  normalized.spins = Array.isArray(result.spins)
    ? result.spins.slice(0, KPI_ROULETTE.rounds).map(function (value) {
      return Math.min(
        KPI_ROULETTE.maximumSpin,
        Math.max(KPI_ROULETTE.minimumSpin, Math.round(Number(value) || 0))
      );
    })
    : [];
  normalized.jackpots = normalized.spins.filter(function (value) { return value >= 9; }).length;
  return normalized;
}

export function formatKpiRouletteResult(result) {
  const spins = Array.isArray(result.spins) ? result.spins.length : 0;
  const jackpots = Number(result.jackpots) || 0;
  return spins + "/" + KPI_ROULETTE.rounds + " otočení · " + jackpots + " "
    + czechCount(jackpots, "jackpot", "jackpoty", "jackpotů");
}

export function startKpiRoulette(context) {
  const localName = Array.isArray(context.names) ? context.names[context.localRole] : "";
  const plan = buildKpiRoulettePlan(context.seed, context.localRole, localName);
  const timers = [];
  const spins = [];
  let roundIndex = 0;
  let score = 0;
  let rotation = 0;
  let phase = "ready";
  let finished = false;

  context.setRoundLabel(KPI_ROULETTE.rounds + " otočení čistě firemní náhody");
  context.stage.innerHTML = `
    <div class="kpi-roulette-shell">
      <div class="kpi-roulette-topline">
        <div class="kpi-roulette-rounds" role="group" aria-label="Průběh otočení"></div>
        <div class="kpi-roulette-score"><small>Firemní karma</small><strong>0</strong></div>
      </div>
      <div class="kpi-roulette-layout">
        <section class="kpi-roulette-machine" aria-label="Kolo KPI rulety">
          <div class="kpi-roulette-wheel-wrap" aria-hidden="true">
            <span class="kpi-roulette-pointer">▼</span>
            <div class="kpi-roulette-wheel"></div>
            <span class="kpi-roulette-hub">KPI</span>
          </div>
          <p>Výsledky certifikoval odbor náhodných tabulek.</p>
        </section>
        <section class="kpi-roulette-panel">
          <span class="eyebrow">Kvartální kalibrace</span>
          <h3 class="kpi-roulette-heading">Otočení 1 z ${KPI_ROULETTE.rounds}</h3>
          <p class="kpi-roulette-copy">Kolo nezná zásluhy, senioritu ani obsah tvého kalendáře.</p>
          <ol class="kpi-roulette-history" aria-label="Výsledky předchozích otočení"></ol>
          <button class="kpi-roulette-button" type="button">🎯 Roztočit KPI</button>
          <small class="kpi-roulette-shortcut">Funguje také mezerník</small>
        </section>
      </div>
      <p class="kpi-roulette-feedback" role="status" aria-live="polite">Šest otočení. Žádná strategie. Přesně jako skutečný kvartál.</p>
    </div>`;

  const shell = context.stage.querySelector(".kpi-roulette-shell");
  const wheel = context.stage.querySelector(".kpi-roulette-wheel");
  const rounds = context.stage.querySelector(".kpi-roulette-rounds");
  const scoreLabel = context.stage.querySelector(".kpi-roulette-score strong");
  const heading = context.stage.querySelector(".kpi-roulette-heading");
  const copy = context.stage.querySelector(".kpi-roulette-copy");
  const history = context.stage.querySelector(".kpi-roulette-history");
  const button = context.stage.querySelector(".kpi-roulette-button");
  const feedback = context.stage.querySelector(".kpi-roulette-feedback");

  KPI_WHEEL_SEGMENTS.forEach(function (outcome, index) {
    const label = document.createElement("span");
    label.className = "kpi-roulette-segment";
    label.style.setProperty("--segment-angle", index * 45 + "deg");
    label.innerHTML = "<b>" + outcome.value + "</b><small>" + outcome.emoji + "</small>";
    wheel.append(label);
  });

  for (let index = 0; index < KPI_ROULETTE.rounds; index += 1) {
    const dot = document.createElement("i");
    dot.setAttribute("aria-hidden", "true");
    rounds.append(dot);
  }
  rounds.children[0].classList.add("is-current");

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  }

  function publishScore() {
    scoreLabel.textContent = String(score);
    context.publishScore(score);
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    button.disabled = true;
    button.textContent = "✓ Audit uzavřen";
    heading.textContent = "Kvartál vyhodnocen";
    copy.textContent = "Výsledek byl zapsán do tabulky, kterou už nikdo nesmí přepočítat.";
    feedback.textContent = "KPI ruleta dokončena. Oddělení náhody odmítá přijímat reklamace.";
    context.finish({
      score,
      spins: spins.slice(),
      jackpots: spins.filter(function (value) { return value >= 9; }).length
    });
  }

  function resolveSpin(value) {
    if (finished || phase !== "spinning") return;
    phase = "resolved";
    shell.classList.remove("is-spinning");
    const outcome = OUTCOME_BY_VALUE.get(value);
    score += value;
    spins.push(value);
    publishScore();

    const result = document.createElement("li");
    result.innerHTML = "<small>" + spins.length + ".</small><b>+" + value + "</b><em>" + outcome.emoji + "</em>";
    history.append(result);

    rounds.children[roundIndex].classList.remove("is-current");
    rounds.children[roundIndex].classList.add(value >= 8 ? "is-jackpot" : "is-done");
    feedback.textContent = outcome.detail + " +" + value + " bodů karmy.";
    heading.textContent = outcome.label;
    copy.textContent = value >= 9
      ? "Audit zaznamenal mimořádně produktivní náhodu."
      : "Výsledek vypadá dostatečně vědecky, pokračujeme.";
    roundIndex += 1;

    if (roundIndex >= KPI_ROULETTE.rounds) {
      schedule(finish, 850);
      return;
    }

    rounds.children[roundIndex].classList.add("is-current");
    schedule(function () {
      if (finished) return;
      phase = "ready";
      heading.textContent = "Otočení " + (roundIndex + 1) + " z " + KPI_ROULETTE.rounds;
      button.textContent = "🎯 Roztočit znovu";
      button.disabled = false;
      button.focus({ preventScroll: true });
    }, 650);
  }

  function spin() {
    if (finished || phase !== "ready") return;
    phase = "spinning";
    button.disabled = true;
    button.textContent = "KPI se kalibruje…";
    shell.classList.add("is-spinning");
    feedback.textContent = "Generuji důvěryhodně vypadající číslo…";

    const value = plan[roundIndex];
    const segmentIndex = KPI_WHEEL_SEGMENTS.findIndex(function (segment) {
      return segment.value === value;
    });
    const currentAngle = ((rotation % 360) + 360) % 360;
    const destinationAngle = (360 - segmentIndex * 45) % 360;
    const adjustment = (destinationAngle - currentAngle + 360) % 360;
    rotation += 1_080 + adjustment;
    wheel.style.transform = "rotate(" + rotation + "deg)";
    schedule(function () { resolveSpin(value); }, KPI_ROULETTE.spinDurationMs + 60);
  }

  function onKeyDown(event) {
    if (event.code !== "Space" || event.repeat) return;
    const target = event.target;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    event.preventDefault();
    spin();
  }

  button.addEventListener("click", spin);
  window.addEventListener("keydown", onKeyDown);
  publishScore();
  button.focus({ preventScroll: true });

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      button.removeEventListener("click", spin);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}
