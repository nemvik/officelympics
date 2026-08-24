import { ALT_TAB_ROUNDS, altTabReactionScore, buildAltTabRounds } from "../game-core.mjs";
import { NOOP, pointsWord } from "./shared.mjs";

export function startAltTabDuel(context) {
  const rounds = buildAltTabRounds(context.seed);
  const timers = [];
  const reactions = [];
  let roundIndex = -1;
  let phase = "idle";
  let shownAt = 0;
  let score = 0;
  let mistakes = 0;
  let missed = 0;
  let finished = false;

  context.setRoundLabel(ALT_TAB_ROUNDS + " kontrol šéfa");
  context.stage.innerHTML = `
    <div class="alttab-shell">
      <div class="alttab-topline">
        <div class="alttab-rounds" role="group" aria-label="Průběh kol"></div>
        <strong class="alttab-score">0 bodů</strong>
      </div>
      <div class="alttab-monitor" data-state="working">
        <div class="monitor-chrome"><i></i><i></i><i></i><span>Q4_vysledky_FINAL_opravdu.xlsx</span></div>
        <div class="monitor-work">
          <div class="fake-sheet" aria-hidden="true">
            <b>A</b><b>B</b><b>C</b><b>D</b><b>E</b>
            <span>Q4</span><span>128</span><span>?</span><span>☕</span><span>#REF!</span>
            <span>KPI</span><span>42 %</span><span>👍</span><span>0</span><span>brzy</span>
            <span>ROI</span><span>∞</span><span>📈</span><span>ano</span><span>možná</span>
          </div>
          <div class="alttab-alert" role="status" aria-live="assertive">
            <span class="alttab-alert-icon" aria-hidden="true">⌛</span>
            <div><strong>Pracuj nenápadně</strong><small>Reaguj jen, když se objeví šéf.</small></div>
          </div>
        </div>
      </div>
      <button class="alttab-button" type="button"><span>ALT + TAB</span><small>nebo mezerník</small></button>
      <p class="alttab-feedback" role="status" aria-live="polite">Až přijde šéf, zachraň tabulku. Ostatní notifikace ignoruj.</p>
    </div>`;

  const monitor = context.stage.querySelector(".alttab-monitor");
  const alert = context.stage.querySelector(".alttab-alert");
  const alertIcon = context.stage.querySelector(".alttab-alert-icon");
  const alertTitle = alert.querySelector("strong");
  const alertCopy = alert.querySelector("small");
  const button = context.stage.querySelector(".alttab-button");
  const feedback = context.stage.querySelector(".alttab-feedback");
  const scoreLabel = context.stage.querySelector(".alttab-score");
  const roundPips = context.stage.querySelector(".alttab-rounds");

  rounds.forEach(function (_, index) {
    const pip = document.createElement("i");
    pip.setAttribute("aria-hidden", "true");
    roundPips.append(pip);
  });

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  }

  function updateScore() {
    scoreLabel.textContent = score + " " + pointsWord(score);
    context.publishScore(score);
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    button.disabled = true;
    monitor.dataset.state = "done";
    alertIcon.textContent = "✅";
    alertTitle.textContent = "Směna přežita";
    alertCopy.textContent = "Historie prohlížeče byla preventivně skartována.";
    feedback.textContent = "Hotovo. Šéf nic neviděl — nebo to aspoň profesionálně předstírá.";
    const average = reactions.length
      ? Math.round(reactions.reduce(function (total, value) { return total + value; }, 0) / reactions.length)
      : 0;
    context.finish({ score, reactions, mistakes, missed, average });
  }

  function resolveRound(outcome) {
    if (finished || (phase !== "waiting" && phase !== "signal")) return;
    const round = rounds[roundIndex];
    let successful = false;
    let delta = 0;

    if (phase === "waiting") {
      mistakes += 1;
      feedback.textContent = "Předčasně! Tohle byl jen kolega jdoucí pro kávu.";
      monitor.dataset.state = "mistake";
    } else if (round.kind === "boss" && outcome === "press") {
      const reaction = Math.max(0, Math.round(performance.now() - shownAt));
      reactions.push(reaction);
      delta = altTabReactionScore(reaction);
      score += delta;
      successful = true;
      feedback.textContent = reaction + " ms · +" + delta + " bodů. Tabulka zachráněna!";
      monitor.dataset.state = "success";
    } else if (round.kind === "safe" && outcome === "timeout") {
      delta = 350;
      score += delta;
      successful = true;
      feedback.textContent = "+350 bodů · Slack úspěšně ignorován.";
      monitor.dataset.state = "success";
    } else if (round.kind === "boss") {
      missed += 1;
      feedback.textContent = "Pozdě! Šéf právě viděl otevřený turnaj v curlingu.";
      monitor.dataset.state = "mistake";
    } else {
      mistakes += 1;
      feedback.textContent = "Past! Kvůli běžné zprávě ses prozradil úplně sám.";
      monitor.dataset.state = "mistake";
    }

    phase = "resolved";
    roundPips.children[roundIndex].classList.add(successful ? "is-good" : "is-bad");
    updateScore();

    if (roundIndex + 1 >= rounds.length) {
      schedule(finish, 850);
    } else {
      schedule(beginRound, 800);
    }
  }

  function showSignal(expectedRound) {
    if (finished || phase !== "waiting" || roundIndex !== expectedRound) return;
    const round = rounds[roundIndex];
    phase = "signal";
    shownAt = performance.now();

    if (round.kind === "boss") {
      monitor.dataset.state = "boss";
      alertIcon.textContent = "👔";
      alertTitle.textContent = "ŠÉF ZA ZÁDY!";
      alertCopy.textContent = "Teď! Přepni na důležitě vypadající tabulku.";
    } else {
      monitor.dataset.state = "safe";
      alertIcon.textContent = "💬";
      alertTitle.textContent = "Slack: oběd?";
      alertCopy.textContent = "Tohle není šéf. Zachovej chladnou hlavu.";
    }

    schedule(function () {
      if (roundIndex === expectedRound) resolveRound("timeout");
    }, round.window);
  }

  function beginRound() {
    if (finished) return;
    roundIndex += 1;
    phase = "waiting";
    monitor.dataset.state = "working";
    alertIcon.textContent = "⌛";
    alertTitle.textContent = "Kolo " + (roundIndex + 1) + " z " + rounds.length;
    alertCopy.textContent = "Pracuj nenápadně a čekej…";
    feedback.textContent = "Ruce v pohotovosti. Panika až na povel.";
    roundPips.children[roundIndex].classList.add("is-current");
    const expectedRound = roundIndex;
    schedule(function () { showSignal(expectedRound); }, rounds[roundIndex].wait);
  }

  function press() {
    if (finished || phase === "resolved" || phase === "idle") return;
    resolveRound("press");
  }

  function onKeyDown(event) {
    if (event.code !== "Space") return;
    event.preventDefault();
    press();
  }

  button.addEventListener("click", press);
  window.addEventListener("keydown", onKeyDown);
  schedule(beginRound, 450);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      button.removeEventListener("click", press);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}
