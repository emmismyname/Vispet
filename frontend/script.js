const SHORTCUT_URL = "https://www.icloud.com/shortcuts/bf6fea89dbcc4a89a2c4ee248407e0e7";
const CAT_FRAMES = {
  idle: "assets/cat_idle.png",
  open: "assets/cat_open.png",
  chew: "assets/cat_chew.png",
};

const apiBase = window.location.protocol === "file:" ? "http://localhost:5000" : "";
const usernameInput = document.querySelector("#usernameInput");
const loginButton = document.querySelector("#loginButton");
const feedButton = document.querySelector("#feedButton");
const activeUser = document.querySelector("#activeUser");
const levelValue = document.querySelector("#levelValue");
const expValue = document.querySelector("#expValue");
const expFill = document.querySelector("#expFill");
const foodValue = document.querySelector("#foodValue");
const message = document.querySelector("#message");
const catWrap = document.querySelector("#catWrap");
const floatExp = document.querySelector("#floatExp");
const catImage = document.querySelector("#catImage");
const hungerValue = document.querySelector("#hungerValue");
const hungerFill = document.querySelector("#hungerFill");

let currentUsername = localStorage.getItem("vitalpet_username") || "Guest";
const HUNGER_CONFIG = {
  initial: 50,
  max: 100,
  feedRestore: 20,
  drainIntervalMs: 10 * 60 * 1000,
  baseDrain: 1,
  sedentaryDrain: 2,
  sedentaryAfterMs: 4 * 60 * 60 * 1000,
  sleepStartHour: 23,
  sleepEndHour: 7,
};
let hungerState = {
  hunger: HUNGER_CONFIG.initial,
  lastFedTime: Date.now(),
  lastHungerUpdate: Date.now(),
};
let hungerTimerId = null;

Object.values(CAT_FRAMES).forEach((src) => {
  const image = new Image();
  image.src = src;
});

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function endpoint(path) {
  return `${apiBase}${path}`;
}

function hungerUserKey() {
  return currentUsername || "Guest";
}

function hungerStorageKey(name) {
  return `vitalpet_${name}_${hungerUserKey()}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isSleepTime(timestamp = Date.now()) {
  const hour = new Date(timestamp).getHours();
  return hour >= HUNGER_CONFIG.sleepStartHour || hour < HUNGER_CONFIG.sleepEndHour;
}

function isSedentaryAt(timestamp = Date.now()) {
  return !isSleepTime(timestamp) && timestamp - hungerState.lastFedTime > HUNGER_CONFIG.sedentaryAfterMs;
}

function loadHungerState() {
  const now = Date.now();
  const savedHungerRaw = localStorage.getItem(hungerStorageKey("hunger"));
  const savedLastFedTimeRaw = localStorage.getItem(hungerStorageKey("lastFedTime"));
  const savedLastHungerUpdateRaw = localStorage.getItem(hungerStorageKey("lastHungerUpdate"));
  const savedHunger = Number(savedHungerRaw);
  const savedLastFedTime = Number(savedLastFedTimeRaw);
  const savedLastHungerUpdate = Number(savedLastHungerUpdateRaw);

  hungerState = {
    hunger:
      savedHungerRaw !== null && Number.isFinite(savedHunger)
        ? clamp(savedHunger, 0, HUNGER_CONFIG.max)
        : HUNGER_CONFIG.initial,
    lastFedTime: savedLastFedTimeRaw !== null && Number.isFinite(savedLastFedTime) ? savedLastFedTime : now,
    lastHungerUpdate:
      savedLastHungerUpdateRaw !== null && Number.isFinite(savedLastHungerUpdate) ? savedLastHungerUpdate : now,
  };
}

function saveHungerState() {
  localStorage.setItem(hungerStorageKey("hunger"), String(hungerState.hunger));
  localStorage.setItem(hungerStorageKey("lastFedTime"), String(hungerState.lastFedTime));
  localStorage.setItem(hungerStorageKey("lastHungerUpdate"), String(hungerState.lastHungerUpdate));
}

function calculateMissedDrain(fromTime, toTime) {
  if (toTime <= fromTime) {
    return { drain: 0, lastAppliedTime: fromTime };
  }

  const intervals = Math.floor((toTime - fromTime) / HUNGER_CONFIG.drainIntervalMs);
  let drain = 0;

  for (let index = 1; index <= intervals; index += 1) {
    const tickTime = fromTime + index * HUNGER_CONFIG.drainIntervalMs;
    if (isSleepTime(tickTime)) {
      continue;
    }
    drain += isSedentaryAt(tickTime) ? HUNGER_CONFIG.sedentaryDrain : HUNGER_CONFIG.baseDrain;
  }

  return {
    drain,
    lastAppliedTime: fromTime + intervals * HUNGER_CONFIG.drainIntervalMs,
  };
}

function renderHunger() {
  if (!hungerValue || !hungerFill) {
    return;
  }

  const rounded = Math.round(hungerState.hunger);
  hungerValue.textContent = `${rounded}%`;
  hungerFill.style.width = `${clamp(rounded, 0, HUNGER_CONFIG.max)}%`;
}

function updateHungerNotice() {
  if (!hungerValue) {
    return;
  }

  if (isSleepTime()) {
    setMessage("Pet is sleeping. Hunger drain is paused.");
  } else if (isSedentaryAt()) {
    setMessage("Pet feels sluggish from sitting too long! Walk and feed me!", true);
  }
}

function applyMissedHungerDrain() {
  const now = Date.now();
  const { drain, lastAppliedTime } = calculateMissedDrain(hungerState.lastHungerUpdate, now);

  if (drain > 0) {
    hungerState.hunger = clamp(hungerState.hunger - drain, 0, HUNGER_CONFIG.max);
  }

  hungerState.lastHungerUpdate = lastAppliedTime;
  saveHungerState();
  renderHunger();
}

function setupHungerLoop() {
  if (!hungerValue || !hungerFill) {
    return;
  }

  window.clearInterval(hungerTimerId);
  applyMissedHungerDrain();
  updateHungerNotice();

  hungerTimerId = window.setInterval(() => {
    applyMissedHungerDrain();
    updateHungerNotice();
  }, 60 * 1000);
}

function setMessage(text, isError = false) {
  if (!message) {
    return;
  }

  message.textContent = text;
  message.style.color = isError ? "#d84f7a" : "#4f9f73";
}

function renderStatus(pet) {
  if (!activeUser || !levelValue || !expValue || !expFill || !foodValue) {
    return;
  }

  activeUser.textContent = pet.username;
  levelValue.textContent = pet.level;
  expValue.textContent = `${pet.exp} / 100`;
  expFill.style.width = `${Math.max(0, Math.min(100, pet.exp))}%`;
  foodValue.textContent = pet.food;
}

async function requestJson(path, options = {}) {
  const response = await fetch(endpoint(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.data = data;
    throw error;
  }

  return data;
}

async function loadPet(username) {
  const pet = await requestJson(`/api/pet_status?username=${encodeURIComponent(username)}`);
  renderStatus(pet);
  loadHungerState();
  setupHungerLoop();
  setMessage("Pet status loaded.");
  updateHungerNotice();
}

async function login() {
  const username = usernameInput.value.trim();

  if (!username) {
    setMessage("Please enter a username.", true);
    usernameInput.focus();
    return;
  }

  currentUsername = username;
  localStorage.setItem("vitalpet_username", username);
  loginButton.disabled = true;

  try {
    await loadPet(username);
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    loginButton.disabled = false;
  }
}

async function playFeedAnimation() {
  if (!catWrap || !floatExp) {
    return;
  }

  catWrap.classList.remove("happy");
  floatExp.classList.remove("show");
  void catWrap.offsetWidth;
  catWrap.classList.add("happy");
  floatExp.classList.add("show");

  if (!catImage) {
    return;
  }

  catImage.src = CAT_FRAMES.open;
  await delay(300);
  catImage.src = CAT_FRAMES.chew;
  await delay(600);
  catImage.src = CAT_FRAMES.idle;
}

async function feedPet() {
  if (!currentUsername) {
    currentUsername = "Guest";
  }

  applyMissedHungerDrain();

  if (hungerState.hunger >= HUNGER_CONFIG.max) {
    setMessage("I'm too full! Let's go for a walk to digest.", true);
    return;
  }

  feedButton.disabled = true;

  try {
    const data = await requestJson("/api/feed", {
      method: "POST",
      body: JSON.stringify({ username: currentUsername }),
    });
    renderStatus(data.pet);
    hungerState.hunger = clamp(hungerState.hunger + HUNGER_CONFIG.feedRestore, 0, HUNGER_CONFIG.max);
    hungerState.lastFedTime = Date.now();
    hungerState.lastHungerUpdate = Date.now();
    saveHungerState();
    renderHunger();
    playFeedAnimation();
    setMessage(`${data.message}. Hunger restored.`);
  } catch (error) {
    if (error.data && error.data.pet) {
      renderStatus(error.data.pet);
    }
    setMessage(error.message, true);
  } finally {
    feedButton.disabled = false;
  }
}

function qrCodeUrl(text, size = 320) {
  const encoded = encodeURIComponent(text);
  return `https://quickchart.io/qr?text=${encoded}&size=${size}&margin=2`;
}

function setupQrCodes() {
  const qrImages = document.querySelectorAll("[data-qr-code]");
  qrImages.forEach((image) => {
    image.src = qrCodeUrl(SHORTCUT_URL, 360);
  });

  const shortcutLinks = document.querySelectorAll("[data-shortcut-link]");
  shortcutLinks.forEach((element) => {
    element.textContent = SHORTCUT_URL;
  });
}

function setupHomePage() {
  if (!usernameInput || !loginButton || !feedButton) {
    return;
  }

  loginButton.addEventListener("click", login);
  feedButton.addEventListener("click", feedPet);
  usernameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      login();
    }
  });

  usernameInput.value = currentUsername;
  loadPet(currentUsername).catch((error) => setMessage(error.message, true));
}

setupQrCodes();
setupHomePage();
