const { fail } = require("../utils/response");

function notFound(req, res) {
  return fail(res, "Ruta no encontrada", 404);
}

function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  console.error("[API ERROR]", err);
  return fail(res, "Error interno del servidor", 500, process.env.NODE_ENV === "development" ? err.message : null);
}

module.exports = { notFound, errorHandler };

