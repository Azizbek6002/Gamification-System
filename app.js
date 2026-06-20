// ---------- State + Storage ----------
const STORAGE_KEY = "site3_gamification_v1";

const defaultState = {
  level: 1,
  xp: 0,
  coins: 0,
  soundOn: true,

  streak: 0,
  lastCheckinISO: null,

  bestGame: 0,
  inventory: { coin: 0, gem: 0, star: 0 },

  unlockedBadges: {}
};

const badgesConfig = [
  { id: "first_xp", title: "First XP", desc: "Birinchi XP oldingiz", check: (s) => s.xpTotal >= 10 },
  { id: "lvl_3", title: "Level 3", desc: "Level 3 ga chiqing", check: (s) => s.level >= 3 },
  { id: "streak_3", title: "Streak 3", desc: "3 kun streak qiling", check: (s) => s.streak >= 3 },
  { id: "collector", title: "Collector", desc: "10 coin to‘plang", check: (s) => s.inventory.coin >= 10 },
  { id: "gamer", title: "Mini-Gamer", desc: "Mini-game’da 15+ score", check: (s) => s.bestGame >= 15 },
  { id: "easter", title: "Easter Hunter", desc: "Hidden code toping", check: (s) => s.unlockedBadges?.easter === true }
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState, xpTotal: 0 };
    const s = JSON.parse(raw);
    return { ...defaultState, ...s };
  } catch {
    return { ...defaultState, xpTotal: 0 };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// ---------- DOM ----------
const $ = (q) => document.querySelector(q);

const elLevel = $("#level");
const elXP = $("#xp");
const elXPNeed = $("#xpNeed");
const elCoins = $("#coins");
const elProgressFill = $("#progressFill");
const elProgressPercent = $("#progressPercent");

const elBadges = $("#badges");

const elStreakCount = $("#streakCount");
const elLastCheckin = $("#lastCheckin");
const elFlame = $("#flame");

const elInventoryGrid = $("#inventoryGrid");

const elToast = $("#toast");

const onboarding = $("#onboarding");
const openOnboardingBtn = $("#openOnboarding");
const closeOnboardingBtn = $("#closeOnboarding");
const nextStepBtn = $("#nextStep");
const prevStepBtn = $("#prevStep");
const dotsWrap = $("#dots");

const toggleSoundBtn = $("#toggleSound");

const resetAllBtn = $("#resetAll");
const clearInventoryBtn = $("#clearInventory");

const doActionBtn = $("#doAction");
const checkInBtn = $("#checkIn");

const claimBadgeDemoBtn = $("#claimBadgeDemo");

const startGameBtn = $("#startGame");
const stopGameBtn = $("#stopGame");
const arena = $("#arena");
const gameTimeEl = $("#gameTime");
const gameScoreEl = $("#gameScore");
const gameBestEl = $("#gameBest");

const easterStatus = $("#easterStatus");

const soundClickBtn = $("#soundClick");
const soundRewardBtn = $("#soundReward");
const soundLevelBtn = $("#soundLevel");

// ---------- Helpers ----------
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function toast(msg) {
  elToast.textContent = msg;
  elToast.classList.add("show");
  elToast.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    elToast.classList.remove("show");
    elToast.setAttribute("aria-hidden", "true");
  }, 1400);
}

function formatISO(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

function xpNeededForLevel(level) {
  // scalable: 100, 130, 160, 190...
  return 100 + (level - 1) * 30;
}

function addXP(amount, reason = "XP") {
  state.xpTotal = (state.xpTotal || 0) + amount;

  const beforeLevel = state.level;
  state.xp += amount;

  while (state.xp >= xpNeededForLevel(state.level)) {
    state.xp -= xpNeededForLevel(state.level);
    state.level += 1;
    playSound("level");
    toast(`LEVEL UP! → ${state.level}`);
  }

  if (state.level !== beforeLevel) {
    // bonus collectibles on level up
    addCollectible("star", 1);
  }

  playSound("click");
  toast(`+${amount} XP (${reason})`);
  checkBadges();
  render();
  saveState();
}

function addCoins(n) {
  state.coins += n;
  playSound("reward");
  render();
  saveState();
}

function addCollectible(type, count = 1) {
  state.inventory[type] = (state.inventory[type] || 0) + count;
  if (type === "coin") state.coins += count; // coin => currency too
  playSound("reward");
  checkBadges();
  renderInventory();
  saveState();
}

function checkBadges() {
  badgesConfig.forEach((b) => {
    if (state.unlockedBadges[b.id]) return;
    if (b.check(state)) {
      state.unlockedBadges[b.id] = true;
      playSound("reward");
      toast(`🏅 Badge unlocked: ${b.title}`);
    }
  });
  renderBadges();
}

function render() {
  const need = xpNeededForLevel(state.level);
  const percent = Math.round((state.xp / need) * 100);

  elLevel.textContent = state.level;
  elXP.textContent = state.xp;
  elXPNeed.textContent = need;

  elCoins.textContent = state.coins;

  elProgressFill.style.width = `${percent}%`;
  elProgressPercent.textContent = `${percent}%`;

  elStreakCount.textContent = state.streak;
  elLastCheckin.textContent = formatISO(state.lastCheckinISO);

  gameBestEl.textContent = state.bestGame;
  updateSoundUI();
}

function renderBadges() {
  elBadges.innerHTML = "";
  badgesConfig.forEach((b) => {
    const unlocked = !!state.unlockedBadges[b.id];
    const div = document.createElement("div");
    div.className = `badge ${unlocked ? "unlocked" : ""}`;
    div.innerHTML = `
      <div class="lock">${unlocked ? "✅" : "🔒"}</div>
      <div class="title">${b.title}</div>
      <div class="desc">${b.desc}</div>
    `;
    elBadges.appendChild(div);
  });
}

function renderInventory() {
  elInventoryGrid.innerHTML = "";
  const items = [
    { key: "coin", name: "Coin", emoji: "🪙" },
    { key: "gem", name: "Gem", emoji: "💎" },
    { key: "star", name: "Star", emoji: "⭐" }
  ];

  items.forEach((it) => {
    const count = state.inventory[it.key] || 0;
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="emoji">${it.emoji}</div>
      <div class="name">${it.name}</div>
      <div class="count">${count} collected</div>
    `;
    elInventoryGrid.appendChild(div);
  });
}

function updateSoundUI() {
  toggleSoundBtn.textContent = state.soundOn ? "🔊 Sound: ON" : "🔇 Sound: OFF";
}

// ---------- 7) Sound effects (WebAudio tiny synth) ----------
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playBeep(freq = 440, duration = 0.07, type = "sine", gain = 0.05) {
  if (!state.soundOn) return;
  if (prefersReducedMotion) { /* motion irrelevant */ }
  ensureAudio();
  const ctx = audioCtx;

  const osc = ctx.createOscillator();
  const g = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  g.gain.value = gain;

  osc.connect(g);
  g.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playSound(kind) {
  if (!state.soundOn) return;
  // small patterns
  if (kind === "click") {
    playBeep(520, 0.05, "triangle", 0.04);
  } else if (kind === "reward") {
    playBeep(660, 0.06, "sine", 0.05);
    setTimeout(() => playBeep(880, 0.06, "sine", 0.05), 70);
  } else if (kind === "level") {
    playBeep(440, 0.06, "square", 0.04);
    setTimeout(() => playBeep(660, 0.06, "square", 0.04), 70);
    setTimeout(() => playBeep(990, 0.08, "square", 0.04), 140);
  }
}

// ---------- 3) Onboarding tutorial ----------
let stepIndex = 0;
function openOnboarding() {
  onboarding.classList.add("open");
  onboarding.setAttribute("aria-hidden", "false");
  stepIndex = 0;
  renderSteps();
}
function closeOnboarding() {
  onboarding.classList.remove("open");
  onboarding.setAttribute("aria-hidden", "true");
}
function renderSteps() {
  const steps = onboarding.querySelectorAll(".step");
  steps.forEach((s, i) => s.classList.toggle("active", i === stepIndex));

  dotsWrap.innerHTML = "";
  for (let i = 0; i < steps.length; i++) {
    const d = document.createElement("div");
    d.className = `dot ${i === stepIndex ? "active" : ""}`;
    dotsWrap.appendChild(d);
  }

  prevStepBtn.disabled = stepIndex === 0;
  nextStepBtn.textContent = stepIndex === steps.length - 1 ? "Finish ✅" : "Next →";
}

// ---------- 4) Daily streak ----------
function sameDay(aISO, bISO) {
  const a = new Date(aISO);
  const b = new Date(bISO);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function isYesterday(lastISO) {
  const last = new Date(lastISO);
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  return last.getFullYear() === y.getFullYear() &&
         last.getMonth() === y.getMonth() &&
         last.getDate() === y.getDate();
}

function dailyCheckin() {
  const nowISO = new Date().toISOString();
  if (state.lastCheckinISO && sameDay(state.lastCheckinISO, nowISO)) {
    toast("Bugun check-in bo‘lgan ✅");
    playSound("click");
    return;
  }

  if (!state.lastCheckinISO) {
    state.streak = 1;
  } else if (isYesterday(state.lastCheckinISO)) {
    state.streak += 1;
  } else {
    state.streak = 1; // break streak
  }

  state.lastCheckinISO = nowISO;
  // reward
  addXP(15, "Daily check-in");
  addCollectible("coin", 2);

  // pulse animation
  elFlame.classList.add("pulse");
  setTimeout(() => elFlame.classList.remove("pulse"), 420);

  saveState();
  render();
}

// ---------- 5) Mini game (coin clicker 60s) ----------
let gameTimer = null;
let gameTime = 60;
let score = 0;
let running = false;

function clearArena() {
  arena.innerHTML = `<div class="arena-hint muted">Start bos → coinlar chiqadi 🪙</div>`;
}

function spawnCoin() {
  if (!running) return;

  const coin = document.createElement("div");
  coin.className = "coin";
  coin.textContent = "🪙";

  const r = arena.getBoundingClientRect();
  const pad = 16;
  const x = Math.random() * (r.width - 42 - pad * 2) + pad;
  const y = Math.random() * (r.height - 42 - pad * 2) + pad;

  coin.style.left = `${x}px`;
  coin.style.top = `${y}px`;

  coin.addEventListener("click", () => {
    score += 1;
    gameScoreEl.textContent = score;
    playSound("click");

    // collectibles + xp as reward
    addCollectible("coin", 1);

    coin.remove();
  });

  arena.appendChild(coin);

  // auto remove after some time
  setTimeout(() => coin.remove(), 1500);
}

function startGame() {
  if (running) return;
  running = true;

  arena.innerHTML = "";
  gameTime = 60;
  score = 0;

  gameTimeEl.textContent = gameTime;
  gameScoreEl.textContent = score;
  gameBestEl.textContent = state.bestGame;

  toast("Mini-game started!");
  playSound("reward");

  // spawn coins frequently
  const spawner = setInterval(() => {
    if (!running) {
      clearInterval(spawner);
      return;
    }
    spawnCoin();
  }, 260);

  gameTimer = setInterval(() => {
    gameTime -= 1;
    gameTimeEl.textContent = gameTime;

    if (gameTime <= 0) {
      stopGame();
    }
  }, 1000);
}

function stopGame() {
  if (!running) return;
  running = false;

  clearInterval(gameTimer);
  gameTimer = null;

  // cleanup coins
  [...arena.querySelectorAll(".coin")].forEach((c) => c.remove());

  // best score
  if (score > state.bestGame) {
    state.bestGame = score;
    toast(`NEW BEST! 🏆 ${score}`);
    playSound("level");
  } else {
    toast(`Game ended. Score: ${score}`);
    playSound("click");
  }

  // extra reward XP
  addXP(Math.min(30, score), "Mini-game reward");

  saveState();
  render();
  clearArena();
}

// ---------- 6) Easter egg (Konami code) ----------
const konami = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
let konamiPos = 0;

function unlockEaster() {
  easterStatus.textContent = "Unlocked ✅";
  state.unlockedBadges["easter"] = true;
  addCollectible("gem", 1);
  addXP(25, "Easter egg");
  toast("🎁 Hidden mode unlocked!");
  playSound("level");

  // add subtle UI effect
  document.body.style.filter = "saturate(1.15)";
  setTimeout(() => (document.body.style.filter = ""), 700);
}

// ---------- Events ----------
openOnboardingBtn.addEventListener("click", openOnboarding);
closeOnboardingBtn.addEventListener("click", closeOnboarding);
onboarding.addEventListener("click", (e) => {
  if (e.target === onboarding) closeOnboarding();
});

nextStepBtn.addEventListener("click", () => {
  const steps = onboarding.querySelectorAll(".step");
  if (stepIndex < steps.length - 1) {
    stepIndex++;
    playSound("click");
    renderSteps();
  } else {
    playSound("reward");
    closeOnboarding();
  }
});

prevStepBtn.addEventListener("click", () => {
  if (stepIndex > 0) {
    stepIndex--;
    playSound("click");
    renderSteps();
  }
});

toggleSoundBtn.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  updateSoundUI();
  saveState();
  toast(state.soundOn ? "Sound ON" : "Sound OFF");
});

resetAllBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  state = { ...defaultState, xpTotal: 0 };
  toast("Reset done ✅");
  easterStatus.textContent = "Locked";
  render();
  renderBadges();
  renderInventory();
  saveState();
});

clearInventoryBtn.addEventListener("click", () => {
  state.inventory = { coin: 0, gem: 0, star: 0 };
  state.coins = 0;
  toast("Inventory cleared");
  playSound("click");
  render();
  renderInventory();
  saveState();
});

doActionBtn.addEventListener("click", () => {
  addXP(12, "Action");
  // random collectible
  const r = Math.random();
  if (r < 0.6) addCollectible("coin", 1);
  else if (r < 0.85) addCollectible("star", 1);
  else addCollectible("gem", 1);
});

checkInBtn.addEventListener("click", dailyCheckin);

claimBadgeDemoBtn.addEventListener("click", () => {
  // force unlock one badge quickly
  state.xpTotal = Math.max(state.xpTotal || 0, 12);
  checkBadges();
  toast("Badge check ✅");
  playSound("reward");
});

startGameBtn.addEventListener("click", startGame);
stopGameBtn.addEventListener("click", stopGame);

soundClickBtn.addEventListener("click", () => playSound("click"));
soundRewardBtn.addEventListener("click", () => playSound("reward"));
soundLevelBtn.addEventListener("click", () => playSound("level"));

window.addEventListener("keydown", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const expected = konami[konamiPos];

  if ((expected === "b" || expected === "a") ? key === expected : e.key === expected) {
    konamiPos++;
    if (konamiPos === konami.length) {
      konamiPos = 0;
      unlockEaster();
      easterStatus.textContent = "Unlocked ✅";
    }
  } else {
    konamiPos = 0;
  }
});

// ---------- Initial render ----------
function init() {
  render();
  renderBadges();
  renderInventory();

  // show onboarding once
  const seen = localStorage.getItem("site3_onboarding_seen");
  if (!seen) {
    localStorage.setItem("site3_onboarding_seen", "1");
    setTimeout(openOnboarding, 350);
  }

  // easter status
  easterStatus.textContent = state.unlockedBadges?.easter ? "Unlocked ✅" : "Locked";
  updateSoundUI();
}
init();
