 (async function () {
  await window.LLineApp.ensureSession();
  if (window.LLineApp.getRole() !== "tecnico") {
    window.LLineApp.showToast("Acceso restringido", "Esta vista esta pensada para el rol tecnico.", "warning");
  }

  var chargers = [];

  function renderChargers() {
    document.getElementById("techChargers").innerHTML = chargers.map(function (charger) {
      var status = window.LLineApp.statusInfo(charger.status);
      return (
        '<div class="summary-panel mb-4">' +
          '<div class="flex items-center justify-between gap-3">' +
            '<div><strong>' + charger.name + '</strong><div class="text-sm text-muted">' + charger.address + "</div></div>" +
            '<span class="badge ' + status.badge + '">' + status.label + "</span>" +
          "</div>" +
          '<div class="summary-row"><span>Potencia</span><strong>' + charger.power + " kW</strong></div>" +
          '<div class="summary-row"><span>Conectores</span><strong>' + charger.connectors + "</strong></div>" +
          '<div class="form-group mt-4">' +
            '<label class="form-label">Cambiar estado</label>' +
            '<div class="select-wrapper">' +
              '<select class="select" data-status="' + charger.id + '">' +
                '<option value="libre" ' + (charger.status === "libre" ? "selected" : "") + ">Libre</option>" +
                '<option value="ocupado" ' + (charger.status === "ocupado" ? "selected" : "") + ">Ocupado</option>" +
                '<option value="reparacion" ' + (charger.status === "reparacion" ? "selected" : "") + ">En reparacion</option>" +
                '<option value="reservado" ' + (charger.status === "reservado" ? "selected" : "") + ">Reservado</option>" +
              "</select>" +
            "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  function renderChargerOptions() {
    document.getElementById("incidentCharger").innerHTML = chargers.map(function (charger) {
      return '<option value="' + charger.id + '">' + charger.name + "</option>";
    }).join("");
  }

  function renderHistory(items) {
    var target = document.getElementById("maintenanceHistory");
    if (!items.length) {
      target.innerHTML = '<p class="text-sm text-muted">No hay incidencias registradas todavia.</p>';
      return;
    }

    target.innerHTML = items.map(function (item) {
      var chargerName = item.chargerName || item.charger || "Cargador";
      var type = item.severidad || item.type || "media";
      var date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("es-ES") : (item.date || "");
      var notes = item.descripcion || item.notes || "";
      return (
        '<article class="summary-panel mb-4">' +
          '<div class="summary-row"><span>Cargador</span><strong>' + chargerName + "</strong></div>" +
          '<div class="summary-row"><span>Severidad</span><strong>' + type + "</strong></div>" +
          '<div class="summary-row"><span>Fecha</span><strong>' + date + "</strong></div>" +
          '<p class="text-sm mt-2">' + notes + "</p>" +
        "</article>"
      );
    }).join("");
  }

  var incidents = [];

  document.getElementById("techChargers").addEventListener("change", async function (e) {
    var select = e.target.closest("[data-status]");
    if (!select) return;
    try {
      await window.LLineApp.api.patchChargerStatus(select.dataset.status, select.value);
      window.LLineApp.showToast("Estado actualizado", "Nuevo estado tecnico: " + select.value, "success");
    } catch (err) {
      window.LLineApp.showToast("Error", err.message, "error");
    }
  });

  document.getElementById("saveIncident").addEventListener("click", async function () {
    var chargerSelect = document.getElementById("incidentCharger");
    var typeSelect = document.getElementById("incidentType");
    var notes = document.getElementById("incidentNotes").value.trim();

    if (!notes) {
      window.LLineApp.showToast("Nota requerida", "Incluye detalles tecnicos antes de guardar.", "warning");
      return;
    }

    try {
      await window.LLineApp.api.createIncidencia({
        cargador_id: chargerSelect.value,
        descripcion: notes,
        severidad: typeSelect.value.includes("Error") ? "media" : "alta"
      });

      incidents = await window.LLineApp.api.getIncidencias();
    } catch (err) {
      window.LLineApp.showToast("Error", err.message, "error");
      return;
    }

    document.getElementById("incidentNotes").value = "";
    renderHistory(incidents);
    window.LLineApp.showToast("Incidencia registrada", "El mantenimiento se ha guardado correctamente.", "success");
  });

  chargers = await window.LLineApp.api.getChargers();
  incidents = await window.LLineApp.api.getIncidencias().catch(function () { return []; });
  renderChargers();
  renderChargerOptions();
  renderHistory(incidents);
})();

