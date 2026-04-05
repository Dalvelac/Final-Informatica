const express = require("express");
const ctrl = require("../controllers/reservations.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, ctrl.listReservations);
router.get("/:id", requireAuth, ctrl.getReservation);
router.post("/", requireAuth, ctrl.createReservation);
router.patch("/:id/cancelar", requireAuth, ctrl.cancelReservation);

module.exports = router;

