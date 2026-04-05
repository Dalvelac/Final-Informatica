const express = require("express");
const { getMe, login, logout } = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/me", requireAuth, getMe);
router.post("/login", login);
router.post("/logout", requireAuth, logout);

module.exports = router;

