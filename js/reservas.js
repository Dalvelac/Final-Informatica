/* global LLineMockData */
(async function () {
  await window.LLineApp.ensureSession();
  var chargers = await window.LLineApp.api.getChargers();
  var user = window.LLineMockData.user;
  var VEHICLES_KEY = "lline-vehicles";
  var selectedId = window.LLineApp.getSelectedCharger();
  var selected = chargers.find(function (c) { return c.id === selectedId; }) || chargers[0];

  var dateInput = document.getElementById("reserveDate");
  var timeInput = document.getElementById("reserveTime");
  var durationInput = document.getElementById("reserveDuration");
  var vehicleSelect = document.getElementById("vehicleSelect");

  function vehiclesForProfile() {
    try {
      var saved = JSON.parse(localStorage.getItem(VEHICLES_KEY) || "null");
      if (Array.isArray(saved) && saved.length) return saved;
    } catch (err) {
      // ignore JSON parse and fallback
    }
    return user.vehicles;
  }

  function fillVehicleSelect() {
    vehicleSelect.innerHTML = vehiclesForProfile().map(function (v) {
      return "<option>" + v.model + " (" + v.battery + ")</option>";
    }).join("");
  }

  async function activeCount() {
    var reservations = await window.LLineApp.api.getReservations();
    return reservations.filter(function (r) {
      return r.status === "activa";
    }).length;
  }

  async function fillSummary() {
    document.getElementById("activeReservations").textContent = String(await activeCount());

    var status = window.LLineApp.statusInfo(selected.status);
    document.getElementById("selectedChargerSummary").innerHTML =
      '<div class="flex items-center justify-between gap-3">' +
      '<div><strong>' + selected.name + '</strong><div class="text-sm text-muted">' + selected.address + "</div></div>" +
      '<span class="badge ' + status.badge + '">' + status.label + "</span>" +
      "</div>" +
      '<div class="summary-row"><span>Tipo</span><strong>' + selected.type + "</strong></div>" +
      '<div class="summary-row"><span>Potencia</span><strong>' + selected.power + " kW</strong></div>" +
      '<div class="summary-row"><span>Precio</span><strong>' + selected.price.toFixed(2) + " EUR/kWh</strong></div>";
  }

  function updateEstimate() {
    var duration = Number(durationInput.value);
    var estimated = Number((selected.price * duration * 0.2).toFixed(2));

    document.getElementById("costSummary").innerHTML =
      '<h3 class="font-semibold">Resumen de reserva</h3>' +
      '<div class="summary-row"><span>Duracion</span><strong>' + duration + " min</strong></div>" +
      '<div class="summary-row"><span>Carga estimada</span><strong>' + Math.round(duration * (selected.power / 60) * 0.25) + " kWh</strong></div>" +
      '<div class="summary-row"><span>Precio estimado</span><strong>' + window.LLineApp.formatCurrency(estimated) + "</strong></div>";
  }

  function setInitialDateTime() {
    var now = new Date();
    dateInput.value = now.toISOString().slice(0, 10);
    timeInput.value = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  }

  function startCountdown() {
    var total = 15 * 60;
    var box = document.getElementById("reserveCountdown");

    return setInterval(function () {
      total -= 1;
      var min = String(Math.floor(total / 60)).padStart(2, "0");
      var sec = String(total % 60).padStart(2, "0");
      box.textContent = "Tiempo limite para iniciar la carga: " + min + ":" + sec;
      if (total <= 0) {
        box.textContent = "Tu ventana de reserva ha caducado. Debes realizar una nueva reserva.";
        clearInterval(timer);
      }
    }, 1000);
  }

  async function submitReservation(event) {
    event.preventDefault();

    if (!dateInput.value || !timeInput.value) {
      window.LLineApp.showToast("Datos incompletos", "Selecciona fecha y hora para confirmar.", "warning");
      return;
    }

    var duration = Number(durationInput.value);
    var response = await window.LLineApp.api.createReservation({
      cargador_id: selected.id,
      fecha_inicio: dateInput.value + "T" + timeInput.value + ":00",
      duracion_minutos: duration
    }).catch(function (err) {
      window.LLineApp.showToast("Reserva", err.message, "error");
      return null;
    });

    if (!response) return;

    window.LLineApp.setSelectedCharger(selected.id);

    document.getElementById("confirmationBox").classList.remove("hidden");
    document.getElementById("confirmationBox").innerHTML =
      '<strong><i class="fa-solid fa-circle-check text-success"></i> Reserva confirmada</strong>' +
      '<p class="text-sm mt-2">' +
      selected.name +
      " - " +
      window.LLineApp.formatDate(response.date) +
      " · " +
      response.duration +
      " min · " +
      window.LLineApp.formatCurrency(response.cost) +
      "</p>";

    document.getElementById("activeReservations").textContent = String(await activeCount());
    window.LLineApp.showToast("Reserva realizada", "Tu plaza ha quedado registrada correctamente.", "success");
  }

  document.getElementById("reservationForm").addEventListener("submit", submitReservation);
  document.getElementById("clearReservation").addEventListener("click", function () {
    setInitialDateTime();
    durationInput.value = "60";
    updateEstimate();
  });
  durationInput.addEventListener("change", updateEstimate);

  fillVehicleSelect();
  await fillSummary();
  setInitialDateTime();
  updateEstimate();
  var timer = startCountdown();
})();

