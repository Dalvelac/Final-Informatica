const db = require("../db/database");
const { ok } = require("../utils/response");
const { listLogs } = require("../services/audit.service");

async function getStats(req, res, next) {
  try {
    const [totals, libres, ocupados, reparacion, reservados, reservasActivas] = await Promise.all([
      db.get("SELECT COUNT(*) as total FROM cargadores"),
      db.get("SELECT COUNT(*) as total FROM cargadores WHERE estado = 'libre'"),
      db.get("SELECT COUNT(*) as total FROM cargadores WHERE estado = 'ocupado'"),
      db.get("SELECT COUNT(*) as total FROM cargadores WHERE estado = 'reparacion'"),
      db.get("SELECT COUNT(*) as total FROM cargadores WHERE estado = 'reservado'"),
      db.get("SELECT COUNT(*) as total FROM reservas WHERE estado = 'activa'")
    ]);

    return ok(res, {
      cargadoresTotales: totals.total,
      libres: libres.total,
      ocupados: ocupados.total,
      reparacion: reparacion.total,
      reservados: reservados.total,
      reservasActivas: reservasActivas.total
    });
  } catch (err) {
    return next(err);
  }
}

async function getLogs(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const logs = await listLogs(limit);
    return ok(res, logs);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getStats, getLogs };

