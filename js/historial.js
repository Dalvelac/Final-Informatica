 (async function () {
  await window.LLineApp.ensureSession();
  var tab = "all";

  async function readItems() {
    return window.LLineApp.api.getReservations();
  }

  function updateCounters(items) {
    var count = {
      all: items.length,
      activa: items.filter(function (r) { return r.status === "activa"; }).length,
      completada: items.filter(function (r) { return r.status === "completada"; }).length,
      cancelada: items.filter(function (r) { return r.status === "cancelada"; }).length
    };

    document.getElementById("countAll").textContent = String(count.all);
    document.getElementById("countActiva").textContent = String(count.activa);
    document.getElementById("countCompletada").textContent = String(count.completada);
    document.getElementById("countCancelada").textContent = String(count.cancelada);
  }

  async function render() {
    var items = await readItems();
    var target = document.getElementById("historyContainer");
    updateCounters(items);

    var filtered = items.filter(function (item) {
      return tab === "all" || item.status === tab;
    });

    if (!filtered.length) {
      target.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-state-icon"><i class="fa-solid fa-calendar-xmark"></i></div>' +
        '<div class="empty-state-title">No hay reservas en esta categoria</div>' +
        '<div class="empty-state-desc">Puedes crear una nueva reserva desde el mapa o la pantalla de reservas.</div>' +
        '<a class="btn btn-primary" href="reservas.html">Ir a reservas</a>' +
        "</div>";
      return;
    }

    target.innerHTML = filtered.map(function (item) {
      var status = window.LLineApp.statusInfo(item.status === "completada" ? "libre" : item.status === "cancelada" ? "reparacion" : "reservado");
      return (
        '<article class="reservation-card">' +
          '<div class="reservation-card-head">' +
            '<div>' +
              '<h3>' + item.chargerName + "</h3>" +
              '<p class="text-sm text-muted">Reserva #' + item.id + "</p>" +
            "</div>" +
            '<span class="badge ' + status.badge + '">' + item.status + "</span>" +
          "</div>" +
          '<div class="reservation-meta">' +
            '<div class="meta-box"><div class="meta-label">Fecha</div><div class="meta-value">' + window.LLineApp.formatDate(item.date, item.time) + "</div></div>" +
            '<div class="meta-box"><div class="meta-label">Duracion</div><div class="meta-value">' + item.duration + " min</div></div>" +
            '<div class="meta-box"><div class="meta-label">Coste</div><div class="meta-value">' + window.LLineApp.formatCurrency(item.cost || 0) + "</div></div>" +
          "</div>" +
          (item.status === "activa" ? '<div class="mt-4"><button class="btn btn-danger btn-sm" data-cancel="' + item.id + '"><i class="fa-solid fa-ban"></i> Cancelar reserva</button></div>' : "") +
        "</article>"
      );
    }).join("");
  }

  document.getElementById("historyTabs").addEventListener("click", function (e) {
    var button = e.target.closest(".tab");
    if (!button) return;

    document.querySelectorAll(".tab").forEach(function (tabItem) {
      tabItem.classList.remove("active");
    });

    button.classList.add("active");
    tab = button.dataset.tab;
    render();
  });

  document.getElementById("historyContainer").addEventListener("click", async function (e) {
    var btn = e.target.closest("[data-cancel]");
    if (!btn) return;

    var id = btn.dataset.cancel;
    try {
      await window.LLineApp.api.cancelReservation(id);
      window.LLineApp.showToast("Reserva cancelada", "La reserva activa se ha cancelado correctamente.", "success");
      render();
    } catch (err) {
      window.LLineApp.showToast("Error", err.message, "error");
    }
  });

  await render();
})();

