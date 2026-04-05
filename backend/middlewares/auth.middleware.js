const db = require("../db/database");
const { fail } = require("../utils/response");

async function attachUser(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const token = bearer || req.headers["x-session-token"] || req.query.token || null;

    if (!token) {
      req.user = null;
      return next();
    }

    const session = await db.get(
      `SELECT s.token, u.id, u.nombre, u.email, u.rol
       FROM sesiones s
       JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token = ?`,
      [token]
    );

    req.user = session
      ? { id: session.id, nombre: session.nombre, email: session.email, rol: session.rol, token: session.token }
      : null;

    return next();
  } catch (err) {
    return next(err);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return fail(res, "Debes iniciar sesion para continuar", 401);
  }
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, "Debes iniciar sesion para continuar", 401);
    }
    if (!roles.includes(req.user.rol)) {
      return fail(res, "No tienes permisos para realizar esta accion", 403);
    }
    return next();
  };
}

module.exports = { attachUser, requireAuth, requireRole };

