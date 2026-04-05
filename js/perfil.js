/* global LLineMockData */
(async function () {
  await window.LLineApp.ensureSession();
  var user = window.LLineMockData.user;
  var me = window.LLineApp.getUser();
  var reservations = await window.LLineApp.api.getReservations().catch(function () { return []; });
  var VEHICLES_KEY = "lline-vehicles";

  function loadVehicles() {
    try {
      var raw = localStorage.getItem(VEHICLES_KEY);
      if (!raw) return user.vehicles.slice();
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : user.vehicles.slice();
    } catch (err) {
      return user.vehicles.slice();
    }
  }

  function saveVehicles(list) {
    user.vehicles = list.slice();
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(user.vehicles));
  }

  saveVehicles(loadVehicles());

  function renderProfile() {
    document.getElementById("profileInfo").innerHTML =
      '<div class="flex items-center gap-4 mb-6">' +
        '<div class="avatar" style="width:54px;height:54px;font-size:18px">' + user.avatar + "</div>" +
        '<div>' +
          '<h3 class="font-bold">' + (me ? me.nombre : user.name) + "</h3>" +
          '<p class="text-sm text-muted">' + (me ? me.email : user.email) + "</p>" +
        "</div>" +
      "</div>" +
      '<div class="summary-row"><span>Rol actual</span><strong id="currentRoleLabel">' + window.LLineApp.getRole() + "</strong></div>" +
      '<div class="summary-row"><span>Reservas activas</span><strong>' + reservations.filter(function (r) { return r.status === "activa"; }).length + "</strong></div>" +
      '<div class="summary-row"><span>Reservas completadas</span><strong>' + reservations.filter(function (r) { return r.status === "completada"; }).length + "</strong></div>";
  }

  function renderVehicles() {
    document.getElementById("vehicleList").innerHTML = user.vehicles.map(function (v) {
      return (
        '<article class="vehicle-item">' +
          '<div><strong>' + v.model + '</strong><div class="text-sm text-muted">' + v.battery + "</div></div>" +
          '<span class="badge badge-blue badge-no-dot">' + v.plate + "</span>" +
        "</article>"
      );
    }).join("");
  }

  function renderHistory() {
    var recent = reservations.slice(0, 3);
    if (!recent.length) {
      document.getElementById("profileHistory").innerHTML = '<p class="text-sm text-muted">Aun no hay reservas registradas.</p>';
      return;
    }

    document.getElementById("profileHistory").innerHTML = recent.map(function (item) {
      return (
        '<div class="summary-panel mb-4">' +
          '<div class="summary-row"><span>Punto</span><strong>' + item.chargerName + "</strong></div>" +
          '<div class="summary-row"><span>Fecha</span><strong>' + window.LLineApp.formatDate(item.date, item.time) + "</strong></div>" +
          '<div class="summary-row"><span>Estado</span><strong>' + item.status + "</strong></div>" +
        "</div>"
      );
    }).join("");
  }

  function bindPreferences() {
    var roleSelect = document.getElementById("roleSelect");
    roleSelect.value = window.LLineApp.getRole();

    document.getElementById("notifyReservation").checked = user.preferences.notifyReservation;
    document.getElementById("notifyNearby").checked = user.preferences.notifyNearbyFree;

    document.getElementById("savePrefs").addEventListener("click", function () {
      user.preferences.notifyReservation = document.getElementById("notifyReservation").checked;
      user.preferences.notifyNearbyFree = document.getElementById("notifyNearby").checked;

      window.LLineApp.loginByRole(roleSelect.value).then(function () {
        window.LLineApp.showToast("Perfil actualizado", "Preferencias guardadas correctamente.", "success");
        setTimeout(function () {
          window.location.reload();
        }, 450);
      }).catch(function (err) {
        window.LLineApp.showToast("Error", err.message, "error");
      });
    });
  }

  function bindAddVehicle() {
    var form = document.getElementById("addVehicleForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var model = document.getElementById("vehicleModel").value.trim();
      var battery = document.getElementById("vehicleBattery").value.trim();
      var plate = document.getElementById("vehiclePlate").value.trim().toUpperCase();

      if (!model || !battery || !plate) {
        window.LLineApp.showToast("Vehiculo", "Completa todos los campos.", "warning");
        return;
      }

      var exists = user.vehicles.some(function (v) { return v.plate === plate; });
      if (exists) {
        window.LLineApp.showToast("Vehiculo", "Ya existe un vehiculo con esa matricula.", "warning");
        return;
      }

      user.vehicles.unshift({ model: model, battery: battery, plate: plate });
      saveVehicles(user.vehicles);
      renderVehicles();
      form.reset();
      window.LLineApp.showToast("Vehiculo anadido", "Se guardo correctamente en tu perfil.", "success");
    });
  }

  renderProfile();
  renderVehicles();
  renderHistory();
  bindPreferences();
  bindAddVehicle();
})();

