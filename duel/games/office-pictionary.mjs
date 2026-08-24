import { createRng } from "../game-core.mjs";
import { defineGame, normalizeScoreResult, safeSmallInteger } from "./shared.mjs";

export const officePictionaryGame = defineGame({
  id: "pictionary",
  meta: {
    icon: "🎨",
    title: "Kancelářský Pictionary",
    teaser: "Nakresli zadání a poznej soupeřovo dílo",
    difficulty: "kreslení",
    instruction: "Nakresli vlastní pojem a potom poznej soupeřův obrázek. Písmena a číslice jsou zakázaná.",
    scoreLabel: "bodů za umění"
  },
  start: startOfficePictionary,
  result: {
    mode: "shared",
    normalize: normalizeResult,
    format: formatResult
  }
});

function normalizeResult(result) {
  const normalized = normalizeScoreResult(result, 3000);
  if (!normalized) return null;
  normalized.guessed = safeSmallInteger(result.guessed, 3);
  normalized.understood = safeSmallInteger(result.understood, 3);
  normalized.rounds = safeSmallInteger(result.rounds, 3);
  return normalized;
}

function formatResult(result) {
  const rounds = result.rounds || 3;
  return result.guessed + "/" + rounds + " uhádnuto · "
    + result.understood + "/" + rounds + " obrázků rozpoznáno";
}

export function startOfficePictionary(context) {
  const rounds = buildPictionaryRounds(context.seed);
  const promptById = new Map(PICTIONARY_PROMPTS.map(function (prompt) { return [prompt.id, prompt]; }));
  const localRole = context.localRole;
  const remoteRole = 1 - localRole;
  const isPractice = context.mode === "practice";
  const scores = [0, 0];
  const guessed = [0, 0];
  const understood = [0, 0];
  let pathsByRole = [[], []];
  let doneByRole = [false, false];
  let guessesByRole = [null, null];
  let guessSubmittedByRole = [false, false];
  let roundIndex = 0;
  let phase = "drawing";
  let remainingMs = PICTIONARY.drawDurationMs;
  let activePath = null;
  let finished = false;
  let transitionTimer = 0;
  let lastTick = performance.now();

  context.setRoundLabel(rounds.length + " kola kreslení");
  context.stage.innerHTML = `
    <div class="pictionary-shell">
      <div class="pictionary-topline">
        <div class="pictionary-rounds" aria-label="Průběh kol"></div>
        <div class="pictionary-timer" aria-label="Zbývající čas"><span>35</span> s</div>
      </div>
      <div class="pictionary-brief">
        <span class="eyebrow">Tvoje zadání</span>
        <h3 class="pictionary-prompt">Připravuji kreativní krizi…</h3>
        <p class="pictionary-instruction">Nakresli pojem bez písmen a číslic.</p>
      </div>
      <div class="pictionary-board-wrap">
        <canvas class="pictionary-canvas" width="${PICTIONARY.width}" height="${PICTIONARY.height}" aria-label="Kreslicí plocha"></canvas>
      </div>
      <div class="pictionary-toolbar">
        <button type="button" class="pictionary-clear" data-pictionary-action="clear">↶ Smazat</button>
        <button type="button" class="pictionary-done" data-pictionary-action="done">✓ Hotovo</button>
      </div>
      <div class="pictionary-choices" role="group" aria-label="Možnosti odpovědi" hidden></div>
      <p class="pictionary-feedback" role="status" aria-live="polite">Kresli výrazně. Umělecká licence je povolená.</p>
    </div>`;

  const shell = context.stage.querySelector(".pictionary-shell");
  const roundDots = context.stage.querySelector(".pictionary-rounds");
  const timer = context.stage.querySelector(".pictionary-timer");
  const timerValue = timer.querySelector("span");
  const briefLabel = context.stage.querySelector(".pictionary-brief .eyebrow");
  const prompt = context.stage.querySelector(".pictionary-prompt");
  const instruction = context.stage.querySelector(".pictionary-instruction");
  const canvas = context.stage.querySelector(".pictionary-canvas");
  const drawing = canvas.getContext("2d");
  const toolbar = context.stage.querySelector(".pictionary-toolbar");
  const clearButton = context.stage.querySelector("[data-pictionary-action=\"clear\"]");
  const doneButton = context.stage.querySelector("[data-pictionary-action=\"done\"]");
  const choices = context.stage.querySelector(".pictionary-choices");
  const feedback = context.stage.querySelector(".pictionary-feedback");
  const previousRenderGameToText = window.render_game_to_text;
  const previousAdvanceTime = window.advanceTime;

  rounds.forEach(function (_, index) {
    const dot = document.createElement("i");
    dot.setAttribute("aria-label", "Kolo " + (index + 1));
    roundDots.append(dot);
  });

  function labelFor(promptId) {
    const item = promptById.get(promptId);
    return item ? item.label : "Neznámý korporátní koncept";
  }

  function canvasPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
    ];
  }

  function drawPath(path) {
    if (!Array.isArray(path) || path.length < 2) return;
    drawing.beginPath();
    drawing.moveTo(path[0][0] * canvas.width, path[0][1] * canvas.height);
    for (let index = 1; index < path.length; index += 1) {
      drawing.lineTo(path[index][0] * canvas.width, path[index][1] * canvas.height);
    }
    drawing.stroke();
  }

  function renderCanvas() {
    drawing.clearRect(0, 0, canvas.width, canvas.height);
    drawing.fillStyle = "#fffdf7";
    drawing.fillRect(0, 0, canvas.width, canvas.height);
    drawing.strokeStyle = "rgba(7, 26, 61, .075)";
    drawing.lineWidth = 1;
    for (let x = 30; x < canvas.width; x += 30) {
      drawing.beginPath();
      drawing.moveTo(x, 0);
      drawing.lineTo(x, canvas.height);
      drawing.stroke();
    }
    for (let y = 30; y < canvas.height; y += 30) {
      drawing.beginPath();
      drawing.moveTo(0, y);
      drawing.lineTo(canvas.width, y);
      drawing.stroke();
    }
    drawing.strokeStyle = "#071a3d";
    drawing.lineWidth = 7;
    drawing.lineCap = "round";
    drawing.lineJoin = "round";
    const shownRole = phase === "drawing" || phase === "waiting-drawing" ? localRole : remoteRole;
    pathsByRole[shownRole].forEach(drawPath);
    if (shownRole === localRole && activePath) drawPath(activePath);
  }

  function renderTimer() {
    timerValue.textContent = String(Math.max(0, Math.ceil(remainingMs / 1000)));
    timer.classList.toggle("is-urgent", remainingMs <= 7000 && phase !== "resolved");
  }

  function renderScores() {
    context.setScores(scores[localRole], scores[remoteRole]);
  }

  function sanitizePath(value) {
    if (!Array.isArray(value)) return null;
    const path = value.slice(0, 240).map(function (point) {
      if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
      return [Math.min(1, Math.max(0, point[0])), Math.min(1, Math.max(0, point[1]))];
    }).filter(Boolean);
    return path.length >= 2 ? path : null;
  }

  function localDrawingHasEnoughInk() {
    const localPaths = pathsByRole[localRole];
    let length = 0;
    localPaths.forEach(function (path) {
      for (let index = 1; index < path.length; index += 1) {
        length += Math.hypot(path[index][0] - path[index - 1][0], path[index][1] - path[index - 1][1]);
      }
    });
    return localPaths.length >= 2 && length >= 0.75;
  }

  function chooseBotGuess() {
    const round = rounds[roundIndex];
    const answer = round.prompts[localRole];
    const botChoices = round.choices[remoteRole];
    return localDrawingHasEnoughInk()
      ? answer
      : botChoices.find(function (choice) { return choice !== answer; });
  }

  function startRound(index) {
    if (finished || index < 0 || index >= rounds.length) return;
    window.clearTimeout(transitionTimer);
    roundIndex = index;
    phase = "drawing";
    remainingMs = PICTIONARY.drawDurationMs;
    pathsByRole = [[], []];
    doneByRole = [false, false];
    guessesByRole = [null, null];
    guessSubmittedByRole = [false, false];
    activePath = null;
    choices.replaceChildren();
    choices.hidden = true;
    toolbar.hidden = false;
    clearButton.disabled = false;
    doneButton.disabled = false;
    canvas.classList.remove("is-readonly");
    briefLabel.textContent = "Tvoje zadání";
    prompt.textContent = labelFor(rounds[roundIndex].prompts[localRole]);
    instruction.textContent = "Nakresli pojem bez písmen a číslic. Soupeř obrázek uvidí až při hádání.";
    feedback.textContent = "Kresli výrazně. Umělecká licence je povolená.";
    roundDots.querySelectorAll("i").forEach(function (dot, dotIndex) {
      dot.className = dotIndex < roundIndex ? "is-done" : dotIndex === roundIndex ? "is-current" : "";
    });

    if (isPractice) {
      pathsByRole[remoteRole] = buildBotPictionaryPaths(rounds[roundIndex].prompts[remoteRole]);
      doneByRole[remoteRole] = true;
    }

    renderTimer();
    renderCanvas();
  }

  function finishDrawing() {
    if (finished || phase !== "drawing" || doneByRole[localRole]) return;
    if (activePath) endPath();
    doneByRole[localRole] = true;
    phase = "waiting-drawing";
    clearButton.disabled = true;
    doneButton.disabled = true;
    canvas.classList.add("is-readonly");
    feedback.textContent = doneByRole[remoteRole]
      ? "Oba obrázky jsou ve schvalovacím procesu…"
      : "Obrázek odevzdán. Čekám na soupeřovo mistrovské dílo…";
    if (!isPractice) context.send({ type: "game:pictionary-done", round: roundIndex });
    if (isPractice) {
      guessesByRole[remoteRole] = chooseBotGuess();
      guessSubmittedByRole[remoteRole] = true;
    }
    maybeStartGuessing();
  }

  function maybeStartGuessing() {
    if (!doneByRole[0] || !doneByRole[1] || (phase !== "drawing" && phase !== "waiting-drawing")) return;
    const round = rounds[roundIndex];
    phase = "guessing";
    remainingMs = PICTIONARY.guessDurationMs;
    toolbar.hidden = true;
    choices.hidden = false;
    canvas.classList.add("is-readonly");
    briefLabel.textContent = "Soupeřův obrázek";
    prompt.textContent = "Co je na obrázku?";
    instruction.textContent = "Vyber jednu možnost. Za správný tip získáš 300 bodů.";
    feedback.textContent = "Za srozumitelný vlastní obrázek můžeš získat dalších 700 bodů.";

    round.choices[localRole].forEach(function (promptId) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.pictionaryChoice = promptId;
      button.textContent = labelFor(promptId);
      choices.append(button);
    });
    renderTimer();
    renderCanvas();
    const firstChoice = choices.querySelector("button");
    if (firstChoice) firstChoice.focus({ preventScroll: true });
  }

  function submitGuess(promptId) {
    if (finished || phase !== "guessing" || guessSubmittedByRole[localRole]) return;
    const allowed = rounds[roundIndex].choices[localRole];
    const choice = allowed.includes(promptId) ? promptId : null;
    guessesByRole[localRole] = choice;
    guessSubmittedByRole[localRole] = true;
    choices.querySelectorAll("button").forEach(function (button) { button.disabled = true; });
    feedback.textContent = choice ? "Tip odeslán. Čekám na verdikt z druhého stolu…" : "Čas vypršel. Čekám na soupeře…";
    if (!isPractice) context.send({ type: "game:pictionary-guess", round: roundIndex, choice });
    maybeResolveRound();
  }

  function maybeResolveRound() {
    if (phase !== "guessing" || !guessSubmittedByRole[0] || !guessSubmittedByRole[1]) return;
    const round = rounds[roundIndex];
    const correctByRole = [
      guessesByRole[0] === round.prompts[1],
      guessesByRole[1] === round.prompts[0]
    ];
    const roundScores = calculatePictionaryRoundScores(correctByRole);
    scores[0] += roundScores[0];
    scores[1] += roundScores[1];
    correctByRole.forEach(function (correct, role) {
      if (correct) guessed[role] += 1;
      if (correct) understood[1 - role] += 1;
    });
    phase = "resolved";
    remainingMs = 0;
    renderScores();
    renderTimer();
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add("is-done");
    choices.querySelectorAll("button").forEach(function (button) {
      button.classList.toggle("is-correct", button.dataset.pictionaryChoice === round.prompts[remoteRole]);
      button.classList.toggle("is-wrong", button.dataset.pictionaryChoice === guessesByRole[localRole]
        && guessesByRole[localRole] !== round.prompts[remoteRole]);
    });
    const ownGuess = correctByRole[localRole] ? "Tip správně." : "Správně bylo „" + labelFor(round.prompts[remoteRole]) + "“.";
    const ownDrawing = correctByRole[remoteRole] ? " Soupeř tvůj obrázek poznal." : " Soupeř tvůj obrázek nepoznal.";
    feedback.textContent = ownGuess + ownDrawing + " +" + roundScores[localRole] + " bodů.";

    if (roundIndex === rounds.length - 1) {
      transitionTimer = window.setTimeout(finishGame, 2100);
      return;
    }
    if (isPractice || localRole === 0) {
      transitionTimer = window.setTimeout(function () {
        const nextRound = roundIndex + 1;
        if (!isPractice) context.send({ type: "game:pictionary-next", round: nextRound });
        startRound(nextRound);
      }, 2300);
    }
  }

  function finishGame() {
    if (finished) return;
    finished = true;
    context.finishShared([0, 1].map(function (role) {
      return {
        score: scores[role],
        guessed: guessed[role],
        understood: understood[role],
        rounds: rounds.length
      };
    }));
  }

  function beginPath(event) {
    if (phase !== "drawing" || doneByRole[localRole] || event.button !== 0) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    activePath = [canvasPoint(event)];
  }

  function extendPath(event) {
    if (!activePath || phase !== "drawing") return;
    event.preventDefault();
    const point = canvasPoint(event);
    const previous = activePath[activePath.length - 1];
    if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) < 0.004) return;
    activePath.push(point);
    renderCanvas();
  }

  function endPath(event) {
    if (!activePath) return;
    if (event) event.preventDefault();
    const path = activePath;
    activePath = null;
    if (path.length < 2 || pathsByRole[localRole].length >= 80) {
      renderCanvas();
      return;
    }
    pathsByRole[localRole].push(path);
    if (!isPractice) context.send({ type: "game:pictionary-path", round: roundIndex, path });
    renderCanvas();
  }

  function clearDrawing() {
    if (phase !== "drawing" || doneByRole[localRole]) return;
    pathsByRole[localRole] = [];
    activePath = null;
    if (!isPractice) context.send({ type: "game:pictionary-clear", round: roundIndex });
    renderCanvas();
    feedback.textContent = "Čistý list, čisté svědomí. Zatím.";
  }

  function stepTime(milliseconds) {
    if (finished || (phase !== "drawing" && phase !== "guessing")) return;
    const elapsed = Math.min(remainingMs, Math.max(0, Number(milliseconds) || 0));
    remainingMs -= elapsed;
    renderTimer();
    if (remainingMs > 0) return;
    if (phase === "drawing") finishDrawing();
    else submitGuess(null);
  }

  function renderGameToText() {
    const round = rounds[roundIndex];
    return JSON.stringify({
      game: "pictionary",
      coordinateSystem: "canvas: origin top-left, x right, y down, normalized 0..1",
      mode: context.mode,
      phase,
      round: roundIndex + 1,
      rounds: rounds.length,
      localRole,
      prompt: phase === "drawing" ? labelFor(round.prompts[localRole]) : null,
      remainingMs: Math.round(remainingMs),
      strokes: { local: pathsByRole[localRole].length, remote: pathsByRole[remoteRole].length },
      done: { local: doneByRole[localRole], remote: doneByRole[remoteRole] },
      choices: phase === "guessing" ? round.choices[localRole].map(labelFor) : [],
      scores: { local: scores[localRole], remote: scores[remoteRole] },
      feedback: feedback.textContent
    });
  }

  function receiveNetwork(message) {
    if (!message || !Number.isInteger(message.round)) return;
    if (message.type === "game:pictionary-next") {
      if (localRole === 1 && message.round === roundIndex + 1 && phase === "resolved") startRound(message.round);
      return;
    }
    if (message.round !== roundIndex || finished) return;
    if (message.type === "game:pictionary-path" && !doneByRole[remoteRole] && pathsByRole[remoteRole].length < 80) {
      const path = sanitizePath(message.path);
      if (path) pathsByRole[remoteRole].push(path);
      return;
    }
    if (message.type === "game:pictionary-clear" && !doneByRole[remoteRole]) {
      pathsByRole[remoteRole] = [];
      return;
    }
    if (message.type === "game:pictionary-done" && !doneByRole[remoteRole]) {
      doneByRole[remoteRole] = true;
      maybeStartGuessing();
      return;
    }
    if (message.type === "game:pictionary-guess" && !guessSubmittedByRole[remoteRole]) {
      const allowed = rounds[roundIndex].choices[remoteRole];
      guessesByRole[remoteRole] = allowed.includes(message.choice) ? message.choice : null;
      guessSubmittedByRole[remoteRole] = true;
      maybeResolveRound();
    }
  }

  function onToolbarClick(event) {
    const button = event.target.closest("[data-pictionary-action]");
    if (!button) return;
    if (button.dataset.pictionaryAction === "clear") clearDrawing();
    if (button.dataset.pictionaryAction === "done") finishDrawing();
  }

  function onChoiceClick(event) {
    const button = event.target.closest("[data-pictionary-choice]");
    if (button) submitGuess(button.dataset.pictionaryChoice);
  }

  function onKeyDown(event) {
    if (event.key.toLowerCase() !== "f" || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    event.preventDefault();
    if (document.fullscreenElement) document.exitFullscreen();
    else if (context.stage.requestFullscreen) context.stage.requestFullscreen();
  }

  canvas.addEventListener("pointerdown", beginPath);
  canvas.addEventListener("pointermove", extendPath);
  canvas.addEventListener("pointerup", endPath);
  canvas.addEventListener("pointercancel", endPath);
  toolbar.addEventListener("click", onToolbarClick);
  choices.addEventListener("click", onChoiceClick);
  window.addEventListener("keydown", onKeyDown);
  window.render_game_to_text = renderGameToText;
  window.advanceTime = stepTime;
  renderScores();
  startRound(0);

  const tickTimer = window.setInterval(function () {
    const now = performance.now();
    const elapsed = now - lastTick;
    lastTick = now;
    stepTime(elapsed);
  }, 100);

  return {
    receiveNetwork,
    cleanup: function () {
      finished = true;
      window.clearInterval(tickTimer);
      window.clearTimeout(transitionTimer);
      canvas.removeEventListener("pointerdown", beginPath);
      canvas.removeEventListener("pointermove", extendPath);
      canvas.removeEventListener("pointerup", endPath);
      canvas.removeEventListener("pointercancel", endPath);
      toolbar.removeEventListener("click", onToolbarClick);
      choices.removeEventListener("click", onChoiceClick);
      window.removeEventListener("keydown", onKeyDown);
      if (window.render_game_to_text === renderGameToText) {
        if (previousRenderGameToText) window.render_game_to_text = previousRenderGameToText;
        else delete window.render_game_to_text;
      }
      if (window.advanceTime === stepTime) {
        if (previousAdvanceTime) window.advanceTime = previousAdvanceTime;
        else delete window.advanceTime;
      }
    }
  };
}

function buildBotPictionaryPaths(promptId) {
  function path() { return Array.from(arguments); }
  function rectangle(x, y, width, height) {
    return path([x, y], [x + width, y], [x + width, y + height], [x, y + height], [x, y]);
  }
  function ellipse(cx, cy, rx, ry, steps = 18) {
    return Array.from({ length: steps + 1 }, function (_, index) {
      const angle = index / steps * Math.PI * 2;
      return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
    });
  }

  const drawings = {
    coffee: [rectangle(.28, .34, .34, .34), ellipse(.63, .49, .11, .13), path([.36, .28], [.33, .21], [.37, .13]), path([.47, .28], [.44, .2], [.48, .11])],
    printer: [rectangle(.25, .3, .5, .36), rectangle(.32, .12, .36, .24), rectangle(.33, .53, .34, .28), path([.32, .4], [.68, .4])],
    chair: [rectangle(.35, .2, .3, .27), path([.33, .52], [.67, .52]), path([.5, .52], [.5, .75]), path([.5, .75], [.32, .84]), path([.5, .75], [.68, .84]), path([.37, .52], [.34, .68]), path([.63, .52], [.66, .68])],
    plane: [path([.16, .53], [.83, .22], [.61, .76], [.48, .55], [.16, .53]), path([.48, .55], [.83, .22]), path([.48, .55], [.52, .72])],
    calendar: [rectangle(.25, .16, .5, .66), path([.25, .31], [.75, .31]), path([.35, .13], [.35, .24]), path([.65, .13], [.65, .24]), path([.42, .31], [.42, .82]), path([.58, .31], [.58, .82]), path([.25, .48], [.75, .48]), path([.25, .65], [.75, .65])],
    laptop: [rectangle(.25, .16, .5, .46), path([.25, .68], [.17, .79], [.83, .79], [.75, .68], [.25, .68]), path([.43, .73], [.57, .73])],
    headphones: [path([.27, .53], [.27, .39], [.31, .25], [.4, .17], [.5, .14], [.6, .17], [.69, .25], [.73, .39], [.73, .53]), rectangle(.2, .49, .15, .27), rectangle(.65, .49, .15, .27)],
    plant: [path([.34, .59], [.66, .59], [.61, .82], [.39, .82], [.34, .59]), path([.5, .59], [.5, .27]), ellipse(.42, .34, .13, .08), ellipse(.59, .28, .13, .08), ellipse(.55, .47, .14, .08)],
    keyboard: [rectangle(.16, .25, .68, .5), path([.16, .42], [.84, .42]), path([.16, .59], [.84, .59]), path([.32, .25], [.32, .59]), path([.48, .25], [.48, .59]), path([.64, .25], [.64, .59]), path([.33, .68], [.67, .68])],
    meeting: [ellipse(.5, .55, .27, .13), ellipse(.24, .28, .07, .09), ellipse(.5, .22, .07, .09), ellipse(.76, .28, .07, .09), path([.24, .37], [.3, .51]), path([.5, .31], [.5, .42]), path([.76, .37], [.7, .51])],
    email: [rectangle(.18, .23, .64, .54), path([.18, .23], [.5, .52], [.82, .23]), path([.18, .77], [.4, .48]), path([.82, .77], [.6, .48])],
    deadline: [ellipse(.5, .47, .27, .31), path([.5, .47], [.5, .25]), path([.5, .47], [.67, .56]), path([.34, .13], [.27, .22]), path([.66, .13], [.73, .22]), path([.36, .82], [.3, .89]), path([.64, .82], [.7, .89])]
  };
  return drawings[promptId] || [ellipse(.5, .5, .25, .25), path([.38, .44], [.43, .4]), path([.62, .44], [.57, .4]), path([.38, .62], [.5, .69], [.62, .62])];
}

export const PICTIONARY_ROUNDS = 3;

export const PICTIONARY = Object.freeze({
  width: 900,
  height: 480,
  drawDurationMs: 35_000,
  guessDurationMs: 18_000,
  drawingPoints: 700,
  guessingPoints: 300
});

export const PICTIONARY_PROMPTS = Object.freeze([
  Object.freeze({ id: "coffee", label: "Hrnek kávy" }),
  Object.freeze({ id: "printer", label: "Tiskárna" }),
  Object.freeze({ id: "chair", label: "Kancelářská židle" }),
  Object.freeze({ id: "plane", label: "Papírová vlaštovka" }),
  Object.freeze({ id: "calendar", label: "Kalendář" }),
  Object.freeze({ id: "laptop", label: "Notebook" }),
  Object.freeze({ id: "headphones", label: "Sluchátka" }),
  Object.freeze({ id: "plant", label: "Květina v kanceláři" }),
  Object.freeze({ id: "keyboard", label: "Klávesnice" }),
  Object.freeze({ id: "meeting", label: "Meeting" }),
  Object.freeze({ id: "email", label: "E-mail" }),
  Object.freeze({ id: "deadline", label: "Deadline" })
]);

export function buildPictionaryRounds(seed, count = PICTIONARY_ROUNDS) {
  const random = createRng("pictionary:" + seed);
  const promptIds = PICTIONARY_PROMPTS.map(function (prompt) { return prompt.id; });

  function shuffle(values) {
    const shuffled = values.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      const value = shuffled[index];
      shuffled[index] = shuffled[swapIndex];
      shuffled[swapIndex] = value;
    }
    return shuffled;
  }

  const deck = shuffle(promptIds);
  const roundCount = Math.min(Math.max(0, count), Math.floor(deck.length / 2));

  return Array.from({ length: roundCount }, function (_, roundIndex) {
    const prompts = [deck[roundIndex * 2], deck[roundIndex * 2 + 1]];
    const choices = [0, 1].map(function (guesserRole) {
      const answer = prompts[1 - guesserRole];
      const distractors = shuffle(promptIds.filter(function (promptId) {
        return promptId !== answer && promptId !== prompts[guesserRole];
      })).slice(0, 3);
      return shuffle([answer].concat(distractors));
    });

    return { id: roundIndex, prompts, choices };
  });
}

export function calculatePictionaryRoundScores(correctByRole) {
  const firstCorrect = Boolean(correctByRole && correctByRole[0]);
  const secondCorrect = Boolean(correctByRole && correctByRole[1]);
  return [
    (firstCorrect ? PICTIONARY.guessingPoints : 0) + (secondCorrect ? PICTIONARY.drawingPoints : 0),
    (secondCorrect ? PICTIONARY.guessingPoints : 0) + (firstCorrect ? PICTIONARY.drawingPoints : 0)
  ];
}
