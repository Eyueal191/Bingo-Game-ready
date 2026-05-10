const express = require("express");
const {
  getGameHistory,
  getTransactionHistory,
} = require("../controllers/historyController");
const { authenticate } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/game-history", authenticate, asyncHandler(getGameHistory));
router.get("/transactions", authenticate, asyncHandler(getTransactionHistory));
module.exports = router;
