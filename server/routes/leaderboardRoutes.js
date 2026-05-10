const express = require("express");
const { getLeaderboard } = require("../controllers/leaderboardController");
const { authenticate } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/leaderboard", authenticate, asyncHandler(getLeaderboard));

module.exports = router;
