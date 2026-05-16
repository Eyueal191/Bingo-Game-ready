const express = require("express");
const router = express.Router();
const {
  getBingoDashboard,
} = require("../controllers/bingoDashboardController");
const { authenticate } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.get("/reports", authenticate, asyncHandler(getBingoDashboard));

module.exports = router;
