/**
 * Bot Pacing Routes
 * 
 * Admin routes for configuring bot pacing settings.
 */
const express = require("express");
const router = express.Router();
const {
    getBotPacingSettings,
    updateBotPacingSettings,
    resetBotPacingSettings,
} = require("../controllers/botPacingController");
const { authenticate,isAdmin } = require("../middlewares/auth");

// All routes require admin authentication
router.use(authenticate);
router.use(isAdmin);

// GET /api/v1/bot-pacing - Get current settings
router.get("/", getBotPacingSettings);

// PUT /api/v1/bot-pacing - Update settings
router.put("/", updateBotPacingSettings);

// POST /api/v1/bot-pacing/reset - Reset to defaults
router.post("/reset", resetBotPacingSettings);

module.exports = router;
