const express = require("express");
const router = express.Router();
const {
    getSettings,
    updateSettings,
    getCardReservationSettings,
    updateCardReservationSettings
} = require("../controllers/settingController");
const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

// Admin-only routes
// Public/User routes
router.get("/", authenticate, asyncHandler(getSettings));
router.get("/card-reservation", authenticate, asyncHandler(getCardReservationSettings));

// Admin-only routes
router.post("/", authenticate, isAdmin, asyncHandler(updateSettings));
router.put("/card-reservation", authenticate, isAdmin, asyncHandler(updateCardReservationSettings));

module.exports = router;