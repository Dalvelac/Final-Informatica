/* global L */
(async function () {
  var mapEl = document.getElementById("map");
  if (!mapEl || !window.L) return;

  await window.LLineApp.ensureSession();

  var chargers = [];
  var markerMap = {};
  var selectedCharger = null;
  var userPosition = { lat: 40.4168, lng: -3.7038 };
  var MIN_MARKER_ZOOM = 8;
  var MAX_LIST_ITEMS = 160;
  var mapRenderTimer = null;

  var state = {
    search: "",
    estado: "all",
    tipo: "all",
    dist: 2000,
    power: 0,
    price: 1,
    onlyAvailable: false,
    sort: "distancia"
  };

  var map = L.map("map", { zoomControl: true }).setView([40.4168, -3.7038], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  function markerHTML(charger) {
    var pulseClass = charger.status === "libre" ? " pulse-marker" : "";
    return '<div class="lline-marker ' + charger.status + pulseClass + '"><i class="fa-solid fa-bolt"></i></div>';
  }

  function clearMarkers() {
    Object.keys(markerMap).forEach(function (id) {
      markerMap[id].remove();
    });
    markerMap = {};
  }

  function createMarkers(items) {
    clearMarkers();
    items.forEach(function (charger) {
      var marker = L.marker([charger.lat, charger.lng], {
        icon: L.divIcon({
          html: markerHTML(charger),
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        })
      });

      marker.on("click", function () {
        openDetail(charger);
      });

      marker.bindPopup(
        '<div class="popup-content">' +
          '<div class="popup-name">' + charger.name + "</div>" +
          '<div class="popup-addr">' + charger.address + "</div>" +
          '<div class="popup-meta">' +
            '<span class="badge ' + window.LLineApp.statusInfo(charger.status).badge + '">' +
            window.LLineApp.statusInfo(charger.status).label +
            "</span>" +
            '<button class="popup-btn" onclick="window.LLineMap.openById(\'' + charger.id + '\')">Ver</button>' +
          "</div>" +
        "</div>"
      );

      marker.addTo(map);
      markerMap[charger.id] = marker;
    });
  }

  function getViewportItems(items) {
    var zoom = map.getZoom();
    if (zoom < MIN_MARKER_ZOOM) {
      return [];
    }

    var bounds = map.getBounds();
    var visible = items.filter(function (item) {
      return bounds.contains([item.lat, item.lng]);
    });

    // Evita sobrecargar el mapa en zonas super densas.
    var MAX_MARKERS = 420;
    if (visible.length <= MAX_MARKERS) {
      return visible;
    }

    var step = Math.ceil(visible.length / MAX_MARKERS);
    return visible.filter(function (_, index) {
      return index % step === 0;
    });
  }

  function toRad(value) { return (value * Math.PI) / 180; }

  function distanceKm(a, b) {
    var R = 6371;
    var dLat = toRad(b.lat - a.lat);
    var dLng = toRad(b.lng - a.lng);
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }

  function enrichDistance(list) {
    return list.map(function (item) {
      var dist = Number(distanceKm(userPosition, { lat: item.lat, lng: item.lng }).toFixed(1));
      return Object.assign({}, item, { distance: dist });
    });
  }

  async function refreshChargers() {
    try {
      var rows = await window.LLineApp.api.getChargers();
      chargers = enrichDistance(rows);
      renderResults();
    } catch (err) {
      window.LLineApp.showToast("Mapa", err.message, "error");
    }
  }

  function currentResults() {
    return chargers.filter(function (item) {
      var q = state.search.trim().toLowerCase();
      var bySearch = !q || item.name.toLowerCase().includes(q) || item.address.toLowerCase().includes(q);
      var byEstado = state.estado === "all" || item.status === state.estado;
      var byTipo = state.tipo === "all" || item.type === state.tipo;
      var byDist = item.distance <= state.dist;
      var byPower = item.power >= state.power;
      var byPrice = item.price <= state.price;
      var byAvailable = !state.onlyAvailable || item.status === "libre";
      return bySearch && byEstado && byTipo && byDist && byPower && byPrice && byAvailable;
    }).sort(function (a, b) {
      if (state.sort === "potencia") return b.power - a.power;
      if (state.sort === "precio") return a.price - b.price;
      if (state.sort === "nombre") return a.name.localeCompare(b.name, "es");
      return a.distance - b.distance;
    });
  }

  function resultCard(charger) {
    var status = window.LLineApp.statusInfo(charger.status);
    var price = Number(charger.price || 0);
    return (
      '<article class="charger-card" data-id="' + charger.id + '">' +
        '<div class="charger-card-icon"><i class="fa-solid fa-charging-station"></i></div>' +
        '<div class="charger-card-body">' +
          '<div class="charger-card-name">' + charger.name + "</div>" +
          '<div class="charger-card-meta">' +
            '<span><i class="fa-solid fa-location-dot"></i> ' + charger.distance + ' km</span>' +
            '<span><i class="fa-solid fa-bolt"></i> ' + charger.power + ' kW</span>' +
            '<span><i class="fa-solid fa-euro-sign"></i> ' + price.toFixed(2) + ' /kWh</span>' +
          "</div>" +
          '<div class="flex items-center justify-between">' +
            '<span class="badge ' + status.badge + '">' + status.label + "</span>" +
            '<button class="btn btn-outline btn-sm" data-action="details">Ver detalles</button>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderResults() {
    var list = document.getElementById("chargerList");
    var count = document.getElementById("resultsCount");
    var toggleCount = document.getElementById("panelToggleCount");
    var items = currentResults();
    var viewportItems = getViewportItems(items);

    if (!items.length) {
      list.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-state-icon"><i class="fa-solid fa-map-location-dot"></i></div>' +
        '<div class="empty-state-title">No hay cargadores con esos filtros</div>' +
        '<div class="empty-state-desc">Prueba ampliar la distancia o desactivar filtros de disponibilidad.</div>' +
        "</div>";
    } else {
      var renderItems = items.slice(0, MAX_LIST_ITEMS);
      list.innerHTML = renderItems.map(resultCard).join("");
      if (items.length > MAX_LIST_ITEMS) {
        list.innerHTML +=
          '<div class="text-xs text-muted text-center" style="padding:8px 4px">Mostrando ' +
          MAX_LIST_ITEMS +
          " de " +
          items.length +
          " resultados. Acerca o filtra para ver menos.</div>";
      }
    }

    if (map.getZoom() < MIN_MARKER_ZOOM) {
      count.textContent = items.length + " encontrados · Acerca el mapa para pintar marcadores";
    } else {
      count.textContent =
        items.length +
        " encontrados · " +
        viewportItems.length +
        " visibles en mapa";
    }
    if (toggleCount) toggleCount.textContent = String(items.length);
    createMarkers(viewportItems);
  }

  function scheduleRender() {
    if (mapRenderTimer) {
      clearTimeout(mapRenderTimer);
    }
    mapRenderTimer = setTimeout(renderResults, 90);
  }

  function fillStars(value) {
    var stars = "";
    for (var i = 1; i <= 5; i += 1) {
      stars += '<i class="fa-solid ' + (i <= Math.round(value) ? "fa-star" : "fa-star-half-stroke") + '"></i>';
    }
    return stars;
  }

  function openDetail(charger) {
    selectedCharger = charger;

    var rating = Number(charger.rating || 4.2);
    var reviews = Number(charger.reviews || 0);
    var spots = charger.spots !== undefined ? charger.spots : "N/D";
    var schedule = charger.schedule || "24/7";

    document.getElementById("modalName").textContent = charger.name;
    document.getElementById("modalAddress").textContent = charger.address;
    document.getElementById("modalTipo").textContent = charger.type;
    document.getElementById("modalPotencia").textContent = charger.power + " kW";
    document.getElementById("modalTiempo").textContent = charger.eta;
    document.getElementById("modalPrecio").textContent = charger.price.toFixed(2) + " EUR/kWh";
    document.getElementById("modalHorario").textContent = schedule;
    document.getElementById("modalConectores").textContent = charger.connectors;
    document.getElementById("modalDistancia").textContent = charger.distance + " km";
    document.getElementById("modalPlazas").textContent = String(spots);

    var status = window.LLineApp.statusInfo(charger.status);
    var statusBar = document.getElementById("detailStatusBar");
    statusBar.className = "detail-status-bar " + status.badge;
    statusBar.innerHTML = '<i class="fa-solid fa-circle"></i> Estado actual: ' + status.label;

    var pct = Math.max(10, Math.min(100, Math.round((charger.power / 350) * 100)));
    document.getElementById("modalPowerPct").textContent = pct + "%";
    document.getElementById("modalPowerBar").style.width = pct + "%";

    document.getElementById("ratingStars").innerHTML = fillStars(rating);
    document.getElementById("ratingScore").textContent = rating.toFixed(1);
    document.getElementById("ratingCount").textContent = "(" + reviews + " valoraciones)";

    document.getElementById("chargerModal").classList.add("open");
  }

  function closeModal(id) {
    var modal = document.getElementById(id);
    modal.classList.remove("open");
  }

  function updateRangeLabels() {
    document.getElementById("distLabel").textContent = state.dist >= 2000 ? "Sin limite" : state.dist + " km";
    document.getElementById("powerLabel").textContent = state.power + " kW";
    document.getElementById("priceLabel").textContent = state.price >= 1 ? "Sin limite" : state.price.toFixed(2) + " EUR/kWh";
  }

  function updateFilterCount() {
    var count = 0;
    if (state.estado !== "all") count += 1;
    if (state.tipo !== "all") count += 1;
    if (state.dist !== 2000) count += 1;
    if (state.power !== 0) count += 1;
    if (state.price !== 1) count += 1;
    if (state.onlyAvailable) count += 1;

    var badge = document.getElementById("filterCount");
    badge.textContent = String(count);
    badge.style.display = count ? "inline-flex" : "none";
  }

  function syncReserveEstimate() {
    var dur = Number(document.getElementById("reserveDuration").value);
    var estTime = document.getElementById("estTime");
    var estPrice = document.getElementById("estPrice");

    estTime.textContent = dur + " min";
    if (selectedCharger) {
      var estimate = selectedCharger.price * (selectedCharger.power * (dur / 60)) * 0.22;
      estPrice.textContent = window.LLineApp.formatCurrency(Math.max(1.5, estimate));
    }
  }

  function openReserveModal() {
    if (!selectedCharger) return;

    var summary = document.getElementById("reserveSummary");
    summary.innerHTML =
      '<div class="charger-card-icon"><i class="fa-solid fa-bolt"></i></div>' +
      '<div>' +
      '<div class="font-semibold">' + selectedCharger.name + "</div>" +
      '<div class="text-sm text-muted">' + selectedCharger.address + "</div>" +
      "</div>";

    var now = new Date();
    document.getElementById("reserveDate").value = now.toISOString().slice(0, 10);
    document.getElementById("reserveTime").value = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

    syncReserveEstimate();
    document.getElementById("reserveModal").classList.add("open");
  }

  function confirmReserve() {
    if (!selectedCharger) return;

    var date = document.getElementById("reserveDate").value;
    var time = document.getElementById("reserveTime").value;
    var duration = Number(document.getElementById("reserveDuration").value);

    if (!date || !time) {
      window.LLineApp.showToast("Faltan datos", "Selecciona fecha y hora para confirmar.", "warning");
      return;
    }

    window.LLineApp.api.createReservation({
      cargador_id: selectedCharger.id,
      fecha_inicio: date + "T" + time + ":00",
      duracion_minutos: duration
    }).then(function () {
      window.LLineApp.setSelectedCharger(selectedCharger.id);
      closeModal("reserveModal");
      closeModal("chargerModal");
      window.LLineApp.showToast("Reserva confirmada", "Tu plaza se ha reservado correctamente.", "success");
      refreshChargers();
    }).catch(function (err) {
      window.LLineApp.showToast("No se pudo reservar", err.message, "error");
    });
  }

  function bindEvents() {
    document.getElementById("searchInput").addEventListener("input", function (e) {
      state.search = e.target.value;
      document.getElementById("clearSearch").style.display = state.search ? "inline-flex" : "none";
      renderResults();
    });

    document.getElementById("clearSearch").addEventListener("click", function () {
      document.getElementById("searchInput").value = "";
      state.search = "";
      renderResults();
      this.style.display = "none";
    });

    document.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var filter = chip.dataset.filter;
        var value = chip.dataset.val;
        document.querySelectorAll('.chip[data-filter="' + filter + '"]').forEach(function (item) {
          item.classList.remove("active");
        });
        chip.classList.add("active");
        state[filter] = value;
        updateFilterCount();
      });
    });

    document.getElementById("distFilter").addEventListener("input", function (e) {
      state.dist = Number(e.target.value);
      updateRangeLabels();
      updateFilterCount();
    });

    document.getElementById("powerFilter").addEventListener("input", function (e) {
      state.power = Number(e.target.value);
      updateRangeLabels();
      updateFilterCount();
    });

    document.getElementById("priceFilter").addEventListener("input", function (e) {
      state.price = Number(e.target.value);
      updateRangeLabels();
      updateFilterCount();
    });

    document.getElementById("onlyAvailable").addEventListener("change", function (e) {
      state.onlyAvailable = e.target.checked;
      updateFilterCount();
    });

    document.getElementById("applyFilters").addEventListener("click", renderResults);

    document.getElementById("resetFilters").addEventListener("click", function () {
      state.estado = "all";
      state.tipo = "all";
      state.dist = 2000;
      state.power = 0;
      state.price = 1;
      state.onlyAvailable = false;
      document.getElementById("distFilter").value = "2000";
      document.getElementById("powerFilter").value = "0";
      document.getElementById("priceFilter").value = "1";
      document.getElementById("onlyAvailable").checked = false;

      document.querySelectorAll(".chip").forEach(function (chip) {
        var initialAll = chip.dataset.val === "all";
        if ((chip.dataset.filter === "estado" || chip.dataset.filter === "tipo") && initialAll) {
          chip.classList.add("active");
        } else {
          chip.classList.remove("active");
        }
      });

      updateRangeLabels();
      updateFilterCount();
      renderResults();
    });

    document.getElementById("sortSelect").addEventListener("change", function (e) {
      state.sort = e.target.value;
      renderResults();
    });

    document.getElementById("chargerList").addEventListener("click", function (e) {
      var card = e.target.closest(".charger-card");
      if (!card) return;
      var id = card.dataset.id;
      var charger = chargers.find(function (item) { return item.id === id; });
      if (!charger) return;

      openDetail(charger);
      var marker = markerMap[id];
      if (marker) {
        map.setView([charger.lat, charger.lng], 15);
        marker.openPopup();
      }
    });

    document.getElementById("locateBtn").addEventListener("click", function () {
      var button = this;
      if (!navigator.geolocation) {
        window.LLineApp.showToast("GPS no disponible", "Tu navegador no soporta geolocalizacion.", "error");
        return;
      }
      button.classList.add("locating");
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        userPosition = { lat: lat, lng: lng };
        map.setView([lat, lng], 14);
        L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: "#1976D2",
          color: "#fff",
          weight: 3,
          fillOpacity: 0.9
        }).addTo(map);
        button.classList.remove("locating");
        chargers = enrichDistance(chargers);
        renderResults();
      }, function () {
        window.LLineApp.showToast("Ubicacion denegada", "No se pudo acceder a tu ubicacion.", "warning");
        button.classList.remove("locating");
      });
    });

    document.getElementById("filtersToggle").addEventListener("click", function () {
      document.getElementById("filtersBody").classList.toggle("open");
      document.getElementById("filtersChevron").classList.toggle("open");
    });

    document.getElementById("panelToggle").addEventListener("click", function () {
      document.getElementById("mapPanel").classList.toggle("open");
    });

    document.getElementById("closeModal").addEventListener("click", function () {
      closeModal("chargerModal");
    });

    document.getElementById("closeReserveModal").addEventListener("click", function () {
      closeModal("reserveModal");
    });

    document.getElementById("cancelReserve").addEventListener("click", function () {
      closeModal("reserveModal");
    });

    document.getElementById("reserveBtn").addEventListener("click", openReserveModal);
    document.getElementById("confirmReserve").addEventListener("click", confirmReserve);
    document.getElementById("reserveDuration").addEventListener("change", syncReserveEstimate);

    document.getElementById("detailBtn").addEventListener("click", function () {
      if (!selectedCharger) return;
      window.LLineApp.setSelectedCharger(selectedCharger.id);
      window.location.href = "reservas.html";
    });

    document.getElementById("navBtn").addEventListener("click", function () {
      if (!selectedCharger) return;
      window.open("https://www.google.com/maps/search/?api=1&query=" + selectedCharger.lat + "," + selectedCharger.lng, "_blank");
    });

    document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) {
          overlay.classList.remove("open");
        }
      });
    });
  }

  window.LLineMap = {
    openById: function (id) {
      var charger = chargers.find(function (item) { return item.id === id; });
      if (charger) openDetail(charger);
    }
  };

  await refreshChargers();
  bindEvents();
  updateRangeLabels();
  updateFilterCount();
  map.on("moveend zoomend", scheduleRender);
  setInterval(refreshChargers, 15000);

  window.LLineApp.startEvents(function () {
    refreshChargers();
  });

  document.getElementById("filtersBody").classList.add("open");
  document.getElementById("filtersChevron").classList.add("open");
})();

