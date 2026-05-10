const jackpotService = require("../services/jackpotService");
const logger = require("../utils/winstonLogger");

/**
 * GET /api/v1/jackpot
 * Admin: Get full jackpot config
 */
const getJackpotConfig = async (req, res) => {
    try {
        const config = await jackpotService.getJackpotConfig();
        res.json({ success: true, config });
    } catch (err) {
        logger.error("jackpotController.getJackpotConfig error", { err: err.message });
        res.status(500).json({ message: "Failed to fetch jackpot config" });
    }
};

/**
 * PUT /api/v1/jackpot
 * Admin: Update jackpot config (enabled, dailyAllocationPercent, levels)
 */
const updateJackpotConfig = async (req, res) => {
    try {
        const config = await jackpotService.getJackpotConfig();
        const { enabled, dailyAllocationPercent, levels } = req.body;

        if (typeof enabled === "boolean") config.enabled = enabled;

        if (typeof dailyAllocationPercent === "number") {
            config.dailyAllocationPercent = Math.max(0, Math.min(100, dailyAllocationPercent));
        }

        if (Array.isArray(levels)) {
            config.levels = levels.map((l, i) => ({
                key: l.key || `level_${i}`,
                label: l.label || `Level ${i + 1}`,

                balance: Math.max(0, Number(l.balance) || 0),

                // ✅ ADD THIS
                awardAmount: Math.max(0, Number(l.awardAmount) || 0),

                allocationPercent: Math.max(0, Math.min(100, Number(l.allocationPercent) || 0)),
                rollbackPercent: Math.max(0, Math.min(100, Number(l.rollbackPercent) || 20)),

                winConditions: {
                    maxCalls: Math.max(1, Number(l.winConditions?.maxCalls) || 4),
                    maxSeconds: Math.max(1, Number(l.winConditions?.maxSeconds) || 5),
                },

                color: l.color || "#FFD700",
                icon: l.icon || "🏆",
                enabled: typeof l.enabled === "boolean" ? l.enabled : true,
                priority: typeof l.priority === "number" ? l.priority : i,

                savedBalance: Math.max(0, Number(l.savedBalance) || 0),
            }));
        }

        await config.save();

        if (req.io) {
            const publicData = await jackpotService.getPublicJackpotData();
            req.io.emit("jackpotUpdate", publicData);
        }

        res.json({ success: true, config });

    } catch (err) {
        logger.error("jackpotController.updateJackpotConfig error", {
            err: err.message,
        });
        res.status(500).json({ message: "Failed to update jackpot config" });
    }
};
/**
 * POST /api/v1/jackpot/adjust-wallet
 * Admin: Adjust central wallet (distribute to levels)
 */
const adjustWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        const result = await jackpotService.adjustCentralWallet(amount, req.user?._id);

        // Emit update
        if (req.io) {
            const publicData = await jackpotService.getPublicJackpotData();
            req.io.emit("jackpotUpdate", publicData);
        }

        res.json({ success: true, ...result });
    } catch (err) {
        logger.error("jackpotController.adjustWallet error", { err: err.message });
        res.status(400).json({ message: err.message || "Failed to adjust wallet" });
    }
};

/**
 * POST /api/v1/jackpot/allocate-daily
 * Admin: Manually trigger daily allocation
 */
const manualAllocate = async (req, res) => {
    try {
        const result = await jackpotService.allocateDailyProfits(true);

        // Emit update
        if (req.io) {
            const publicData = await jackpotService.getPublicJackpotData();
            req.io.emit("jackpotUpdate", publicData);
        }

        res.json({ success: true, result });
    } catch (err) {
        logger.error("jackpotController.manualAllocate error", { err: err.message });
        res.status(500).json({ message: "Failed to allocate" });
    }
};

/**
 * GET /api/v1/jackpot/public
 * Public: Get player-facing jackpot data
 */
const getPublicJackpot = async (req, res) => {
    try {
        const data = await jackpotService.getPublicJackpotData();
        res.json(data);
    } catch (err) {
        logger.error("jackpotController.getPublicJackpot error", { err: err.message });
        res.status(500).json({ message: "Failed to fetch jackpot data" });
    }
};

/**
 * GET /api/v1/jackpot/history
 * Admin: Get allocation history
 */
const getHistory = async (req, res) => {
    try {
        const config = await jackpotService.getJackpotConfig();
        res.json({
            success: true,
            history: (config.allocationHistory || []).slice().reverse(),
        });
    } catch (err) {
        logger.error("jackpotController.getHistory error", { err: err.message });
        res.status(500).json({ message: "Failed to fetch history" });
    }
};

module.exports = {
    getJackpotConfig,
    updateJackpotConfig,
    adjustWallet,
    manualAllocate,
    getPublicJackpot,
    getHistory,
};
