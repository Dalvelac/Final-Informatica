const db = require("../db/database");

async function logAction({ usuarioId = null, accion, entidad, entidadId = null, detalle = "" }) {
  await db.run(
    `INSERT INTO logs_auditoria (usuario_id, accion, entidad, entidad_id, detalle)
     VALUES (?, ?, ?, ?, ?)`,
    [usuarioId, accion, entidad, entidadId, detalle]
  );
}

async function listLogs(limit = 100) {
  return db.all(
    `SELECT l.*, u.nombre as usuario_nombre, u.rol as usuario_rol
     FROM logs_auditoria l
     LEFT JOIN usuarios u ON u.id = l.usuario_id
     ORDER BY l.created_at DESC
     LIMIT ?`,
    [limit]
  );
}

module.exports = { logAction, listLogs };

