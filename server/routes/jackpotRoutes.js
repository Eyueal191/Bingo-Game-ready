const express = require("express");
const { authenticate, isAdmin, isManager } = require("../middlewares/auth");
const {
    getJackpotConfig,
    updateJackpotConfig,
    adjustWallet,
    manualAllocate,
    getPublicJackpot,
    getHistory,
} = require("../controllers/jackpotController");

const router = express.Router();

// Middleware to pass io to controllers
router.use((req, res, next) => {
    req.io = req.app.get("io");
    next();
});

// Public endpoint — no auth required
router.get("/public", getPublicJackpot);

// Protected admin endpoints
router.use(authenticate);

router.get("/", isManager, getJackpotConfig);
router.put("/", isManager, updateJackpotConfig);
router.post("/adjust-wallet", isAdmin, adjustWallet);
router.post("/allocate-daily", isAdmin, manualAllocate);
router.get("/history", isManager, getHistory);

module.exports = router;
