// ===== SISTEMA PRODEMAX ELITE - ULTRA AVANZADO =====

// ===== CONFIGURACIÓN GLOBAL =====
const CONFIG = {
  AI_DELAY: 1500,
  LIVE_UPDATE_INTERVAL: 3000,
  CHART_ANIMATION_DURATION: 1000,
  NOTIFICATION_DURATION: 5000,
  ODDS_UPDATE_INTERVAL: 5000
};

// ===== INICIALIZACIÓN DE DATOS AVANZADOS =====
if (!localStorage.getItem("users")) {
  const defaultUsers = [
    {
      id: 1,
      name: "SuperAdmin",
      email: "admin@prodemax.com",
      password: "admin123",
      role: "admin",
      avatar: "👨‍💼",
      level: "Élite",
      points: 15420,
      streak: 12,
      accuracy: 89.5,
      predictions: 134,
      lastLogin: new Date().toISOString(),
      favoriteTeam: "Boca Juniors",
      achievements: ["🏆 Maestro", "🔥 Racha de Oro", "🎯 Precisión Élite"],
      isPremium: true
    },
    {
      id: 2,
      name: "María Rodriguez",
      email: "maria@email.com",
      password: "123456",
      role: "vip",
      avatar: "👩‍🦰",
      level: "VIP",
      points: 8920,
      streak: 7,
      accuracy: 76.3,
      predictions: 89,
      lastLogin: new Date(Date.now() - 86400000).toISOString(),
      favoriteTeam: "River Plate",
      achievements: ["🎯 Precisión VIP", "💎 Usuario Premium"],
      isPremium: true
    },
    {
      id: 3,
      name: "Carlos Mendez",
      email: "carlos@email.com",
      password: "123456",
      role: "analyst",
      avatar: "👨‍🔬",
      level: "Analista",
      points: 12100,
      streak: 9,
      accuracy: 84.2,
      predictions: 156,
      lastLogin: new Date(Date.now() - 43200000).toISOString(),
      favoriteTeam: "Racing Club",
      achievements: ["📊 Analista Pro", "🧠 Cerebro Deportivo"],
      isPremium: true
    },
    {
      id: 4,
      name: "Ana García",
      email: "ana@email.com",
      password: "123456",
      role: "participant",
      avatar: "👩‍💻",
      level: "Pro",
      points: 3450,
      streak: 4,
      accuracy: 68.7,
      predictions: 67,
      lastLogin: new Date(Date.now() - 172800000).toISOString(),
      favoriteTeam: "Independiente",
      achievements: ["⭐ Rising Star"],
      isPremium: false
    }
  ];
  localStorage.setItem("users", JSON.stringify(defaultUsers));
}

if (!localStorage.getItem("matches")) {
  const teams = [
    "Boca Juniors", "River Plate", "Racing Club", "Independiente",
    "San Lorenzo", "Huracán", "Vélez Sarsfield", "Lanús",
    "Estudiantes", "Gimnasia LP", "Rosario Central", "Newell's",
    "Colón", "Unión", "Talleres", "Belgrano",
    "Argentinos Juniors", "Banfield", "Defensa y Justicia", "Godoy Cruz"
  ];
  
  let matches = [];
  let matchId = 1;
  
  for (let i = 0; i < teams.length; i += 2) {
    const match = {
      id: matchId++,
      team1: teams[i],
      team2: teams[i + 1],
      result: "",
      status: Math.random() > 0.7 ? "live" : Math.random() > 0.5 ? "finished" : "upcoming",
      score: { team1: 0, team2: 0 },
      minute: 0,
      date: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
      odds: {
        team1: (1.5 + Math.random() * 3).toFixed(2),
        draw: (2.8 + Math.random() * 1.5).toFixed(2),
        team2: (1.5 + Math.random() * 3).toFixed(2)
      },
      predictions: Math.floor(Math.random() * 500) + 50,
      aiPrediction: Math.random() > 0.33 ? (Math.random() > 0.5 ? "L" : "V") : "E",
      aiConfidence: Math.floor(Math.random() * 30) + 70,
      popularChoice: Math.random() > 0.33 ? (Math.random() > 0.5 ? "L" : "V") : "E",
      league: "Liga Profesional Argentina",
      stadium: `Estadio ${Math.random() > 0.5 ? teams[i] : teams[i + 1]}`,
      weather: ["Soleado", "Nublado", "Lluvia", "Viento"][Math.floor(Math.random() * 4)],
      temperature: Math.floor(Math.random() * 15) + 15 + "°C"
    };
    
    if (match.status === "live") {
      match.minute = Math.floor(Math.random() * 90) + 1;
      match.score.team1 = Math.floor(Math.random() * 4);
      match.score.team2 = Math.floor(Math.random() * 4);
    } else if (match.status === "finished") {
      match.minute = 90;
      match.score.team1 = Math.floor(Math.random() * 4);
      match.score.team2 = Math.floor(Math.random() * 4);
      match.result = match.score.team1 > match.score.team2 ? "L" : 
                     match.score.team1 < match.score.team2 ? "V" : "E";
    }
    
    matches.push(match);
  }
  
  localStorage.setItem("matches", JSON.stringify(matches));
}

// Inicializar predicciones y notificaciones
let predictions = JSON.parse(localStorage.getItem("predictions")) || {};
let notifications = JSON.parse(localStorage.getItem("notifications")) || [
  {
    id: 1,
    title: "¡Nuevo partido en vivo!",
    message: "Boca vs River comenzó hace 15 minutos",
    type: "live",
    time: new Date().toISOString(),
    read: false
  },
  {
    id: 2,
    title: "Predicción IA actualizada",
    message: "La IA cambió su predicción para Racing vs Independiente",
    type: "ai",
    time: new Date(Date.now() - 300000).toISOString(),
    read: false
  },
  {
    id: 3,
    title: "¡Racha de 5 aciertos!",
    message: "Felicitaciones, has alcanzado una nueva racha",
    type: "achievement",
    time: new Date(Date.now() - 600000).toISOString(),
    read: true
  }
];

let currentUser = null;
let currentTheme = localStorage.getItem("theme") || "light";
let liveUpdatesInterval = null;
let chartInstances = {};

// ===== ELEMENTOS DEL DOM =====
const elements = {
  startOptions: document.getElementById("start-options"),
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  matchesSection: document.getElementById("matches-section"),
  predictionsSection: document.getElementById("predictions-section"),
  dashboard: document.getElementById("dashboard"),
  navbar: document.querySelector(".navbar"),
  currentUserSpan: document.getElementById("current-user")
};

// ===== INICIALIZACIÓN AL CARGAR =====
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  setupEventListeners();
  loadTeamsIntoSelect();
  updateGlobalStats();
  if (currentTheme === "dark") {
    document.body.classList.add("dark");
    document.querySelector(".theme-toggle i").className = "fas fa-sun";
  }
});

function initializeApp() {
  // Verificar si hay sesión guardada
  const savedSession = localStorage.getItem("currentSession");
  if (savedSession) {
    const sessionData = JSON.parse(savedSession);
    if (new Date() - new Date(sessionData.timestamp) < 24 * 60 * 60 * 1000) { // 24 horas
      currentUser = sessionData.user;
      showUserInterface();
      return;
    } else {
      localStorage.removeItem("currentSession");
    }
  }
  
  showStartScreen();
}

function setupEventListeners() {
  // Navegación
  document.getElementById("show-register").onclick = showRegisterForm;
  document.getElementById("show-login").onclick = showLoginForm;
  document.getElementById("to-login").onclick = showLoginForm;
  document.getElementById("to-register").onclick = showRegisterForm;
  
  // Formularios
  document.querySelector("#register-form form").addEventListener("submit", handleRegister);
  document.querySelector("#login-form form").addEventListener("submit", handleLogin);
  
  // Logout
  document.getElementById("logout-admin").onclick = handleLogout;
  document.getElementById("logout-user").onclick = handleLogout;
  
  // Theme toggle
  document.getElementById("toggle-theme").onclick = toggleTheme;
  
  // Tabs
  setupTabs();
  
  // Password toggle
  document.querySelector(".password-toggle")?.addEventListener("click", togglePasswordVisibility);
  
  // Password strength
  document.getElementById("register-password")?.addEventListener("input", checkPasswordStrength);
  
  // Notificaciones
  document.getElementById("notifications-btn")?.addEventListener("click", showNotifications);
  
  // Modales
  document.querySelectorAll(".close-modal").forEach(btn => {
    btn.addEventListener("click", closeModal);
  });
  
  // Clicks fuera del modal
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  });
  
  // Funcionalidades avanzadas del admin
  setupAdminFeatures();
  
  // Funcionalidades avanzadas del usuario
  setupUserFeatures();
  
  // Live updates
  setupLiveUpdates();
}

// ===== NAVEGACIÓN Y VISTAS =====
function showStartScreen() {
  hideAllSections();
  elements.startOptions.classList.remove("hidden");
  elements.navbar.classList.add("hidden");
  updateRanking();
}

function showRegisterForm() {
  hideAllSections();
  elements.registerForm.classList.remove("hidden");
  elements.navbar.classList.add("hidden");
}

function showLoginForm() {
  hideAllSections();
  elements.loginForm.classList.remove("hidden");
  elements.navbar.classList.add("hidden");
}

function showUserInterface() {
  hideAllSections();
  elements.navbar.classList.remove("hidden");
  elements.currentUserSpan.textContent = `${currentUser.avatar} ${currentUser.name}`;
  elements.currentUserSpan.classList.remove("hidden");
  document.getElementById("notifications-btn").classList.remove("hidden");
  document.getElementById("stats-btn").classList.remove("hidden");
  document.getElementById("settings-btn").classList.remove("hidden");
  
  if (currentUser.role === "admin") {
    elements.matchesSection.classList.remove("hidden");
    loadAdminDashboard();
  } else {
    elements.predictionsSection.classList.remove("hidden");
    loadUserDashboard();
  }
  
  startLiveUpdates();
  showWelcomeNotification();
}

function hideAllSections() {
  Object.values(elements).forEach(el => {
    if (el) el.classList.add("hidden");
  });
}

// ===== AUTENTICACIÓN AVANZADA =====
function handleRegister(e) {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById("register-name").value,
    email: document.getElementById("register-email").value,
    password: document.getElementById("register-password").value,
    role: document.getElementById("register-role").value,
    favoriteTeam: document.getElementById("register-team").value || "Boca Juniors"
  };
  
  if (!formData.role) {
    showAdvancedAlert("Por favor seleccione un rol", "warning");
    return;
  }
  
  if (!formData.name || !formData.email || !formData.password) {
    showAdvancedAlert("Por favor complete los campos básicos", "warning");
    return;
  }
  
  let users = JSON.parse(localStorage.getItem("users")) || [];
  
  // Verificar si el email ya existe
  const existingUser = users.find(u => u.email === formData.email);
  if (existingUser) {
    showAdvancedAlert("Email ya registrado, intenta con otro", "warning");
    return;
  }
  
  const newUser = {
    id: users.length + 1,
    ...formData,
    avatar: getRandomAvatar(),
    level: formData.role === "admin" ? "Élite" : formData.role === "vip" ? "VIP" : "Novato",
    points: Math.floor(Math.random() * 1000),
    streak: 0,
    accuracy: 0,
    predictions: 0,
    lastLogin: new Date().toISOString(),
    achievements: ["🎯 Nuevo Usuario"],
    isPremium: formData.role === "vip" || formData.role === "admin"
  };
  
  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));
  
  showAdvancedAlert("¡Cuenta creada exitosamente! 🎉", "success");
  
  setTimeout(() => {
    document.getElementById("register-form").reset();
    showLoginForm();
  }, 1500);
}

function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const role = document.getElementById("login-role").value;
  const rememberMe = document.getElementById("remember-me").checked;
  
  if (!role) {
    showAdvancedAlert("Seleccione un rol", "warning");
    return;
  }
  
  const users = JSON.parse(localStorage.getItem("users")) || [];
  
  // Buscar usuario por email y password (sin validar rol estricto)
  let user = users.find(u => u.email === email && u.password === password);
  
  // Si no existe el usuario, crear uno automáticamente para el demo
  if (!user) {
    user = {
      id: users.length + 1,
      name: email.split('@')[0] || "Usuario Demo",
      email: email,
      password: password,
      role: role,
      avatar: getRandomAvatar(),
      level: role === "admin" ? "Élite" : role === "vip" ? "VIP" : "Pro",
      points: Math.floor(Math.random() * 5000) + 1000,
      streak: Math.floor(Math.random() * 10),
      accuracy: Math.floor(Math.random() * 40) + 60,
      predictions: Math.floor(Math.random() * 100) + 20,
      lastLogin: new Date().toISOString(),
      favoriteTeam: "Boca Juniors",
      achievements: ["🎯 Nuevo Usuario"],
      isPremium: role === "vip" || role === "admin"
    };
    
    users.push(user);
    localStorage.setItem("users", JSON.stringify(users));
    showAdvancedAlert("¡Cuenta creada automáticamente para el demo!", "success");
  } else {
    // Si el usuario existe pero el rol no coincide, actualizar el rol
    if (user.role !== role) {
      user.role = role;
      user.level = role === "admin" ? "Élite" : role === "vip" ? "VIP" : user.level;
      user.isPremium = role === "vip" || role === "admin";
      users[users.findIndex(u => u.id === user.id)] = user;
      localStorage.setItem("users", JSON.stringify(users));
    }
  }
  
  // Actualizar último login
  user.lastLogin = new Date().toISOString();
  users[users.findIndex(u => u.id === user.id)] = user;
  localStorage.setItem("users", JSON.stringify(users));
  
  currentUser = user;
  
  if (rememberMe) {
    localStorage.setItem("currentSession", JSON.stringify({
      user: user,
      timestamp: new Date().toISOString()
    }));
  }
  
  showAdvancedAlert(`¡Bienvenido ${user.name}! 👋`, "success");
  
  setTimeout(() => {
    showUserInterface();
  }, 1000);
}

function handleLogout() {
  showAdvancedAlert("Sesión cerrada correctamente", "info");
  
  localStorage.removeItem("currentSession");
  currentUser = null;
  stopLiveUpdates();
  
  setTimeout(() => {
    showStartScreen();
  }, 1000);
}

// ===== FUNCIONALIDADES ADMIN AVANZADAS =====
function setupAdminFeatures() {
  // Gestión de partidos
  document.getElementById("add-match")?.addEventListener("click", addNewMatch);
  document.getElementById("import-matches")?.addEventListener("click", importMatches);
  document.getElementById("auto-results")?.addEventListener("click", generateAutoResults);
  document.getElementById("publish-results")?.addEventListener("click", publishResults);
  
  // IA y Analytics
  document.getElementById("ai-assistant")?.addEventListener("click", showAIAssistant);
  document.getElementById("train-model")?.addEventListener("click", trainAIModel);
  document.getElementById("generate-predictions")?.addEventListener("click", generateAIPredictions);
  document.getElementById("analyze-patterns")?.addEventListener("click", analyzePatterns);
  
  // Acciones masivas
  document.getElementById("bulk-actions")?.addEventListener("click", showBulkActions);
  document.getElementById("export-all")?.addEventListener("click", exportAllData);
}

function loadAdminDashboard() {
  loadMatchesTable();
  loadUsersTable();
  loadAnalytics();
  updateAdminStats();
}

function loadMatchesTable() {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  const tbody = document.querySelector("#matches-table tbody");
  
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  matches.forEach(match => {
    const tr = document.createElement("tr");
    tr.className = `match-row status-${match.status}`;
    
    const statusIcon = {
      upcoming: "⏰",
      live: "🔴",
      finished: "✅"
    }[match.status];
    
    const resultDisplay = match.status === "finished" 
      ? `${match.score.team1} - ${match.score.team2}`
      : match.status === "live"
      ? `${match.score.team1} - ${match.score.team2} (${match.minute}')`
      : "vs";
    
    tr.innerHTML = `
      <td>
        <div class="match-datetime">
          <div>${match.date.toLocaleDateString()}</div>
          <div class="time">${match.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
      </td>
      <td>
        <div class="team-info">
          <strong>${match.team1}</strong>
          <div class="team-stats">Local • ${match.stadium}</div>
        </div>
      </td>
      <td class="match-result">
        <div class="result-display">
          ${statusIcon} ${resultDisplay}
        </div>
        <div class="result-controls">
          ${match.status !== "finished" ? `
            <button onclick="setMatchResult(${match.id}, 'L')" class="result-btn ${match.result === 'L' ? 'active' : ''}">1</button>
            <button onclick="setMatchResult(${match.id}, 'E')" class="result-btn ${match.result === 'E' ? 'active' : ''}">X</button>
            <button onclick="setMatchResult(${match.id}, 'V')" class="result-btn ${match.result === 'V' ? 'active' : ''}">2</button>
          ` : ''}
        </div>
      </td>
      <td>
        <div class="team-info">
          <strong>${match.team2}</strong>
          <div class="team-stats">Visitante • ${match.weather}</div>
        </div>
      </td>
      <td>
        <div class="odds-display">
          <div>1: ${match.odds.team1}</div>
          <div>X: ${match.odds.draw}</div>
          <div>2: ${match.odds.team2}</div>
        </div>
      </td>
      <td>
        <div class="predictions-count">
          <i class="fas fa-users"></i> ${match.predictions}
        </div>
      </td>
      <td>
        <div class="action-buttons">
          <button onclick="editMatch(${match.id})" class="btn-edit"><i class="fas fa-edit"></i></button>
          <button onclick="deleteMatch(${match.id})" class="btn-delete"><i class="fas fa-trash"></i></button>
          <button onclick="duplicateMatch(${match.id})" class="btn-copy"><i class="fas fa-copy"></i></button>
        </div>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

function loadUsersTable() {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const tbody = document.querySelector("#users-table tbody");
  
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  users.forEach(user => {
    const tr = document.createElement("tr");
    const statusClass = new Date() - new Date(user.lastLogin) < 86400000 ? "online" : "offline";
    const statusText = statusClass === "online" ? "En línea" : "Desconectado";
    
    tr.innerHTML = `
      <td>
        <div class="user-info">
          <span class="user-avatar">${user.avatar}</span>
          <div>
            <div class="user-name">${user.name}</div>
            <div class="user-email">${user.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="role-badge role-${user.role}">${user.role.toUpperCase()}</span>
      </td>
      <td>
        <div class="accuracy-display">
          <div class="accuracy-bar">
            <div class="accuracy-fill" style="width: ${user.accuracy}%"></div>
          </div>
          <span>${user.accuracy}%</span>
        </div>
      </td>
      <td>
        <div class="last-login">
          ${new Date(user.lastLogin).toLocaleDateString()}
          <div class="time">${new Date(user.lastLogin).toLocaleTimeString()}</div>
        </div>
      </td>
      <td>
        <span class="status-indicator ${statusClass}"></span>
        ${statusText}
      </td>
      <td>
        <div class="user-actions">
          <button onclick="viewUserDetails(${user.id})" class="btn-view"><i class="fas fa-eye"></i></button>
          <button onclick="editUser(${user.id})" class="btn-edit"><i class="fas fa-edit"></i></button>
          <button onclick="toggleUserStatus(${user.id})" class="btn-toggle"><i class="fas fa-power-off"></i></button>
        </div>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

// ===== FUNCIONALIDADES USUARIO AVANZADAS =====
function setupUserFeatures() {
  // Predicciones
  document.getElementById("save-predictions")?.addEventListener("click", savePredictions);
  document.getElementById("ai-suggest")?.addEventListener("click", getAISuggestions);
  document.getElementById("copy-expert")?.addEventListener("click", copyExpertPredictions);
  
  // Filtros
  document.getElementById("matches-filter")?.addEventListener("change", filterMatches);
  document.getElementById("ranking-filter")?.addEventListener("change", updateRanking);
  
  // IA Chat
  document.getElementById("send-ai-question")?.addEventListener("click", sendAIQuestion);
  document.getElementById("ai-question")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendAIQuestion();
  });
  
  // Acciones rápidas
  document.getElementById("quick-predict")?.addEventListener("click", quickPredict);
  document.getElementById("export-data")?.addEventListener("click", exportUserData);
  document.getElementById("share-rankings")?.addEventListener("click", shareRankings);
}

function loadUserDashboard() {
  loadPredictionsTable();
  loadUserStats();
  loadUserHistory();
  updateUserAchievements();
}

function loadPredictionsTable() {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  const tbody = document.querySelector("#predictions-table tbody");
  
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  if (!predictions[currentUser.email]) {
    predictions[currentUser.email] = {};
  }
  
  matches.forEach(match => {
    const userPrediction = predictions[currentUser.email][match.id] || {};
    const tr = document.createElement("tr");
    
    // Determinar el estado del pronóstico
    let predictionClass = "";
    if (match.status === "finished" && userPrediction.result) {
      predictionClass = userPrediction.result === match.result ? "correct-prediction" : "wrong-prediction";
    }
    
    tr.className = predictionClass;
    
    const popularPercentage = Math.floor(Math.random() * 100);
    const aiConfidenceColor = match.aiConfidence > 80 ? "#10b981" : match.aiConfidence > 60 ? "#f59e0b" : "#ef4444";
    
    tr.innerHTML = `
      <td>
        <div class="match-time">
          <div>${match.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          <div class="match-status status-${match.status}">
            ${match.status === "live" ? "🔴 EN VIVO" : match.status === "finished" ? "✅ FINAL" : "⏰ PRÓXIMO"}
          </div>
        </div>
      </td>
      <td>
        <div class="team-prediction">
          <strong>${match.team1}</strong>
          <div class="team-form">Local • ${match.odds.team1}</div>
        </div>
      </td>
      <td>
        <div class="prediction-buttons">
          <button onclick="makePrediction(${match.id}, 'L')" 
                  class="prediction-btn ${userPrediction.result === 'L' ? 'selected' : ''}"
                  ${match.status !== "upcoming" ? 'disabled' : ''}>
            <span>1</span>
            <small>${match.odds.team1}</small>
          </button>
          <button onclick="makePrediction(${match.id}, 'E')" 
                  class="prediction-btn ${userPrediction.result === 'E' ? 'selected' : ''}"
                  ${match.status !== "upcoming" ? 'disabled' : ''}>
            <span>X</span>
            <small>${match.odds.draw}</small>
          </button>
          <button onclick="makePrediction(${match.id}, 'V')" 
                  class="prediction-btn ${userPrediction.result === 'V' ? 'selected' : ''}"
                  ${match.status !== "upcoming" ? 'disabled' : ''}>
            <span>2</span>
            <small>${match.odds.team2}</small>
          </button>
        </div>
      </td>
      <td>
        <div class="team-prediction">
          <strong>${match.team2}</strong>
          <div class="team-form">Visitante • ${match.odds.team2}</div>
        </div>
      </td>
      <td>
        <div class="odds-summary">
          <div class="favorite">${match.odds.team1 < match.odds.team2 ? match.team1 : match.team2}</div>
          <div class="odds-favorite">${Math.min(match.odds.team1, match.odds.team2)}</div>
        </div>
      </td>
      <td>
        <div class="ai-prediction">
          <div class="ai-choice">${match.aiPrediction === 'L' ? '1' : match.aiPrediction === 'E' ? 'X' : '2'}</div>
          <div class="ai-confidence" style="color: ${aiConfidenceColor}">${match.aiConfidence}%</div>
        </div>
      </td>
      <td>
        <div class="popular-choice">
          <div class="popular-option">${match.popularChoice === 'L' ? '1' : match.popularChoice === 'E' ? 'X' : '2'}</div>
          <div class="popular-percentage">${popularPercentage}%</div>
        </div>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

// ===== SISTEMA DE PREDICCIONES =====
function makePrediction(matchId, choice) {
  if (!predictions[currentUser.email]) {
    predictions[currentUser.email] = {};
  }
  
  if (!predictions[currentUser.email][matchId]) {
    predictions[currentUser.email][matchId] = {};
  }
  
  predictions[currentUser.email][matchId].result = choice;
  predictions[currentUser.email][matchId].timestamp = new Date().toISOString();
  predictions[currentUser.email][matchId].confidence = Math.floor(Math.random() * 30) + 70;
  
  localStorage.setItem("predictions", JSON.stringify(predictions));
  
  showAdvancedAlert(`Predicción guardada: ${choice === 'L' ? 'Local' : choice === 'E' ? 'Empate' : 'Visitante'}`, "success");
  
  loadPredictionsTable();
  updateUserStats();
}

function setMatchResult(matchId, result) {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  const matchIndex = matches.findIndex(m => m.id === matchId);
  
  if (matchIndex !== -1) {
    matches[matchIndex].result = result;
    matches[matchIndex].status = "finished";
    
    // Simular puntaje basado en el resultado
    if (result === "L") {
      matches[matchIndex].score.team1 = Math.floor(Math.random() * 3) + 1;
      matches[matchIndex].score.team2 = Math.floor(Math.random() * 2);
    } else if (result === "V") {
      matches[matchIndex].score.team1 = Math.floor(Math.random() * 2);
      matches[matchIndex].score.team2 = Math.floor(Math.random() * 3) + 1;
    } else {
      const score = Math.floor(Math.random() * 3);
      matches[matchIndex].score.team1 = score;
      matches[matchIndex].score.team2 = score;
    }
    
    localStorage.setItem("matches", JSON.stringify(matches));
    loadMatchesTable();
    updateAllStats();
    
    showAdvancedAlert("Resultado actualizado correctamente", "success");
  }
}

// ===== SISTEMA DE NOTIFICACIONES =====
function showNotifications() {
  const modal = document.getElementById("notification-modal");
  const list = document.getElementById("notifications-list");
  
  list.innerHTML = "";
  
  notifications.forEach(notification => {
    const notifEl = document.createElement("div");
    notifEl.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
    
    const timeAgo = getTimeAgo(new Date(notification.time));
    
    notifEl.innerHTML = `
      <div class="notification-icon ${notification.type}">
        ${getNotificationIcon(notification.type)}
      </div>
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-time">${timeAgo}</div>
      </div>
      <button onclick="markAsRead(${notification.id})" class="mark-read-btn">
        <i class="fas fa-check"></i>
      </button>
    `;
    
    list.appendChild(notifEl);
  });
  
  modal.classList.remove("hidden");
}

function getNotificationIcon(type) {
  const icons = {
    live: "🔴",
    ai: "🤖",
    achievement: "🏆",
    warning: "⚠️",
    info: "ℹ️"
  };
  return icons[type] || "📢";
}

function markAsRead(notificationId) {
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index !== -1) {
    notifications[index].read = true;
    localStorage.setItem("notifications", JSON.stringify(notifications));
    updateNotificationBadge();
    showNotifications(); // Refresh
  }
}

function updateNotificationBadge() {
  const unreadCount = notifications.filter(n => !n.read).length;
  const badge = document.querySelector("#notifications-btn .badge");
  if (badge) {
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? "flex" : "none";
  }
}

// ===== SISTEMA DE TABS =====
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      switchTab(tabId, btn.closest(".admin-tabs, .predictions-tabs"));
    });
  });
}

function switchTab(targetTabId, container) {
  // Desactivar todos los tabs del contenedor
  container.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  container.parentElement.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
  
  // Activar el tab seleccionado
  container.querySelector(`[data-tab="${targetTabId}"]`).classList.add("active");
  document.getElementById(targetTabId).classList.add("active");
  
  // Cargar contenido específico del tab
  loadTabContent(targetTabId);
}

function loadTabContent(tabId) {
  switch (tabId) {
    case "analytics-tab":
      loadAnalyticsCharts();
      break;
    case "users-tab":
      loadUsersTable();
      break;
    case "ai-tab":
      loadAIInsights();
      break;
    case "history-tab":
      loadUserPerformanceChart();
      break;
    case "ai-help-tab":
      loadAIChatHistory();
      break;
    case "social-tab":
      loadSocialFeatures();
      break;
  }
}

// ===== SISTEMA DE RANKINGS =====
function updateRanking() {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const filter = document.getElementById("ranking-filter")?.value || "general";
  
  let ranking = users.filter(u => u.role === "participant" || u.role === "vip" || u.role === "analyst").map(u => {
    let correct = 0;
    let total = 0;
    let points = 0;
    let streak = 0;
    let currentStreak = 0;
    
    matches.forEach(m => {
      if (m.status === "finished") {
        const userPred = predictions[u.email]?.[m.id];
        if (userPred && userPred.result) {
          total++;
          if (userPred.result === m.result) {
            correct++;
            points += getPointsForPrediction(m, userPred);
            currentStreak++;
            streak = Math.max(streak, currentStreak);
          } else {
            currentStreak = 0;
          }
        }
      }
    });
    
    const accuracy = total > 0 ? ((correct / total) * 100) : 0;
    
    // Actualizar stats del usuario
    u.accuracy = accuracy.toFixed(1);
    u.streak = currentStreak;
    u.points = points;
    u.predictions = total;
    
    return {
      ...u,
      correct,
      total,
      accuracy: parseFloat(accuracy.toFixed(1)),
      points,
      streak: currentStreak,
      maxStreak: streak
    };
  });
  
  // Aplicar filtro temporal
  if (filter === "monthly") {
    // Filtrar por este mes (simulado)
    ranking = ranking.map(r => ({...r, points: Math.floor(r.points * 0.3)}));
  } else if (filter === "weekly") {
    // Filtrar por esta semana (simulado)
    ranking = ranking.map(r => ({...r, points: Math.floor(r.points * 0.1)}));
  }
  
  ranking.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.streak - a.streak;
  });
  
  const tbody = document.querySelector("#ranking-table tbody");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  ranking.forEach((user, index) => {
    const tr = document.createElement("tr");
    
    let positionIcon = "";
    if (index === 0) positionIcon = "🥇";
    else if (index === 1) positionIcon = "🥈";
    else if (index === 2) positionIcon = "🥉";
    
    const levelBadge = getLevelBadge(user.points);
    
    tr.innerHTML = `
      <td>
        <div class="position">
          <span class="rank-number">${index + 1}</span>
          <span class="rank-icon">${positionIcon}</span>
        </div>
      </td>
      <td>
        <div class="participant-info">
          <span class="user-avatar">${user.avatar}</span>
          <div>
            <div class="user-name">${user.name}</div>
            <div class="user-level">${levelBadge}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="accuracy-display">
          <span class="correct-count">${user.correct}/${user.total}</span>
        </div>
      </td>
      <td>
        <div class="accuracy-percentage">
          <div class="accuracy-bar">
            <div class="accuracy-fill" style="width: ${user.accuracy}%"></div>
          </div>
          <span>${user.accuracy}%</span>
        </div>
      </td>
      <td>
        <div class="points-display">
          <span class="points-number">${user.points}</span>
          <small>pts</small>
        </div>
      </td>
      <td>
        <div class="streak-display">
          <span class="streak-number">${user.streak}</span>
          <span class="streak-icon">${user.streak > 0 ? "🔥" : "❄️"}</span>
        </div>
      </td>
    `;
    
    // Destacar al usuario actual
    if (currentUser && user.id === currentUser.id) {
      tr.classList.add("current-user-row");
    }
    
    tbody.appendChild(tr);
  });
  
  // Actualizar usuarios en localStorage
  localStorage.setItem("users", JSON.stringify(users));
}

// ===== FUNCIONES AUXILIARES =====
function getPointsForPrediction(match, prediction) {
  let points = 10; // Puntos base por acierto
  
  // Bonus por dificultad (odds más altas = más puntos)
  const avgOdds = (parseFloat(match.odds.team1) + parseFloat(match.odds.draw) + parseFloat(match.odds.team2)) / 3;
  if (avgOdds > 2.5) points += 5;
  
  // Bonus por confianza de la predicción
  if (prediction.confidence > 80) points += 3;
  
  // Bonus por partidazos importantes (simulado)
  if (match.predictions > 200) points += 2;
  
  return points;
}

function getLevelBadge(points) {
  if (points >= 10000) return "🏆 Maestro";
  if (points >= 5000) return "💎 Élite";
  if (points >= 2000) return "⭐ Pro";
  if (points >= 500) return "🥉 Avanzado";
  if (points >= 100) return "🥈 Intermedio";
  return "🥉 Novato";
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

function getRandomAvatar() {
  const avatars = ["👨‍💼", "👩‍💼", "👨‍🎓", "👩‍🎓", "👨‍💻", "👩‍💻", "👨‍🔬", "👩‍🔬", "👨‍🎨", "👩‍🎨"];
  return avatars[Math.floor(Math.random() * avatars.length)];
}

function loadTeamsIntoSelect() {
  const teams = ["Boca Juniors", "River Plate", "Racing Club", "Independiente", "San Lorenzo", "Huracán"];
  const select = document.getElementById("register-team");
  
  if (select) {
    teams.forEach(team => {
      const option = document.createElement("option");
      option.value = team;
      option.textContent = team;
      select.appendChild(option);
    });
  }
}

// ===== SISTEMA DE ALERTAS AVANZADAS =====
function showAdvancedAlert(message, type = "info", duration = 3000) {
  const alertEl = document.createElement("div");
  alertEl.className = `advanced-alert alert-${type}`;
  
  const icon = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️"
  }[type];
  
  alertEl.innerHTML = `
    <div class="alert-content">
      <span class="alert-icon">${icon}</span>
      <span class="alert-message">${message}</span>
    </div>
    <button class="alert-close">&times;</button>
  `;
  
  alertEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    background: var(--light-card);
    border: 1px solid var(--light-border);
    box-shadow: var(--shadow-xl);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 300px;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  
  if (type === "success") {
    alertEl.style.borderLeftColor = "var(--success-color)";
    alertEl.style.borderLeftWidth = "4px";
  } else if (type === "error") {
    alertEl.style.borderLeftColor = "var(--danger-color)";
    alertEl.style.borderLeftWidth = "4px";
  } else if (type === "warning") {
    alertEl.style.borderLeftColor = "var(--warning-color)";
    alertEl.style.borderLeftWidth = "4px";
  }
  
  document.body.appendChild(alertEl);
  
  // Animar entrada
  setTimeout(() => {
    alertEl.style.transform = "translateX(0)";
  }, 100);
  
  // Cerrar automáticamente
  setTimeout(() => {
    alertEl.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (alertEl.parentNode) {
        alertEl.parentNode.removeChild(alertEl);
      }
    }, 300);
  }, duration);
  
  // Botón cerrar
  alertEl.querySelector(".alert-close").addEventListener("click", () => {
    alertEl.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (alertEl.parentNode) {
        alertEl.parentNode.removeChild(alertEl);
      }
    }, 300);
  });
}

// ===== FUNCIONES DE SIMULACIÓN (CONTINUARÁ...) =====
function toggleTheme() {
  document.body.classList.toggle("dark");
  const icon = document.querySelector(".theme-toggle i");
  
  if (document.body.classList.contains("dark")) {
    icon.className = "fas fa-sun";
    currentTheme = "dark";
  } else {
    icon.className = "fas fa-moon";
    currentTheme = "light";
  }
  
  localStorage.setItem("theme", currentTheme);
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById("login-password");
  const icon = document.querySelector(".password-toggle i");
  
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    icon.className = "fas fa-eye-slash";
  } else {
    passwordInput.type = "password";
    icon.className = "fas fa-eye";
  }
}

function checkPasswordStrength() {
  const password = document.getElementById("register-password").value;
  const strengthIndicator = document.querySelector(".password-strength");
  
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  strengthIndicator.className = "password-strength";
  if (strength <= 1) strengthIndicator.classList.add("weak");
  else if (strength <= 2) strengthIndicator.classList.add("medium");
  else strengthIndicator.classList.add("strong");
}

function closeModal() {
  document.querySelectorAll(".modal").forEach(modal => {
    modal.classList.add("hidden");
  });
}

// ===== MÁS FUNCIONES AVANZADAS (CONTINUACIÓN) =====

// ===== SISTEMA DE UPDATES EN VIVO =====
function startLiveUpdates() {
  if (liveUpdatesInterval) return;
  
  liveUpdatesInterval = setInterval(() => {
    updateLiveMatches();
    updateOdds();
    generateRandomNotifications();
  }, CONFIG.LIVE_UPDATE_INTERVAL);
}

function stopLiveUpdates() {
  if (liveUpdatesInterval) {
    clearInterval(liveUpdatesInterval);
    liveUpdatesInterval = null;
  }
}

function updateLiveMatches() {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  let updated = false;
  
  matches.forEach(match => {
    if (match.status === "live") {
      // Simular progresión del partido
      if (Math.random() > 0.7) {
        match.minute = Math.min(match.minute + 1, 90);
        
        // Simular goles ocasionales
        if (Math.random() > 0.95) {
          if (Math.random() > 0.5) {
            match.score.team1++;
          } else {
            match.score.team2++;
          }
          
          // Crear notificación de gol
          const goalNotification = {
            id: Date.now(),
            title: "¡GOL!",
            message: `${match.team1} ${match.score.team1} - ${match.score.team2} ${match.team2}`,
            type: "live",
            time: new Date().toISOString(),
            read: false
          };
          
          notifications.unshift(goalNotification);
          localStorage.setItem("notifications", JSON.stringify(notifications));
          updateNotificationBadge();
        }
        
        // Finalizar partido
        if (match.minute >= 90 && Math.random() > 0.8) {
          match.status = "finished";
          match.result = match.score.team1 > match.score.team2 ? "L" : 
                         match.score.team1 < match.score.team2 ? "V" : "E";
        }
        
        updated = true;
      }
    }
  });
  
  if (updated) {
    localStorage.setItem("matches", JSON.stringify(matches));
    if (currentUser?.role === "admin") {
      loadMatchesTable();
    } else {
      loadPredictionsTable();
    }
    updateLiveMatchesWidget();
  }
}

function updateOdds() {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  let updated = false;
  
  matches.forEach(match => {
    if (match.status === "upcoming" && Math.random() > 0.8) {
      // Fluctuar odds ligeramente
      const fluctuation = 0.1;
      match.odds.team1 = Math.max(1.1, (parseFloat(match.odds.team1) + (Math.random() - 0.5) * fluctuation)).toFixed(2);
      match.odds.draw = Math.max(1.1, (parseFloat(match.odds.draw) + (Math.random() - 0.5) * fluctuation)).toFixed(2);
      match.odds.team2 = Math.max(1.1, (parseFloat(match.odds.team2) + (Math.random() - 0.5) * fluctuation)).toFixed(2);
      updated = true;
    }
  });
  
  if (updated) {
    localStorage.setItem("matches", JSON.stringify(matches));
    if (currentUser) {
      loadPredictionsTable();
      loadMatchesTable();
    }
  }
}

function updateLiveMatchesWidget() {
  const container = document.getElementById("live-matches-container");
  if (!container) return;
  
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  const liveMatches = matches.filter(m => m.status === "live").slice(0, 3);
  
  container.innerHTML = "";
  
  if (liveMatches.length === 0) {
    container.innerHTML = `
      <div class="no-live-matches">
        <i class="fas fa-tv"></i>
        <p>No hay partidos en vivo</p>
      </div>
    `;
    return;
  }
  
  liveMatches.forEach(match => {
    const matchEl = document.createElement("div");
    matchEl.className = "live-match-item";
    
    matchEl.innerHTML = `
      <div class="live-match-header">
        <span class="live-indicator">🔴 EN VIVO</span>
        <span class="match-minute">${match.minute}'</span>
      </div>
      <div class="live-match-teams">
        <div class="team-score">
          <span class="team-name">${match.team1}</span>
          <span class="score">${match.score.team1}</span>
        </div>
        <div class="vs">-</div>
        <div class="team-score">
          <span class="score">${match.score.team2}</span>
          <span class="team-name">${match.team2}</span>
        </div>
      </div>
    `;
    
    container.appendChild(matchEl);
  });
}

// ===== FUNCIONES DE IA AVANZADAS =====
function getAISuggestions() {
  showAdvancedAlert("🤖 Analizando partidos con IA...", "info");
  
  setTimeout(() => {
    const matches = JSON.parse(localStorage.getItem("matches")) || [];
    const upcomingMatches = matches.filter(m => m.status === "upcoming");
    
    if (upcomingMatches.length === 0) {
      showAdvancedAlert("No hay partidos próximos para analizar", "warning");
      return;
    }
    
    // Simular análisis de IA
    upcomingMatches.slice(0, 3).forEach((match, index) => {
      setTimeout(() => {
        const suggestions = [
          `${match.team1} tiene 73% de probabilidad de ganar según el análisis histórico`,
          `Se recomienda apostar por más de 2.5 goles en este partido`,
          `El empate es la opción más segura con 65% de confianza`,
          `${match.team2} viene en racha y es una buena opción de valor`
        ];
        
        const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        showAdvancedAlert(`🧠 IA: ${randomSuggestion}`, "info", 5000);
      }, index * 1000);
    });
  }, CONFIG.AI_DELAY);
}

function sendAIQuestion() {
  const input = document.getElementById("ai-question");
  const question = input.value.trim();
  
  if (!question) return;
  
  const messagesContainer = document.getElementById("ai-messages");
  
  // Agregar pregunta del usuario
  const userMessage = document.createElement("div");
  userMessage.className = "ai-message user-message";
  userMessage.innerHTML = `
    <div class="message-content">
      <span class="message-avatar">👤</span>
      <span class="message-text">${question}</span>
    </div>
    <div class="message-time">${new Date().toLocaleTimeString()}</div>
  `;
  messagesContainer.appendChild(userMessage);
  
  // Limpiar input
  input.value = "";
  
  // Simular respuesta de IA
  setTimeout(() => {
    const aiMessage = document.createElement("div");
    aiMessage.className = "ai-message ai-response";
    
    const responses = [
      "Basándome en el análisis de datos históricos, recomiendo considerar las estadísticas de enfrentamientos directos.",
      "La forma actual de los equipos es crucial. Te sugiero revisar los últimos 5 partidos de cada equipo.",
      "Los factores climáticos y de localía pueden influir significativamente en el resultado.",
      "Considera las bajas por lesión y suspensiones antes de hacer tu predicción.",
      "El momento de la temporada es importante. Los equipos suelen cambiar su rendimiento según sus objetivos."
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    aiMessage.innerHTML = `
      <div class="message-content">
        <span class="message-avatar">🤖</span>
        <span class="message-text">${randomResponse}</span>
      </div>
      <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;
    
    messagesContainer.appendChild(aiMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 1500);
}

function quickPredict() {
  showAdvancedAlert("🎯 Generando predicción rápida con IA...", "info");
  
  setTimeout(() => {
    const matches = JSON.parse(localStorage.getItem("matches")) || [];
    const upcomingMatch = matches.find(m => m.status === "upcoming");
    
    if (!upcomingMatch) {
      showAdvancedAlert("No hay partidos disponibles para predicción rápida", "warning");
      return;
    }
    
    const predictions = ["L", "E", "V"];
    const randomPrediction = predictions[Math.floor(Math.random() * predictions.length)];
    
    makePrediction(upcomingMatch.id, randomPrediction);
    
    const predictionText = randomPrediction === "L" ? upcomingMatch.team1 : 
                          randomPrediction === "E" ? "Empate" : upcomingMatch.team2;
    
    showAdvancedAlert(`🎯 IA predice: ${predictionText} (Confianza: ${Math.floor(Math.random() * 30) + 70}%)`, "success");
  }, 2000);
}

// ===== FUNCIONES ADMIN AVANZADAS =====
function addNewMatch() {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h3><i class="fas fa-plus"></i> Agregar Nuevo Partido</h3>
      <form id="new-match-form">
        <div class="input-group">
          <i class="fas fa-home"></i>
          <input type="text" id="new-team1" placeholder="Equipo Local" required>
        </div>
        <div class="input-group">
          <i class="fas fa-plane"></i>
          <input type="text" id="new-team2" placeholder="Equipo Visitante" required>
        </div>
        <div class="input-group">
          <i class="fas fa-calendar"></i>
          <input type="datetime-local" id="new-date" required>
        </div>
        <div class="input-group">
          <i class="fas fa-map-marker-alt"></i>
          <input type="text" id="new-stadium" placeholder="Estadio" required>
        </div>
        <div class="form-buttons">
          <button type="submit" class="btn-primary">Crear Partido</button>
          <button type="button" class="btn-secondary close-modal">Cancelar</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.classList.remove("hidden");
  
  modal.querySelector("#new-match-form").addEventListener("submit", (e) => {
    e.preventDefault();
    
    const matches = JSON.parse(localStorage.getItem("matches")) || [];
    const newMatch = {
      id: Math.max(...matches.map(m => m.id)) + 1,
      team1: document.getElementById("new-team1").value,
      team2: document.getElementById("new-team2").value,
      date: new Date(document.getElementById("new-date").value),
      stadium: document.getElementById("new-stadium").value,
      result: "",
      status: "upcoming",
      score: { team1: 0, team2: 0 },
      minute: 0,
      odds: {
        team1: (1.5 + Math.random() * 3).toFixed(2),
        draw: (2.8 + Math.random() * 1.5).toFixed(2),
        team2: (1.5 + Math.random() * 3).toFixed(2)
      },
      predictions: 0,
      aiPrediction: ["L", "E", "V"][Math.floor(Math.random() * 3)],
      aiConfidence: Math.floor(Math.random() * 30) + 70,
      popularChoice: ["L", "E", "V"][Math.floor(Math.random() * 3)],
      league: "Liga Profesional Argentina",
      weather: ["Soleado", "Nublado", "Lluvia"][Math.floor(Math.random() * 3)],
      temperature: Math.floor(Math.random() * 15) + 15 + "°C"
    };
    
    matches.push(newMatch);
    localStorage.setItem("matches", JSON.stringify(matches));
    
    showAdvancedAlert("Partido creado exitosamente", "success");
    loadMatchesTable();
    modal.remove();
  });
  
  modal.querySelector(".close-modal").addEventListener("click", () => {
    modal.remove();
  });
}

function generateAutoResults() {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  let count = 0;
  
  matches.forEach(match => {
    if (match.status === "upcoming" && Math.random() > 0.5) {
      const results = ["L", "E", "V"];
      match.result = results[Math.floor(Math.random() * results.length)];
      match.status = "finished";
      
      // Generar puntajes
      if (match.result === "L") {
        match.score.team1 = Math.floor(Math.random() * 3) + 1;
        match.score.team2 = Math.floor(Math.random() * match.score.team1);
      } else if (match.result === "V") {
        match.score.team2 = Math.floor(Math.random() * 3) + 1;
        match.score.team1 = Math.floor(Math.random() * match.score.team2);
      } else {
        const score = Math.floor(Math.random() * 3);
        match.score.team1 = score;
        match.score.team2 = score;
      }
      
      count++;
    }
  });
  
  localStorage.setItem("matches", JSON.stringify(matches));
  showAdvancedAlert(`Se generaron ${count} resultados automáticamente`, "success");
  loadMatchesTable();
  updateAllStats();
}

function trainAIModel() {
  showAdvancedAlert("🤖 Entrenando modelo de IA...", "info");
  
  // Simular entrenamiento con barra de progreso
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 100) {
      progress = 100;
      clearInterval(progressInterval);
      showAdvancedAlert("✅ Modelo de IA entrenado exitosamente. Precisión mejorada al 94.7%", "success");
    } else {
      showAdvancedAlert(`⏳ Entrenando... ${Math.floor(progress)}%`, "info", 1000);
    }
  }, 500);
}

function analyzePatterns() {
  showAdvancedAlert("📊 Analizando patrones de predicción...", "info");
  
  setTimeout(() => {
    const insights = [
      "🔍 Patrón detectado: Los equipos locales tienen 67% más probabilidad de ganar los domingos",
      "📈 Tendencia: Las predicciones son 23% más precisas en partidos con odds balanceadas",
      "⚡ Insight: Los usuarios VIP predicen empates con 31% más precisión que usuarios regulares",
      "🎯 Análisis: Los partidos de equipos grandes generan 45% más predicciones",
      "🧠 Descubrimiento: La precisión mejora 18% cuando se usan sugerencias de IA"
    ];
    
    insights.forEach((insight, index) => {
      setTimeout(() => {
        showAdvancedAlert(insight, "info", 4000);
      }, index * 1500);
    });
  }, 2000);
}

// ===== SISTEMA DE ESTADÍSTICAS GLOBALES =====
function updateGlobalStats() {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  
  let totalPredictions = 0;
  let totalCorrect = 0;
  
  users.forEach(user => {
    if (predictions[user.email]) {
      Object.keys(predictions[user.email]).forEach(matchId => {
        const match = matches.find(m => m.id === parseInt(matchId));
        if (match && match.status === "finished") {
          totalPredictions++;
          if (predictions[user.email][matchId].result === match.result) {
            totalCorrect++;
          }
        }
      });
    }
  });
  
  const activeUsers = users.filter(u => {
    const lastLogin = new Date(u.lastLogin);
    const daysSinceLogin = (new Date() - lastLogin) / (1000 * 60 * 60 * 24);
    return daysSinceLogin < 7;
  }).length;
  
  const accuracyRate = totalPredictions > 0 ? ((totalCorrect / totalPredictions) * 100).toFixed(1) : 0;
  
  // Actualizar widgets del dashboard
  document.getElementById("total-users").textContent = activeUsers;
  document.getElementById("total-predictions").textContent = totalPredictions;
  document.getElementById("accuracy-rate").textContent = accuracyRate + "%";
}

function updateAllStats() {
  updateGlobalStats();
  updateRanking();
  if (currentUser) {
    updateUserStats();
  }
}

function updateUserStats() {
  if (!currentUser) return;
  
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  let correct = 0, total = 0, currentStreak = 0, maxStreak = 0, tempStreak = 0;
  
  matches.forEach(match => {
    if (match.status === "finished") {
      const userPred = predictions[currentUser.email]?.[match.id];
      if (userPred && userPred.result) {
        total++;
        if (userPred.result === match.result) {
          correct++;
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
    }
  });
  
  currentStreak = tempStreak;
  const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;
  const points = correct * 10; // Simplificado
  
  // Actualizar UI
  document.getElementById("user-accuracy").textContent = accuracy + "%";
  document.getElementById("user-streak").textContent = currentStreak;
  document.getElementById("user-points").textContent = points;
  
  // Actualizar datos del usuario
  currentUser.accuracy = accuracy;
  currentUser.streak = currentStreak;
  currentUser.points = points;
  currentUser.predictions = total;
}

// ===== FUNCIONES DE EXPORTACIÓN =====
function exportUserData() {
  showAdvancedAlert("📊 Exportando tus datos...", "info");
  
  setTimeout(() => {
    const userData = {
      user: currentUser,
      predictions: predictions[currentUser.email] || {},
      exportDate: new Date().toISOString(),
      totalMatches: Object.keys(predictions[currentUser.email] || {}).length
    };
    
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `prodemax_${currentUser.name}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showAdvancedAlert("✅ Datos exportados exitosamente", "success");
  }, 1500);
}

function exportAllData() {
  showAdvancedAlert("📊 Exportando todos los datos del sistema...", "info");
  
  setTimeout(() => {
    const allData = {
      users: JSON.parse(localStorage.getItem("users")) || [],
      matches: JSON.parse(localStorage.getItem("matches")) || [],
      predictions: predictions,
      notifications: notifications,
      exportDate: new Date().toISOString(),
      systemVersion: "ProdeMax Elite v2.0"
    };
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `prodemax_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showAdvancedAlert("✅ Backup completo generado exitosamente", "success");
  }, 2000);
}

// ===== NOTIFICACIONES DINÁMICAS =====
function generateRandomNotifications() {
  if (Math.random() > 0.95) { // 5% de probabilidad cada update
    const notificationTypes = [
      {
        title: "¡Nueva racha alcanzada!",
        message: "Un usuario ha alcanzado una racha de 8 aciertos consecutivos",
        type: "achievement"
      },
      {
        title: "Cambio en las odds",
        message: "Las cuotas han cambiado significativamente en el partido más popular",
        type: "info"
      },
      {
        title: "Predicción masiva",
        message: "Más del 80% de usuarios coinciden en el mismo resultado",
        type: "info"
      },
      {
        title: "IA actualizada",
        message: "El modelo de inteligencia artificial ha actualizado sus predicciones",
        type: "ai"
      }
    ];
    
    const randomNotif = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
    
    const newNotification = {
      id: Date.now(),
      ...randomNotif,
      time: new Date().toISOString(),
      read: false
    };
    
    notifications.unshift(newNotification);
    
    // Mantener máximo 20 notificaciones
    if (notifications.length > 20) {
      notifications = notifications.slice(0, 20);
    }
    
    localStorage.setItem("notifications", JSON.stringify(notifications));
    updateNotificationBadge();
  }
}

function showWelcomeNotification() {
  const welcomeMessage = currentUser.role === "admin" 
    ? `¡Bienvenido al panel de administración, ${currentUser.name}! 👨‍💼`
    : `¡Listo para hacer tus predicciones, ${currentUser.name}! 🎯`;
  
  showAdvancedAlert(welcomeMessage, "success", 4000);
  
  // Agregar notificación de bienvenida
  const welcomeNotif = {
    id: Date.now(),
    title: "¡Bienvenido!",
    message: `Sesión iniciada como ${currentUser.role}`,
    type: "info",
    time: new Date().toISOString(),
    read: false
  };
  
  notifications.unshift(welcomeNotif);
  localStorage.setItem("notifications", JSON.stringify(notifications));
  updateNotificationBadge();
}

// ===== FUNCIONES AUXILIARES FINALES =====
function copyExpertPredictions() {
  showAdvancedAlert("👨‍🔬 Copiando predicciones de expertos...", "info");
  
  setTimeout(() => {
    const matches = JSON.parse(localStorage.getItem("matches")) || [];
    const upcomingMatches = matches.filter(m => m.status === "upcoming");
    let copiedCount = 0;
    
    upcomingMatches.forEach(match => {
      if (Math.random() > 0.3) { // 70% de probabilidad de copiar
        makePrediction(match.id, match.aiPrediction);
        copiedCount++;
      }
    });
    
    showAdvancedAlert(`✅ Se copiaron ${copiedCount} predicciones de expertos`, "success");
  }, 1500);
}

function shareRankings() {
  showAdvancedAlert("📤 Generando enlace para compartir rankings...", "info");
  
  setTimeout(() => {
    // Simular generación de enlace
    const shareUrl = `https://prodemax.com/rankings/${btoa(currentUser.id + Date.now())}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'ProdeMax Elite - Rankings',
        text: '¡Mira mi posición en el ranking de ProdeMax Elite!',
        url: shareUrl
      });
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(shareUrl).then(() => {
        showAdvancedAlert("🔗 Enlace copiado al portapapeles", "success");
      });
    }
  }, 1000);
}

function savePredictions() {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  const upcomingMatches = matches.filter(m => m.status === "upcoming");
  const userPredictions = predictions[currentUser.email] || {};
  
  let savedCount = 0;
  upcomingMatches.forEach(match => {
    if (userPredictions[match.id] && userPredictions[match.id].result) {
      savedCount++;
    }
  });
  
  localStorage.setItem("predictions", JSON.stringify(predictions));
  showAdvancedAlert(`💾 ${savedCount} predicciones guardadas exitosamente`, "success");
  updateUserStats();
}

function filterMatches() {
  const filter = document.getElementById("matches-filter").value;
  const rows = document.querySelectorAll("#predictions-table tbody tr");
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  rows.forEach(row => {
    const matchDate = new Date(); // En un caso real, extraer la fecha de la fila
    let show = true;
    
    switch(filter) {
      case "today":
        show = matchDate >= today && matchDate < tomorrow;
        break;
      case "tomorrow":
        show = matchDate >= tomorrow && matchDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "week":
        show = matchDate >= today && matchDate < nextWeek;
        break;
      default:
        show = true;
    }
    
    row.style.display = show ? "" : "none";
  });
  
  showAdvancedAlert(`Filtro aplicado: ${filter}`, "info", 2000);
}

// ===== FUNCIONES FALTANTES PARA COMPLETAR EL SISTEMA =====

// ===== FUNCIONES DE GESTIÓN DE PARTIDOS =====
function editMatch(matchId) {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  const match = matches.find(m => m.id === matchId);
  
  if (!match) return;
  
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h3><i class="fas fa-edit"></i> Editar Partido</h3>
      <form id="edit-match-form">
        <div class="input-group">
          <i class="fas fa-home"></i>
          <input type="text" id="edit-team1" value="${match.team1}" required>
        </div>
        <div class="input-group">
          <i class="fas fa-plane"></i>
          <input type="text" id="edit-team2" value="${match.team2}" required>
        </div>
        <div class="input-group">
          <i class="fas fa-calendar"></i>
          <input type="datetime-local" id="edit-date" value="${new Date(match.date).toISOString().slice(0, 16)}" required>
        </div>
        <div class="input-group">
          <i class="fas fa-map-marker-alt"></i>
          <input type="text" id="edit-stadium" value="${match.stadium}" required>
        </div>
        <div class="input-group">
          <i class="fas fa-cloud"></i>
          <select id="edit-weather">
            <option value="Soleado" ${match.weather === "Soleado" ? "selected" : ""}>Soleado</option>
            <option value="Nublado" ${match.weather === "Nublado" ? "selected" : ""}>Nublado</option>
            <option value="Lluvia" ${match.weather === "Lluvia" ? "selected" : ""}>Lluvia</option>
            <option value="Viento" ${match.weather === "Viento" ? "selected" : ""}>Viento</option>
          </select>
        </div>
        <div class="form-buttons">
          <button type="submit" class="btn-primary">Guardar Cambios</button>
          <button type="button" class="btn-secondary close-modal">Cancelar</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.classList.remove("hidden");
  
  modal.querySelector("#edit-match-form").addEventListener("submit", (e) => {
    e.preventDefault();
    
    match.team1 = document.getElementById("edit-team1").value;
    match.team2 = document.getElementById("edit-team2").value;
    match.date = new Date(document.getElementById("edit-date").value);
    match.stadium = document.getElementById("edit-stadium").value;
    match.weather = document.getElementById("edit-weather").value;
    
    const matchIndex = matches.findIndex(m => m.id === matchId);
    matches[matchIndex] = match;
    localStorage.setItem("matches", JSON.stringify(matches));
    
    showAdvancedAlert("Partido actualizado exitosamente", "success");
    loadMatchesTable();
    modal.remove();
  });
  
  modal.querySelector(".close-modal").addEventListener("click", () => modal.remove());
}

function deleteMatch(matchId) {
  if (!confirm("¿Estás seguro de eliminar este partido?")) return;
  
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  const filteredMatches = matches.filter(m => m.id !== matchId);
  localStorage.setItem("matches", JSON.stringify(filteredMatches));
  
  showAdvancedAlert("Partido eliminado exitosamente", "success");
  loadMatchesTable();
}

function duplicateMatch(matchId) {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  const match = matches.find(m => m.id === matchId);
  
  if (!match) return;
  
  const newMatch = {
    ...match,
    id: Math.max(...matches.map(m => m.id)) + 1,
    date: new Date(match.date.getTime() + 7 * 24 * 60 * 60 * 1000), // +1 semana
    status: "upcoming",
    result: "",
    score: { team1: 0, team2: 0 },
    minute: 0
  };
  
  matches.push(newMatch);
  localStorage.setItem("matches", JSON.stringify(matches));
  
  showAdvancedAlert("Partido duplicado exitosamente", "success");
  loadMatchesTable();
}

// ===== FUNCIONES DE GESTIÓN DE USUARIOS =====
function viewUserDetails(userId) {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find(u => u.id === userId);
  
  if (!user) return;
  
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h3><i class="fas fa-user"></i> Detalles de ${user.name}</h3>
      <div class="user-details">
        <div class="detail-row">
          <span class="detail-label">Avatar:</span>
          <span class="detail-value">${user.avatar} ${user.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${user.email}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Rol:</span>
          <span class="detail-value role-badge role-${user.role}">${user.role.toUpperCase()}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Nivel:</span>
          <span class="detail-value">${user.level}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Puntos:</span>
          <span class="detail-value">${user.points}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Precisión:</span>
          <span class="detail-value">${user.accuracy}%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Racha actual:</span>
          <span class="detail-value">${user.streak} ${user.streak > 0 ? "🔥" : "❄️"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Predicciones:</span>
          <span class="detail-value">${user.predictions}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Último acceso:</span>
          <span class="detail-value">${new Date(user.lastLogin).toLocaleString()}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Equipo favorito:</span>
          <span class="detail-value">${user.favoriteTeam}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Logros:</span>
          <div class="achievements">${user.achievements.join(" ")}</div>
        </div>
      </div>
      <button class="btn-secondary close-modal">Cerrar</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.classList.remove("hidden");
  
  modal.querySelector(".close-modal").addEventListener("click", () => modal.remove());
}

function editUser(userId) {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find(u => u.id === userId);
  
  if (!user) return;
  
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h3><i class="fas fa-user-edit"></i> Editar Usuario</h3>
      <form id="edit-user-form">
        <div class="input-group">
          <i class="fas fa-user"></i>
          <input type="text" id="edit-user-name" value="${user.name}" required>
        </div>
        <div class="input-group">
          <i class="fas fa-envelope"></i>
          <input type="email" id="edit-user-email" value="${user.email}" required>
        </div>
        <div class="input-group">
          <i class="fas fa-shield-alt"></i>
          <select id="edit-user-role" required>
            <option value="admin" ${user.role === "admin" ? "selected" : ""}>Administrador</option>
            <option value="analyst" ${user.role === "analyst" ? "selected" : ""}>Analista</option>
            <option value="vip" ${user.role === "vip" ? "selected" : ""}>VIP</option>
            <option value="participant" ${user.role === "participant" ? "selected" : ""}>Participante</option>
          </select>
        </div>
        <div class="input-group">
          <i class="fas fa-star"></i>
          <input type="number" id="edit-user-points" value="${user.points}" min="0">
        </div>
        <div class="form-buttons">
          <button type="submit" class="btn-primary">Guardar Cambios</button>
          <button type="button" class="btn-secondary close-modal">Cancelar</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.classList.remove("hidden");
  
  modal.querySelector("#edit-user-form").addEventListener("submit", (e) => {
    e.preventDefault();
    
    user.name = document.getElementById("edit-user-name").value;
    user.email = document.getElementById("edit-user-email").value;
    user.role = document.getElementById("edit-user-role").value;
    user.points = parseInt(document.getElementById("edit-user-points").value);
    user.isPremium = user.role === "vip" || user.role === "admin";
    
    const userIndex = users.findIndex(u => u.id === userId);
    users[userIndex] = user;
    localStorage.setItem("users", JSON.stringify(users));
    
    showAdvancedAlert("Usuario actualizado exitosamente", "success");
    loadUsersTable();
    modal.remove();
  });
  
  modal.querySelector(".close-modal").addEventListener("click", () => modal.remove());
}

function toggleUserStatus(userId) {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find(u => u.id === userId);
  
  if (!user) return;
  
  // Simular activar/desactivar usuario
  user.active = !user.active;
  const userIndex = users.findIndex(u => u.id === userId);
  users[userIndex] = user;
  localStorage.setItem("users", JSON.stringify(users));
  
  const status = user.active ? "activado" : "desactivado";
  showAdvancedAlert(`Usuario ${status} exitosamente`, "success");
  loadUsersTable();
}

// ===== FUNCIONES DE ANALYTICS AVANZADOS =====
function loadAnalyticsCharts() {
  // Simular carga de gráficos
  showAdvancedAlert("📊 Cargando analytics avanzados...", "info");
  
  setTimeout(() => {
    const chartContainer = document.getElementById("predictions-chart");
    if (chartContainer) {
      chartContainer.innerHTML = `
        <div class="chart-placeholder">
          <div class="chart-bars">
            <div class="bar" style="height: 60%"></div>
            <div class="bar" style="height: 80%"></div>
            <div class="bar" style="height: 45%"></div>
            <div class="bar" style="height: 90%"></div>
            <div class="bar" style="height: 70%"></div>
            <div class="bar" style="height: 85%"></div>
            <div class="bar" style="height: 55%"></div>
          </div>
          <div class="chart-labels">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>
        </div>
      `;
    }
    
    const userAccuracyChart = document.getElementById("user-accuracy-chart");
    if (userAccuracyChart) {
      userAccuracyChart.innerHTML = `
        <div class="accuracy-chart">
          <div class="accuracy-item">
            <span class="user-name">María R.</span>
            <div class="accuracy-bar"><div class="fill" style="width: 89%"></div></div>
            <span class="percentage">89%</span>
          </div>
          <div class="accuracy-item">
            <span class="user-name">Carlos M.</span>
            <div class="accuracy-bar"><div class="fill" style="width: 84%"></div></div>
            <span class="percentage">84%</span>
          </div>
          <div class="accuracy-item">
            <span class="user-name">Ana G.</span>
            <div class="accuracy-bar"><div class="fill" style="width: 76%"></div></div>
            <span class="percentage">76%</span>
          </div>
        </div>
      `;
    }
    
    showAdvancedAlert("✅ Analytics cargados exitosamente", "success");
  }, 1500);
}

function loadAIInsights() {
  const aiInsights = document.getElementById("ai-insights");
  if (!aiInsights) return;
  
  aiInsights.innerHTML = `
    <div class="ai-insights-container">
      <div class="insight-card">
        <h4><i class="fas fa-brain"></i> Análisis de Patrones</h4>
        <p>La IA ha detectado que los equipos locales tienen 67% más probabilidades de ganar en días soleados.</p>
        <div class="confidence">Confianza: 94%</div>
      </div>
      <div class="insight-card">
        <h4><i class="fas fa-chart-line"></i> Tendencia Detectada</h4>
        <p>Los usuarios VIP predicen empates con 31% más precisión que usuarios regulares.</p>
        <div class="confidence">Confianza: 87%</div>
      </div>
      <div class="insight-card">
        <h4><i class="fas fa-target"></i> Recomendación</h4>
        <p>Se recomienda ajustar las odds de partidos con más de 200 predicciones para mayor equilibrio.</p>
        <div class="confidence">Confianza: 91%</div>
      </div>
    </div>
  `;
}

function loadUserPerformanceChart() {
  const chartContainer = document.getElementById("user-performance-chart");
  if (!chartContainer) return;
  
  chartContainer.innerHTML = `
    <div class="performance-chart">
      <h4>Tu Rendimiento Últimas 2 Semanas</h4>
      <div class="chart-area">
        <svg viewBox="0 0 300 150" class="performance-svg">
          <polyline points="0,120 50,100 100,80 150,60 200,70 250,50 300,40" 
                    fill="none" stroke="url(#gradient)" stroke-width="3"/>
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#667eea"/>
              <stop offset="100%" style="stop-color:#764ba2"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="chart-stats">
        <div class="stat">
          <span class="value">+12%</span>
          <span class="label">Mejora</span>
        </div>
        <div class="stat">
          <span class="value">78%</span>
          <span class="label">Precisión Media</span>
        </div>
        <div class="stat">
          <span class="value">5</span>
          <span class="label">Mejor Racha</span>
        </div>
      </div>
    </div>
  `;
}

// ===== FUNCIONES SOCIALES =====
function loadSocialFeatures() {
  const miniLeaderboard = document.getElementById("mini-leaderboard");
  if (miniLeaderboard) {
    miniLeaderboard.innerHTML = `
      <div class="mini-ranking">
        <div class="mini-rank-item">
          <span class="position">🥇</span>
          <span class="name">María R.</span>
          <span class="points">1,240 pts</span>
        </div>
        <div class="mini-rank-item">
          <span class="position">🥈</span>
          <span class="name">Carlos M.</span>
          <span class="points">1,180 pts</span>
        </div>
        <div class="mini-rank-item">
          <span class="position">🥉</span>
          <span class="name">Ana G.</span>
          <span class="points">980 pts</span>
        </div>
        <div class="mini-rank-item">
          <span class="position">4</span>
          <span class="name">Luis P.</span>
          <span class="points">850 pts</span>
        </div>
        <div class="mini-rank-item current">
          <span class="position">5</span>
          <span class="name">Tú</span>
          <span class="points">${currentUser?.points || 750} pts</span>
        </div>
      </div>
    `;
  }
  
  const communityPredictions = document.getElementById("community-predictions");
  if (communityPredictions) {
    communityPredictions.innerHTML = `
      <div class="community-feed">
        <div class="feed-item">
          <div class="user-info">
            <span class="avatar">👨‍💼</span>
            <span class="name">Carlos M.</span>
            <span class="time">hace 5min</span>
          </div>
          <div class="prediction">Predice que <strong>Boca</strong> ganará vs River con 85% de confianza</div>
        </div>
        <div class="feed-item">
          <div class="user-info">
            <span class="avatar">👩‍💻</span>
            <span class="name">María R.</span>
            <span class="time">hace 12min</span>
          </div>
          <div class="prediction">Ve un <strong>empate</strong> en Racing vs Independiente</div>
        </div>
        <div class="feed-item">
          <div class="user-info">
            <span class="avatar">👨‍🎓</span>
            <span class="name">Ana G.</span>
            <span class="time">hace 18min</span>
          </div>
          <div class="prediction">Confía en la <strong>visita</strong> de San Lorenzo</div>
        </div>
      </div>
    `;
  }
}

function loadAIChatHistory() {
  const aiMessages = document.getElementById("ai-messages");
  if (!aiMessages) return;
  
  aiMessages.innerHTML = `
    <div class="ai-message ai-response">
      <div class="message-content">
        <span class="message-avatar">🤖</span>
        <span class="message-text">¡Hola! Soy tu asistente de pronósticos deportivos. ¿En qué puedo ayudarte hoy?</span>
      </div>
      <div class="message-time">${new Date().toLocaleTimeString()}</div>
    </div>
  `;
}

// ===== FUNCIONES DE IMPORTACIÓN =====
function importMatches() {
  showAdvancedAlert("📥 Simulando importación de fixture...", "info");
  
  setTimeout(() => {
    const newMatches = [
      {
        id: Date.now() + 1,
        team1: "Barcelona",
        team2: "Real Madrid",
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: "upcoming",
        result: "",
        score: { team1: 0, team2: 0 },
        minute: 0,
        odds: { team1: "2.10", draw: "3.20", team2: "2.80" },
        predictions: 0,
        aiPrediction: "L",
        aiConfidence: 78,
        popularChoice: "L",
        league: "El Clásico",
        stadium: "Camp Nou",
        weather: "Soleado",
        temperature: "22°C"
      },
      {
        id: Date.now() + 2,
        team1: "Manchester United",
        team2: "Liverpool",
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "upcoming",
        result: "",
        score: { team1: 0, team2: 0 },
        minute: 0,
        odds: { team1: "2.45", draw: "3.10", team2: "2.60" },
        predictions: 0,
        aiPrediction: "V",
        aiConfidence: 82,
        popularChoice: "V",
        league: "Premier League",
        stadium: "Old Trafford",
        weather: "Nublado",
        temperature: "18°C"
      }
    ];
    
    const matches = JSON.parse(localStorage.getItem("matches")) || [];
    matches.push(...newMatches);
    localStorage.setItem("matches", JSON.stringify(matches));
    
    showAdvancedAlert(`✅ ${newMatches.length} partidos importados exitosamente`, "success");
    loadMatchesTable();
  }, 2000);
}

function publishResults() {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  const finishedMatches = matches.filter(m => m.status === "finished");
  
  if (finishedMatches.length === 0) {
    showAdvancedAlert("No hay resultados para publicar", "warning");
    return;
  }
  
  showAdvancedAlert("📢 Publicando resultados y calculando puntuaciones...", "info");
  
  setTimeout(() => {
    // Simular cálculo de puntuaciones
    updateAllStats();
    
    // Crear notificación de resultados publicados
    const notification = {
      id: Date.now(),
      title: "¡Resultados Publicados!",
      message: `Se publicaron ${finishedMatches.length} resultados. Revisa tu nueva puntuación.`,
      type: "achievement",
      time: new Date().toISOString(),
      read: false
    };
    
    notifications.unshift(notification);
    localStorage.setItem("notifications", JSON.stringify(notifications));
    updateNotificationBadge();
    
    showAdvancedAlert("✅ Resultados publicados y puntuaciones actualizadas", "success");
  }, 1500);
}

function showBulkActions() {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h3><i class="fas fa-layer-group"></i> Acciones Masivas</h3>
      <div class="bulk-actions">
        <button onclick="bulkSetStatus('live')" class="btn-warning">
          <i class="fas fa-broadcast-tower"></i> Marcar como En Vivo
        </button>
        <button onclick="bulkSetStatus('finished')" class="btn-success">
          <i class="fas fa-check-circle"></i> Marcar como Finalizados
        </button>
        <button onclick="bulkUpdateOdds()" class="btn-info">
          <i class="fas fa-chart-line"></i> Actualizar Todas las Odds
        </button>
        <button onclick="bulkDeleteMatches()" class="btn-danger">
          <i class="fas fa-trash"></i> Eliminar Partidos Seleccionados
        </button>
      </div>
      <button class="btn-secondary close-modal">Cerrar</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.classList.remove("hidden");
  
  modal.querySelector(".close-modal").addEventListener("click", () => modal.remove());
}

function bulkSetStatus(status) {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  let count = 0;
  
  matches.forEach(match => {
    if (match.status === "upcoming") {
      match.status = status;
      if (status === "live") {
        match.minute = Math.floor(Math.random() * 90) + 1;
      }
      count++;
    }
  });
  
  localStorage.setItem("matches", JSON.stringify(matches));
  showAdvancedAlert(`✅ ${count} partidos actualizados a ${status}`, "success");
  loadMatchesTable();
}

function bulkUpdateOdds() {
  const matches = JSON.parse(localStorage.getItem("matches")) || [];
  let count = 0;
  
  matches.forEach(match => {
    if (match.status === "upcoming") {
      match.odds.team1 = (1.5 + Math.random() * 3).toFixed(2);
      match.odds.draw = (2.8 + Math.random() * 1.5).toFixed(2);
      match.odds.team2 = (1.5 + Math.random() * 3).toFixed(2);
      count++;
    }
  });
  
  localStorage.setItem("matches", JSON.stringify(matches));
  showAdvancedAlert(`✅ Odds actualizadas en ${count} partidos`, "success");
  loadMatchesTable();
}

// ===== FUNCIONES ADICIONALES DE USUARIO =====
function updateUserAchievements() {
  if (!currentUser) return;
  
  const achievements = [];
  
  if (currentUser.accuracy > 80) achievements.push("🎯 Precisión Élite");
  if (currentUser.streak >= 5) achievements.push("🔥 Racha de Oro");
  if (currentUser.predictions >= 50) achievements.push("📊 Predictor Veterano");
  if (currentUser.points >= 1000) achievements.push("💎 Millonario");
  if (currentUser.role === "vip") achievements.push("👑 Usuario Premium");
  
  currentUser.achievements = achievements;
  
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex !== -1) {
    users[userIndex] = currentUser;
    localStorage.setItem("users", JSON.stringify(users));
  }
}

// Inicializar al cargar
updateNotificationBadge();
setInterval(updateNotificationBadge, 5000);