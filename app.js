const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2);
}

function makeChild(name = "Mein Kind") {
  return {
    id: uid(),
    childName: name,
    avatar: "🌟",
    fun: 2,
    goal: 3,
    interest: 5,
    goalName: "Neues Spiel",
    goalPrice: 70,
    tasks: [
      { id: uid(), title: "Zimmer aufräumen", reward: 2, done: false },
      { id: uid(), title: "Hausaufgaben erledigen", reward: 1, done: false },
      { id: uid(), title: "Extra helfen", reward: 1.5, done: false }
    ],
    history: []
  };
}

const demo = makeChild("Mia");
demo.id = "demo";
demo.avatar = "🦊";

let state = load() || {
  pin: "1234",
  parentUnlocked: false,
  activeChildId: "demo",
  children: [demo]
};

function load() {
  try { return JSON.parse(localStorage.getItem("taschengeld-taschen-pro-static")); }
  catch { return null; }
}

function save() {
  localStorage.setItem("taschengeld-taschen-pro-static", JSON.stringify(state));
}

function activeChild() {
  return state.children.find(c => c.id === state.activeChildId) || state.children[0];
}

function log(text) {
  return { id: uid(), date: new Date().toLocaleDateString("de-DE"), text };
}

function setChild(patcher) {
  const id = activeChild().id;
  state.children = state.children.map(c => c.id === id ? patcher(c) : c);
  save();
  render();
}

function byId(id) { return document.getElementById(id); }

function render() {
  const child = activeChild();
  const amount = Number(byId("amount")?.value || 1);
  const total = child.fun + child.goal + child.interest;
  const monthlyInterest = Math.floor(child.interest * 0.05 * 100) / 100;
  const bonus = child.interest >= 100 ? 10 : child.interest >= 50 ? 5 : 0;
  const goalPercent = Math.min(100, Math.round((child.goal / Math.max(1, child.goalPrice)) * 100));

  byId("status").textContent = state.parentUnlocked ? "Eltern-Modus aktiv" : "Kind-Modus: Geldänderungen gesperrt";

  byId("lockArea").innerHTML = state.parentUnlocked
    ? `<button class="btn" onclick="lockParent()">🔒 Eltern-Modus sperren</button>`
    : `<input id="pinInput" class="pin-input" type="password" placeholder="Eltern-PIN" />
       <button class="btn" onclick="unlockParent()">🔓 Entsperren</button>`;

  byId("childTabs").innerHTML = state.children.map(c =>
    `<button class="child-tab ${c.id === child.id ? "active" : ""}" onclick="selectChild('${c.id}')">${c.avatar} ${escapeHtml(c.childName)}</button>`
  ).join("");

  byId("addChildArea").innerHTML = state.parentUnlocked
    ? `<div class="add-row">
        <input id="newChildName" class="field" placeholder="Neues Kind" />
        <button class="btn" onclick="addChild()">➕ Hinzufügen</button>
      </div>`
    : "";

  byId("childName").value = child.childName;
  byId("childName").disabled = !state.parentUnlocked;
  byId("total").textContent = euro.format(total);
  byId("interestHint").textContent = `Aktuell wären das ${euro.format(monthlyInterest)} Zinsen pro Monat${bonus ? " plus " + euro.format(bonus) + " Bonus." : "."}`;
  byId("amount").disabled = !state.parentUnlocked;
  byId("paydayBtn").disabled = !state.parentUnlocked;

  const pockets = [
    { key: "fun", title: "Spaß-Tasche", icon: "😊", value: child.fun, text: "Für Eis, Karten, Haarspangen und kleine Wünsche.", color: "pink" },
    { key: "goal", title: "Ziel-Tasche", icon: "🎯", value: child.goal, text: `Sparen auf: ${escapeHtml(child.goalName)}`, color: "blue" },
    { key: "interest", title: "5%-Zinsen-Tasche", icon: "🐷", value: child.interest, text: "Geld wächst jeden Monat mit Mama-Bank-Zinsen.", color: "green" }
  ];

  byId("pockets").innerHTML = pockets.map(p => `
    <section class="card pocket ${p.color}">
      <div class="pocket-head">
        <div class="pocket-left">
          <div class="pocket-icon">${p.icon}</div>
          <div><h2>${p.title}</h2><p>${p.text}</p></div>
        </div>
        <div class="pocket-money">${euro.format(p.value)}</div>
      </div>
      ${p.key === "goal" ? `
        <div class="progress-wrap">
          <div class="progress-label"><span>${goalPercent}% geschafft</span><span>${euro.format(child.goalPrice)}</span></div>
          <div class="progress"><div style="width:${goalPercent}%"></div></div>
        </div>` : ""}
      <div class="button-grid">
        <button class="btn secondary" ${!state.parentUnlocked ? "disabled" : ""} onclick="changePocket('${p.key}', -${amount})">➖ Abziehen</button>
        <button class="btn" ${!state.parentUnlocked ? "disabled" : ""} onclick="changePocket('${p.key}', ${amount})">➕ Einzahlen</button>
      </div>
    </section>
  `).join("");

  byId("goalName").value = child.goalName;
  byId("goalPrice").value = child.goalPrice;
  byId("goalName").disabled = !state.parentUnlocked;
  byId("goalPrice").disabled = !state.parentUnlocked;

  byId("tasks").innerHTML = child.tasks.map(t => `
    <div class="task ${t.done ? "done" : ""}">
      <div><b>${t.done ? "✅ " : ""}${escapeHtml(t.title)}</b><p>${euro.format(t.reward)} Belohnung in die Spaß-Tasche</p></div>
      <div class="task-actions">
        <button ${!state.parentUnlocked || t.done ? "disabled" : ""} onclick="completeTask('${t.id}')">✅</button>
        <button ${!state.parentUnlocked ? "disabled" : ""} onclick="deleteTask('${t.id}')">🗑️</button>
      </div>
    </div>
  `).join("");

  byId("addTaskArea").innerHTML = state.parentUnlocked
    ? `<div class="add-row">
        <input id="taskTitle" class="field" placeholder="Neue Aufgabe" />
        <input id="taskReward" class="field" type="number" min="0" step="0.5" value="1" />
      </div>
      <div class="button-grid">
        <button class="btn" onclick="addTask()">➕ Aufgabe</button>
        <button class="btn secondary" onclick="resetTasks()">🔄 Woche neu</button>
      </div>`
    : "";

  byId("parentSettings").classList.toggle("hidden", !state.parentUnlocked);
  byId("deleteChildBtn").disabled = state.children.length <= 1;

  byId("history").innerHTML = child.history.length
    ? child.history.map(h => `<div class="log"><b>${h.date}</b> – ${escapeHtml(h.text)}</div>`).join("")
    : `<p class="muted">Noch keine Einträge.</p>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[s]));
}

window.unlockParent = function() {
  const input = byId("pinInput");
  if (input && input.value === state.pin) {
    state.parentUnlocked = true;
    save();
    render();
  } else alert("PIN stimmt nicht.");
};

window.lockParent = function() {
  state.parentUnlocked = false;
  save();
  render();
};

window.selectChild = function(id) {
  state.activeChildId = id;
  save();
  render();
};

window.addChild = function() {
  const input = byId("newChildName");
  if (!input || !input.value.trim()) return;
  const child = makeChild(input.value.trim());
  state.children.push(child);
  state.activeChildId = child.id;
  save();
  render();
};

window.changePocket = function(key, delta) {
  if (!state.parentUnlocked) return;
  setChild(c => {
    const label = key === "fun" ? "Spaß" : key === "goal" ? "Ziel" : "Zinsen";
    return {
      ...c,
      [key]: Math.max(0, Math.round((c[key] + delta) * 100) / 100),
      history: [log(`${delta > 0 ? "+" : ""}${euro.format(delta)} in ${label}`), ...c.history].slice(0, 30)
    };
  });
};

window.completeTask = function(taskId) {
  if (!state.parentUnlocked) return;
  setChild(c => {
    const task = c.tasks.find(t => t.id === taskId);
    if (!task || task.done) return c;
    return {
      ...c,
      fun: Math.round((c.fun + Number(task.reward || 0)) * 100) / 100,
      tasks: c.tasks.map(t => t.id === taskId ? { ...t, done: true } : t),
      history: [log(`Aufgabe erledigt: ${task.title} → +${euro.format(task.reward)} Spaß-Tasche`), ...c.history].slice(0, 30)
    };
  });
};

window.deleteTask = function(taskId) {
  if (!state.parentUnlocked) return;
  setChild(c => ({ ...c, tasks: c.tasks.filter(t => t.id !== taskId) }));
};

window.addTask = function() {
  const title = byId("taskTitle").value.trim();
  const reward = Number(byId("taskReward").value || 0);
  if (!title) return;
  setChild(c => ({ ...c, tasks: [...c.tasks, { id: uid(), title, reward, done: false }] }));
};

window.resetTasks = function() {
  setChild(c => ({
    ...c,
    tasks: c.tasks.map(t => ({ ...t, done: false })),
    history: [log("Aufgaben zurückgesetzt"), ...c.history].slice(0, 30)
  }));
};

byId("paydayBtn").addEventListener("click", () => {
  if (!state.parentUnlocked) return;
  setChild(c => {
    const interest = Math.floor(c.interest * 0.05 * 100) / 100;
    const bonus = c.interest >= 100 ? 10 : c.interest >= 50 ? 5 : 0;
    return {
      ...c,
      interest: Math.round((c.interest + interest + bonus) * 100) / 100,
      history: [log(`Mama-Bank: ${euro.format(interest)} Zinsen${bonus ? " + " + euro.format(bonus) + " Bonus" : ""}`), ...c.history].slice(0, 30)
    };
  });
});

byId("childName").addEventListener("input", e => setChild(c => ({ ...c, childName: e.target.value })));
byId("goalName").addEventListener("input", e => setChild(c => ({ ...c, goalName: e.target.value })));
byId("goalPrice").addEventListener("input", e => setChild(c => ({ ...c, goalPrice: Number(e.target.value || 0) })));
byId("amount").addEventListener("input", render);

byId("changePinBtn").addEventListener("click", () => {
  const value = byId("newPin").value;
  if (value.length < 4) return alert("Die neue PIN braucht mindestens 4 Zeichen.");
  state.pin = value;
  byId("newPin").value = "";
  save();
  alert("PIN geändert.");
});

byId("deleteChildBtn").addEventListener("click", () => {
  if (!state.parentUnlocked || state.children.length <= 1) return;
  state.children = state.children.filter(c => c.id !== activeChild().id);
  state.activeChildId = state.children[0].id;
  save();
  render();
});

byId("resetAllBtn").addEventListener("click", () => {
  if (!state.parentUnlocked) return;
  if (!confirm("Wirklich alles zurücksetzen?")) return;
  const child = makeChild("Mia");
  child.id = "demo";
  child.avatar = "🦊";
  state = { pin: "1234", parentUnlocked: false, activeChildId: "demo", children: [child] };
  save();
  render();
});

render();
