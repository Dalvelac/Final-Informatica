const db = require("../db/database");
const { ok, fail } = require("../utils/response");
const { generateId } = require("../utils/ids");
const { logAction } = require("../services/audit.service");
const { broadcast } = require("../services/events.service");

function mapCharger(row) {
  return {
    id: row.id,
    name: row.nombre,
    address: row.direccion,
    lat: row.lat,
    lng: row.lng,
    type: row.tipo,
    status: row.estado,
    power: row.potencia,
    battery: row.nivel_bateria,
    eta: row.tiempo_estimado,
    price: row.coste,
    available: !!row.disponible,
    connectors: row.conectores,
    updatedAt: row.updated_at
  };
}

async function listChargers(req, res, next) {
  try {
    const { tipo, estado } = req.query;
    const where = [];
    const params = [];

    if (tipo) {
      where.push("tipo = ?");
      params.push(tipo);
    }
    if (estado) {
      where.push("estado = ?");
      params.push(estado);
    }

    const query = `SELECT * FROM cargadores ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY nombre ASC`;
    const rows = await db.all(query, params);
    return ok(res, rows.map(mapCharger));
  } catch (err) {
    return next(err);
  }
}

async function getCharger(req, res, next) {
  try {
    const row = await db.get("SELECT * FROM cargadores WHERE id = ?", [req.params.id]);
    if (!row) {
      return fail(res, "Cargador no encontrado", 404);
    }
    return ok(res, mapCharger(row));
  } catch (err) {
    return next(err);
  }
}

async function createCharger(req, res, next) {
  try {
    const payload = req.body || {};
    const required = ["nombre", "direccion", "lat", "lng", "tipo", "potencia", "coste"];
    const missing = required.filter((k) => payload[k] === undefined || payload[k] === null || payload[k] === "");
    if (missing.length) {
      return fail(res, `Faltan campos obligatorios: ${missing.join(", ")}`, 400);
    }

    const id = payload.id || generateId("chg");
    await db.run(
      `INSERT INTO cargadores (id, nombre, direccion, lat, lng, tipo, estado, potencia, nivel_bateria, tiempo_estimado, coste, disponible, conectores, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        payload.nombre,
        payload.direccion,
        Number(payload.lat),
        Number(payload.lng),
        payload.tipo,
        payload.estado || "libre",
        Number(payload.potencia),
        Number(payload.nivel_bateria || 100),
        payload.tiempo_estimado || "60 min",
        Number(payload.coste),
        payload.disponible === false ? 0 : 1,
        payload.conectores || "Tipo 2"
      ]
    );

    const created = await db.get("SELECT * FROM cargadores WHERE id = ?", [id]);
    await logAction({
      usuarioId: req.user.id,
      accion: "CREATE",
      entidad: "cargador",
      entidadId: id,
      detalle: `Alta de cargador ${payload.nombre}`
    });
    broadcast("charger_updated", { id, status: created.estado });

    return ok(res, mapCharger(created), "Cargador creado", 201);
  } catch (err) {
    return next(err);
  }
}

async function updateCharger(req, res, next) {
  try {
    const id = req.params.id;
    const existing = await db.get("SELECT * FROM cargadores WHERE id = ?", [id]);
    if (!existing) {
      return fail(res, "Cargador no encontrado", 404);
    }

    const payload = req.body || {};
    await db.run(
      `UPDATE cargadores
       SET nombre = ?, direccion = ?, lat = ?, lng = ?, tipo = ?, estado = ?, potencia = ?,
           nivel_bateria = ?, tiempo_estimado = ?, coste = ?, disponible = ?, conectores = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        payload.nombre || existing.nombre,
        payload.direccion || existing.direccion,
        Number(payload.lat !== undefined ? payload.lat : existing.lat),
        Number(payload.lng !== undefined ? payload.lng : existing.lng),
        payload.tipo || existing.tipo,
        payload.estado || existing.estado,
        Number(payload.potencia !== undefined ? payload.potencia : existing.potencia),
        Number(payload.nivel_bateria !== undefined ? payload.nivel_bateria : existing.nivel_bateria),
        payload.tiempo_estimado || existing.tiempo_estimado,
        Number(payload.coste !== undefined ? payload.coste : existing.coste),
        payload.disponible === undefined ? existing.disponible : payload.disponible ? 1 : 0,
        payload.conectores || existing.conectores,
        id
      ]
    );

    const updated = await db.get("SELECT * FROM cargadores WHERE id = ?", [id]);
    await logAction({ usuarioId: req.user.id, accion: "UPDATE", entidad: "cargador", entidadId: id, detalle: "Edicion de cargador" });
    broadcast("charger_updated", { id, status: updated.estado });

    return ok(res, mapCharger(updated), "Cargador actualizado");
  } catch (err) {
    return next(err);
  }
}

async function deleteCharger(req, res, next) {
  try {
    const id = req.params.id;
    const result = await db.run("DELETE FROM cargadores WHERE id = ?", [id]);
    if (!result.changes) {
      return fail(res, "Cargador no encontrado", 404);
    }

    await logAction({ usuarioId: req.user.id, accion: "DELETE", entidad: "cargador", entidadId: id, detalle: "Baja de cargador" });
    broadcast("charger_deleted", { id });

    return ok(res, null, "Cargador eliminado");
  } catch (err) {
    return next(err);
  }
}

async function patchEstado(req, res, next) {
  try {
    const id = req.params.id;
    const { estado } = req.body || {};
    if (!estado) {
      return fail(res, "El campo estado es obligatorio", 400);
    }

    const row = await db.get("SELECT * FROM cargadores WHERE id = ?", [id]);
    if (!row) {
      return fail(res, "Cargador no encontrado", 404);
    }

    await db.run(
      `UPDATE cargadores SET estado = ?, disponible = ?, updated_at = datetime('now') WHERE id = ?`,
      [estado, estado === "libre" ? 1 : 0, id]
    );

    await logAction({ usuarioId: req.user.id, accion: "PATCH_STATUS", entidad: "cargador", entidadId: id, detalle: `Cambio de estado a ${estado}` });

    const updated = await db.get("SELECT * FROM cargadores WHERE id = ?", [id]);
    broadcast("charger_updated", { id, status: estado });
    return ok(res, mapCharger(updated), "Estado actualizado");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listChargers,
  getCharger,
  createCharger,
  updateCharger,
  deleteCharger,
  patchEstado
};

