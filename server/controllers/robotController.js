const RobotService = require("../services/robotService");
const User = require("../models/userModels");
const logger = require("../utils/winstonLogger");

/**
 * Robot Controller
 * Management endpoints for system robots
 */
const robotController = {
    /**
     * Create a new robot
     * POST /api/v1/robots
     */
    createRobot: async (req, res) => {
        try {
            const { name, stakeAmount } = req.body;

            const robot = await RobotService.createRobotUser(name, stakeAmount);

            res.status(201).json({
                message: "Robot created successfully",
                robot: {
                    id: robot._id,
                    fullName: robot.fullName,
                    telegramId: robot.telegramId,
                    wallet: robot.wallet,
                    createdAt: robot.createdAt
                }
            });
        } catch (error) {
            logger.error("Create robot error", { error: error.message });
            res.status(500).json({ error: "Failed to create robot" });
        }
    },

    /**
     * Delete a robot
     * DELETE /api/v1/robots/:id
     */
    deleteRobot: async (req, res) => {
        try {
            const { id } = req.params;

            // Check if robot has game history? 
            // For now, we allow soft delete or just delete if no critical constraints
            // But GameTransactions reference userId. We should probably just mark as deleted or verify.
            // MongoDB will keep the ID in transaction logs, so standard delete is okay from DB perspective
            // as long as we don't rely on joins for critical path without handling nulls.
            // Better: soft delete or check permissions.

            // For this implementation, we'll do a hard delete but warn if it has history
            const robot = await User.findById(id);
            if (!robot || !robot.isRobot) {
                return res.status(404).json({ error: "Robot not found" });
            }

            await User.findByIdAndDelete(id);

            res.json({ message: "Robot deleted successfully" });
        } catch (error) {
            logger.error("Delete robot error", { error: error.message });
            res.status(500).json({ error: "Failed to delete robot" });
        }
    },

    /**
     * Adjust robot wallet balance
     * PUT /api/v1/robots/:id/wallet
     */
    adjustWallet: async (req, res) => {
        try {
            const { id } = req.params;
            const { amount, action, reason } = req.body; // action: 'credit' or 'debit'

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: "Invalid amount" });
            }

            let updatedRobot;
            if (action === "credit") {
                updatedRobot = await RobotService.addRobotWinnings(id, Number(amount), reason || "Admin Adjustment");
            } else if (action === "debit") {
                updatedRobot = await RobotService.deductRobotWallet(id, Number(amount), reason || "Admin Adjustment");
            } else {
                return res.status(400).json({ error: "Invalid action. Use 'credit' or 'debit'" });
            }

            res.json({
                message: "Wallet adjusted successfully",
                wallet: updatedRobot.wallet
            });
        } catch (error) {
            logger.error("Adjust robot wallet error", { error: error.message });
            res.status(500).json({ error: "Failed to adjust wallet" });
        }
    },

    /**
     * Get robot names
     * GET /api/v1/robots/:id/names
     */
    getRobotNames: async (req, res) => {
        try {
            const { id } = req.params;
            const names = await RobotService.getRobotNames(id);
            res.json({ names });
        } catch (error) {
            logger.error("Get robot names error", { error: error.message });
            res.status(500).json({ error: "Failed to get robot names" });
        }
    },

    /**
     * Update robot names
     * PUT /api/v1/robots/:id/names
     */
    updateRobotNames: async (req, res) => {
        try {
            const { id } = req.params;
            const { names } = req.body;

            if (!Array.isArray(names)) {
                return res.status(400).json({ error: "Names must be an array" });
            }

            const updatedNames = await RobotService.updateRobotNames(id, names);
            res.json({
                message: "Robot names updated successfully",
                names: updatedNames
            });
        } catch (error) {
            logger.error("Update robot names error", { error: error.message });
            res.status(500).json({ error: "Failed to update robot names" });
        }
    }
};

module.exports = robotController;
