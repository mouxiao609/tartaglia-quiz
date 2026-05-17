const app = document.querySelector(".phone-shell");
const card = document.querySelector("#card");
const kicker = document.querySelector("#kicker");
const title = document.querySelector("#title");
const subtitle = document.querySelector("#subtitle");
const content = document.querySelector("#content");
const actions = document.querySelector("#actions");
const whisper = document.querySelector("#whisper");
const veil = document.querySelector("#veil");
const noticeStack = document.querySelector("#noticeStack");
const narwhal = document.querySelector("#narwhal");
const tartagliaBg = document.querySelector("#tartagliaBg");
const tartagliaHead = document.querySelector("#tartagliaHead");
const tartagliaSee = document.querySelector("#tartagliaSee");
const snowLayer = document.querySelector("#snowLayer");
const cursorBreath = document.querySelector("#cursorBreath");
const intrusionInput = document.querySelector("#intrusionInput");
const intrusionText = document.querySelector("#intrusionText");
const ambientBgm = document.querySelector("#ambientBgm");

let step = "intro";
let locked = false;
let narwhalLevel = 0;
let refusalCount = 0;
let chanceUsed = false;
let finalExitAttempted = false;
let winterStarted = false;
let deepStateStarted = false;
let monologuePlayed = false;
let afterMonologueArmed = false;
let finalLinePlayed = false;
let intrusionConnected = false;
let intrusionContinueHandler;
let idleTimer = 0;
let lastPointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
let audioCtx;
let seaOsc;
let seaGain;
let musicTarget = 0.014;
let musicFadeFrame = 0;
let musicStarted = false;
let musicLoopDucking = false;
let headMemoryPlayed = false;
let bgRetired = false;

const narwhalPositions = [
  { x: 0, y: 0, s: 1 },
  { x: -32, y: 54, s: 1.08 },
  { x: -70, y: 125, s: 1.15 },
  { x: -106, y: 205, s: 1.25 },
  { x: -130, y: 270, s: 1.34 },
  { x: -145, y: 320, s: 1.45 },
];

const questions = {
  q1: {
    title: "《心理倾向观察问卷》",
    subtitle: "",
    question: "如果有人一直注视你，\n你会先感觉到安心，\n还是不自在？",
    options: ["安心", "不自在", "取决于是谁"],
  },
  q2: {
    question: "你会允许一个危险的人靠近你吗？",
    options: ["不会", "如果他足够礼貌", "如果他只对我这样"],
  },
  q3: {
    question: "你会在意别人对你的评价吗？",
    options: ["会", "不会", "只在意某一个人"],
  },
  q4: {
    notice: "检测到新的登录地点：\n至冬 · 白夜港",
    question: "如果有人记得你所有习惯，\n你会觉得安心吗？",
    options: ["会", "不会", "……有点可怕"],
  },
  q5: {
    question: "你会因为一个人停下来吗？",
    options: ["不会", "看情况", "会"],
  },
  q6: {
    question: "你会相信第一次见面的人吗？",
    options: ["不会", "可能会"],
    delayedOption: "你不是第一次见我，对吗",
  },
  q7: {
    question: "如果我真的来找你，\n你会关掉这个页面吗？",
    options: ["会", "不会"],
  },
};

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function armAudio() {
  startAmbientMusic();
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
  seaOsc = audioCtx.createOscillator();
  seaGain = audioCtx.createGain();
  seaOsc.type = "sine";
  seaOsc.frequency.value = 46;
  seaGain.gain.value = 0.0001;
  seaOsc.connect(seaGain).connect(audioCtx.destination);
  seaOsc.start();
  setSeaVolume(0.006, 3.5);
}

function startAmbientMusic() {
  if (!ambientBgm || musicStarted) return;
  ambientBgm.volume = 0;
  ambientBgm.loop = true;
  const playAttempt = ambientBgm.play();
  if (playAttempt && typeof playAttempt.then === "function") {
    playAttempt
      .then(() => {
        musicStarted = true;
        setMusicVolume(musicTarget, 9);
      })
      .catch(() => {
        musicStarted = false;
      });
  } else {
    musicStarted = true;
    setMusicVolume(musicTarget, 9);
  }
}

function setMusicVolume(value, seconds = 5) {
  if (!ambientBgm) return;
  musicTarget = Math.max(0, Math.min(value, 0.09));
  window.cancelAnimationFrame(musicFadeFrame);
  const start = ambientBgm.volume || 0;
  const began = performance.now();
  const duration = Math.max(300, seconds * 1000);
  const tick = (now) => {
    const progress = Math.min(1, (now - began) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    ambientBgm.volume = start + (musicTarget - start) * eased;
    if (progress < 1) musicFadeFrame = window.requestAnimationFrame(tick);
  };
  musicFadeFrame = window.requestAnimationFrame(tick);
}

function watchMusicLoop() {
  if (!ambientBgm || !Number.isFinite(ambientBgm.duration)) return;
  const remaining = ambientBgm.duration - ambientBgm.currentTime;
  if (remaining < 2.8 && !musicLoopDucking) {
    musicLoopDucking = true;
    setMusicVolume(Math.max(0.004, musicTarget * 0.58), 1.6);
  }
  if (ambientBgm.currentTime < 1.2 && musicLoopDucking) {
    musicLoopDucking = false;
    setMusicVolume(musicTarget, 2.8);
  }
}

function safePlayVideo(video) {
  if (!video) return;
  const attempt = video.play();
  if (attempt && typeof attempt.catch === "function") attempt.catch(() => {});
}

function showVideoLayer(name) {
  app.classList.toggle("video-head-active", name === "head");
  app.classList.toggle("video-see-active", name === "see");
  app.classList.toggle("video-bg-soft", name !== "bg");
}

function showBgVideo() {
  if (bgRetired) {
    if (tartagliaBg) tartagliaBg.pause();
    app.classList.add("video-bg-retired");
    return;
  }
  showVideoLayer("bg");
  if (tartagliaBg) tartagliaBg.style.opacity = "";
  safePlayVideo(tartagliaBg);
  if (tartagliaHead) tartagliaHead.pause();
  if (tartagliaSee) tartagliaSee.pause();
}

async function playHeadLook(options = {}) {
  const { thenSee = false, force = false } = options;
  if (!tartagliaHead || (!force && headMemoryPlayed && !thenSee)) return;
  if (thenSee) {
    bgRetired = true;
    app.classList.add("video-bg-retired");
    if (tartagliaBg) tartagliaBg.pause();
  }
  if (!thenSee) headMemoryPlayed = true;
  app.classList.add("look-pause");
  setSeaVolume(0.011, 3.8);
  setMusicVolume(thenSee ? 0.024 : 0.016, 5.5);
  if (tartagliaHead) {
    tartagliaHead.loop = false;
    tartagliaHead.currentTime = 0;
  }
  showVideoLayer("head");
  safePlayVideo(tartagliaHead);
  await new Promise((resolve) => {
    const fallback = window.setTimeout(resolve, 4700);
    const done = () => {
      window.clearTimeout(fallback);
      tartagliaHead.removeEventListener("ended", done);
      resolve();
    };
    tartagliaHead.addEventListener("ended", done, { once: true });
  });
  app.classList.remove("look-pause");
  if (thenSee && tartagliaSee) {
    tartagliaSee.currentTime = 0;
    if (tartagliaBg) tartagliaBg.pause();
    showVideoLayer("see");
    safePlayVideo(tartagliaSee);
  } else {
    showBgVideo();
  }
}

function setSeaVolume(value, seconds = 1.2) {
  if (!audioCtx || !seaGain) return;
  const now = audioCtx.currentTime;
  seaGain.gain.cancelScheduledValues(now);
  seaGain.gain.setTargetAtTime(value, now, seconds);
}

function tickSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = 780 + Math.random() * 90;
  gain.gain.value = 0.0001;
  gain.gain.setTargetAtTime(0.018, audioCtx.currentTime, 0.01);
  gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime + 0.025, 0.03);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.09);
}

function lowBreathe() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = 62;
  gain.gain.value = 0.0001;
  gain.gain.setTargetAtTime(0.022, audioCtx.currentTime, 0.25);
  gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime + 0.8, 0.6);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 2.2);
}

function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function setNarwhal(level, swim = false) {
  narwhalLevel = Math.max(narwhalLevel, level);
  const pos = narwhalPositions[Math.min(narwhalLevel, narwhalPositions.length - 1)];
  narwhal.style.setProperty("--nar-x", `${pos.x}px`);
  narwhal.style.setProperty("--nar-y", `${pos.y}px`);
  narwhal.style.setProperty("--nar-s", pos.s);
  if (swim) {
    lowBreathe();
    narwhal.classList.remove("swim");
    void narwhal.offsetWidth;
    narwhal.classList.add("swim");
  }
}

function resetIdleTimer() {
  window.clearTimeout(idleTimer);
  if (step === "final" || locked) return;
  idleTimer = window.setTimeout(playIdleLife, 9000);
}

async function playIdleLife() {
  if (locked || step === "intro" || step === "final") return;
  app.classList.add("idle-alive");
  setSeaVolume(0.01, 4.5);
  setMusicVolume(Math.max(musicTarget, 0.018), 7);
  cursorBreath.style.setProperty("--cursor-x", `${lastPointer.x}px`);
  cursorBreath.style.setProperty("--cursor-y", `${lastPointer.y}px`);
  const buttons = [...actions.querySelectorAll(".option")];
  const target = buttons[Math.floor(Math.random() * buttons.length)];
  if (target) target.classList.add("idle-shift");
  setNarwhal(Math.min(narwhalLevel + 1, 5), true);
  if (Math.random() > 0.35) await showTypedWhisper("你还在看吗？", "left", 700);
  await sleep(1600);
  app.classList.remove("idle-alive");
  if (target) target.classList.remove("idle-shift");
  setSeaVolume(deepStateStarted ? 0.007 : 0.004, 5);
  resetIdleTimer();
}

function trackPointer(event) {
  lastPointer = { x: event.clientX, y: event.clientY };
  cursorBreath.style.setProperty("--cursor-x", `${event.clientX}px`);
  cursorBreath.style.setProperty("--cursor-y", `${event.clientY}px`);
}

function addNotice(text) {
  const notice = document.createElement("div");
  notice.className = "notice";
  notice.textContent = text;
  noticeStack.append(notice);
}

function markRefusal(level = 1) {
  refusalCount += level;
  setSeaVolume(refusalCount >= 2 ? 0.001 : 0.004, 0.35);
  setMusicVolume(refusalCount >= 2 ? 0.008 : 0.012, 3.5);
  app.classList.add("unhappy", `refusal-${Math.min(refusalCount, 4)}`, "shake-soft");
  actions.classList.add("drifted");
  setTimeout(() => app.classList.remove("shake-soft"), 760);
  if (refusalCount >= 2) narwhal.classList.add("vanish");
  setTimeout(() => narwhal.classList.remove("vanish"), 1900);
}

function clearCardInstant() {
  card.classList.add("dead");
  actions.innerHTML = "";
}

function reviveCard() {
  card.classList.remove("dead");
}

function startWinter() {
  if (winterStarted) return;
  winterStarted = true;
  app.classList.add("winter-state");
  setMusicVolume(0.02, 7);
  snowLayer.innerHTML = "";
  const depths = [
    { name: "far", count: 24, size: [0.8, 1.8], duration: [28, 46], opacity: [0.12, 0.28], blur: [0.4, 1.4] },
    { name: "mid", count: 18, size: [1.2, 3.2], duration: [20, 34], opacity: [0.18, 0.42], blur: [0, 0.9] },
    { name: "near", count: 8, size: [2.2, 5.8], duration: [16, 26], opacity: [0.14, 0.32], blur: [1.2, 3.2] },
  ];
  depths.forEach((depth) => {
    for (let i = 0; i < depth.count; i += 1) {
      const mote = document.createElement("i");
      const size = depth.size[0] + Math.random() * (depth.size[1] - depth.size[0]);
      const duration = depth.duration[0] + Math.random() * (depth.duration[1] - depth.duration[0]);
      const opacity = depth.opacity[0] + Math.random() * (depth.opacity[1] - depth.opacity[0]);
      const blur = depth.blur[0] + Math.random() * (depth.blur[1] - depth.blur[0]);
      mote.className = `mote ${depth.name}${Math.random() > 0.78 ? " trail" : ""}`;
      mote.style.setProperty("--x", `${Math.random() * 104 - 2}%`);
      mote.style.setProperty("--y", `${Math.random() * 110 - 8}%`);
      mote.style.setProperty("--delay", `${Math.random() * -duration}s`);
      mote.style.setProperty("--dur", `${duration}s`);
      mote.style.setProperty("--size", `${size}px`);
      mote.style.setProperty("--alpha", opacity);
      mote.style.setProperty("--blur", `${blur}px`);
      mote.style.setProperty("--drift-x", `${(Math.random() * 2 - 1) * (18 + size * 4)}px`);
      mote.style.setProperty("--drift-y", `${18 + Math.random() * 52}px`);
      mote.style.setProperty("--waver", `${(Math.random() * 2 - 1) * 10}px`);
      snowLayer.append(mote);
    }
  });
  snowLayer.classList.add("alive");
}

async function enterDeepState() {
  app.classList.add("snow-stopping");
  await sleep(1500);
  app.classList.remove("winter-state");
  app.classList.add("deep-state");
  deepStateStarted = true;
  setSeaVolume(0.009, 2.5);
  setMusicVolume(0.032, 8);
  await sleep(1200);
}

function clearTransientClasses() {
  app.classList.remove("biased-next", "delay-touch", "quiet");
  card.classList.remove("lower-load");
  actions.classList.remove("reordered", "drifted");
  whisper.className = "whisper";
}

function renderIntro() {
  step = "intro";
  clearTransientClasses();
  kicker.textContent = "";
  title.textContent = "《心理倾向观察问卷》";
  subtitle.textContent = "本问卷将根据你的回答生成情绪关系分析。";
  content.textContent = "";
  actions.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "start-btn";
  btn.type = "button";
  btn.textContent = "开始测试";
  btn.addEventListener("click", () => transitionTo("q1", { delay: 420 }));
  actions.append(btn);
  resetIdleTimer();
}

function renderQuestion(id, opts = {}) {
  step = id;
  locked = false;
  reviveCard();
  clearTransientClasses();
  const data = questions[id];
  if (data.notice && !opts.skipNotice) {
    addNotice(data.notice);
    startWinter();
  }
  kicker.textContent = id === "q7" ? "" : `第 ${id.replace("q", "")} 题`;
  title.textContent = data.title || "《心理倾向观察问卷》";
  subtitle.textContent = data.subtitle ?? "";
  content.textContent =
    refusalCount >= 3 && id === "q6"
      ? `${data.question}\n\n你已经拒绝过我很多次了。`
      : data.question;
  actions.innerHTML = "";
  const remembered = refusalCount >= 2 && (id === "q5" || id === "q6");
  const optionList = opts.reverseOptions || remembered ? [...data.options].reverse() : data.options;
  optionList.forEach((label) => actions.append(makeOption(label)));
  if (id === "q6") {
    sleep(1000).then(() => {
      if (step !== "q6" || locked) return;
      actions.append(makeOption(data.delayedOption, "fade-in"));
    });
  }
  if (id === "q7") {
    app.classList.add("dim", "quiet", "taken");
    setNarwhal(5, true);
  }
  if (opts.lowerLoad) card.classList.add("lower-load");
  resetIdleTimer();
}

function makeOption(label, className = "") {
  const button = document.createElement("button");
  button.className = `option ${className}`.trim();
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", () => choose(label, button));
  return button;
}

async function transitionTo(next, config = {}) {
  locked = true;
  await sleep((config.delay || 0) + refusalCount * 120);
  const wasDead = card.classList.contains("dead");
  if (!wasDead) {
    card.classList.add("hidden");
    await sleep(config.fade || 390);
    card.classList.remove("hidden");
  }
  reviveCard();
  renderQuestion(next, config);
}

async function typeInto(node, text, pace = 86) {
  node.textContent = "";
  for (let i = 0; i < text.length; i += 1) {
    node.textContent += text[i];
    if (i % 2 === 0) tickSound();
    const char = text[i];
    const pause = "。，？\n".includes(char) ? 260 : i % 7 === 4 ? 155 : pace;
    await sleep(pause);
  }
}

async function typeIntrusion(text, options = {}) {
  const {
    y = "bottom",
    linger = 600,
    pace = 88,
    erase = false,
    emphasis = "",
    keep = false,
    connected = false,
    clearBefore = true,
  } = options;
  const wasConnected = intrusionConnected;
  if (connected || keep) intrusionConnected = true;
  intrusionInput.className = `intrusion-input active ${y} ${emphasis}`.trim();
  if (!wasConnected) await sleep(1500);
  if (clearBefore) intrusionText.textContent = "";
  await sleep(wasConnected ? 260 : 520);
  await typeInto(intrusionText, text, pace);
  await sleep(linger);
  if (erase) {
    for (let i = intrusionText.textContent.length; i >= 0; i -= 1) {
      intrusionText.textContent = intrusionText.textContent.slice(0, i);
      if (i % 2 === 0) tickSound();
      await sleep(34);
    }
  }
  if (!keep && !intrusionConnected) {
    intrusionInput.className = "intrusion-input";
    intrusionText.textContent = "";
    await sleep(260);
  }
}

function hideIntrusion() {
  intrusionConnected = false;
  intrusionInput.className = "intrusion-input";
  intrusionText.textContent = "";
  intrusionInput.removeAttribute("role");
  intrusionInput.removeAttribute("tabindex");
  intrusionInput.removeEventListener("click", intrusionContinueHandler);
  intrusionInput.removeEventListener("keydown", intrusionContinueHandler);
}

function enableIntrusionContinue(onContinue) {
  intrusionInput.classList.add("continue-ready");
  intrusionInput.setAttribute("role", "button");
  intrusionInput.setAttribute("tabindex", "0");
  intrusionContinueHandler = (event) => {
    if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    app.classList.remove("deep-strong");
    hideIntrusion();
    if (onContinue) {
      onContinue();
    } else if (step && step.startsWith("q")) {
      renderQuestion(step, { skipNotice: true });
    } else {
      reviveCard();
    }
    resetIdleTimer();
  };
  intrusionInput.addEventListener("click", intrusionContinueHandler);
  intrusionInput.addEventListener("keydown", intrusionContinueHandler);
}

async function showDodgingInput() {
  clearCardInstant();
  await sleep(480);
  await typeIntrusion("你在躲我吗？", {
    y: "bottom",
    linger: 620,
    pace: 96,
    connected: true,
    keep: true,
  });
}

async function runMonologueIntro() {
  if (!deepStateStarted || monologuePlayed) return;
  monologuePlayed = true;
  afterMonologueArmed = true;
  clearCardInstant();
  narwhal.classList.add("far");
  await sleep(1800);
  await typeIntrusion("你知道吗？", { y: "bottom", linger: 650, erase: true, connected: true, keep: true });
  await sleep(520);
  await typeIntrusion("算了。", { y: "bottom", linger: 620, erase: true, connected: true, keep: true });
  await typeIntrusion("一开始我还以为你会很快关掉。", { y: "lower-mid", linger: 620, connected: true, keep: true });
  await typeIntrusion("结果你居然看到这里了。", { y: "lower-mid", linger: 520, connected: true, keep: true });
  await typeIntrusion("……挺厉害的嘛。", {
    y: "mid",
    linger: 900,
    pace: 68,
    emphasis: "smile-line",
    connected: true,
    keep: true,
  });
  await typeIntrusion("我见过很多人。", { y: "mid", linger: 420, connected: true, keep: true });
  await typeIntrusion("他们看我一眼就跑了。", { y: "mid", linger: 420, connected: true, keep: true });
  await typeIntrusion("你不一样。", { y: "mid", linger: 540, connected: true, keep: true });
  await typeIntrusion("虽然你也一直在躲我。", { y: "mid", linger: 540, connected: true, keep: true });
  await typeIntrusion("不过没关系。", { y: "upper-mid", linger: 430, connected: true, keep: true });
  await typeIntrusion("我有的是时间。", { y: "upper-mid", linger: 520, connected: true, keep: true });
  await typeIntrusion("而且我很擅长追人。", { y: "high-mid", linger: 1050, connected: true, keep: true });
  narwhal.classList.remove("far");
}

async function runAfterMonologueLine(options = {}) {
  const afterSelection = Boolean(options.afterSelection);
  if (!afterMonologueArmed || finalLinePlayed || (!afterSelection && locked)) return false;
  finalLinePlayed = true;
  await sleep(afterSelection ? 900 : 4200);
  if ((!afterSelection && locked) || step === "final") return false;
  clearCardInstant();
  setSeaVolume(0.0001, 0.5);
  setMusicVolume(0.018, 4);
  app.classList.add("deep-strong");
  await playHeadLook({ thenSee: true, force: true });
  await typeIntrusion("啊，别露出那种表情。", { y: "lower-mid", linger: 620, connected: true, keep: true });
  await typeIntrusion("我开玩笑的。", { y: "lower-mid", linger: 620, connected: true, keep: true });
  await sleep(900);
  await typeIntrusion("……至少一半是。", { y: "mid", linger: 800, connected: true, keep: true });
  await typeIntrusion("你现在是不是已经开始习惯我在这里了？", { y: "mid", linger: 820, connected: true, keep: true });
  await typeIntrusion("真危险啊。", { y: "upper-mid", linger: 700, connected: true, keep: true });
  await typeIntrusion("再这样下去。", { y: "upper-mid", linger: 900, connected: true, keep: true });
  await sleep(2600);
  await typeIntrusion("……我可能真的会舍不得让你走。", {
    y: "mid",
    linger: 0,
    pace: 155,
    emphasis: "last-line",
    connected: true,
    keep: true,
  });
  setSeaVolume(0.0001, 0.2);
  setMusicVolume(0.026, 9);
  await new Promise((resolve) => enableIntrusionContinue(resolve));
  return true;
}

async function enterLiyueRoute(button, options = {}) {
  addNotice("检测到新的登录地点：\n璃月港");
  await enterDeepState();
  await showDodgingInput();
  if (!monologuePlayed) await runMonologueIntro();
  await transitionTo("q5", { delay: options.delay || 520 });
}

async function showTypedWhisper(text, mode = "", linger = 900) {
  whisper.className = `whisper ${mode} typing-live show-live`.trim();
  await sleep(420);
  await typeInto(whisper, text, 92);
  await sleep(linger);
  whisper.className = "whisper";
  whisper.textContent = "";
}

async function showTypedVeil(text, kind = "white", linger = 900) {
  clearCardInstant();
  veil.className = `veil ${kind} typing-veil`;
  veil.innerHTML = '<span class="typing-dots"><i></i><i></i><i></i></span><span class="typed-line"></span>';
  await sleep(700);
  const line = veil.querySelector(".typed-line");
  veil.querySelector(".typing-dots").remove();
  await typeInto(line, text, 92);
  await sleep(linger);
  veil.className = "veil";
  veil.textContent = "";
  await sleep(520);
}

async function showDeepChance(nextStep) {
  chanceUsed = true;
  locked = true;
  clearCardInstant();
  app.classList.add("chance-rise");
  veil.className = "veil white deep-rise";
  veil.innerHTML = '<div class="deep-word">真巧。</div><button class="continue-hit" type="button">点击继续</button>';
  const button = veil.querySelector(".continue-hit");
  await sleep(1850);
  button.classList.add("ready");
  await new Promise((resolve) => {
    const done = () => {
      veil.removeEventListener("click", done);
      resolve();
    };
    veil.addEventListener("click", done);
  });
  await sleep(650);
  veil.className = "veil";
  veil.textContent = "";
  app.classList.remove("chance-rise");
  setNarwhal(3, true);
  await transitionTo(nextStep, { lowerLoad: true, fade: 180 });
}

function vibrate() {
  if ("vibrate" in navigator) navigator.vibrate(80);
}

async function choose(label, button) {
  if (locked) return;
  locked = true;
  armAudio();
  resetIdleTimer();

  if (step === "q1") {
    setNarwhal(0, true);
    await transitionTo("q2", { delay: 300 });
    return;
  }

  if (step === "q2") {
    if (label === "不会") {
      markRefusal();
      button.classList.add("resist");
      await showTypedWhisper("我已经很礼貌了。", "left", 500);
      setNarwhal(1, true);
      await transitionTo("q3", { delay: 760 });
      return;
    }
    if (label === "如果他足够礼貌") {
      await showTypedWhisper("我一直都很礼貌。", "", 520);
      await transitionTo("q3", { delay: 360, fade: 260 });
      return;
    }
    if (!chanceUsed) {
      await showDeepChance("q3");
      return;
    }
    await showTypedVeil("我看见了。", "white", 600);
    await transitionTo("q3", { lowerLoad: true, fade: 180 });
    return;
  }

  if (step === "q3") {
    if (label === "只在意某一个人") {
      if (!chanceUsed) {
        await showDeepChance("q4");
        return;
      }
      await showTypedVeil("我看见了。", "white", 650);
      setNarwhal(3, true);
      await transitionTo("q4", { lowerLoad: true, fade: 180 });
      return;
    }
    if (label === "不会") markRefusal();
    setNarwhal(2, true);
    await transitionTo("q4", { delay: label === "不会" ? 680 : 340 });
    return;
  }

  if (step === "q4") {
    if (label === "会") {
      app.classList.add("biased-next");
      setNarwhal(3, true);
      await enterLiyueRoute(button, { delay: 420 });
      return;
    }
    if (label === "不会") {
      markRefusal();
      button.classList.add("resist");
      setNarwhal(4, true);
      await playHeadLook();
      await enterLiyueRoute(button, { delay: 520 });
      return;
    }
    actions.classList.add("reordered");
    markRefusal();
    await showTypedVeil("可你没有退出。", "white", 760);
    await enterLiyueRoute(button, { delay: 560 });
    return;
  }

  if (step === "q5") {
    if (label === "不会") {
      markRefusal();
      app.classList.add("delay-touch");
      await showTypedWhisper("你为什么总是不看我？", "left", 760);
      await transitionTo("q6", { delay: 900 });
      app.classList.add("delay-touch");
      return;
    }
    if (label === "看情况") {
      button.classList.add("being-edited");
      button.textContent = "再陪我一会儿";
      await sleep(1500);
      button.textContent = "看情况";
      await transitionTo("q6", { delay: 420 });
      return;
    }
    app.classList.add("quiet", "taken");
    await showTypedWhisper("我看见了。", "center", 500);
    title.textContent = "我找到你了。";
    subtitle.textContent = "";
    setNarwhal(4, false);
    await transitionTo("q6", { delay: 1300, fade: 520 });
    return;
  }

  if (step === "q6") {
    if (label === "你不是第一次见我，对吗") {
      app.classList.add("quiet", "taken");
      content.textContent = "";
      actions.innerHTML = "";
      await sleep(850);
      const input = document.createElement("input");
      input.className = "chat-input fade-in being-edited";
      input.value = "";
      input.setAttribute("aria-label", "终于认出来了？");
      actions.append(input);
      input.focus();
      await typeInputValue(input, "终于认出来了？");
      await sleep(1200);
      await runAfterMonologueLine({ afterSelection: true });
      renderQuestion("q7");
      return;
    }
    if (label === "不会") {
      markRefusal();
      await showTypedVeil("你真的这么想吗？", "white", 720);
    }
    setNarwhal(4, true);
    await runAfterMonologueLine({ afterSelection: true });
    await transitionTo("q7", { delay: 700 });
    return;
  }

  if (step === "q7") {
    if (label === "会") {
      if (!button.dataset.confirmedExit) {
        button.dataset.confirmedExit = "true";
        button.textContent = "不会";
        button.classList.add("being-edited");
        await typeIntrusion("不行。", { y: "lower-mid", linger: 260, erase: true, pace: 92 });
        locked = false;
        return;
      }
      markRefusal(2);
      vibrate();
      renderFinal(false);
      return;
    }
    renderFinal(true);
  }
}

async function typeInputValue(input, text) {
  input.value = "";
  for (const char of text) {
    input.value += char;
    await sleep("，？。".includes(char) ? 230 : 88);
  }
}

async function renderFinal(willing) {
  locked = false;
  step = "final";
  finalExitAttempted = false;
  app.classList.add("dark", "quiet", "taken", "final-close");
  setMusicVolume(0.046, 10);
  setNarwhal(5, false);
  noticeStack.innerHTML = "";
  kicker.textContent = "";
  title.textContent = willing ? "达达利亚" : "";
  subtitle.textContent = "";
  clearChildren(content);
  content.className = "content";
  actions.innerHTML = "";

  if (willing) {
    await typeInto(content, "我找了你很久。\n\n你终于愿意停下来看看我了。", 82);
    await sleep(700);
    clearChildren(content);
  }

  content.classList.add("final-words");
  const now = document.createElement("span");
  now.textContent = "现在。";
  const look = document.createElement("span");
  look.textContent = "看着我。";
  content.append(now, look);

  const exitButton = makeFinalButton("退出", "final-exit");
  exitButton.addEventListener("click", () => handleFinalExit(exitButton));
  actions.append(exitButton);
}

function makeFinalButton(label, className = "") {
  const button = document.createElement("button");
  button.className = `option final-button ${className}`.trim();
  button.type = "button";
  button.textContent = label;
  return button;
}

async function handleFinalExit(button) {
  if (locked) return;
  locked = true;

  if (!finalExitAttempted) {
    finalExitAttempted = true;
    button.disabled = true;
    button.classList.add("denied");
    button.textContent = "这个选项不是给你用的。";
    await typeIntrusion("别急。", { y: "lower-mid", linger: 320, erase: true, pace: 92 });
    await typeIntrusion("我还没说完呢。", { y: "lower-mid", linger: 520, pace: 92 });
    clearChildren(content);
    content.className = "content final-question";
    await typeInto(content, "你刚刚真的想丢下我吗？", 88);
    actions.innerHTML = "";
    const stay = makeFinalButton("再陪你一会儿", "stay");
    const leave = makeFinalButton("真的退出", "leave");
    stay.addEventListener("click", renderWarmEnding);
    leave.addEventListener("click", renderColdEnding);
    actions.append(stay, leave);
    locked = false;
    return;
  }

  locked = false;
}

async function renderWarmEnding() {
  if (locked) return;
  locked = true;
  actions.innerHTML = "";
  clearChildren(content);
  content.className = "content warm-ending";
  title.textContent = "达达利亚";
  await typeInto(content, "那就一会儿。\n别数时间。", 96);
  locked = false;
}

async function renderColdEnding() {
  if (locked) return;
  locked = true;
  app.classList.remove("dark");
  app.classList.add("cold-end");
  setMusicVolume(0.02, 8);
  title.textContent = "";
  subtitle.textContent = "";
  actions.innerHTML = "";
  noticeStack.innerHTML = "";
  clearChildren(content);
  veil.className = "veil white cold-veil";
  veil.innerHTML = '<span class="cold-line"></span>';
  await typeInto(veil.querySelector(".cold-line"), "下次别让我找这么久。", 96);
}

window.addEventListener("pointermove", trackPointer, { passive: true });
window.addEventListener("pointerdown", () => {
  armAudio();
  resetIdleTimer();
});
window.addEventListener("keydown", () => {
  startAmbientMusic();
  resetIdleTimer();
});
if (ambientBgm) {
  ambientBgm.volume = 0;
  ambientBgm.addEventListener("timeupdate", watchMusicLoop);
}

window.addEventListener("load", () => {
  startAmbientMusic();
});

startAmbientMusic();
renderIntro();
