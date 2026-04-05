const express = require("express");
const ctrl = require("../controllers/admin.controller");
const { requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/stats", requireRole("admin"), ctrl.getStats);
router.get("/logs", requireRole("admin"), ctrl.getLogs);

module.exports = router;

