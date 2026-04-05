(function () {
  var API_BASE = "/api";
  var STORAGE = {
    role: "lline-role",
    token: "lline-token",
    selectedCharger: "lline-selected-charger"
  };

  var STATUS_META = {
    libre: { label: "Libre", badge: "badge-free" },
    ocupado: { label: "Ocupado", badge: "badge-busy" },
    reparacion: { label: "En reparacion", badge: "badge-repair" },
    reservado: { label: "Reservado", badge: "badge-reserved" }
  };

  var DEMO_ACCOUNTS = {
    user: { email: "user@lline.app", password: "demo123" },
    admin: { email: "admin@lline.app", password: "demo123" },
    tecnico: { email: "tecnico@lline.app", password: "demo123" }
  };

  var state = {
    user: null,
    sessionReady: null
  };

  function getRole() {
    return localStorage.getItem(STORAGE.role) || "user";
  }

  function setRole(role) {
    localStorage.setItem(STORAGE.role, role);
  }

  function getToken() {
    return localStorage.getItem(STORAGE.token);
  }

  function setToken(token) {
    if (token) localStorage.setItem(STORAGE.token, token);
    else localStorage.removeItem(STORAGE.token);
  }

  async function request(path, options) {
    var opts = options || {};
    var headers = opts.headers || {};
    var body = opts.body;
    var token = getToken();

    if (token) {
      headers.Authorization = "Bearer " + token;
    }
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    var response = await fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers: headers,
      body: body && !(body instanceof FormData) ? JSON.stringify(body) : body
    });

    var payload = null;
    try {
      payload = await response.json();
    } catch (err) {
      payload = { success: false, message: "Respuesta no valida del servidor" };
    }

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Error de servidor");
    }

    return payload.data;
  }

  async function loginByRole(role) {
    var creds = DEMO_ACCOUNTS[role] || DEMO_ACCOUNTS.user;
    var data = await request("/login", { method: "POST", body: creds });
    setToken(data.token);
    state.user = data.user;
    setRole(data.user.rol);
    return data.user;
  }

  async function ensureSession() {
    if (state.sessionReady) {
      return state.sessionReady;
    }

    state.sessionReady = (async function () {
      try {
        state.user = await request("/me");
        setRole(state.user.rol);
        return state.user;
      } catch (err) {
        return loginByRole(getRole());
      }
    })();

    return state.sessionReady;
  }

  function statusInfo(status) {
    return STATUS_META[status] || { label: status || "Desconocido", badge: "badge-gray" };
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR"
    }).format(value || 0);
  }

  function formatDate(dateString, timeString) {
    var value = timeString ? dateString + "T" + timeString + ":00" : dateString;
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: timeString ? "2-digit" : undefined,
      minute: timeString ? "2-digit" : undefined
    });
  }

  function showToast(title, message, type) {
    var container = document.getElementById("toastContainer");
    if (!container) return;

    var icon = "fa-circle-info";
    if (type === "success") icon = "fa-circle-check";
    if (type === "error") icon = "fa-triangle-exclamation";
    if (type === "warning") icon = "fa-bell";

    var toast = document.createElement("div");
    toast.className = "toast " + (type || "");
    toast.innerHTML =
      '<div class="toast-icon"><i class="fa-solid ' + icon + '"></i></div>' +
      '<div class="toast-content"><div class="toast-title">' + title + '</div><div class="toast-msg">' + message + '</div></div>';
    container.appendChild(toast);

    setTimeout(function () { toast.classList.add("show"); }, 10);
    setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () { toast.remove(); }, 300);
    }, 3200);
  }

  function applyRoleToNavbar() {
    var role = state.user ? state.user.rol : getRole();
    var roleBadge = document.querySelector(".role-badge");
    if (roleBadge) {
      roleBadge.classList.remove("user", "admin", "tecnico");
      roleBadge.classList.add(role);
      var label = role === "admin" ? "Administrador" : role === "tecnico" ? "Tecnico" : "Usuario";
      roleBadge.innerHTML = '<i class="fa-solid fa-circle-user"></i> ' + label;
    }

    var allowedByRole = {
      user: ["index.html", "mapa.html", "reservas.html", "historial.html", "perfil.html"],
      admin: ["index.html", "mapa.html", "perfil.html", "admin.html"],
      tecnico: ["index.html", "mapa.html", "perfil.html", "tecnico.html"]
    };

    var allowed = allowedByRole[role] || allowedByRole.user;
    document.querySelectorAll(".navbar-nav .nav-link").forEach(function (link) {
      var href = (link.getAttribute("href") || "").toLowerCase();
      var li = link.closest("li");
      if (!li) return;
      li.style.display = allowed.some(function (route) { return href.indexOf(route) !== -1; }) ? "" : "none";
    });
  }

  function initNavbar() {
    var toggle = document.getElementById("navToggle");
    var nav = document.getElementById("mainNav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        nav.classList.toggle("mobile-open");
      });
    }
    renderRoleDemoSwitch();
  }

  function renderRoleDemoSwitch() {
    if (document.getElementById("demoRoleSwitch")) return;

    var box = document.createElement("div");
    box.id = "demoRoleSwitch";
    box.className = "demo-role-switch";
    box.innerHTML =
      '<span class="demo-label">Modo demo</span>' +
      '<select id="roleSelectDemo" class="select" aria-label="Cambiar rol">' +
      '<option value="user">Usuario</option>' +
      '<option value="admin">Administrador</option>' +
      '<option value="tecnico">Tecnico</option>' +
      "</select>";
    document.body.appendChild(box);

    var select = document.getElementById("roleSelectDemo");
    select.value = getRole();
    select.addEventListener("change", async function () {
      try {
        await loginByRole(select.value);
        applyRoleToNavbar();
        showToast("Rol cambiado", "Sesion actualizada para " + select.value, "success");
        setTimeout(function () { window.location.reload(); }, 350);
      } catch (err) {
        showToast("Error", err.message, "error");
      }
    });
  }

  function setSelectedCharger(chargerId) {
    localStorage.setItem(STORAGE.selectedCharger, chargerId);
  }

  function getSelectedCharger() {
    return localStorage.getItem(STORAGE.selectedCharger);
  }

  function clearSelectedCharger() {
    localStorage.removeItem(STORAGE.selectedCharger);
  }

  function startEvents(onMessage) {
    var token = getToken();
    if (!token || typeof EventSource === "undefined") return null;
    var es = new EventSource(API_BASE + "/stream?token=" + encodeURIComponent(token));
    if (onMessage) {
      es.onmessage = onMessage;
      es.addEventListener("charger_updated", onMessage);
      es.addEventListener("reservation_created", onMessage);
      es.addEventListener("reservation_canceled", onMessage);
      es.addEventListener("incident_created", onMessage);
    }
    return es;
  }

  window.LLineApp = {
    ensureSession: ensureSession,
    getUser: function () { return state.user; },
    getRole: function () { return state.user ? state.user.rol : getRole(); },
    setRole: setRole,
    loginByRole: loginByRole,
    logout: function () { return request("/logout", { method: "POST" }).finally(function () { setToken(null); state.user = null; }); },
    showToast: showToast,
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    statusInfo: statusInfo,
    setSelectedCharger: setSelectedCharger,
    getSelectedCharger: getSelectedCharger,
    clearSelectedCharger: clearSelectedCharger,
    startEvents: startEvents,
    api: {
      request: request,
      getChargers: function (query) {
        var qs = query ? "?" + new URLSearchParams(query).toString() : "";
        return request("/cargadores" + qs);
      },
      getCharger: function (id) { return request("/cargadores/" + encodeURIComponent(id)); },
      createCharger: function (payload) { return request("/cargadores", { method: "POST", body: payload }); },
      updateCharger: function (id, payload) { return request("/cargadores/" + encodeURIComponent(id), { method: "PUT", body: payload }); },
      deleteCharger: function (id) { return request("/cargadores/" + encodeURIComponent(id), { method: "DELETE" }); },
      patchChargerStatus: function (id, estado) { return request("/cargadores/" + encodeURIComponent(id) + "/estado", { method: "PATCH", body: { estado: estado } }); },
      getReservations: function () { return request("/reservas"); },
      getReservation: function (id) { return request("/reservas/" + encodeURIComponent(id)); },
      createReservation: function (payload) { return request("/reservas", { method: "POST", body: payload }); },
      cancelReservation: function (id) { return request("/reservas/" + encodeURIComponent(id) + "/cancelar", { method: "PATCH" }); },
      getIncidencias: function () { return request("/incidencias"); },
      createIncidencia: function (payload) { return request("/incidencias", { method: "POST", body: payload }); },
      getAdminStats: function () { return request("/admin/stats"); },
      getAdminLogs: function () { return request("/admin/logs"); },
      health: function () { return request("/health"); }
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    initNavbar();
    ensureSession().then(applyRoleToNavbar).catch(function (err) {
      showToast("Sesion", err.message, "warning");
    });
  });
})();

