const { GameTransaction, GameType, UserType, GameTransactionType } = require("../models/GameTransaction");
const GameRoom = require("../models/gameRoom");
const { Transaction } = require("../models/Transaction");
const ManualTransaction = require("../models/ManualTransaction");
const User = require("../models/userModels");
const logger = require("../utils/winstonLogger");

/**
 * Get comprehensive revenue breakdown
 * Industry-standard fintech revenue calculation
 * 
 * Revenue Sources:
 * 1. Game Revenue (from GameTransaction) - Stakes minus Payouts
 * 2. Real Money Flow (Deposits - Withdrawals)
 * 3. Bonus Costs (Registration, Referral, Deposit bonuses)
 */
const getRevenueBreakdown = async (req, res) => {
    try {
        const { startDate, endDate, gameType } = req.query;

        // Build date filters
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }

        const gameMatch = {};
        const txMatch = {};
        if (Object.keys(dateFilter).length) {
            gameMatch.createdAt = dateFilter;
            txMatch.createdAt = dateFilter;
        }
        if (gameType) gameMatch.gameType = gameType;

        // 1. Game Revenue from GameTransaction (Single Source of Truth)
        const gameStats = await GameTransaction.aggregate([
            { $match: gameMatch },
            {
                $group: {
                    _id: {
                        type: "$type",
                        userType: "$userType",
                        gameType: "$gameType",
                    },
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
        ]);

        // Transform into structured breakdown
        const breakdown = {
            stakes: { user: 0, robot: 0, userCount: 0, robotCount: 0 },
            wins: { user: 0, robot: 0, userCount: 0, robotCount: 0 },
            refunds: { user: 0, robot: 0 },
            byGame: {},
        };

        for (const stat of gameStats) {
            const { type, userType, gameType: gt } = stat._id;

            if (type === "stake") {
                if (userType === "user") {
                    breakdown.stakes.user += stat.totalAmount;
                    breakdown.stakes.userCount += stat.count;
                } else {
                    breakdown.stakes.robot += stat.totalAmount;
                    breakdown.stakes.robotCount += stat.count;
                }
            } else if (type === "win") {
                if (userType === "user") {
                    breakdown.wins.user += stat.totalAmount;
                    breakdown.wins.userCount += stat.count;
                } else {
                    breakdown.wins.robot += stat.totalAmount;
                    breakdown.wins.robotCount += stat.count;
                }
            } else if (type === "refund") {
                breakdown.refunds[userType] += stat.totalAmount;
            }

            // By game type breakdown
            if (!breakdown.byGame[gt]) {
                breakdown.byGame[gt] = {
                    stakes: { user: 0, robot: 0 },
                    wins: { user: 0, robot: 0 },
                    games: 0,
                };
            }
            if (type === "stake") {
                breakdown.byGame[gt].stakes[userType] += stat.totalAmount;
            } else if (type === "win") {
                breakdown.byGame[gt].wins[userType] += stat.totalAmount;
            }
        }

        // 2. Real Money Flow (Deposits & Withdrawals)
        const [
            addispayDeposits,
            addispayWithdrawals,
            manualDeposits,
            manualWithdrawals,
            bonuses,
            depositBonuses,
        ] = await Promise.all([
            // AddisPlay deposits
            Transaction.aggregate([
                {
                    $match: {
                        type: "deposit",
                        status: "COMPLETED",
                        ...txMatch,
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                        bonusTotal: { $sum: { $ifNull: ["$bonusAmount", 0] } },
                        count: { $sum: 1 },
                    },
                },
            ]),
            // AddisPlay withdrawals
            Transaction.aggregate([
                {
                    $match: {
                        type: "withdrawal",
                        status: "COMPLETED",
                        ...txMatch,
                    },
                },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
            ]),
            // Manual deposits (with receipt approval)
            ManualTransaction.aggregate([
                {
                    $match: {
                        type: "deposit",
                        ...txMatch,
                    },
                },
                {
                    $lookup: {
                        from: "receipts",
                        localField: "receiptId",
                        foreignField: "_id",
                        as: "receipt",
                    },
                },
                {
                    $match: {
                        $or: [
                            { "receipt.status": { $in: ["approved", "Approved"] } },
                            { receiptId: null }, // Admin deposits without receipt
                        ],
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                        bonusTotal: { $sum: { $ifNull: ["$bonusAmount", 0] } },
                        count: { $sum: 1 },
                    },
                },
            ]),
            // Manual withdrawals
            ManualTransaction.aggregate([
                {
                    $match: {
                        type: { $in: ["Withdrawal", "withdrawal"] },
                        ...txMatch,
                    },
                },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
            ]),
            // Registration & Referral bonuses
            Transaction.aggregate([
                {
                    $match: {
                        type: { $in: ["registration_bonus", "referral_bonus"] },
                        status: "COMPLETED",
                        ...txMatch,
                    },
                },
                { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
            ]),
            // Deposit bonuses (from bonusAmount field in deposits)
            Transaction.aggregate([
                {
                    $match: {
                        type: "deposit",
                        status: "COMPLETED",
                        bonusAmount: { $gt: 0 },
                        ...txMatch,
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$bonusAmount" },
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        // Extract bonus data
        const bonusMap = {};
        bonuses.forEach((b) => (bonusMap[b._id] = b));

        // Calculate deposit bonuses from all sources
        const addispayDepositBonus = addispayDeposits[0]?.bonusTotal || 0;
        const manualDepositBonus = manualDeposits[0]?.bonusTotal || 0;
        const totalDepositBonus = addispayDepositBonus + manualDepositBonus;

        // 3. Robot wallet status
        const robotStatus = await User.aggregate([
            { $match: { $or: [{ isRobot: true }, { role: "robot" }] } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    totalBalance: { $sum: "$wallet" },
                    inDebt: { $sum: { $cond: [{ $lt: ["$wallet", 0] }, 1, 0] } },
                    positiveBalance: { $sum: { $cond: [{ $gt: ["$wallet", 0] }, "$wallet", 0] } },
                    negativeBalance: { $sum: { $cond: [{ $lt: ["$wallet", 0] }, "$wallet", 0] } },
                },
            },
        ]);

        const robot = robotStatus[0] || {
            count: 0,
            totalBalance: 0,
            inDebt: 0,
            positiveBalance: 0,
            negativeBalance: 0,
        };

        // 4. Game room summary (for verification)
        const gameRoomStats = await GameRoom.aggregate([
            {
                $match: {
                    status: "completed",
                    ...(Object.keys(dateFilter).length ? { completedAt: dateFilter } : {}),
                },
            },
            {
                $group: {
                    _id: null,
                    totalGames: { $sum: 1 },
                    totalHouseProfit: { $sum: "$houseProfit" },
                    totalWinAmount: { $sum: "$winAmount" },
                    totalPlayers: { $sum: "$numberOfPlayers" },
                },
            },
        ]);

        const gameRoomSummary = gameRoomStats[0] || {
            totalGames: 0,
            totalHouseProfit: 0,
            totalWinAmount: 0,
            totalPlayers: 0,
        };

        // Calculate core metrics
        const totalStakes = breakdown.stakes.user + breakdown.stakes.robot;
        const totalWins = breakdown.wins.user + breakdown.wins.robot;
        const grossGameProfit = totalStakes - totalWins;

        const totalDeposits =
            (addispayDeposits[0]?.total || 0) + (manualDeposits[0]?.total || 0);
        const totalWithdrawals =
            (addispayWithdrawals[0]?.total || 0) + (manualWithdrawals[0]?.total || 0);

        const totalBonuses =
            (bonusMap.registration_bonus?.total || 0) +
            (bonusMap.referral_bonus?.total || 0) +
            totalDepositBonus;

        // Response
        res.json({
            period: {
                from: startDate || "all-time",
                to: endDate || "now",
                generated: new Date().toISOString(),
            },

            // Core Game Revenue
            gameRevenue: {
                totalStakes,
                totalPayouts: totalWins,
                grossProfit: grossGameProfit,
                gameRoomHouseProfit: gameRoomSummary.totalHouseProfit, // Cross-reference
                gamesCompleted: gameRoomSummary.totalGames,
            },

            // User vs Robot Breakdown
            breakdown: {
                stakes: {
                    fromUsers: breakdown.stakes.user,
                    fromRobots: breakdown.stakes.robot,
                    userStakeCount: breakdown.stakes.userCount,
                    robotStakeCount: breakdown.stakes.robotCount,
                },
                wins: {
                    toUsers: breakdown.wins.user,
                    toRobots: breakdown.wins.robot,
                    userWinCount: breakdown.wins.userCount,
                    robotWinCount: breakdown.wins.robotCount,
                },
                contribution: {
                    fromUsers: breakdown.stakes.user - breakdown.wins.user,
                    fromRobots: breakdown.stakes.robot - breakdown.wins.robot,
                },
                byGame: breakdown.byGame,
            },

            // Real Money Flow
            cashFlow: {
                deposits: {
                    addispay: addispayDeposits[0]?.total || 0,
                    manual: manualDeposits[0]?.total || 0,
                    total: totalDeposits,
                    count:
                        (addispayDeposits[0]?.count || 0) + (manualDeposits[0]?.count || 0),
                },
                withdrawals: {
                    addispay: addispayWithdrawals[0]?.total || 0,
                    manual: manualWithdrawals[0]?.total || 0,
                    total: totalWithdrawals,
                    count:
                        (addispayWithdrawals[0]?.count || 0) +
                        (manualWithdrawals[0]?.count || 0),
                },
                netCashFlow: totalDeposits - totalWithdrawals,
            },

            // All Bonus Costs
            bonuses: {
                registration: {
                    amount: bonusMap.registration_bonus?.total || 0,
                    count: bonusMap.registration_bonus?.count || 0,
                },
                referral: {
                    amount: bonusMap.referral_bonus?.total || 0,
                    count: bonusMap.referral_bonus?.count || 0,
                },
                deposit: {
                    amount: totalDepositBonus,
                    addispay: addispayDepositBonus,
                    manual: manualDepositBonus,
                },
                totalBonusCost: totalBonuses,
            },

            // Robot Status
            robots: {
                count: robot.count,
                combinedBalance: robot.totalBalance,
                inDebt: robot.inDebt,
                positiveBalance: robot.positiveBalance,
                negativeBalance: Math.abs(robot.negativeBalance),
                status:
                    robot.totalBalance < 0
                        ? "profitable" // Robots lost money = good for house
                        : robot.totalBalance > 0
                            ? "losing" // Robots won money = bad for house
                            : "neutral",
            },

            // Net Profit Calculation
            summary: {
                grossGameProfit,
                bonusCosts: totalBonuses,
                netGameProfit: grossGameProfit - totalBonuses,
                netCashPosition: totalDeposits - totalWithdrawals,

                // What robots contributed/took
                robotImpact: -(breakdown.stakes.robot - breakdown.wins.robot),

                // Final interpretation
                interpretation: {
                    gameProfit: `House earned ${grossGameProfit} ETB from games (stakes - payouts)`,
                    bonusImpact: `Paid out ${totalBonuses} ETB in bonuses (registration + referral + deposit)`,
                    robotContribution:
                        breakdown.stakes.robot - breakdown.wins.robot > 0
                            ? `Robots contributed ${breakdown.stakes.robot - breakdown.wins.robot} ETB to house`
                            : `Robots took ${Math.abs(breakdown.stakes.robot - breakdown.wins.robot)} ETB from house`,
                },
            },
        });
    } catch (error) {
        logger.error("Revenue breakdown error", { error: error.message, stack: error.stack });
        res.status(500).json({ error: "Failed to calculate revenue breakdown" });
    }
};

/**
 * Get game transactions with pagination and filters
 */
const getGameTransactions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            userType,
            type,
            gameType,
            roomId,
            userId,
            startDate,
            endDate,
            q,
        } = req.query;

        const filter = {};
        if (userType) filter.userType = userType;
        if (type) filter.type = type;
        if (gameType) filter.gameType = gameType;
        if (roomId) filter.roomId = roomId;
        if (userId) filter.userId = userId;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        // Server-side text search across user fields and description (regex-escaped)
        if (q && String(q).trim().length > 0) {
            const term = String(q).trim();
            const escapeRegex = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
            let regex;
            try {
                regex = new RegExp(escapeRegex(term), "i");
            } catch (err) {
                return res.status(400).json({ error: "Invalid search term" });
            }

            const matchedUsers = await User.find(
                {
                    $or: [
                        { fullName: regex },
                        { telegramId: regex },
                        { $expr: { $regexMatch: { input: { $toString: "$phone" }, regex } } },
                    ],
                },
                { _id: 1 }
            ).lean();

            const userIds = matchedUsers.map((u) => u._id);
            const searchClauses = [];
            if (userIds.length > 0) searchClauses.push({ userId: { $in: userIds } });
            // Cast description to string to avoid $regex errors on non-string values
            searchClauses.push({ $expr: { $regexMatch: { input: { $toString: "$description" }, regex } } });

            if (searchClauses.length === 0 && userId) {
                // If userId already provided but no match found via q, keep existing filter (acts as exact match)
                // and skip adding $or to avoid wiping results.
            } else if (searchClauses.length === 0) {
                return res.json({
                    transactions: [],
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total: 0,
                        pages: 0,
                    },
                });
            } else {
                filter.$or = searchClauses;
            }
        }

        const [transactions, total] = await Promise.all([
            GameTransaction.find(filter)
                .sort({ createdAt: -1 })
                .skip((Number(page) - 1) * Number(limit))
                .limit(Number(limit))
                .populate("userId", "fullName phone isRobot role telegramId")
                .populate("roomId", "stakeAmount status completedAt")
                .lean(),
            GameTransaction.countDocuments(filter),
        ]);

        res.json({
            transactions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        logger.error("Get game transactions error", { error: error.message });
        res.status(500).json({ error: "Failed to fetch game transactions" });
    }
};

/**
 * Get robot users with stats
 */
const getRobotStats = async (req, res) => {
    try {
        const robots = await User.find({
            $or: [{ isRobot: true }, { role: "robot" }],
        })
            .select("fullName telegramId wallet createdAt")
            .sort({ createdAt: -1 })
            .lean();

        // Get stats for each robot
        const robotIds = robots.map((r) => r._id);

        const stats = await GameTransaction.aggregate([
            { $match: { userId: { $in: robotIds } } },
            {
                $group: {
                    _id: { userId: "$userId", type: "$type" },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
        ]);

        // Map stats to robots
        const statsMap = {};
        stats.forEach((s) => {
            const id = s._id.userId.toString();
            if (!statsMap[id]) {
                statsMap[id] = { stakes: 0, wins: 0, stakeCount: 0, winCount: 0 };
            }
            if (s._id.type === "stake") {
                statsMap[id].stakes = s.total;
                statsMap[id].stakeCount = s.count;
            } else if (s._id.type === "win") {
                statsMap[id].wins = s.total;
                statsMap[id].winCount = s.count;
            }
        });

        const robotsWithStats = robots.map((robot) => {
            const robotStats = statsMap[robot._id.toString()] || {
                stakes: 0,
                wins: 0,
                stakeCount: 0,
                winCount: 0,
            };
            return {
                ...robot,
                totalStaked: robotStats.stakes,
                totalWon: robotStats.wins,
                netResult: robotStats.wins - robotStats.stakes,
                gamesPlayed: robotStats.stakeCount,
                gamesWon: robotStats.winCount,
                winRate:
                    robotStats.stakeCount > 0
                        ? ((robotStats.winCount / robotStats.stakeCount) * 100).toFixed(1)
                        : 0,
            };
        });

        res.json({
            robots: robotsWithStats,
            summary: {
                totalRobots: robots.length,
                totalBalance: robots.reduce((sum, r) => sum + r.wallet, 0),
                totalStaked: Object.values(statsMap).reduce((sum, s) => sum + s.stakes, 0),
                totalWon: Object.values(statsMap).reduce((sum, s) => sum + s.wins, 0),
            },
        });
    } catch (error) {
        logger.error("Get robot stats error", { error: error.message });
        res.status(500).json({ error: "Failed to fetch robot stats" });
    }
};

/**
 * Get daily revenue trend
 */
const getDailyRevenueTrend = async (req, res) => {
    try {
        const { days = 30, gameType } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));
        startDate.setHours(0, 0, 0, 0);

        const match = { createdAt: { $gte: startDate } };
        if (gameType) match.gameType = gameType;

        const trend = await GameTransaction.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        type: "$type",
                        userType: "$userType",
                    },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.date": 1 } },
        ]);

        // Transform to daily summaries
        const dailyMap = {};
        trend.forEach((t) => {
            const date = t._id.date;
            if (!dailyMap[date]) {
                dailyMap[date] = {
                    date,
                    userStakes: 0,
                    robotStakes: 0,
                    userWins: 0,
                    robotWins: 0,
                    games: 0,
                };
            }
            if (t._id.type === "stake") {
                if (t._id.userType === "user") {
                    dailyMap[date].userStakes += t.total;
                } else {
                    dailyMap[date].robotStakes += t.total;
                }
                dailyMap[date].games += t.count;
            } else if (t._id.type === "win") {
                if (t._id.userType === "user") {
                    dailyMap[date].userWins += t.total;
                } else {
                    dailyMap[date].robotWins += t.total;
                }
            }
        });

        const dailyData = Object.values(dailyMap).map((d) => ({
            ...d,
            totalStakes: d.userStakes + d.robotStakes,
            totalWins: d.userWins + d.robotWins,
            profit: d.userStakes + d.robotStakes - (d.userWins + d.robotWins),
            userContribution: d.userStakes - d.userWins,
            robotContribution: d.robotStakes - d.robotWins,
        }));

        res.json({
            period: { days: Number(days), from: startDate.toISOString() },
            data: dailyData,
        });
    } catch (error) {
        logger.error("Get daily revenue trend error", { error: error.message });
        res.status(500).json({ error: "Failed to fetch revenue trend" });
    }
};

module.exports = {
    getRevenueBreakdown,
    getGameTransactions,
    getRobotStats,
    getDailyRevenueTrend,
};
