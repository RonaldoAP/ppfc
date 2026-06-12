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
  { id: "azul_1",     name: "Azul — Gola Branca",       color: "blue", emoji: "🔵", img: "azul_01.jpg"    },
  { id: "azul_2",     name: "Azul — Gola Preta",        color: "blue", emoji: "💙", img: "azul_02.jpg"    },
  { id: "vermelho_1", name: "Listrado — Preto/Vermelho", color: "red",  emoji: "🔴", img: "vermelha_01.jpg" },
  { id: "vermelho_2", name: "Listrado — Vermelho/Preto", color: "red",  emoji: "❤️", img: "vermelha_02.jpg" },
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

  const isBlue  = uniform.color === "blue";
  const current = isBlue ? selectedBlue : selectedRed;

  if (current) {
    document.getElementById(`card-${current}`)?.classList.remove("selected");
  }

  if (current === id) {
    // Clicou no mesmo card → desfaz seleção
    if (isBlue) selectedBlue = null;
    else        selectedRed  = null;
  } else {
    // Seleciona novo card
    if (isBlue) selectedBlue = id;
    else        selectedRed  = id;
    document.getElementById(`card-${id}`)?.classList.add("selected");
  }

  updateSummary();
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
  db.ref("voters").on("value", snap => renderRanking(snap.val() || {}));
}

function renderRanking(votersData) {
  const votersList = Object.values(votersData);

  const byUniform = {};
  UNIFORMS.forEach(u => { byUniform[u.id] = []; });
  votersList.forEach(v => {
    if (v.blue && byUniform[v.blue] !== undefined) byUniform[v.blue].push(v.name);
    if (v.red  && byUniform[v.red]  !== undefined) byUniform[v.red].push(v.name);
  });

  const sorted = [...UNIFORMS]
    .map(u => ({ ...u, votes: byUniform[u.id].length, voters: byUniform[u.id] }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));

  // Pódio: 2º esquerda · 1º centro · 3º direita
  const slots    = [sorted[1], sorted[0], sorted[2]];
  const positions = [2, 1, 3];
  const badgeCls  = ["badge-silver", "badge-gold", "badge-bronze"];
  const fourth    = sorted[3];

  function dropdownHtml(uid, names) {
    const text = names.length > 0 ? names.join(" · ") : "Ninguém ainda";
    return `
      <button class="voters-toggle" data-target="vd-${uid}">Quem votou? ▾</button>
      <div class="voters-dropdown" id="vd-${uid}">${text}</div>`;
  }

  const podiumHtml = `
    <div class="podium">
      ${slots.map((u, idx) => {
        const pos = positions[idx];
        const userVoted = voteData?.blue === u.id || voteData?.red === u.id;
        return `
          <div class="podium-item place-${pos}">
            <div class="podium-top">
              ${pos === 1 ? '<div class="podium-crown">👑</div>' : '<div class="podium-crown-gap"></div>'}
              <div class="podium-photo ${u.color === 'blue' ? 'ring-blue' : 'ring-red'}">
                <img src="${u.img}" alt="${u.name}" onerror="this.style.display='none'" />
                <span class="podium-badge ${badgeCls[idx]}">${pos}</span>
              </div>
              <div class="podium-name">${u.name}${userVoted ? '<br><em class="your-vote">seu voto ✓</em>' : ''}</div>
              <div class="podium-votes">${u.votes}<span> voto${u.votes !== 1 ? 's' : ''}</span></div>
              ${dropdownHtml(u.id, u.voters)}
            </div>
            <div class="podium-step"></div>
          </div>`;
      }).join("")}
    </div>`;

  const fourthHtml = fourth ? (() => {
    const total = sorted.reduce((s, x) => s + x.votes, 0);
    const pct   = total > 0 ? Math.round((fourth.votes / total) * 100) : 0;
    const colorClass = fourth.color === "blue" ? "bar-blue" : "bar-red";
    const userVoted  = voteData?.blue === fourth.id || voteData?.red === fourth.id;
    return `
      <div class="rank-item">
        <div class="rank-header">
          <span class="rank-pos">4️⃣</span>
          <img class="rank-thumb" src="${fourth.img}" alt="${fourth.name}" onerror="this.style.display='none'" />
          <span class="rank-name">${fourth.name}${userVoted ? " <em style='font-size:11px;font-weight:400;opacity:.7'>(seu voto)</em>" : ""}</span>
          <span class="rank-votes">${fourth.votes} voto${fourth.votes !== 1 ? "s" : ""} · ${pct}%</span>
        </div>
        <div class="rank-bar-bg"><div class="rank-bar ${colorClass}" style="width:${pct}%"></div></div>
        ${dropdownHtml(fourth.id, fourth.voters)}
      </div>`;
  })() : '';

  const container = document.getElementById("ranking-list");
  container.innerHTML = podiumHtml + fourthHtml;

  container.querySelectorAll(".voters-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      const open   = target.classList.toggle("open");
      btn.textContent = open ? "Fechar ▴" : "Quem votou? ▾";
    });
  });
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
