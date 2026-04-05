const db = require("./database");

const TARGET = {
  total: 2400,
  libre: 1847,
  ocupado: 423,
  reparacion: 130
};

const CITY_HUBS = [
  { city: "Madrid", province: "Madrid", lat: 40.4168, lng: -3.7038, spread: 0.28 },
  { city: "Barcelona", province: "Barcelona", lat: 41.3874, lng: 2.1686, spread: 0.22 },
  { city: "Valencia", province: "Valencia", lat: 39.4699, lng: -0.3763, spread: 0.2 },
  { city: "Sevilla", province: "Sevilla", lat: 37.3891, lng: -5.9845, spread: 0.2 },
  { city: "Bilbao", province: "Bizkaia", lat: 43.263, lng: -2.935, spread: 0.16 },
  { city: "Zaragoza", province: "Zaragoza", lat: 41.6488, lng: -0.8891, spread: 0.16 },
  { city: "Malaga", province: "Malaga", lat: 36.7213, lng: -4.4214, spread: 0.18 },
  { city: "Murcia", province: "Murcia", lat: 37.9922, lng: -1.1307, spread: 0.14 },
  { city: "Valladolid", province: "Valladolid", lat: 41.6523, lng: -4.7245, spread: 0.15 },
  { city: "A Coruna", province: "A Coruna", lat: 43.3623, lng: -8.4115, spread: 0.15 },
  { city: "Palma", province: "Illes Balears", lat: 39.5696, lng: 2.6502, spread: 0.14 },
  { city: "Las Palmas", province: "Las Palmas", lat: 28.1235, lng: -15.4363, spread: 0.12 }
];

function pad(num, size) {
  return String(num).padStart(size, "0");
}

function pickType(index) {
  if (index % 5 === 0) return "rapido";
  if (index % 3 === 0) return "compatible";
  return "estandar";
}

function pickPower(type) {
  if (type === "rapido") return 120 + Math.floor(Math.random() * 180);
  if (type === "compatible") return 22 + Math.floor(Math.random() * 28);
  return 7 + Math.floor(Math.random() * 16);
}

function pickConnectors(type) {
  if (type === "rapido") return "CCS, CHAdeMO";
  if (type === "compatible") return "Tipo 2, CCS";
  return "Tipo 2";
}

function buildStatusList() {
  var list = [];
  for (var i = 0; i < TARGET.libre; i += 1) list.push("libre");
  for (var j = 0; j < TARGET.ocupado; j += 1) list.push("ocupado");
  for (var k = 0; k < TARGET.reparacion; k += 1) list.push("reparacion");
  return list;
}

function createCharger(index, status) {
  var type = pickType(index);
  var hub = CITY_HUBS[index % CITY_HUBS.length];
  var lat = hub.lat + (Math.random() - 0.5) * hub.spread;
  var lng = hub.lng + (Math.random() - 0.5) * hub.spread;
  var power = pickPower(type);

  return {
    id: "chg-" + pad(index + 1, 4),
    nombre: "LLine Punto " + pad(index + 1, 4),
    direccion: "Zona " + (1 + (index % 140)) + ", " + hub.city + " (" + hub.province + ")",
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    tipo: type,
    estado: status,
    potencia: power,
    nivel_bateria: status === "reparacion" ? 0 : 60 + Math.floor(Math.random() * 40),
    tiempo_estimado: type === "rapido" ? "25 min" : "60 min",
    coste: Number((0.15 + Math.random() * 0.25).toFixed(2)),
    disponible: status === "libre" ? 1 : 0,
    conectores: pickConnectors(type)
  };
}

async function currentFleetSummary() {
  const total = await db.get("SELECT COUNT(*) as total FROM cargadores");
  const libres = await db.get("SELECT COUNT(*) as total FROM cargadores WHERE estado = 'libre'");
  const ocupados = await db.get("SELECT COUNT(*) as total FROM cargadores WHERE estado = 'ocupado'");
  const reparacion = await db.get("SELECT COUNT(*) as total FROM cargadores WHERE estado = 'reparacion'");
  const reservados = await db.get("SELECT COUNT(*) as total FROM cargadores WHERE estado = 'reservado'");

  return {
    total: total.total,
    libre: libres.total,
    ocupado: ocupados.total,
    reparacion: reparacion.total,
    reservado: reservados.total
  };
}

async function currentGeoSpread() {
  return db.get(
    `SELECT
      MIN(lat) as min_lat,
      MAX(lat) as max_lat,
      MIN(lng) as min_lng,
      MAX(lng) as max_lng
     FROM cargadores`
  );
}

function hasNationalCoverage(spread) {
  if (!spread || spread.min_lat === null) return false;
  var latRange = Number(spread.max_lat) - Number(spread.min_lat);
  var lngRange = Number(spread.max_lng) - Number(spread.min_lng);
  return latRange > 6.5 && lngRange > 8.0;
}

function isTarget(summary) {
  return (
    summary.total === TARGET.total &&
    summary.libre === TARGET.libre &&
    summary.ocupado === TARGET.ocupado &&
    summary.reparacion === TARGET.reparacion &&
    summary.reservado === 0
  );
}

async function rebuildFleet() {
  const statuses = buildStatusList();
  const chargers = statuses.map(function (status, index) {
    return createCharger(index, status);
  });

  await db.run("BEGIN TRANSACTION");
  try {
    await db.run("DELETE FROM incidencias");
    await db.run("DELETE FROM reservas");
    await db.run("DELETE FROM cargadores");

    for (const charger of chargers) {
      await db.run(
        `INSERT INTO cargadores (id, nombre, direccion, lat, lng, tipo, estado, potencia, nivel_bateria, tiempo_estimado, coste, disponible, conectores, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          charger.id,
          charger.nombre,
          charger.direccion,
          charger.lat,
          charger.lng,
          charger.tipo,
          charger.estado,
          charger.potencia,
          charger.nivel_bateria,
          charger.tiempo_estimado,
          charger.coste,
          charger.disponible,
          charger.conectores
        ]
      );
    }

    await db.run(
      `INSERT INTO reservas (id, usuario_id, cargador_id, fecha_inicio, duracion_minutos, fecha_fin, expires_at, estado, precio_estimado, created_at)
       VALUES
       ('res-demo-1', 1, 'chg-0001', datetime('now', '-3 day'), 60, datetime('now', '-3 day', '+60 minute'), datetime('now', '-3 day', '+15 minute'), 'completada', 7.9, datetime('now', '-3 day')),
       ('res-demo-2', 1, 'chg-0002', datetime('now', '-1 day'), 45, datetime('now', '-1 day', '+45 minute'), datetime('now', '-1 day', '+15 minute'), 'cancelada', 0, datetime('now', '-1 day'))`
    );

    await db.run(
      `INSERT INTO incidencias (cargador_id, tecnico_id, descripcion, severidad, estado, created_at)
       VALUES
       ('chg-2301', 3, 'Mantenimiento preventivo programado.', 'media', 'en_proceso', datetime('now', '-5 hour')),
       ('chg-2350', 3, 'Sustitucion de modulo de potencia.', 'alta', 'abierta', datetime('now', '-2 hour'))`
    );

    await db.run(
      `INSERT INTO logs_auditoria (usuario_id, accion, entidad, entidad_id, detalle, created_at)
       VALUES (2, 'RESEED', 'cargadores', 'fleet-2400', 'Se regenera flota academica con 2400 cargadores', datetime('now'))`
    );

    await db.run("COMMIT");
  } catch (err) {
    await db.run("ROLLBACK");
    throw err;
  }
}

async function ensureFleetData() {
  const summary = await currentFleetSummary();
  const spread = await currentGeoSpread();
  if (isTarget(summary) && hasNationalCoverage(spread)) return summary;
  await rebuildFleet();
  return currentFleetSummary();
}

module.exports = {
  ensureFleetData,
  TARGET
};

