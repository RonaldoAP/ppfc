// ─────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DO FIREBASE
// Substitua pelos dados do seu projeto em console.firebase.google.com
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyD87An_tilOqKznmHcWAOzGIpkTEkUCnhY",
  authDomain:        "ppfc-uniformes.firebaseapp.com",
  databaseURL:       "https://ppfc-uniformes-default-rtdb.firebaseio.com",
  projectId:         "ppfc-uniformes",
  storageBucket:     "ppfc-uniformes.firebasestorage.app",
  messagingSenderId: "570179377619",
  appId:             "1:570179377619:web:46dc461ced8db952b8f726",
};

// ─────────────────────────────────────────────────────────────
// UNIFORMES — edite nomes, descrições e caminhos de imagem
// ─────────────────────────────────────────────────────────────
const UNIFORMS = [
  { id: "azul_1",     name: "Uniforme Azul 1",     color: "blue", emoji: "🔵", img: "img/azul_1.jpg"     },
  { id: "azul_2",     name: "Uniforme Azul 2",     color: "blue", emoji: "💙", img: "img/azul_2.jpg"     },
  { id: "vermelho_1", name: "Uniforme Vermelho 1", color: "red",  emoji: "🔴", img: "img/vermelho_1.jpg" },
  { id: "vermelho_2", name: "Uniforme Vermelho 2", color: "red",  emoji: "❤️", img: "img/vermelho_2.jpg" },
];

// ─────────────────────────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "ppfc_vote_v1";

let db;
let voterName   = "";
let selectedBlue = null;
let selectedRed  = null;
let voteData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

// ─────────────────────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────────────────────
function init() {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
  } catch (e) {
    console.error("Firebase init error:", e);
  }

  if (voteData?.voted) {
    // Já votou: vai direto para o ranking
    showVotedScreen();
  } else {
    showStep("step-name");
  }

  // Eventos
  document.getElementById("name-form").addEventListener("submit", handleNameSubmit);
  document.getElementById("btn-confirm").addEventListener("click", handleConfirm);
}

// ─────────────────────────────────────────────────────────────
// PASSO 1 — NOME
// ─────────────────────────────────────────────────────────────
function handleNameSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("name-input");
  const name  = input.value.trim();
  if (!name) return;

  voterName = name;
  document.getElementById("voter-name-display").textContent = voterName;
  renderCards();
  showStep("step-voting");
}

// ─────────────────────────────────────────────────────────────
// PASSO 2 — SELEÇÃO DE UNIFORMES
// ─────────────────────────────────────────────────────────────
function renderCards() {
  renderGroup("blue", "row-blue");
  renderGroup("red",  "row-red");
}

function renderGroup(color, rowId) {
  const row = document.getElementById(rowId);
  row.innerHTML = UNIFORMS
    .filter(u => u.color === color)
    .map(u => cardHTML(u))
    .join("");

  row.querySelectorAll(".uniform-card").forEach(card => {
    card.addEventListener("click", () => pickUniform(card.dataset.id));
  });
}

function cardHTML(u) {
  const img = `<img src="${u.img}" alt="${u.name}"
    onerror="this.closest('.uniform-img').innerHTML='<span>${u.emoji}</span>'" />`;
  return `
    <div class="uniform-card" id="card-${u.id}" data-id="${u.id}" data-color="${u.color}">
      <div class="uniform-img">${img}</div>
      <div class="uniform-body">
        <span class="uniform-name">${u.name}</span>
        <span class="select-indicator">✓ Escolhido</span>
      </div>
    </div>`;
}

function pickUniform(id) {
  const uniform = UNIFORMS.find(u => u.id === id);
  if (!uniform) return;

  if (uniform.color === "blue") {
    if (selectedBlue) return; // já escolheu nessa cor, bloqueado
    selectedBlue = id;
    lockGroup("blue", id);
  } else {
    if (selectedRed) return;
    selectedRed = id;
    lockGroup("red", id);
  }

  document.getElementById(`card-${id}`)?.classList.add("selected");
  updateSummary();
}

function lockGroup(color, selectedId) {
  // Marca todos os cards daquele grupo como locked
  UNIFORMS
    .filter(u => u.color === color)
    .forEach(u => {
      const card = document.getElementById(`card-${u.id}`);
      if (card) card.classList.add("locked");
    });
}

function updateSummary() {
  const btn     = document.getElementById("btn-confirm");
  const summary = document.getElementById("selection-summary");

  const blueName = selectedBlue ? getName(selectedBlue) : null;
  const redName  = selectedRed  ? getName(selectedRed)  : null;

  if (blueName && redName) {
    summary.textContent = `Azul: ${blueName} · Vermelho: ${redName}`;
    btn.disabled = false;
  } else if (blueName) {
    summary.textContent = `Azul: ${blueName} · Vermelho: escolha um uniforme vermelho`;
  } else if (redName) {
    summary.textContent = `Azul: escolha um uniforme azul · Vermelho: ${redName}`;
  } else {
    summary.textContent = "Selecione um uniforme de cada cor para continuar.";
  }
}

// ─────────────────────────────────────────────────────────────
// PASSO 3 — CONFIRMAR E SALVAR
// ─────────────────────────────────────────────────────────────
async function handleConfirm() {
  if (!selectedBlue || !selectedRed) return;

  const btn = document.getElementById("btn-confirm");
  btn.disabled  = true;
  btn.textContent = "Registrando...";

  try {
    // Incrementa votos no Firebase atomicamente
    const updates = {
      [`votes/${selectedBlue}`]: firebase.database.ServerValue.increment(1),
      [`votes/${selectedRed}`]:  firebase.database.ServerValue.increment(1),
    };
    await db.ref().update(updates);

    // Salva registro do votante
    await db.ref("voters").push({
      name:      voterName,
      blue:      selectedBlue,
      red:       selectedRed,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    });

    // Persiste localmente — impede novo voto mesmo com reload
    voteData = { voted: true, name: voterName, blue: selectedBlue, red: selectedRed };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(voteData));

    showVotedScreen();
  } catch (err) {
    console.error("Erro ao votar:", err);
    btn.disabled = false;
    btn.textContent = "Confirmar votos";
    alert("Erro ao registrar o voto. Tente novamente.");
  }
}

// ─────────────────────────────────────────────────────────────
// TELA DE VOTADO + RANKING
// ─────────────────────────────────────────────────────────────
function showVotedScreen() {
  const data = voteData;
  document.getElementById("voted-summary-text").textContent =
    `${data.name} votou em ${getName(data.blue)} e ${getName(data.red)}.`;

  showStep("step-voted");
  listenToRanking();
}

function listenToRanking() {
  if (!db) {
    document.getElementById("ranking-list").innerHTML =
      '<p style="color:var(--muted)">Firebase não configurado.</p>';
    return;
  }
  db.ref("votes").on("value", snap => renderRanking(snap.val() || {}));
}

function renderRanking(counts) {
  const sorted = [...UNIFORMS]
    .map(u => ({ ...u, votes: counts[u.id] || 0 }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));

  const total  = sorted.reduce((s, u) => s + u.votes, 0);
  const maxV   = sorted[0]?.votes || 0;
  const medals = ["🥇", "🥈", "🥉", "4️⃣"];

  document.getElementById("ranking-list").innerHTML = sorted.map((u, i) => {
    const pct        = total > 0 ? Math.round((u.votes / total) * 100) : 0;
    const isTop      = u.votes > 0 && u.votes === maxV;
    const colorClass = u.color === "blue" ? "bar-blue" : "bar-red";
    const userVoted  = voteData?.blue === u.id || voteData?.red === u.id;

    return `
      <div class="rank-item${isTop ? " top" : ""}">
        <div class="rank-header">
          <span class="rank-pos">${medals[i]}</span>
          <span class="rank-name">${u.name}${userVoted ? " <em style='font-size:11px;font-weight:400;opacity:.7'>(seu voto)</em>" : ""}</span>
          <span class="rank-votes">${u.votes} voto${u.votes !== 1 ? "s" : ""} · ${pct}%</span>
        </div>
        <div class="rank-bar-bg">
          <div class="rank-bar ${colorClass}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join("");
}

// ─────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────
function showStep(id) {
  document.querySelectorAll(".step").forEach(s => s.classList.add("hidden"));
  document.getElementById(id)?.classList.remove("hidden");
}

function getName(id) {
  return UNIFORMS.find(u => u.id === id)?.name ?? id;
}

init();
