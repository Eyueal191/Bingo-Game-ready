const express = require("express");
const router = express.Router();
const { getGameHistory, getLeaderboard, getAdminLeaderboard, getMyGameHistory, getRecentWinners } = require("../controllers/gameHistoryController");
const { authenticate, isAdmin, isManager } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.get("/recent-winners", asyncHandler(getRecentWinners));
router.get("/mine", authenticate, asyncHandler(getGameHistory));
router.get(
	"/leaderboard",
	authenticate,

	asyncHandler(getLeaderboard)
);
router.get(
	"/leaderboard/admin",
	authenticate,
	isManager,
	asyncHandler(getAdminLeaderboard)
);
router.get("/history/:userId", asyncHandler(getMyGameHistory));

module.exports = router;
