 (async function () {
  await window.LLineApp.ensureSession();
  if (window.LLineApp.getRole() !== "admin") {
    window.LLineApp.showToast("Acceso restringido", "Esta vista esta pensada para el rol administrador.", "warning");
  }

  var chargers = [];
  var stats = null;
  var reservations = [];
  var logs = [];

  function kpiCard(label, value, icon, color, sub) {
    return (
      '<article class="kpi-card">' +
      '<div class="kpi-info">' +
      '<div class="kpi-label">' + label + "</div>" +
      '<div class="kpi-value">' + value + "</div>" +
      '<div class="kpi-sub">' + sub + "</div>" +
      "</div>" +
      '<div class="kpi-icon ' + color + '"><i class="fa-solid ' + icon + '"></i></div>' +
      "</article>"
    );
  }

  function renderKPIs() {

    document.getElementById("kpiGrid").innerHTML = [
      kpiCard("Cargadores totales", stats.cargadoresTotales, "charging-station", "blue", "Red monitorizada en tiempo real"),
      kpiCard("Libres", stats.libres, "circle-check", "green", "Disponibles para reserva inmediata"),
      kpiCard("Ocupados", stats.ocupados, "clock", "yellow", "En uso por otros usuarios"),
      kpiCard("En reparacion", stats.reparacion, "triangle-exclamation", "red", "Requieren intervencion tecnica"),
      kpiCard("Reservas activas", stats.reservasActivas, "calendar-check", "purple", "En curso en este momento")
    ].join("");
  }

  function renderStatusChart() {
    var groups = [
      { name: "Libre", key: "libre", color: "#2EAF6D" },
      { name: "Ocupado", key: "ocupado", color: "#F59E0B" },
      { name: "Reparacion", key: "reparacion", color: "#EF4444" },
      { name: "Reservado", key: "reservado", color: "#1565C0" }
    ];

    document.getElementById("statusChart").innerHTML = groups.map(function (group) {
      var total = chargers.filter(function (c) { return c.status === group.key; }).length;
      var percent = Math.round((total / Math.max(1, chargers.length)) * 100) || 0;
      return (
        '<div class="bar-item">' +
          '<strong>' + group.name + "</strong>" +
          '<div class="bar-track"><div class="bar-fill" style="width:' + percent + "%;background:" + group.color + '"></div></div>' +
          '<span class="text-sm text-muted">' + total + "</span>" +
        "</div>"
      );
    }).join("");
  }

  async function renderActivityLog() {
    var lastLogs = logs.slice(0, 3);
    document.getElementById("activityLog").innerHTML = lastLogs.map(function (log) {
      return '<div class="summary-panel mb-4">' + (log.accion || "ACCION") + " · " + (log.entidad || "sistema") + " · " + (log.created_at || "") + "</div>";
    }).join("") || '<div class="summary-panel">Sin actividad reciente.</div>';
  }

  function renderReservationsTable() {
    var target = document.getElementById("adminReservationRows");
    if (!target) return;
    target.innerHTML = reservations.slice(0, 120).map(function (r) {
      var status = window.LLineApp.statusInfo(r.status === "activa" ? "reservado" : r.status === "cancelada" ? "reparacion" : "libre");
      return (
        "<tr>" +
          "<td>" + r.id + "</td>" +
          "<td>" + (r.chargerName || r.chargerId) + "</td>" +
          '<td><span class="badge ' + status.badge + '">' + r.status + "</span></td>" +
          "<td>" + window.LLineApp.formatDate(r.date, r.time) + "</td>" +
          "<td>" + r.duration + " min</td>" +
          "<td>" + window.LLineApp.formatCurrency(r.cost || 0) + "</td>" +
        "</tr>"
      );
    }).join("") || '<tr><td colspan="6" class="text-muted text-center">No hay reservas.</td></tr>';
  }

  function renderStatsDetail() {
    var target = document.getElementById("statsDetail");
    if (!target || !stats) return;
    var usage = stats.cargadoresTotales ? Math.round(((stats.ocupados + stats.reservados) / stats.cargadoresTotales) * 100) : 0;
    target.innerHTML =
      '<div class="summary-panel mb-4"><strong>Uso actual de red:</strong> ' + usage + '%</div>' +
      '<div class="summary-panel mb-4"><strong>Disponibilidad:</strong> ' + stats.libres + ' libres de ' + stats.cargadoresTotales + '</div>' +
      '<div class="summary-panel"><strong>Mantenimiento:</strong> ' + stats.reparacion + ' puntos en revision</div>';
  }

  function renderLogsSection() {
    var target = document.getElementById("adminLogsRows");
    if (!target) return;
    target.innerHTML = logs.slice(0, 120).map(function (log) {
      return '<div class="summary-panel mb-3"><strong>' + (log.accion || "ACCION") + '</strong> · ' + (log.entidad || "sistema") + ' · ' + (log.created_at || "") + '<div class="text-sm text-muted mt-2">' + (log.detalle || "") + '</div></div>';
    }).join("") || '<p class="text-sm text-muted">Sin logs disponibles.</p>';
  }

  function bindSidebarSections() {
    var links = document.querySelectorAll(".sidebar-link[data-section]");
    links.forEach(function (link) {
      link.addEventListener("click", function () {
        var section = link.getAttribute("data-section");
        links.forEach(function (item) { item.classList.remove("active"); });
        link.classList.add("active");
        document.querySelectorAll(".admin-section").forEach(function (block) {
          block.classList.add("hidden");
        });
        var current = document.getElementById("section-" + section);
        if (current) current.classList.remove("hidden");
      });
    });
  }

  function renderRows() {
    document.getElementById("adminChargerRows").innerHTML = chargers.map(function (c) {
      var status = window.LLineApp.statusInfo(c.status);
      return (
        "<tr>" +
          "<td>" + c.name + "</td>" +
          "<td>" + c.type + "</td>" +
          '<td><span class="badge ' + status.badge + '">' + status.label + "</span></td>" +
          "<td>" + c.power + " kW</td>" +
          "<td>" + c.price.toFixed(2) + " EUR</td>" +
          '<td><div class="table-actions">' +
            '<button class="btn btn-outline btn-sm" data-edit="' + c.id + '">Editar</button>' +
            '<button class="btn btn-danger btn-sm" data-delete="' + c.id + '">Eliminar</button>' +
          "</div></td>" +
        "</tr>"
      );
    }).join("");
  }

  document.getElementById("adminChargerRows").addEventListener("click", async function (e) {
    var edit = e.target.closest("[data-edit]");
    var del = e.target.closest("[data-delete]");

    if (edit) {
      var power = prompt("Nueva potencia (kW):", "50");
      if (!power) return;
      try {
        await window.LLineApp.api.updateCharger(edit.dataset.edit, { potencia: Number(power) });
        window.LLineApp.showToast("Actualizado", "Cargador editado correctamente", "success");
        await loadData();
      } catch (err) {
        window.LLineApp.showToast("Error", err.message, "error");
      }
    }

    if (del) {
      if (!confirm("¿Seguro que quieres eliminar este cargador?")) return;
      try {
        await window.LLineApp.api.deleteCharger(del.dataset.delete);
        window.LLineApp.showToast("Eliminado", "Cargador eliminado", "warning");
        await loadData();
      } catch (err) {
        window.LLineApp.showToast("Error", err.message, "error");
      }
    }
  });

  document.getElementById("addChargerBtn").addEventListener("click", async function () {
    var nombre = prompt("Nombre del cargador:", "Nuevo punto LLine");
    if (!nombre) return;
    try {
      await window.LLineApp.api.createCharger({
        nombre: nombre,
        direccion: "Direccion pendiente",
        lat: 37.99,
        lng: -1.13,
        tipo: "estandar",
        estado: "libre",
        potencia: 22,
        coste: 0.25,
        tiempo_estimado: "60 min"
      });
      window.LLineApp.showToast("Creado", "Cargador anadido", "success");
      await loadData();
    } catch (err) {
      window.LLineApp.showToast("Error", err.message, "error");
    }
  });

  async function loadData() {
    chargers = await window.LLineApp.api.getChargers();
    stats = await window.LLineApp.api.getAdminStats();
    reservations = await window.LLineApp.api.getReservations();
    logs = await window.LLineApp.api.getAdminLogs();
    renderKPIs();
    renderStatusChart();
    await renderActivityLog();
    renderRows();
    renderReservationsTable();
    renderStatsDetail();
    renderLogsSection();
  }

  document.getElementById("refreshAdminData").addEventListener("click", async function () {
    await loadData();
    window.LLineApp.showToast("Admin", "Datos actualizados correctamente.", "success");
  });

  bindSidebarSections();
  await loadData();
})();

