const express = require("express");
const router = express.Router();
const  {getGameHistory, getLeaderboard, getAdminLeaderboard, getMyGameHistory} = require("../controllers/gameHistoryController");
const { authenticate,isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.get("/mine", authenticate, asyncHandler(getGameHistory));
router.get(
	"/leaderboard",
	authenticate,

	asyncHandler(getLeaderboard)
);
router.get(
	"/leaderboard/admin",
	authenticate,
	isAdmin,
	asyncHandler(getAdminLeaderboard)
);
router.get("/history/:userId", asyncHandler(getMyGameHistory));

module.exports = router;
