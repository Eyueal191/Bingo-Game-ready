const User = require("../models/userModels");
const WalletLog = require("../models/walletLog");
const logger = require("../utils/winstonLogger");
const crypto = require("crypto");
const RobotProfile = require("../models/robotProfile");
const { maleEthiopianNames } = require("../utils/ethiopianNames");

/**
 * Robot Service
 * Manages robot user lifecycle, wallet operations, and settings
 */
class RobotService {

    /**
     * Get or create a robot user for a specific stake amount
     * @param {number} stakeAmount - The stake amount for the game
     * @returns {Promise<User>} - The robot user
     */
    async getRobotForStake(stakeAmount) {
        try {
            // Try to find a robot specifically assigned to this stake or a general one
            let robot = await User.findOne({
                role: "robot",
                isRobot: true,
            }).sort({ createdAt: 1 }); // Get the oldest/primary robot

            if (!robot) {
                logger.info("RobotService: No robot found, creating new system robot");
                return await this.createRobotUser("System Robot", stakeAmount);
            }

            return robot;
        } catch (error) {
            logger.error("RobotService: Error getting robot", { error: error.message });
            throw error;
        }
    }

    /**
     * Create a new robot user
     * @param {string} name - Display name
     * @param {number} stakeAmount - Associated stake (optional context)
     * @param {string[]} initialNames - Optional initial list of names
     * @returns {Promise<User>}
     */
    async createRobotUser(name = "System Robot", stakeAmount = 0, initialNames = null) {
        try {
            const uniqueSuffix = crypto.randomBytes(4).toString("hex");
            const robotData = {
                telegramId: `ROBOT_${uniqueSuffix}`, // Virtual ID
                fullName: name,
                phone: `+000${uniqueSuffix}`, // Virtual phone
                role: "robot",
                isRobot: true,
                wallet: 0,
                password: crypto.randomBytes(16).toString("hex"), // Random secure password
                verificationStatus: "verified", // Robots are born verified
                verifiedAt: new Date()
            };

            const robot = await User.create(robotData);

            // Create profile with names
            // Use provided names, or fallback to default global list
            const namesToUse = (initialNames && Array.isArray(initialNames) && initialNames.length > 0)
                ? initialNames
                : [...maleEthiopianNames];

            await RobotProfile.create({
                userId: robot._id,
                names: namesToUse
            });

            logger.info("RobotService: Created new robot user and profile", { robotId: robot._id });
            return robot;
        } catch (error) {
            logger.error("RobotService: Error creating robot", { error: error.message });
            throw error;
        }
    }

    /**
     * Deduct amount from robot wallet (allows negative balance)
     * @param {string} robotId - Robot User ID
     * @param {number} amount - Amount to deduct
     * @param {string} reason - Reason for deduction
     * @returns {Promise<User>}
     */
    async deductRobotWallet(robotId, amount, reason = "System Deduction") {
        try {
            const robot = await User.findById(robotId);
            if (!robot || !robot.isRobot) {
                throw new Error("User is not a robot");
            }

            const balanceBefore = robot.wallet;
            const balanceAfter = balanceBefore - amount;

            robot.wallet = balanceAfter;
            await robot.save();

            // Log transaction
            await WalletLog.create({
                targetUser: robot._id,
                performedBy: robot._id, // Self-action
                amount: -amount,
                balanceBefore,
                balanceAfter,
                reason,
                type: "debit"
            });

            return robot;
        } catch (error) {
            logger.error("RobotService: Error deducting wallet", { robotId, amount, error: error.message });
            throw error;
        }
    }

    /**
     * Add winnings to robot wallet
     * @param {string} robotId - Robot User ID
     * @param {number} amount - Amount to add
     * @param {string} reason - Reason for addition
     * @returns {Promise<User>}
     */
    async addRobotWinnings(robotId, amount, reason = "Game Win") {
        try {
            const robot = await User.findById(robotId);
            if (!robot || !robot.isRobot) {
                throw new Error("User is not a robot");
            }

            const balanceBefore = robot.wallet;
            const balanceAfter = balanceBefore + amount;

            robot.wallet = balanceAfter;
            await robot.save();

            // Log transaction
            await WalletLog.create({
                targetUser: robot._id,
                performedBy: robot._id,
                amount: amount,
                balanceBefore,
                balanceAfter,
                reason,
                type: "credit"
            });

            return robot;
        } catch (error) {
            logger.error("RobotService: Error adding winnings", { robotId, amount, error: error.message });
            throw error;
        }
    }

    /**
     * Get robot wallet balance
     * @param {string} robotId 
     * @returns {Promise<number>}
     */
    async getRobotWalletBalance(robotId) {
        const robot = await User.findById(robotId);
        return robot ? robot.wallet : 0;
    }

    /**
     * Get robot profile names
     * @param {string} robotId
     * @returns {Promise<string[]>}
     */
    async getRobotNames(robotId) {
        let profile = await RobotProfile.findOne({ userId: robotId });
        // If no profile exists for an existing robot (legacy), create one with defaults
        if (!profile) {
            const user = await User.findById(robotId);
            if (user && (user.isRobot || user.role === 'robot')) {
                profile = await RobotProfile.create({
                    userId: robotId,
                    names: [...maleEthiopianNames]
                });
            } else {
                return [];
            }
        }
        return profile.names;
    }

    /**
     * Update robot names
     * @param {string} robotId
     * @param {string[]} names
     * @returns {Promise<string[]>}
     */
    async updateRobotNames(robotId, names) {
        if (!Array.isArray(names)) throw new Error("Names must be an array");

        // Ensure profile exists
        let profile = await RobotProfile.findOne({ userId: robotId });
        if (!profile) {
            // Validate user is robot first
            const user = await User.findById(robotId);
            if (!user || (!user.isRobot && user.role !== 'robot')) {
                throw new Error("User is not a robot");
            }
            profile = new RobotProfile({ userId: robotId });
        }

        profile.names = names;
        await profile.save();
        return profile.names;
    }
}

module.exports = new RobotService();
