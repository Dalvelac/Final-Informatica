const express = require("express");
const { openStream, ping } = require("../controllers/stream.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/health", ping);
router.get("/stream", requireAuth, openStream);

module.exports = router;

