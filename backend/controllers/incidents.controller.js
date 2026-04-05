const db = require("../db/database");
const { ok, fail } = require("../utils/response");
const { logAction } = require("../services/audit.service");
const { broadcast } = require("../services/events.service");

async function listIncidencias(req, res, next) {
  try {
    const rows = await db.all(
      `SELECT i.*, c.nombre as cargador_nombre, u.nombre as tecnico_nombre
       FROM incidencias i
       JOIN cargadores c ON c.id = i.cargador_id
       JOIN usuarios u ON u.id = i.tecnico_id
       ORDER BY i.created_at DESC`
    );

    const data = rows.map((row) => ({
      id: row.id,
      chargerId: row.cargador_id,
      chargerName: row.cargador_nombre,
      tecnicoId: row.tecnico_id,
      tecnicoNombre: row.tecnico_nombre,
      descripcion: row.descripcion,
      severidad: row.severidad,
      estado: row.estado,
      createdAt: row.created_at
    }));

    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function createIncidencia(req, res, next) {
  try {
    const { cargador_id, descripcion, severidad, estado } = req.body || {};
    if (!cargador_id || !descripcion || !severidad) {
      return fail(res, "cargador_id, descripcion y severidad son obligatorios", 400);
    }

    const charger = await db.get("SELECT id FROM cargadores WHERE id = ?", [cargador_id]);
    if (!charger) {
      return fail(res, "Cargador no encontrado", 404);
    }

    const result = await db.run(
      `INSERT INTO incidencias (cargador_id, tecnico_id, descripcion, severidad, estado)
       VALUES (?, ?, ?, ?, ?)`,
      [cargador_id, req.user.id, descripcion, severidad, estado || "abierta"]
    );

    await logAction({ usuarioId: req.user.id, accion: "CREATE", entidad: "incidencia", entidadId: String(result.lastID), detalle: descripcion });
    broadcast("incident_created", { id: result.lastID, cargador_id, severidad });

    const created = await db.get("SELECT * FROM incidencias WHERE id = ?", [result.lastID]);
    return ok(res, created, "Incidencia registrada", 201);
  } catch (err) {
    return next(err);
  }
}

module.exports = { listIncidencias, createIncidencia };

