const express = require("express");
const { authenticate, isAdmin } = require("../middlewares/auth");
const {
    transferBalance,
    getAllTransfers,
    getUserTransfers,
    deleteTransfer,
} = require("../controllers/transferController");
const { getAppSettings } = require("../services/appSettingsService");

const router = express.Router();

// Middleware to pass io to controllers
router.use((req, res, next) => {
    req.io = req.app.get("io");
    next();
});

// Middleware to inject wallet rules into request for the controller if we choose to use it there,
// or we can validate max/min right here in the route.
const validateTransferLimits = async (req, res, next) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid transfer amount" });
        }

        const { walletRules } = await getAppSettings();
        const min = walletRules?.minTransferAmount || 10;
        const max = walletRules?.maxTransferAmount || 500;

        if (amount < min) {
            return res.status(400).json({ message: `Minimum transfer amount is ${min}` });
        }
        if (amount > max) {
            return res.status(400).json({ message: `Maximum transfer amount is ${max}` });
        }

        next();
    } catch (error) {
        return res.status(500).json({ message: "Error validating transfer rules", error: error.message });
    }
};

// Protect all transfer routes
router.use(authenticate);

// Endpoint for users to transfer balance to each other
router.post("/", validateTransferLimits, transferBalance);

// Admin history endpoints
router.get("/", isAdmin, getAllTransfers);
router.get("/user/:userId", isAdmin, getUserTransfers);
router.delete("/:transferId", isAdmin, deleteTransfer);

module.exports = router;