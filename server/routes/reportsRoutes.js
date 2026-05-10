const express = require("express");
const router = express.Router();
const {
  getBingoDashboard,
} = require("../controllers/bingoDashboardController");
const { authenticate, isFinance, isSecretary } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.get(
  "/reports",
  authenticate,
  isSecretary,
  asyncHandler(getBingoDashboard)
);

module.exports = router;
