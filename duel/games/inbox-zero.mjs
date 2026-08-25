import { createRng } from "../game-core.mjs";
import {
  czechCount,
  defineGame,
  NOOP,
  normalizeScoreResult,
  pointsWord,
  safeSmallInteger
} from "./shared.mjs";

export const INBOX_ZERO = Object.freeze({
  rounds: 10,
  roundDurationMs: 4_500,
  maximumScore: 6_000
});

export const INBOX_ZERO_ACTIONS = Object.freeze([
  Object.freeze({ id: "reply", emoji: "↩️", label: "Odpovědět", shortcut: "1" }),
  Object.freeze({ id: "archive", emoji: "🗄️", label: "Archivovat", shortcut: "2" }),
  Object.freeze({ id: "spam", emoji: "🚫", label: "Spam", shortcut: "3" })
]);

export const INBOX_ZERO_MESSAGES = Object.freeze([
  Object.freeze({ id: "client-question", action: "reply", sender: "Klientka Nováková", subject: "Prosba o potvrzení termínu", preview: "Můžete prosím potvrdit, že prezentace platí na čtvrtek v 10:00?" }),
  Object.freeze({ id: "boss-approval", action: "reply", sender: "Vedoucí oddělení", subject: "Schválíš finální návrh?", preview: "Potřebuji tvoje ano nebo připomínky ještě před dnešním stand-upem." }),
  Object.freeze({ id: "colleague-help", action: "reply", sender: "Pavel z financí", subject: "Chybí mi číslo objednávky", preview: "Pošleš mi prosím číslo objednávky k poslední faktuře?" }),
  Object.freeze({ id: "room-change", action: "reply", sender: "Recepce", subject: "Přesun návštěvy", preview: "Host už čeká. Můžete potvrdit, do které zasedačky má jít?" }),
  Object.freeze({ id: "urgent-review", action: "reply", sender: "Produktový tým", subject: "Rychlá kontrola před vydáním", preview: "Našli jsme nejasnost v textu. Kterou ze dvou variant máme použít?" }),
  Object.freeze({ id: "lunch-choice", action: "reply", sender: "Office management", subject: "Volba menu na workshop", preview: "Napište prosím dnes alergie a preferovanou variantu oběda." }),

  Object.freeze({ id: "newsletter", action: "archive", sender: "Firemní newsletter", subject: "Týdenní přehled novinek", preview: "Pět týmů, osm úspěchů a fotografie nové pokojové rostliny." }),
  Object.freeze({ id: "receipt", action: "archive", sender: "Kancelářské potřeby", subject: "Účtenka k objednávce 1842", preview: "Objednávka byla zaplacena a doručena. Doklad najdete v příloze." }),
  Object.freeze({ id: "completed-ticket", action: "archive", sender: "IT Service Desk", subject: "Požadavek byl vyřešen", preview: "Ticket #431 je uzavřen. Pokud vše funguje, není nutná žádná odpověď." }),
  Object.freeze({ id: "calendar-copy", action: "archive", sender: "Kalendář", subject: "Přijato: Týdenní synchronizace", preview: "Událost už byla přidána do vašeho kalendáře." }),
  Object.freeze({ id: "policy-info", action: "archive", sender: "HR informace", subject: "Aktualizace interní směrnice", preview: "Dokument je uložený na intranetu. Tato zpráva nevyžaduje odpověď." }),
  Object.freeze({ id: "delivery", action: "archive", sender: "Kurýrní služba", subject: "Zásilka byla doručena", preview: "Balíček převzala recepce dnes v 9:14." }),

  Object.freeze({ id: "prince", action: "spam", sender: "Princ z oddělení investic", subject: "DŮVĚRNÁ obchodní příležitost", preview: "Potřebuji pouze vaše heslo a malý administrativní poplatek." }),
  Object.freeze({ id: "gift-card", action: "spam", sender: "CEO urgentně", subject: "Kup ihned deset dárkových karet", preview: "Jsem na tajném jednání. Nikomu nevolej a pošli kódy obratem." }),
  Object.freeze({ id: "invoice-zip", action: "spam", sender: "Neznámý dodavatel", subject: "Neuhrazená Faktura_FINAL.zip", preview: "Otevřete přílohu a povolte makra, jinak bude účtována pokuta." }),
  Object.freeze({ id: "password-expiry", action: "spam", sender: "Správce hesel", subject: "Účet vyprší za 4 minuty", preview: "Přihlaste se přes tento zkrácený odkaz a potvrďte své heslo." }),
  Object.freeze({ id: "lottery", action: "spam", sender: "Global Awards", subject: "Vyhráli jste kancelářský notebook", preview: "Pro převzetí výhry zašlete údaje z platební karty." }),
  Object.freeze({ id: "seo", action: "spam", sender: "Growth Wizard", subject: "První místo na Googlu ZARUČENO", preview: "Odpovězte YES a ztrojnásobíme návštěvnost do zítřejšího rána." })
]);

export const inboxZeroGame = defineGame({
  id: "inbox-zero",
  meta: {
    icon: "📥",
    title: "Inbox Zero",
    teaser: "Odpovědět, archivovat, nebo poslat do spamu",
    difficulty: "rychlé rozhodování",
    instruction: "Roztřiď deset e-mailů na odpověď, archiv a spam. Na každý máš jen pár sekund.",
    scoreLabel: "bodů za čistý inbox"
  },
  start: startInboxZero,
  result: {
    mode: "local",
    createPractice: createInboxZeroPracticeResult,
    normalize: normalizeInboxZeroResult,
    format: formatInboxZeroResult
  }
});

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const value = values[index];
    values[index] = values[target];
    values[target] = value;
  }
  return values;
}

export function buildInboxZeroRounds(seed, count = INBOX_ZERO.rounds, messages = INBOX_ZERO_MESSAGES) {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  const random = createRng("inbox-zero:" + seed);
  const validMessages = Array.isArray(messages) ? messages.filter(function (message) {
    return message && typeof message.id === "string" && INBOX_ZERO_ACTIONS.some(function (action) {
      return action.id === message.action;
    });
  }) : [];
  const pools = new Map(INBOX_ZERO_ACTIONS.map(function (action) {
    return [action.id, shuffle(validMessages.filter(function (message) { return message.action === action.id; }).slice(), random)];
  }));
  const categories = [];

  while (categories.length < safeCount) {
    categories.push(...shuffle(INBOX_ZERO_ACTIONS.map(function (action) { return action.id; }), random));
  }

  const used = new Set();
  return categories.slice(0, safeCount).map(function (actionId, index) {
    let pool = pools.get(actionId) || [];
    let message = pool.find(function (candidate) { return !used.has(candidate.id); });
    if (!message) message = validMessages.find(function (candidate) { return !used.has(candidate.id); });
    if (!message) message = validMessages[index % Math.max(1, validMessages.length)] || {
      id: "fallback-" + index,
      action: actionId,
      sender: "Kancelář",
      subject: "Prázdný inbox",
      preview: "Tuto zprávu bezpečně roztřiďte."
    };
    used.add(message.id);
    return { id: index, ...message };
  });
}

export function inboxZeroMessageScore(elapsedMs) {
  if (!Number.isFinite(Number(elapsedMs))) return 0;
  const elapsed = Math.min(INBOX_ZERO.roundDurationMs, Math.max(0, Number(elapsedMs)));
  return Math.max(150, Math.round(600 - elapsed / 10));
}

export function createInboxZeroPracticeResult(seed) {
  const random = createRng("practice-result:inbox-zero:" + seed);
  const correct = 7 + Math.floor(random() * 3);
  const timeouts = Math.floor(random() * 2);
  const mistakes = Math.max(0, INBOX_ZERO.rounds - correct - timeouts);
  const average = 950 + Math.floor(random() * 1_750);
  let score = 0;

  for (let index = 0; index < correct; index += 1) {
    score += inboxZeroMessageScore(Math.min(
      INBOX_ZERO.roundDurationMs,
      average + Math.floor((random() - .5) * 900)
    ));
  }
  return { score, correct, mistakes, timeouts, average };
}

export function normalizeInboxZeroResult(result) {
  const normalized = normalizeScoreResult(result, INBOX_ZERO.maximumScore);
  if (!normalized) return null;
  normalized.correct = safeSmallInteger(result.correct, INBOX_ZERO.rounds);
  normalized.mistakes = safeSmallInteger(result.mistakes, INBOX_ZERO.rounds);
  normalized.timeouts = safeSmallInteger(result.timeouts, INBOX_ZERO.rounds);
  normalized.average = safeSmallInteger(result.average, INBOX_ZERO.roundDurationMs);
  return normalized;
}

export function formatInboxZeroResult(result) {
  return result.correct + "/" + INBOX_ZERO.rounds + " e-mailů · " + result.mistakes + " "
    + czechCount(result.mistakes, "přešlap", "přešlapy", "přešlapů");
}

export function startInboxZero(context) {
  const rounds = buildInboxZeroRounds(context.seed);
  const timers = [];
  const reactionTimes = [];
  let animationFrame = 0;
  let roundTimer = 0;
  let roundIndex = -1;
  let shownAt = 0;
  let score = 0;
  let correct = 0;
  let mistakes = 0;
  let timeouts = 0;
  let phase = "idle";
  let finished = false;

  context.setRoundLabel(INBOX_ZERO.rounds + " zpráv k roztřídění");
  context.stage.innerHTML = `
    <div class="inbox-zero-shell">
      <div class="inbox-zero-topline">
        <div class="inbox-zero-rounds" role="group" aria-label="Průběh třídění"></div>
        <strong class="inbox-zero-score">0 bodů</strong>
      </div>
      <div class="inbox-zero-window">
        <div class="inbox-zero-toolbar" aria-hidden="true"><span></span><span></span><span></span><b>INBOX · PRIORITA VŠECHNO</b></div>
        <article class="inbox-zero-message" aria-labelledby="inbox-zero-subject">
          <div class="inbox-zero-avatar" aria-hidden="true">?</div>
          <div class="inbox-zero-copy">
            <span class="inbox-zero-sender">Načítám odesílatele…</span>
            <h3 id="inbox-zero-subject">Kontroluji poštu</h3>
            <p class="inbox-zero-preview">Inbox předstírá, že má všechno pod kontrolou.</p>
          </div>
          <div class="inbox-zero-clock" aria-label="Zbývající čas"><b>4,5</b><small>s</small></div>
        </article>
        <div class="inbox-zero-timer" aria-hidden="true"><span></span></div>
        <div class="inbox-zero-actions" role="group" aria-label="Způsob vyřízení zprávy"></div>
        <p class="inbox-zero-feedback" role="status" aria-live="polite">Rozhoduj rychle. Ne každý vykřičník je skutečně urgentní.</p>
      </div>
    </div>`;

  const roundDots = context.stage.querySelector(".inbox-zero-rounds");
  const scoreLabel = context.stage.querySelector(".inbox-zero-score");
  const avatar = context.stage.querySelector(".inbox-zero-avatar");
  const sender = context.stage.querySelector(".inbox-zero-sender");
  const subject = context.stage.querySelector("#inbox-zero-subject");
  const preview = context.stage.querySelector(".inbox-zero-preview");
  const clock = context.stage.querySelector(".inbox-zero-clock b");
  const timerBar = context.stage.querySelector(".inbox-zero-timer span");
  const actions = context.stage.querySelector(".inbox-zero-actions");
  const feedback = context.stage.querySelector(".inbox-zero-feedback");

  rounds.forEach(function () {
    const dot = document.createElement("i");
    dot.setAttribute("aria-hidden", "true");
    roundDots.append(dot);
  });

  INBOX_ZERO_ACTIONS.forEach(function (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.inboxAction = action.id;
    button.disabled = true;
    const shortcut = document.createElement("small");
    shortcut.textContent = action.shortcut;
    const emoji = document.createElement("span");
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = action.emoji;
    const label = document.createElement("b");
    label.textContent = action.label;
    button.append(shortcut, emoji, label);
    actions.append(button);
  });

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  }

  function publish() {
    scoreLabel.textContent = score + " " + pointsWord(score);
    context.publishScore(score);
  }

  function setActionsDisabled(disabled) {
    actions.querySelectorAll("button").forEach(function (button) { button.disabled = disabled; });
  }

  function updateClock(now) {
    if (finished || phase !== "solve") return;
    const elapsed = Math.min(INBOX_ZERO.roundDurationMs, now - shownAt);
    const remaining = Math.max(0, INBOX_ZERO.roundDurationMs - elapsed);
    clock.textContent = (remaining / 1000).toFixed(1).replace(".", ",");
    timerBar.style.transform = "scaleX(" + (remaining / INBOX_ZERO.roundDurationMs) + ")";
    animationFrame = window.requestAnimationFrame(updateClock);
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    setActionsDisabled(true);
    sender.textContent = "Inbox Zero";
    subject.textContent = "Žádné další zprávy";
    preview.textContent = "Na krátký okamžik je doručená pošta skutečně prázdná.";
    avatar.textContent = "✓";
    feedback.textContent = "Hotovo. Nový e-mail dorazí pravděpodobně během vyhodnocení.";
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

  function revealCorrect(actionId) {
    const correctButton = actions.querySelector('[data-inbox-action="' + actionId + '"]');
    if (correctButton) correctButton.classList.add("is-correct");
  }

  function resolveTimeout(expectedRound) {
    if (finished || phase !== "solve" || roundIndex !== expectedRound) return;
    phase = "resolved";
    timeouts += 1;
    window.cancelAnimationFrame(animationFrame);
    setActionsDisabled(true);
    clock.textContent = "0,0";
    timerBar.style.transform = "scaleX(0)";
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add("is-bad");
    revealCorrect(rounds[roundIndex].action);
    feedback.textContent = "Pozdě. Inbox zprávu automaticky přesunul do složky ‚později‘.";
    schedule(nextRound, 950);
  }

  function startRound(index) {
    if (finished || !rounds[index]) return;
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    roundIndex = index;
    phase = "solve";
    const round = rounds[index];
    avatar.textContent = round.sender.trim().charAt(0).toUpperCase() || "?";
    sender.textContent = round.sender;
    subject.textContent = round.subject;
    preview.textContent = round.preview;
    feedback.textContent = "Zpráva " + (index + 1) + "/" + rounds.length + " · klávesy 1–3 urychlují administrativu.";
    Array.from(roundDots.children).forEach(function (dot) { dot.classList.remove("is-current"); });
    roundDots.children[index].classList.add("is-current");
    actions.querySelectorAll("button").forEach(function (button) {
      button.classList.remove("is-correct", "is-wrong");
    });
    setActionsDisabled(false);
    shownAt = performance.now();
    clock.textContent = "4,5";
    timerBar.style.transform = "scaleX(1)";
    animationFrame = window.requestAnimationFrame(updateClock);
    roundTimer = schedule(function () { resolveTimeout(index); }, INBOX_ZERO.roundDurationMs);
    const firstAction = actions.querySelector("button");
    if (firstAction) firstAction.focus({ preventScroll: true });
  }

  function chooseAction(actionId) {
    if (finished || phase !== "solve") return;
    const round = rounds[roundIndex];
    const button = actions.querySelector('[data-inbox-action="' + actionId + '"]');
    if (!round || !button || button.disabled) return;
    phase = "resolved";
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    setActionsDisabled(true);
    roundDots.children[roundIndex].classList.remove("is-current");

    if (actionId === round.action) {
      const elapsed = Math.min(INBOX_ZERO.roundDurationMs, Math.round(performance.now() - shownAt));
      const points = inboxZeroMessageScore(elapsed);
      correct += 1;
      score += points;
      reactionTimes.push(elapsed);
      button.classList.add("is-correct");
      roundDots.children[roundIndex].classList.add("is-good");
      feedback.textContent = elapsed + " ms · +" + points + " bodů. Profesionálně vyřízeno.";
      publish();
    } else {
      mistakes += 1;
      button.classList.add("is-wrong");
      revealCorrect(round.action);
      roundDots.children[roundIndex].classList.add("is-bad");
      feedback.textContent = "Špatná složka. Compliance právě otevřelo nový dokument.";
    }
    schedule(nextRound, actionId === round.action ? 700 : 950);
  }

  function onActionClick(event) {
    const button = event.target.closest("[data-inbox-action]");
    if (button) chooseAction(button.dataset.inboxAction);
  }

  function onKeyDown(event) {
    if (phase !== "solve" || !/^[1-3]$/.test(event.key)) return;
    const action = INBOX_ZERO_ACTIONS[Number(event.key) - 1];
    if (!action) return;
    event.preventDefault();
    chooseAction(action.id);
  }

  actions.addEventListener("click", onActionClick);
  window.addEventListener("keydown", onKeyDown);
  publish();
  schedule(function () { startRound(0); }, 400);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      window.clearTimeout(roundTimer);
      window.cancelAnimationFrame(animationFrame);
      actions.removeEventListener("click", onActionClick);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}
