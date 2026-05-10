/**
 * Bot Pacing Controller
 * 
 * SIMPLIFIED: Admin API endpoints for configuring bot pacing settings.
 * Only 3 settings: maxCardsPerTick, delayMs, verboseLogging
 */
const BotPacingSettings = require("../models/botPacingSettings");
const { clearPacingCache } = require("../services/botPacingService");

/**
 * GET /api/v1/bot-pacing
 * Get current bot pacing settings
 */
exports.getBotPacingSettings = async (req, res) => {
    try {
        const settings = await BotPacingSettings.getSettings();
        res.status(200).json({
            success: true,
            data: {
                maxCardsPerTick: settings.maxCardsPerTick,
                delayMs: settings.delayMs,
                verboseLogging: settings.verboseLogging,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch bot pacing settings",
            error: error.message,
        });
    }
};

/**
 * PUT /api/v1/bot-pacing
 * Update bot pacing settings
 */
exports.updateBotPacingSettings = async (req, res) => {
    try {
        const allowedFields = [
            "maxCardsPerTick",
            "delayMs",
            "verboseLogging",
        ];

        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        // Validate values
        if (updates.maxCardsPerTick !== undefined) {
            const val = Number(updates.maxCardsPerTick);
            if (isNaN(val) || val < 1 || val > 100) {
                return res.status(400).json({
                    success: false,
                    message: "maxCardsPerTick must be between 1 and 100",
                });
            }
            updates.maxCardsPerTick = val;
        }

        if (updates.delayMs !== undefined) {
            const val = Number(updates.delayMs);
            if (isNaN(val) || val < 20 || val > 1000) {
                return res.status(400).json({
                    success: false,
                    message: "delayMs must be between 20 and 1000",
                });
            }
            updates.delayMs = val;
        }

        const settings = await BotPacingSettings.updateSettings(updates);

        // Clear cache to apply new settings immediately
        clearPacingCache();

        res.status(200).json({
            success: true,
            message: "Bot pacing settings updated successfully",
            data: {
                maxCardsPerTick: settings.maxCardsPerTick,
                delayMs: settings.delayMs,
                verboseLogging: settings.verboseLogging,
            },
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: Object.values(error.errors).map((e) => e.message),
            });
        }
        res.status(500).json({
            success: false,
            message: "Failed to update bot pacing settings",
            error: error.message,
        });
    }
};

/**
 * POST /api/v1/bot-pacing/reset
 * Reset bot pacing settings to defaults
 */
exports.resetBotPacingSettings = async (req, res) => {
    try {
        await BotPacingSettings.deleteMany({});
        const settings = await BotPacingSettings.getSettings();

        // Clear cache
        clearPacingCache();

        res.status(200).json({
            success: true,
            message: "Bot pacing settings reset to defaults",
            data: {
                maxCardsPerTick: settings.maxCardsPerTick,
                delayMs: settings.delayMs,
                verboseLogging: settings.verboseLogging,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to reset bot pacing settings",
            error: error.message,
        });
    }
};
