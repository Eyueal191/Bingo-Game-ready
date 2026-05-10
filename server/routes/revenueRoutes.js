const express = require("express");
const router = express.Router();
const { authenticate, isFinance } = require("../middlewares/auth");

const {
    getRevenueBreakdown,
    getGameTransactions,
    getRobotStats,
    getDailyRevenueTrend,
} = require("../controllers/revenueController");

// All routes require finance access
router.use(authenticate, isFinance);

// GET /api/v1/revenue/breakdown - Get comprehensive revenue breakdown
router.get("/breakdown", getRevenueBreakdown);

// GET /api/v1/revenue/transactions - Get game transactions with pagination
router.get("/transactions", getGameTransactions);

// GET /api/v1/revenue/robots - Get robot users with stats
router.get("/robots", getRobotStats);

// GET /api/v1/revenue/trend - Get daily revenue trend
router.get("/trend", getDailyRevenueTrend);

module.exports = router;
