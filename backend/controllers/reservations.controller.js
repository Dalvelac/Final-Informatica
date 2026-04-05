const db = require("../db/database");
const { ok, fail } = require("../utils/response");
const { generateId } = require("../utils/ids");
const { logAction } = require("../services/audit.service");
const { broadcast } = require("../services/events.service");

function mapReservation(row) {
  var iso = row.fecha_inicio || "";
  var date = iso.includes("T") ? iso.slice(0, 10) : iso;
  var time = iso.includes("T") ? iso.slice(11, 16) : null;
  return {
    id: row.id,
    userId: row.usuario_id,
    chargerId: row.cargador_id,
    chargerName: row.cargador_nombre,
    date: date,
    time: time,
    dateTime: iso,
    duration: row.duracion_minutos,
    endDate: row.fecha_fin,
    expiresAt: row.expires_at,
    status: row.estado,
    cost: row.precio_estimado,
    createdAt: row.created_at
  };
}

async function expireReservations() {
  const expired = await db.all(
    `SELECT id, cargador_id FROM reservas
     WHERE estado = 'activa' AND expires_at IS NOT NULL AND julianday(expires_at) < julianday('now')`
  );

  for (const item of expired) {
    await db.run("UPDATE reservas SET estado = 'cancelada' WHERE id = ?", [item.id]);
    await db.run("UPDATE cargadores SET estado = 'libre', disponible = 1, updated_at = datetime('now') WHERE id = ?", [item.cargador_id]);
    broadcast("reservation_canceled", { reservationId: item.id, cargador_id: item.cargador_id, reason: "expired" });
    broadcast("charger_updated", { id: item.cargador_id, status: "libre" });
  }
}

async function listReservations(req, res, next) {
  try {
    await expireReservations();
    const filters = [];
    const params = [];

    if (req.user.rol === "user") {
      filters.push("r.usuario_id = ?");
      params.push(req.user.id);
    }

    const rows = await db.all(
      `SELECT r.*, c.nombre as cargador_nombre
       FROM reservas r
       JOIN cargadores c ON c.id = r.cargador_id
       ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
       ORDER BY r.created_at DESC`,
      params
    );

    return ok(res, rows.map(mapReservation));
  } catch (err) {
    return next(err);
  }
}

async function getReservation(req, res, next) {
  try {
    await expireReservations();
    const row = await db.get(
      `SELECT r.*, c.nombre as cargador_nombre
       FROM reservas r
       JOIN cargadores c ON c.id = r.cargador_id
       WHERE r.id = ?`,
      [req.params.id]
    );

    if (!row) {
      return fail(res, "Reserva no encontrada", 404);
    }

    if (req.user.rol === "user" && row.usuario_id !== req.user.id) {
      return fail(res, "No tienes permisos para ver esta reserva", 403);
    }

    return ok(res, mapReservation(row));
  } catch (err) {
    return next(err);
  }
}

async function createReservation(req, res, next) {
  try {
    await expireReservations();
    const { cargador_id, fecha_inicio, duracion_minutos } = req.body || {};

    if (!cargador_id || !fecha_inicio || !duracion_minutos) {
      return fail(res, "cargador_id, fecha_inicio y duracion_minutos son obligatorios", 400);
    }

    const charger = await db.get("SELECT * FROM cargadores WHERE id = ?", [cargador_id]);
    if (!charger) {
      return fail(res, "Cargador no encontrado", 404);
    }

    if (charger.estado !== "libre" || !charger.disponible) {
      return fail(res, "El cargador no esta disponible para reservar", 409);
    }

    const start = new Date(fecha_inicio);
    if (Number.isNaN(start.getTime())) {
      return fail(res, "fecha_inicio no tiene un formato valido", 400);
    }

    const duration = Number(duracion_minutos);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const expiresAt = new Date(start.getTime() + 15 * 60 * 1000);
    const estimated = Number((charger.coste * duration * 0.2).toFixed(2));
    const reservationId = generateId("res");

    await db.run(
      `INSERT INTO reservas (id, usuario_id, cargador_id, fecha_inicio, duracion_minutos, fecha_fin, expires_at, estado, precio_estimado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'activa', ?)`,
      [reservationId, req.user.id, cargador_id, start.toISOString(), duration, end.toISOString(), expiresAt.toISOString(), estimated]
    );

    await db.run(
      `UPDATE cargadores SET estado = 'reservado', disponible = 0, updated_at = datetime('now') WHERE id = ?`,
      [cargador_id]
    );

    await logAction({ usuarioId: req.user.id, accion: "CREATE", entidad: "reserva", entidadId: reservationId, detalle: `Reserva en cargador ${cargador_id}` });
    broadcast("reservation_created", { reservationId, cargador_id });
    broadcast("charger_updated", { id: cargador_id, status: "reservado" });

    const created = await db.get(
      `SELECT r.*, c.nombre as cargador_nombre
       FROM reservas r
       JOIN cargadores c ON c.id = r.cargador_id
       WHERE r.id = ?`,
      [reservationId]
    );

    return ok(res, mapReservation(created), "Reserva creada", 201);
  } catch (err) {
    return next(err);
  }
}

async function cancelReservation(req, res, next) {
  try {
    const row = await db.get("SELECT * FROM reservas WHERE id = ?", [req.params.id]);
    if (!row) {
      return fail(res, "Reserva no encontrada", 404);
    }

    if (req.user.rol === "user" && row.usuario_id !== req.user.id) {
      return fail(res, "Solo puedes cancelar tus propias reservas", 403);
    }

    if (row.estado !== "activa") {
      return fail(res, "Solo se pueden cancelar reservas activas", 409);
    }

    await db.run("UPDATE reservas SET estado = 'cancelada' WHERE id = ?", [row.id]);
    await db.run("UPDATE cargadores SET estado = 'libre', disponible = 1, updated_at = datetime('now') WHERE id = ?", [row.cargador_id]);

    await logAction({ usuarioId: req.user.id, accion: "CANCEL", entidad: "reserva", entidadId: row.id, detalle: "Reserva cancelada" });
    broadcast("reservation_canceled", { reservationId: row.id, cargador_id: row.cargador_id });
    broadcast("charger_updated", { id: row.cargador_id, status: "libre" });

    const updated = await db.get(
      `SELECT r.*, c.nombre as cargador_nombre
       FROM reservas r
       JOIN cargadores c ON c.id = r.cargador_id
       WHERE r.id = ?`,
      [row.id]
    );

    return ok(res, mapReservation(updated), "Reserva cancelada");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listReservations,
  getReservation,
  createReservation,
  cancelReservation
};

