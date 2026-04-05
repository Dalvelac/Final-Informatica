const express = require("express");
const ctrl = require("../controllers/incidents.controller");
const { requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireRole("admin", "tecnico"), ctrl.listIncidencias);
router.post("/", requireRole("tecnico", "admin"), ctrl.createIncidencia);

module.exports = router;

