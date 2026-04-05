const express = require("express");
const ctrl = require("../controllers/chargers.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, ctrl.listChargers);
router.get("/:id", requireAuth, ctrl.getCharger);
router.post("/", requireRole("admin"), ctrl.createCharger);
router.put("/:id", requireRole("admin"), ctrl.updateCharger);
router.delete("/:id", requireRole("admin"), ctrl.deleteCharger);
router.patch("/:id/estado", requireRole("admin", "tecnico"), ctrl.patchEstado);

module.exports = router;

