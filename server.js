const express = require("express");
const cors = require("cors");
const path = require("path");

const { initDatabase } = require("./backend/db/init");
const authRoutes = require("./backend/routes/auth.routes");
const chargersRoutes = require("./backend/routes/chargers.routes");
const reservationsRoutes = require("./backend/routes/reservations.routes");
const incidentsRoutes = require("./backend/routes/incidents.routes");
const adminRoutes = require("./backend/routes/admin.routes");
const streamRoutes = require("./backend/routes/stream.routes");
const { attachUser, requireAuth } = require("./backend/middlewares/auth.middleware");
const { notFound, errorHandler } = require("./backend/middlewares/error.middleware");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api", attachUser);

app.use("/api", authRoutes);

app.use("/api/cargadores", chargersRoutes);
app.use("/api/reservas", reservationsRoutes);
app.use("/api/incidencias", incidentsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", streamRoutes);

// Ruta de compatibilidad para revisar sesión en pruebas rápidas.
app.get("/api/session", requireAuth, (req, res) => {
  res.json({ success: true, data: req.user, message: "Sesion activa" });
});

app.use(express.static(path.join(__dirname)));

app.use("/api", notFound);
app.use(errorHandler);

async function start() {
  await initDatabase();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Servidor LLine en http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("No se pudo iniciar el servidor:", err);
  process.exit(1);
});