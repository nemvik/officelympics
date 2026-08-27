import { createRng } from "../game-core.mjs";
import { defineGame, NOOP, normalizeScoreResult, pointsWord, safeSmallInteger } from "./shared.mjs";

export const HARCOV_PRICE = Object.freeze({
  rounds: 8,
  optionCount: 4,
  roundDurationMs: 12_000,
  maximumScore: 8_000
});

export const HARCOV_PRICE_SOURCE = Object.freeze({
  url: "https://menza.tul.cz/harcov/",
  location: "Výdejna Harcov",
  firstDate: "2026-08-17",
  lastDate: "2026-09-11",
  menuDays: 20,
  retrievedDate: "2026-08-27",
  priceType: "Veřejná cena bez přihlášení · oběd bez polévky"
});

function meal(date, name, portion, price) {
  return Object.freeze({ date, name, portion, price });
}

// Ceny jsou uložené v haléřích přesně tak, jak je veřejně zobrazil jídelníček.
export const HARCOV_MEALS = Object.freeze([
  meal("2026-08-17", "Uzené kuřecí stehno, bramborová kaše, zelný salát", "220g", 17566),
  meal("2026-08-17", "Gobbi ki Sabzi (květákové sabdží), dušená rýže", "200g", 15276),
  meal("2026-08-17", "Marinované medailonky z vepřové panenky, opékané brambory, zeleninová obloha", "120g", 16180),
  meal("2026-08-17", "Středomořský talíř s grilovaným lososem, polníčkem a cizrnou, pečivo", "300g", 21662),
  meal("2026-08-18", "Kuřecí steak s broskví, šunkou a sýrem, vařené brambory, zeleninová obloha", "150g", 18869),
  meal("2026-08-18", "Žampionové knedlíky, dušené zelí", "320g", 16682),
  meal("2026-08-18", "Drůbeží á la bažant, rýžové těstoviny", "120g", 15618),
  meal("2026-08-18", "Zeleninový talíř s mozzarellou, pečivo", "300g", 17708),
  meal("2026-08-19", "Čevabčiči s hořčicí, cibulí a vařeným bramborem", "200g", 19025),
  meal("2026-08-19", "Halušky s bryndzou a cibulkou", "320g", 17179),
  meal("2026-08-19", "Hovězí maso v rajské omáčce, rýžové těstoviny", "120g", 19897),
  meal("2026-08-19", "Zeleninový talíř s lahůdkovým salátem, pečivo", "300g", 15745),
  meal("2026-08-20", "Svíčková na smetaně s brusinkami, houskové knedlíky", "150g", 20388),
  meal("2026-08-20", "Zeleninové rizoto s tofu a sýrem, okurkový salát", "310g", 16387),
  meal("2026-08-20", "Sekaný máslový řízek, bramborová kaše, zeleninová přízdoba", "200g", 17870),
  meal("2026-08-20", "Mix salátů se zeleninou, pečený kuřecí plátek, pečivo", "120g", 20788),
  meal("2026-08-21", "Sekaná pečeně, bramborová kaše", "200g", 19851),
  meal("2026-08-21", "Dukátové buchtičky s krémem", "320g", 14131),
  meal("2026-08-21", "Gratinovaný krůtí plátek, dušená zelenina na másle", "120g", 17965),
  meal("2026-08-21", "Zeleninový talíř, brokolicový salát s se šunkou a sýrem, pečivo", "300g", 16505),
  meal("2026-08-24", "Segedínský guláš, houskový knedlík", "150g", 16970),
  meal("2026-08-24", "Indický dhal, pita chléb", "220g", 15682),
  meal("2026-08-24", "Kuřecí nudličky s ananasem a smetanou, jasmínová rýže", "120g", 15971),
  meal("2026-08-24", "Salát Pollo s kuřecím masem, pečivo", "300g", 18912),
  meal("2026-08-25", "Bramborové knedlíky plněné uzeninou, dušené zelí, cibulka", "3ks", 17748),
  meal("2026-08-25", "Smažený květák, vařené brambory, tatarská omáčka", "200g", 15950),
  meal("2026-08-25", "Krůtí steak na bylinkách, růžičkové kapustičky na másle", "120g", 17274),
  meal("2026-08-25", "Švýcarský fazolový salát, pečivo", "250g", 17203),
  meal("2026-08-26", "Smažený kuřecí řízek, bramborová kaše s jarní cibulkou a máslem", "150g", 17067),
  meal("2026-08-26", "Neplněné kynuté knedlíky s jahodovým přelivem a kysanou smetanou", "4ks", 15855),
  meal("2026-08-26", "Zapečené brambory s tuňákem, sýrem a plátky vajec, zeleninová přízdoba", "320g", 17712),
  meal("2026-08-26", "Kuřecí plátek, grilovaná cuketa a paprika, pečivo", "120g", 16679),
  meal("2026-08-27", "Hovězí maso, koprová omáčka, houskový knedlík", "150g", 19723),
  meal("2026-08-27", "Zeleninový karbanátek se sýrem, vařené brambory, tatarská omáčka", "200g", 16519),
  meal("2026-08-27", "Pečené kuřecí stehno, jasmínová rýže", "220g", 15427),
  meal("2026-08-27", "Mix salátů a zeleniny, grilovaný hermelín, brusinkový dip, pečivo", "100g", 20434),
  meal("2026-08-28", "Hovězí maso v rajské omáčce, vařené těstoviny", "150g", 19226),
  meal("2026-08-28", "Rajma masala, rýže basmati", "200 g", 14510),
  meal("2026-08-28", "Vepřové maso na česneku, dušený špenát, bramborové noky", "120g", 19445),
  meal("2026-08-28", "Těstovinový salát s tuňákem a zeleninou, pečivo", "300g", 16300),
  meal("2026-08-31", "Vepřový katův šleh, dušená jasmínová rýže", "150g", 16081),
  meal("2026-08-31", "Houbový kuba, zelný salát", "300g", 14161),
  meal("2026-08-31", "Krůtí guláš, vařené těstoviny", "120g", 16830),
  meal("2026-08-31", "Salát s kuskusem a balkánem, pečivo", "300g", 16012),
  meal("2026-09-01", "Moravský vrabec, dušené bílé zelí, bramborový knedlík", "150g", 17862),
  meal("2026-09-01", "Massaman kari s rýží basmati", "200g", 18316),
  meal("2026-09-01", "Rybí filé na kmíně, bramborová kaše", "150g", 16383),
  meal("2026-09-01", "Salát Waldorf, pečivo", "300g", 16633),
  meal("2026-09-02", "Vepřová játra na slanině, dušená rýže", "150g", 14057),
  meal("2026-09-02", "Zapečená baby karotka s květákem a pórkem, vařený brambor", "300g", 16258),
  meal("2026-09-02", "Pečené kuřecí paličky, bramborová kaše, kompot", "300g", 18443),
  meal("2026-09-02", "Řecký salát s olivami, česneková bageta", "300g", 15549),
  meal("2026-09-03", "Hamburská vepřová kýta, houskový knedlík", "150g", 17231),
  meal("2026-09-03", "Cizrnové ragú, jasmínová rýže", "200g", 15107),
  meal("2026-09-03", "Milánské rýžové těstoviny s parmezánem", "320g", 18712),
  meal("2026-09-03", "Mix salátů se zeleninou, grilovaný losos, citronový dip, pečivo", "150g", 25754),
  meal("2026-09-04", "Krůtí maso na paprice, vařené těstoviny", "150g", 17330),
  meal("2026-09-04", "Kapustový karbanátek, vařené brambory", "200g", 15614),
  meal("2026-09-04", "Vepřová krkovička přírodní, fazolové lusky se slaninou, česnekový dip", "120g", 16929),
  meal("2026-09-04", "Zeleninový talíř s pomazánkou z nivy, slunečnicová kostka", "300g", 16906),
  meal("2026-09-07", "Svíčková Stroganov, jasmínová rýže", "150g", 18841),
  meal("2026-09-07", "Smažený celer, vařené brambory, tatarská omáčka", "200g", 15956),
  meal("2026-09-07", "Přírodní kuřecí plátek, sweet kukuřička na másle", "120g", 15686),
  meal("2026-09-07", "Čočkový salát s kořenovou zeleninou a vejcem, pečivo", "250g", 15518),
  meal("2026-09-08", "Svíčková na smetaně s brusinkami, houskové knedlíky", "150g", 20156),
  meal("2026-09-08", "Bramborové šišky s mákem", "300g", 15009),
  meal("2026-09-08", "Gratinovaný krůtí plátek, dušená zelenina na másle", "120g", 17767),
  meal("2026-09-08", "Sýrový salát s rajčaty, pečivo", "300g", 17087),
  meal("2026-09-09", "Cikánská hovězí pečeně, dušená rýže", "150g", 19245),
  meal("2026-09-09", "Smetanové žampiony s pórkem, pažitkové brambory", "150g", 16854),
  meal("2026-09-09", "Smažený kuřecí řízek, bramborová kaše, okurkový salát", "120g", 17008),
  meal("2026-09-09", "Italský talíř s rukolou a cherry rajčaty, pečivo", "300 g", 19485),
  meal("2026-09-10", "Hovězí maso na česneku, dušený špenát, bramborový knedlík", "150g", 20051),
  meal("2026-09-10", "Těstoviny Pomodoro sypané parmazánem", "320g", 15565),
  meal("2026-09-10", "Losos na másle, bramborová kaše", "150g", 18474),
  meal("2026-09-10", "Mix salátů se zeleninou, smažené stripsy, dip, pečivo", "4 ks", 21638),
  meal("2026-09-11", "Pikantní kuřecí nudličky, dušená rýže", "150g", 16374),
  meal("2026-09-11", "Lasagne s čočkovým ragú", "320g", 15933),
  meal("2026-09-11", "Vepřové ražniči na plechu, vařené brambory", "150g", 16314),
  meal("2026-09-11", "Zeleninový talíř, těstovinový salát se šunkou a sýrem, pečivo", "300g", 15696)
]);

export const harcovPriceGame = defineGame({
  id: "harcov-price",
  meta: {
    icon: "🍽️",
    title: "Harcov na korunu",
    teaser: "Tref cenu oběda bez polévky",
    difficulty: "odhad",
    instruction: "Podle jídla vyber jednu ze čtyř veřejných cen menzy Harcov. Polévka v tom není.",
    scoreLabel: "bodů za cenotvorbu"
  },
  start: startHarcovPrice,
  result: {
    mode: "local",
    createPractice: createHarcovPricePracticeResult,
    normalize: normalizeHarcovPriceResult,
    format: formatHarcovPriceResult
  }
});

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values;
}

function validMeal(value) {
  return value && typeof value.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
    && typeof value.name === "string" && value.name.trim().length > 0 && value.name.length <= 180
    && typeof value.portion === "string" && value.portion.length <= 20
    && Number.isSafeInteger(value.price) && value.price > 0;
}

export function buildHarcovPriceRounds(seed, count = HARCOV_PRICE.rounds, meals = HARCOV_MEALS) {
  if (!Array.isArray(meals)) return [];
  const records = meals.filter(validMeal).map(function (record, index) {
    return { ...record, id: record.date + ":" + index };
  });
  const uniquePrices = Array.from(new Set(records.map(function (record) { return record.price; })));
  if (records.length === 0 || uniquePrices.length < HARCOV_PRICE.optionCount) return [];

  const random = createRng("harcov-price:" + seed);
  const roundCount = Math.min(records.length, Math.max(0, Math.floor(Number(count) || 0)));
  const selected = shuffle(records.slice(), random).slice(0, roundCount);
  const answerPositions = shuffle(selected.map(function (_, index) {
    return index % HARCOV_PRICE.optionCount;
  }), random);

  return selected.map(function (record, roundIndex) {
    const nearby = uniquePrices
      .filter(function (price) { return price !== record.price; })
      .sort(function (first, second) {
        return Math.abs(first - record.price) - Math.abs(second - record.price) || first - second;
      })
      .slice(0, 12);
    const options = shuffle(nearby, random).slice(0, HARCOV_PRICE.optionCount - 1);
    const answerIndex = answerPositions[roundIndex];
    options.splice(answerIndex, 0, record.price);
    return Object.freeze({
      id: record.id,
      date: record.date,
      name: record.name,
      portion: record.portion,
      price: record.price,
      answerIndex,
      options: Object.freeze(options)
    });
  });
}

export function formatHarcovPrice(price) {
  if (!Number.isSafeInteger(price) || price < 0) return "—";
  return (price / 100).toFixed(2).replace(".", ",") + " Kč";
}

export function formatHarcovDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return "Neznámý den";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return "Neznámý den";
  }
  const weekdays = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
  const months = [
    "ledna", "února", "března", "dubna", "května", "června",
    "července", "srpna", "září", "října", "listopadu", "prosince"
  ];
  return weekdays[date.getUTCDay()] + " " + day + ". " + months[month - 1] + " " + year;
}

export function harcovPriceRoundScore(elapsedMs) {
  if (!Number.isFinite(Number(elapsedMs))) return 0;
  const safeElapsed = Math.min(HARCOV_PRICE.roundDurationMs, Math.max(0, Number(elapsedMs)));
  return Math.max(250, Math.round(1_000 - safeElapsed / 16));
}

export function createHarcovPricePracticeResult(seed) {
  const random = createRng("practice-result:harcov-price:" + seed);
  const correct = 4 + Math.floor(random() * 4);
  const timeouts = Math.min(HARCOV_PRICE.rounds - correct, random() < .28 ? 1 : 0);
  const mistakes = HARCOV_PRICE.rounds - correct - timeouts;
  const reactions = [];
  let score = 0;

  for (let index = 0; index < correct; index += 1) {
    const reaction = 2_100 + Math.floor(random() * 5_900);
    reactions.push(reaction);
    score += harcovPriceRoundScore(reaction);
  }

  const average = reactions.length
    ? Math.round(reactions.reduce(function (sum, value) { return sum + value; }, 0) / reactions.length)
    : 0;
  return { score, correct, mistakes, timeouts, average };
}

export function normalizeHarcovPriceResult(result) {
  const normalized = normalizeScoreResult(result, HARCOV_PRICE.maximumScore);
  if (!normalized) return null;
  normalized.correct = safeSmallInteger(result.correct, HARCOV_PRICE.rounds);
  normalized.mistakes = safeSmallInteger(result.mistakes, HARCOV_PRICE.rounds);
  normalized.timeouts = safeSmallInteger(result.timeouts, HARCOV_PRICE.rounds);
  normalized.average = safeSmallInteger(result.average, HARCOV_PRICE.roundDurationMs);
  return normalized;
}

export function formatHarcovPriceResult(result) {
  const average = result.average ? (result.average / 1000).toFixed(1).replace(".", ",") + " s" : "—";
  return result.correct + "/" + HARCOV_PRICE.rounds + " cen · průměr " + average;
}

export function startHarcovPrice(context) {
  const rounds = buildHarcovPriceRounds(context.seed);
  const timers = new Set();
  const reactionTimes = [];
  let animationFrame = 0;
  let roundIndex = -1;
  let roundStartedAt = 0;
  let phase = "idle";
  let score = 0;
  let correct = 0;
  let mistakes = 0;
  let timeouts = 0;
  let finished = false;

  context.setRoundLabel(HARCOV_PRICE.rounds + " cen bez polévky");
  context.stage.innerHTML = `
    <div class="harcov-price-shell">
      <div class="harcov-price-topline">
        <div class="harcov-price-rounds" role="group" aria-label="Průběh cenového auditu"></div>
        <strong class="harcov-price-score">0 bodů</strong>
      </div>
      <div class="harcov-price-layout">
        <section class="harcov-price-receipt" aria-labelledby="harcov-price-meal">
          <div class="harcov-price-brand">
            <span aria-hidden="true">🍽️</span>
            <div><b>MENZA TUL</b><small>VÝDEJNA HARCOV</small></div>
            <em>ÚČTENKA</em>
          </div>
          <div class="harcov-price-rule" aria-hidden="true"></div>
          <time class="harcov-price-date"></time>
          <div class="harcov-price-meal">
            <span>HLAVNÍ JÍDLO <b class="harcov-price-portion"></b></span>
            <h3 id="harcov-price-meal">Načítám denní nabídku…</h3>
          </div>
          <div class="harcov-price-receipt-bottom">
            <span>CENA CELKEM</span><strong>??? Kč</strong>
          </div>
          <div class="harcov-price-stamp" aria-label="Varianta bez polévky">BEZ<br>POLÉVKY</div>
        </section>
        <section class="harcov-price-panel" aria-labelledby="harcov-price-question">
          <div class="harcov-price-question-row">
            <div><span class="eyebrow">Cenový audit</span><h3 id="harcov-price-question">Kolik stojí tenhle oběd?</h3></div>
            <div class="harcov-price-clock" aria-label="Zbývající čas"><b>12,0</b><small>s</small></div>
          </div>
          <div class="harcov-price-timer" aria-hidden="true"><span></span></div>
          <div class="harcov-price-options" role="group" aria-label="Vyber cenu"></div>
          <p class="harcov-price-feedback" role="status" aria-live="polite">Vyber jednu ze čtyř cen. Účetní kalkulačka je zakázaná.</p>
          <div class="harcov-price-source">
            <span>Veřejná cena bez přihlášení · bez polévky</span>
            <a target="_blank" rel="noreferrer">Ověřit v jídelníčku ↗</a>
          </div>
        </section>
      </div>
    </div>`;

  const shell = context.stage.querySelector(".harcov-price-shell");
  const roundDots = context.stage.querySelector(".harcov-price-rounds");
  const scoreLabel = context.stage.querySelector(".harcov-price-score");
  const dateLabel = context.stage.querySelector(".harcov-price-date");
  const mealLabel = context.stage.querySelector("#harcov-price-meal");
  const portionLabel = context.stage.querySelector(".harcov-price-portion");
  const totalLabel = context.stage.querySelector(".harcov-price-receipt-bottom strong");
  const options = context.stage.querySelector(".harcov-price-options");
  const clock = context.stage.querySelector(".harcov-price-clock b");
  const timerBar = context.stage.querySelector(".harcov-price-timer span");
  const feedback = context.stage.querySelector(".harcov-price-feedback");
  const sourceLink = context.stage.querySelector(".harcov-price-source a");

  rounds.forEach(function (_, index) {
    const dot = document.createElement("i");
    dot.setAttribute("aria-label", "Kolo " + (index + 1));
    roundDots.append(dot);
  });

  function schedule(callback, delay) {
    const timer = window.setTimeout(function () {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
    return timer;
  }

  function publish() {
    scoreLabel.textContent = score + " " + pointsWord(score);
    context.publishScore(score);
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    window.cancelAnimationFrame(animationFrame);
    const average = reactionTimes.length
      ? Math.round(reactionTimes.reduce(function (sum, value) { return sum + value; }, 0) / reactionTimes.length)
      : 0;
    context.finish({ score, correct, mistakes, timeouts, average });
  }

  function nextRound() {
    if (finished) return;
    if (roundIndex + 1 >= rounds.length) {
      finish();
      return;
    }
    startRound(roundIndex + 1);
  }

  function updateClock() {
    if (finished || phase !== "guess") return;
    const elapsed = performance.now() - roundStartedAt;
    const remaining = Math.max(0, HARCOV_PRICE.roundDurationMs - elapsed);
    clock.textContent = (remaining / 1000).toFixed(1).replace(".", ",");
    timerBar.style.transform = "scaleX(" + (remaining / HARCOV_PRICE.roundDurationMs) + ")";
    if (remaining <= 0) {
      resolveRound(null);
      return;
    }
    animationFrame = window.requestAnimationFrame(updateClock);
  }

  function createOption(price, index) {
    const button = document.createElement("button");
    const letter = String.fromCharCode(65 + index);
    button.type = "button";
    button.dataset.priceIndex = String(index);
    button.setAttribute("aria-label", "Možnost " + letter + ": " + formatHarcovPrice(price));

    const badge = document.createElement("span");
    badge.textContent = letter;
    const value = document.createElement("strong");
    value.textContent = formatHarcovPrice(price);
    const shortcut = document.createElement("small");
    shortcut.textContent = "klávesa " + (index + 1);
    button.append(badge, value, shortcut);
    return button;
  }

  function startRound(index) {
    const round = rounds[index];
    if (finished || !round) return;
    window.cancelAnimationFrame(animationFrame);
    roundIndex = index;
    phase = "guess";
    shell.classList.remove("is-correct", "is-wrong");
    totalLabel.textContent = "??? Kč";
    dateLabel.dateTime = round.date;
    dateLabel.textContent = formatHarcovDate(round.date);
    mealLabel.textContent = round.name;
    portionLabel.textContent = "· " + round.portion;
    sourceLink.href = HARCOV_PRICE_SOURCE.url + round.date + "/";
    feedback.textContent = "Kolo " + (index + 1) + " z " + rounds.length + " · vyber cenu bez polévky.";
    options.replaceChildren(...round.options.map(createOption));
    Array.from(roundDots.children).forEach(function (dot, dotIndex) {
      dot.classList.toggle("is-current", dotIndex === index);
    });
    clock.textContent = "12,0";
    timerBar.style.transform = "scaleX(1)";
    roundStartedAt = performance.now();
    animationFrame = window.requestAnimationFrame(updateClock);
    const firstOption = options.querySelector("button");
    if (firstOption) firstOption.focus({ preventScroll: true });
  }

  function resolveRound(choiceIndex) {
    if (finished || phase !== "guess") return;
    const round = rounds[roundIndex];
    if (!round) return;
    if (choiceIndex !== null && (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= round.options.length)) return;
    phase = "resolved";
    window.cancelAnimationFrame(animationFrame);
    const elapsed = Math.min(HARCOV_PRICE.roundDurationMs, Math.max(0, performance.now() - roundStartedAt));
    const buttons = Array.from(options.querySelectorAll("button"));
    buttons.forEach(function (button, index) {
      button.disabled = true;
      if (index === round.answerIndex) button.classList.add("is-correct");
      if (index === choiceIndex && index !== round.answerIndex) button.classList.add("is-wrong");
    });
    totalLabel.textContent = formatHarcovPrice(round.price);
    const isCorrect = choiceIndex === round.answerIndex;
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add(isCorrect ? "is-good" : "is-bad");

    if (isCorrect) {
      const points = harcovPriceRoundScore(elapsed);
      correct += 1;
      score += points;
      reactionTimes.push(Math.round(elapsed));
      shell.classList.add("is-correct");
      feedback.textContent = "Trefa! +" + points + " bodů. Menza potvrzuje " + formatHarcovPrice(round.price) + ".";
    } else if (choiceIndex === null) {
      timeouts += 1;
      shell.classList.add("is-wrong");
      feedback.textContent = "Čas vypršel. Správná cena je " + formatHarcovPrice(round.price) + ".";
    } else {
      mistakes += 1;
      shell.classList.add("is-wrong");
      feedback.textContent = "Vedle. V jídelníčku je " + formatHarcovPrice(round.price) + ".";
    }
    publish();
    schedule(nextRound, 1_250);
  }

  function onOptionClick(event) {
    const button = event.target.closest("[data-price-index]");
    if (!button || !options.contains(button)) return;
    resolveRound(Number(button.dataset.priceIndex));
  }

  function onKeyDown(event) {
    if (phase !== "guess" || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    const index = ["1", "2", "3", "4"].indexOf(key) >= 0
      ? Number(key) - 1
      : ["a", "b", "c", "d"].indexOf(key);
    if (index < 0) return;
    event.preventDefault();
    resolveRound(index);
  }

  options.addEventListener("click", onOptionClick);
  window.addEventListener("keydown", onKeyDown);
  publish();
  if (rounds.length) schedule(function () { startRound(0); }, 350);
  else schedule(finish, 0);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      phase = "finished";
      window.cancelAnimationFrame(animationFrame);
      timers.forEach(window.clearTimeout);
      timers.clear();
      options.removeEventListener("click", onOptionClick);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}
