const crypto = require("crypto");
const db = require("../db/database");
const { ok, fail } = require("../utils/response");
const { logAction } = require("../services/audit.service");

async function getMe(req, res) {
  if (!req.user) {
    return fail(res, "Sesion no iniciada", 401);
  }
  return ok(res, req.user, "Sesion activa");
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return fail(res, "Email y password son obligatorios", 400);
    }

    const user = await db.get("SELECT * FROM usuarios WHERE email = ?", [String(email).toLowerCase()]);
    if (!user || user.password_hash !== password) {
      return fail(res, "Credenciales invalidas", 401);
    }

    const token = crypto.randomBytes(24).toString("hex");
    await db.run("INSERT INTO sesiones (token, usuario_id) VALUES (?, ?)", [token, user.id]);

    await logAction({
      usuarioId: user.id,
      accion: "LOGIN",
      entidad: "sesion",
      entidadId: token,
      detalle: `Inicio de sesion para ${user.email}`
    });

    return ok(res, {
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
    }, "Login correcto");
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (!req.user || !req.user.token) {
      return fail(res, "Sesion no iniciada", 401);
    }

    await db.run("DELETE FROM sesiones WHERE token = ?", [req.user.token]);
    await logAction({
      usuarioId: req.user.id,
      accion: "LOGOUT",
      entidad: "sesion",
      entidadId: req.user.token,
      detalle: "Cierre de sesion"
    });

    return ok(res, null, "Sesion cerrada");
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMe, login, logout };

