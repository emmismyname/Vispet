const SHORTCUT_URL = "https://www.icloud.com/shortcuts/bf6fea89dbcc4a89a2c4ee248407e0e7";

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
const qrImage = document.querySelector("#qrImage");

let currentUsername = localStorage.getItem("vitalpet_username") || "";

function endpoint(path) {
  return `${apiBase}${path}`;
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#d84f7a" : "#4f9f73";
}

function renderStatus(pet) {
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
  setMessage("Pet status loaded.");
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

function playFeedAnimation() {
  catWrap.classList.remove("happy");
  floatExp.classList.remove("show");
  void catWrap.offsetWidth;
  catWrap.classList.add("happy");
  floatExp.classList.add("show");
}

async function feedPet() {
  if (!currentUsername) {
    setMessage("Login with your username first.", true);
    usernameInput.focus();
    return;
  }

  feedButton.disabled = true;

  try {
    const data = await requestJson("/api/feed", {
      method: "POST",
      body: JSON.stringify({ username: currentUsername }),
    });
    renderStatus(data.pet);
    playFeedAnimation();
    setMessage(data.message);
  } catch (error) {
    if (error.data && error.data.pet) {
      renderStatus(error.data.pet);
    }
    setMessage(error.message, true);
  } finally {
    feedButton.disabled = false;
  }
}

function setupQrCode() {
  const encoded = encodeURIComponent(SHORTCUT_URL);
  qrImage.src = `https://quickchart.io/qr?text=${encoded}&size=320&margin=2`;
}

loginButton.addEventListener("click", login);
feedButton.addEventListener("click", feedPet);
usernameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    login();
  }
});

setupQrCode();

if (currentUsername) {
  usernameInput.value = currentUsername;
  loadPet(currentUsername).catch((error) => setMessage(error.message, true));
} else {
  setMessage("Enter a username to start.");
}
