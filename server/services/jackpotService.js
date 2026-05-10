/**
 * Jackpot Service — All jackpot operations for the bingo game.
 *
 * Functions:
 *   getJackpotConfig       — Get the singleton config
 *   checkJackpotWin        — Determine which level (if any) a win qualifies for
 *   awardJackpot           — Credit winner, apply rollback, record transaction
 *   allocateDailyProfits   — Distribute daily bingo profit to levels
 *   adjustCentralWallet    — Admin top-up/reduce, redistributes to levels
 *   getPublicJackpotData   — Safe data for player-facing UI
 */

const JackpotConfig = require("../models/JackpotConfig");
const User = require("../models/userModels");
const GameRoom = require("../models/gameRoom");
const { Transaction: MainTransaction, TransactionStatus } = require("../models/Transaction");
const walletService = require("./walletService");
const logger = require("../utils/winstonLogger");
const JackpotHistory = require("../models/JackpotHistory.js");
/**
 * Get the singleton JackpotConfig document.
 */

const getJackpotConfig = async () => {
  let config = await JackpotConfig.getConfig();

  if (!config) {
    logger.error("Jackpot config missing, using fallback");
    return {
      enabled: false,
      levels: [],
    };
  }

  config.levels = config.levels ?? [];

  return config;
};

/**
 * Check which jackpot level (if any) a win qualifies for.
 *
 * @param {number} callCount — number of drawn numbers when the winner hit bingo
 * @param {number} elapsedSeconds — seconds from game start (playing) to win
 * @returns {object|null} — the matching level subdocument, or null
 */
const checkJackpotWin = async (callCount, elapsedSeconds) => {
    const config = await getJackpotConfig();
    if (!config.enabled) return null;

    // Sort by priority (lowest first = most prestigious)
    const sortedLevels = [...config.levels]
        .filter((l) => l.enabled && l.balance > 0)
        .sort((a, b) => a.priority - b.priority);

    for (const level of sortedLevels) {
        const { maxCalls, maxSeconds } = level.winConditions;
        if (callCount <= maxCalls && elapsedSeconds <= maxSeconds) {
            return level;
        }
    }

    return null;
};

/**
 * Award a jackpot prize to a winner.
 *
 * @param {string} levelKey — key of the jackpot level being awarded
 * @param {string} winnerId — User._id of the winner
 * @param {string} roomId — GameRoom._id for reference
 * @param {object} io — Socket.IO instance for real-time updates
 * @returns {{ awarded: number, rollback: number, level: object }|null}
 */
const awardJackpot = async (levelKey, winnerId, roomId, io) => {
    const config = await getJackpotConfig();

    const level = config.levels.find((l) => l.key === levelKey);

    if (!level || !level.enabled || level.balance <= 500) {
        logger.warn("jackpotService.awardJackpot: level not available", { levelKey });
        return null;
    }

    const awardedAmount = Number(level.awardAmount || 0);

    if (awardedAmount <= 0) {
        logger.warn("jackpotService.awardJackpot: invalid awardAmount", {
            levelKey,
            awardAmount: level.awardAmount,
        });
        return null;
    }

    // 🔒 1. DOUBLE-AWARD GUARD (MUST BE FIRST)
    const JackpotHistory = require("../models/JackpotHistory");

    const alreadyAwarded = await JackpotHistory.findOne({
        roomId,
        levelKey,
        winnerId,
    });

    if (alreadyAwarded) {
        logger.warn("Jackpot already awarded (blocked duplicate)", {
            roomId,
            levelKey,
            winnerId,
        });
        return null;
    }

    // 🧠 lock record FIRST (prevents race condition)
    await JackpotHistory.create({
        roomId,
        levelKey,
        winnerId,
        amount: awardedAmount,
        createdAt: new Date(),
    });

    const originalBalance = level.balance;

    try {
        // 2. Deduct safely
        level.balance = Math.max(0, level.balance - awardedAmount);
        config.centralWallet = Math.max(
            0,
            (config.centralWallet || 0) - awardedAmount
        );

        await config.save();

        // 3. Credit winner
        await walletService.creditBonus(winnerId, awardedAmount);

    } catch (err) {
        // rollback jackpot history if something fails
        await JackpotHistory.deleteOne({
            roomId,
            levelKey,
            winnerId,
        });

        level.balance = originalBalance;
        await config.save();

        logger.error("jackpotService.awardJackpot: failed", { err: err.message });
        throw err;
    }

    // 4. Transaction log
    const { TransactionType, TransactionStatus } = require("../models/Transaction");
    const User = require("../models/User");

    try {
        await new MainTransaction({
            userId: winnerId,
            type: TransactionType.JACKPOT,
            amount: awardedAmount,
            bonusAmount: awardedAmount,
            creditedAmount: 0,
            status: TransactionStatus.COMPLETED,
            reference: `jackpot-${levelKey}-${roomId}-${Date.now()}`,
            description: `${level.label} Jackpot prize in room ${roomId}`,
        }).save();
    } catch (err) {
        logger.error("jackpotService: transaction failed", { err: err.message });
    }

    // 5. Wallet update
    if (io) {
        const user = await User.findById(winnerId).select("wallet bonus");

        if (user) {
            io.to(winnerId.toString()).emit("walletUpdate", {
                wallet: user.wallet,
                bonus: user.bonus,
            });
        }
    }

    // 6. Jackpot update
    if (io) {
        const publicData = await getPublicJackpotData();
        io.emit("jackpotUpdate", publicData);
    }

    logger.info("jackpotService.awardJackpot: success", {
        levelKey,
        winnerId,
        roomId,
        awardedAmount,
    });

    return {
        awarded: awardedAmount,
        level,
    };
};
/**
 * Allocate daily bingo profits to jackpot levels.
 * Uses houseProfit from completed bingo GameRooms for today.
 */
const allocateDailyProfits = async (isManual = false) => {
    let config = await getJackpotConfig();
    if (!config || !config.enabled) {
        logger.info("jackpotService.allocateDailyProfits: jackpot disabled or no config");
        return null;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Use a date-sweep cursor for high-performance idempotent allocation
    // If we have a lastProcessedTimestamp, start from there. Otherwise, start from 24h ago.
    let queryStart = config.lastProcessedTimestamp;
    if (!queryStart) {
        queryStart = new Date(startOfToday);
        queryStart.setDate(queryStart.getDate() - 1);
    }

    // Determine the end of our sweep: start of today (to ensure we process full UTC days)
    // For manual triggers, we might allow processing up to 'now'
    const queryEnd = isManual ? now : startOfToday;

    // Prevent redundant automated runs
    if (!isManual && queryStart >= queryEnd) {
        logger.info("jackpotService.allocateDailyProfits: already up to date", { queryStart, queryEnd });
        return null;
    }

    logger.info("jackpotService.allocateDailyProfits: starting sweep", { queryStart, queryEnd, isManual });

    // Sum houseProfit from all completed bingo games in the window
    const rooms = await GameRoom.aggregate([
        {
            $match: {
                status: "completed",
                completedAt: { $gte: queryStart, $lt: queryEnd },
                houseProfit: { $gt: 0 },
            },
        },
        {
            $group: {
                _id: null,
                totalProfit: { $sum: "$houseProfit" },
            },
        },
    ]);

    const totalProfit = rooms.length > 0 ? rooms[0].totalProfit : 0;
    let totalAllocation = 0;
    let totalSavedPool = 0;
    const breakdown = [];

    if (totalProfit > 0) {
        // Calculate total allocation pool from house revenue
        // Math.round: rounds to nearest whole number (e.g., 6.6 → 7, 6.4 → 6)
        const totalAllocationPool = Math.round(totalProfit * (config.dailyAllocationPercent / 100));

        if (totalAllocationPool > 0) {
            // Split pool into 70% distribution and 30% saved
            // Math.floor: always rounds down (e.g., 4.9 → 4, 4.1 → 4)
            // Remainder from 70% calculation goes to saved pool
            totalAllocation = Math.floor(totalAllocationPool * 0.7); // 70% to distribute
            totalSavedPool = totalAllocationPool - totalAllocation; // 30% saved + any remainder

            const enabledLevels = config.levels.filter((l) => l.enabled);
            const totalPercentage = enabledLevels.reduce((sum, l) => sum + l.allocationPercent, 0);

            let totalDistributed = 0;
            let totalLevelSaved = 0;

            for (const level of enabledLevels) {
                // Each level gets its percentage share of the 70% distribution
                // Math.floor: rounds down, remainder tracked and added to saved pool
                const toBalance = totalPercentage > 0
                    ? Math.floor(totalAllocation * (level.allocationPercent / totalPercentage))
                    : 0;

                // Each level also tracks its percentage share of the 30% savings
                const toSaved = totalPercentage > 0
                    ? Math.floor(totalSavedPool * (level.allocationPercent / totalPercentage))
                    : 0;

                level.balance += toBalance;
                level.savedBalance = (level.savedBalance || 0) + toSaved;

                totalDistributed += toBalance;
                totalLevelSaved += toSaved;

                breakdown.push({
                    key: level.key,
                    amount: toBalance,
                    savedAmount: toSaved
                });
            }

            // Add any undistributed remainders to saved pool for transparency
            // This ensures no coins are lost due to Math.floor
            const distributionRemainder = totalAllocation - totalDistributed;
            const savedRemainder = totalSavedPool - totalLevelSaved;

            if (distributionRemainder > 0) {
                // Add undistributed coins to first enabled level's saved balance
                const firstLevel = enabledLevels[0];
                if (firstLevel) {
                    firstLevel.savedBalance = (firstLevel.savedBalance || 0) + distributionRemainder;
                    breakdown[0].savedAmount += distributionRemainder;
                    totalLevelSaved += distributionRemainder;
                }
            }

            if (savedRemainder > 0) {
                // Add undistributed saved coins to first enabled level's saved balance
                const firstLevel = enabledLevels[0];
                if (firstLevel) {
                    firstLevel.savedBalance = (firstLevel.savedBalance || 0) + savedRemainder;
                    breakdown[0].savedAmount += savedRemainder;
                    totalLevelSaved += savedRemainder;
                }
            }

            // Record total saved for history
            config.allocationHistory.push({
                date: now,
                totalProfit,
                allocated: totalDistributed,
                saved: totalLevelSaved,
                breakdown,
            });
        }
    } else {
        // Record zero allocation
        config.allocationHistory.push({
            date: now,
            totalProfit: 0,
            allocated: 0,
            saved: 0,
            breakdown: [],
        });
    }

    // Keep history manageable
    if (config.allocationHistory.length > 90) {
        config.allocationHistory = config.allocationHistory.slice(-90);
    }

    // Advance the sweep cursor
    config.lastProcessedTimestamp = queryEnd;
    config.lastDailyAllocation = now;
    
    await config.save();

    logger.info("jackpotService.allocateDailyProfits: completed", {
        totalProfit,
        totalAllocation,
        breakdown,
        newCursor: config.lastProcessedTimestamp
    });

    return { totalProfit, allocated: totalAllocation, saved: totalSavedPool, breakdown };
};

/**
 * Admin: adjust the central wallet and redistribute to levels.
 *
 * @param {number} amount — positive to add, negative to subtract
 * @param {string} adminId — admin User._id for audit
 * @returns {{ centralWallet: number, levels: Array }}
 */
const adjustCentralWallet = async (amount, adminId) => {
    const config = await getJackpotConfig();

    const adjustedAmount = Number(amount);
    if (!Number.isFinite(adjustedAmount) || adjustedAmount === 0) {
        throw new Error("Invalid adjustment amount");
    }

    // Don't allow central wallet to go below 0
    if (config.centralWallet + adjustedAmount < 0) {
        throw new Error("Adjustment would make central wallet negative");
    }

    config.centralWallet += adjustedAmount;

    // Distribute the adjustment across enabled levels by their allocationPercent
    const enabledLevels = config.levels.filter((l) => l.enabled);
    const totalPercentage = enabledLevels.reduce((sum, l) => sum + l.allocationPercent, 0);

    if (totalPercentage > 0 && adjustedAmount !== 0) {
        for (const level of enabledLevels) {
            const share = Math.floor(adjustedAmount * (level.allocationPercent / totalPercentage));
            level.balance = Math.max(0, level.balance + share);
        }
    }

    await config.save();

    logger.info("jackpotService.adjustCentralWallet", {
        adjustedAmount,
        adminId,
        newCentralWallet: config.centralWallet,
    });

    return {
        centralWallet: config.centralWallet,
        levels: config.levels,
    };
};


/**
 * Get safe public data for player-facing UI.
 */
const getPublicJackpotData = async () => {
    const config = await getJackpotConfig();
    if (!config.enabled) {
        return { enabled: false, levels: [] };
    }

    return {
        enabled: true,
        levels: config.levels
            .filter((l) => l.enabled)
            .sort((a, b) => a.priority - b.priority)
            .map((l) => {
                let displayBalance = l.awardAmount;
                
                if (l.key === "super_bingo" && displayBalance > 40000) {
                    displayBalance = l.awardAmount || 40000;
                } else if (l.key === "gold" && displayBalance > 17000) {
                    displayBalance = l.awardAmount || 17000;
                } else if (l.key === "silver" && displayBalance > 9000) {
                    displayBalance = l.awardAmount || 9000;
                } else if (l.key === "bronze" && displayBalance > 4000) {
                    displayBalance = l.awardAmount || 4000;
                }

                return {
                    key: l.key,
                    label: l.label,
                    balance: displayBalance,
                    color: l.color,
                    icon: l.icon,
                    winConditions: l.winConditions,
                };
            }),
    };
};

module.exports = {
    getJackpotConfig,
    checkJackpotWin,
    awardJackpot,
    allocateDailyProfits,
    adjustCentralWallet,
    getPublicJackpotData,
};
