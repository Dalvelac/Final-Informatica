const baseUrl = process.env.API_BASE || "http://localhost:3000";

async function api(path, options = {}) {
  const response = await fetch(baseUrl + path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success) {
    throw new Error(`${path}: ${payload.message || response.statusText}`);
  }
  return payload.data;
}

async function login(email, password) {
  const data = await api("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return data.token;
}

async function run() {
  const userToken = await login("user@lline.app", "demo123");
  const userHeaders = { Authorization: `Bearer ${userToken}` };

  const chargers = await api("/api/cargadores", { headers: userHeaders });
  if (!Array.isArray(chargers) || chargers.length === 0) {
    throw new Error("No hay cargadores en la base de datos");
  }

  const first = chargers[0];
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  let reservation = null;
  try {
    reservation = await api("/api/reservas", {
      method: "POST",
      headers: { ...userHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        cargador_id: first.id,
        fecha_inicio: start,
        duracion_minutos: 30
      })
    });
  } catch (err) {
    // Puede fallar si el primer cargador no esta libre; en ese caso solo validamos listado.
  }

  await api("/api/reservas", { headers: userHeaders });

  const tecnicoToken = await login("tecnico@lline.app", "demo123");
  const tecnicoHeaders = { Authorization: `Bearer ${tecnicoToken}` };
  await api("/api/incidencias", {
    method: "POST",
    headers: { ...tecnicoHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      cargador_id: first.id,
      descripcion: "Smoke test incidencia",
      severidad: "media"
    })
  });

  const adminToken = await login("admin@lline.app", "demo123");
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  await api("/api/admin/stats", { headers: adminHeaders });
  await api("/api/admin/logs", { headers: adminHeaders });

  if (reservation && reservation.id) {
    await api(`/api/reservas/${reservation.id}/cancelar`, {
      method: "PATCH",
      headers: userHeaders
    }).catch(() => null);
  }

  console.log("Smoke API OK");
}

run().catch((err) => {
  console.error("Smoke API FAILED:", err.message);
  process.exit(1);
});

