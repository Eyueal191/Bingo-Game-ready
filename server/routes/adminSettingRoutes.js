const express = require("express");
const router = express.Router();
const { getSettings, updateSettings } = require("../controllers/AdminSettingController");
const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

// Get current settings
router.get("/", authenticate, isAdmin, asyncHandler(getSettings));

// Update settings
router.put("/", authenticate, isAdmin, asyncHandler(updateSettings));

module.exports = router;
