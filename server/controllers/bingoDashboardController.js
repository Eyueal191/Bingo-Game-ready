const Transaction = require("../models/Transaction").Transaction;
const ManualTransaction = require("../models/DepositRequest");

const GameRoom = require("../models/gameRoom");
const Receipt = require("../models/Receipt");
const User = require("../models/userModels");
const Reservation = require("../models/reservationModel");
const { GameTransaction } = require("../models/GameTransaction");
const logger = require("../utils/winstonLogger");

// Helper function to get full previous calendar month
const getPreviousMonthRange = () => {
  const now = new Date();
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
  return { prevStart, prevEnd };
};

// Helper function to get today's date range (midnight to midnight in EAT, UTC+3)
const getTodayRange = () => {
  const now = new Date();
  const offset = 3 * 60 * 60 * 1000; // 3 hours in milliseconds for EAT (UTC+3)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  todayStart.setTime(todayStart.getTime() + offset);
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );
  todayEnd.setTime(todayEnd.getTime() + offset);
  return { todayStart, todayEnd };
};

// Controller for Bingo Dashboard
exports.getBingoDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate date inputs and build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
        if (isNaN(dateFilter.$gte.getTime())) {
          return res.status(400).json({ message: "Invalid startDate format" });
        }
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate);
        if (isNaN(dateFilter.$lte.getTime())) {
          return res.status(400).json({ message: "Invalid endDate format" });
        }
      }
    }

    // Helper function to apply date filter to a specific field
    const applyDateFilter = (field) => {
      if (Object.keys(dateFilter).length === 0) return {};
      return { [field]: { ...dateFilter, $ne: null } };
    };

    // 0. Detailed Game Statistics (Robot vs User)
    const statsFilter = {};
    if (startDate) statsFilter.date = { ...statsFilter.date, $gte: new Date(startDate) };
    if (endDate) statsFilter.date = { ...statsFilter.date, $lte: new Date(endDate) };

    // 0. Detailed Game Statistics (Robot vs User) via GameTransaction
    const txMatch = {};
    if (startDate) txMatch.createdAt = { ...txMatch.createdAt, $gte: new Date(startDate) };
    if (endDate) txMatch.createdAt = { ...txMatch.createdAt, $lte: new Date(endDate) };

    const gameStatsAgg = await GameTransaction.aggregate([
      { $match: txMatch },
      {
        $group: {
          _id: { type: "$type", userType: "$userType" },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    let userWins = 0, robotWins = 0, userStakes = 0, robotStakes = 0;

    gameStatsAgg.forEach(s => {
      const { type, userType } = s._id;
      if (type === 'stake') {
        if (userType === 'user') userStakes += s.totalAmount;
        else robotStakes += s.totalAmount;
      } else if (type === 'win') {
        if (userType === 'user') userWins += s.totalAmount;
        else robotWins += s.totalAmount;
      }
    });

    const detailedStats = {
      totalGames: 0,
      userGamesPlayed: 0,
      robotGamesPlayed: 0,
      userCardsReserved: 0,
      robotCardsReserved: 0,
      userWins,
      robotWins,
      userTotalStaked: userStakes,
      robotTotalStaked: robotStakes,
      userTotalWon: userWins,
      robotTotalWon: robotWins,
      systemRevenue: (userStakes + robotStakes) - (userWins + robotWins),
      robotNetRevenue: robotWins - robotStakes,
      userNetRevenue: userWins - userStakes
    };

    // 1. System Revenue and Player Count
    const systemRevenuePipeline = [
      {
        $match: {
          status: "completed",
          ...applyDateFilter("completedAt"),
          stakeAmount: { $exists: true, $ne: null },
          numberOfPlayers: { $exists: true, $ne: null },
          winAmount: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          totalStake: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$stakeAmount", null] },
                    { $ne: ["$numberOfPlayers", null] },
                  ],
                },
                { $multiply: ["$stakeAmount", "$numberOfPlayers"] },
                0,
              ],
            },
          },
          totalWinAmount: { $sum: { $ifNull: ["$winAmount", 0] } },
          gameCount: { $sum: 1 },
          avgStake: { $avg: "$stakeAmount" },
          gamesWithWinners: {
            $sum: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$winners", []] } }, 0] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          systemRevenue: { $subtract: ["$totalStake", "$totalWinAmount"] },
          gameCount: 1,
          avgStake: 1,
          gamesWithWinners: 1,
          winRate: {
            $cond: [
              { $gt: ["$gameCount", 0] },
              { $divide: ["$gamesWithWinners", "$gameCount"] },
              0,
            ],
          },
        },
      },
    ];

    const playerCountPipeline = [
      {
        $match: {
          roomId: { $exists: true },
          status: "completed",
          gameStatus: { $in: ["won", "lost"] },
          userId: { $exists: true, $ne: null },
          ...applyDateFilter("updatedAt"),
        },
      },
      {
        $group: {
          _id: null,
          uniquePlayers: { $addToSet: "$userId" },
        },
      },
      {
        $project: {
          uniquePlayerCount: { $size: "$uniquePlayers" },
        },
      },
    ];

    // 2. Total User Wallets and Total Users (Split by User vs Robot)
    const userStatsPipeline = [
      {
        $match: {
          wallet: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          totalUserWallets: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$role", "robot"] },
                    { $eq: ["$isRobot", true] },
                  ],
                },
                0,
                "$wallet",
              ],
            },
          },
          totalRobotWallets: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$role", "robot"] },
                    { $eq: ["$isRobot", true] },
                  ],
                },
                "$wallet",
                0,
              ],
            },
          },
          totalUsers: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$role", "robot"] },
                    { $eq: ["$isRobot", true] },
                  ],
                },
                0,
                1,
              ],
            },
          },
          totalRobots: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$role", "robot"] },
                    { $eq: ["$isRobot", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];

    // 3. Today's Deposits (Santim Pay and Manual)
    const { todayStart, todayEnd } = getTodayRange();
    const todayAddispayDepositsPipeline = [
      {
        $match: {
          type: { $in: ["deposit", "Deposit"] },
          status: { $in: ["COMPLETED", "completed"] },
          createdAt: { $gte: todayStart, $lte: todayEnd },
          amount: { $exists: true, $ne: null, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ];

    const todayManualDepositsPipeline = [
      {
        $match: {
          type: { $in: ["deposit", "Deposit"] },
          receiptId: { $ne: null },
          createdAt: { $gte: todayStart, $lte: todayEnd },
          amount: { $exists: true, $ne: null, $gt: 0 },
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
          "receipt.status": { $in: ["approved", "Approved"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ];

    // 4. Today's Withdrawals (Santim Pay and Manual)
    const todayAddispayWithdrawalsPipeline = [
      {
        $match: {
          type: { $in: ["withdrawal", "Withdrawal"] },
          status: { $in: ["COMPLETED", "completed"] },
          createdAt: { $gte: todayStart, $lte: todayEnd },
          amount: { $exists: true, $ne: null, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ];

    const todayManualWithdrawalsPipeline = [
      {
        $match: {
          type: { $in: ["withdrawal", "Withdrawal"] },
          createdAt: { $gte: todayStart, $lte: todayEnd },
          amount: { $exists: true, $ne: null, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ];
    // Today's Bonuses (Registration, Referral, and Deposit)
    const todayRegistrationBonusPipeline = [
      {
        $match: {
          type: "registration_bonus",
          status: { $in: ["COMPLETED", "completed"] },
          createdAt: { $gte: todayStart, $lte: todayEnd },
          amount: { $exists: true, $ne: null, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ];

    const todayReferralBonusPipeline = [
      {
        $match: {
          type: "referral_bonus",
          status: { $in: ["COMPLETED", "completed"] },
          createdAt: { $gte: todayStart, $lte: todayEnd },
          amount: { $exists: true, $ne: null, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ];

    // Deposit bonus (from bonusAmount field on deposit transactions)
    const todayDepositBonusPipeline = [
      {
        $match: {
          type: { $in: ["deposit", "Deposit"] },
          status: { $in: ["COMPLETED", "completed"] },
          createdAt: { $gte: todayStart, $lte: todayEnd },
          bonusAmount: { $exists: true, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$bonusAmount" },
        },
      },
    ];
    // 5. Today's System Revenue and Games Played
    const todaySystemRevenuePipeline = [
      {
        $match: {
          status: "completed",
          completedAt: { $gte: todayStart, $lte: todayEnd },
          stakeAmount: { $exists: true, $ne: null },
          numberOfPlayers: { $exists: true, $ne: null },
          winAmount: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          totalStake: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$stakeAmount", null] },
                    { $ne: ["$numberOfPlayers", null] },
                  ],
                },
                { $multiply: ["$stakeAmount", "$numberOfPlayers"] },
                0,
              ],
            },
          },
          totalWinAmount: { $sum: { $ifNull: ["$winAmount", 0] } },
          gameCount: { $sum: 1 },
        },
      },
      {
        $project: {
          systemRevenue: { $subtract: ["$totalStake", "$totalWinAmount"] },
          gameCount: 1,
        },
      },
    ];

    // Debugging output (avoid dumping full pipelines)
    logger.debug("bingoDashboard: today system revenue pipeline built", {
      stages: Array.isArray(todaySystemRevenuePipeline)
        ? todaySystemRevenuePipeline.length
        : undefined,
    });

    // Debug: Fetch raw Santim Pay transactions
    const rawAddispayTransactions = await Transaction.find({
      $or: [
        {
          type: { $in: ["deposit", "Deposit"] },
          status: { $in: ["COMPLETED", "completed"] },
        },
        {
          type: { $in: ["withdrawal", "Withdrawal"] },
          status: { $in: ["COMPLETED", "completed"] },
        },
      ],
      amount: { $exists: true, $ne: null, $gt: 0 },
      ...applyDateFilter("createdAt"),
    }).lean();
    logger.debug("bingoDashboard: fetched raw addispay transactions", {
      count: Array.isArray(rawAddispayTransactions)
        ? rawAddispayTransactions.length
        : undefined,
    });

    const [
      systemRevenueResult,
      playerCountResult,
      userStatsResult,
      todayAddispayDepositsResult,
      todayManualDepositsResult,
      todayManualWithdrawalsResult,
      todayAddispayWithdrawalsResult,
      todayRegistrationBonusResult,
      todayReferralBonusResult,
      todayDepositBonusResult,
      todaySystemRevenueResult,
    ] = await Promise.all([
      GameRoom.aggregate(systemRevenuePipeline),
      Reservation.aggregate(playerCountPipeline),
      User.aggregate(userStatsPipeline),
      Transaction.aggregate(todayAddispayDepositsPipeline),
      ManualTransaction.aggregate(todayManualDepositsPipeline),
      Transaction.aggregate(todayManualWithdrawalsPipeline),
      Transaction.aggregate(todayAddispayWithdrawalsPipeline),
      Transaction.aggregate(todayRegistrationBonusPipeline),
      Transaction.aggregate(todayReferralBonusPipeline),
      Transaction.aggregate(todayDepositBonusPipeline),
      GameRoom.aggregate(todaySystemRevenuePipeline),
    ]);

    const systemRevenue = {
      total: systemRevenueResult[0]?.systemRevenue || 0,
      gameCount: systemRevenueResult[0]?.gameCount || 0,
      uniquePlayerCount: playerCountResult[0]?.uniquePlayerCount || 0,
      avgStake: systemRevenueResult[0]?.avgStake || 0,
      winRate: systemRevenueResult[0]?.winRate || 0,
    };

    const userStats = {
      totalUserWallets: userStatsResult[0]?.totalUserWallets || 0,
      totalRobotWallets: userStatsResult[0]?.totalRobotWallets || 0,
      totalUsers: userStatsResult[0]?.totalUsers || 0,
      totalRobots: userStatsResult[0]?.totalRobots || 0,
    };

    const todayDeposits = {
      Addispay: todayAddispayDepositsResult[0]?.total || 0,
      manual: todayManualDepositsResult[0]?.total || 0,
      total:
        (todayAddispayDepositsResult[0]?.total || 0) +
        (todayManualDepositsResult[0]?.total || 0),
    };

    const todayWithdrawals = {
      Addispay: todayAddispayWithdrawalsResult[0]?.total || 0,
      manual: todayManualWithdrawalsResult[0]?.total || 0,
      total:
        (todayAddispayWithdrawalsResult[0]?.total || 0) +
        (todayManualWithdrawalsResult[0]?.total || 0),
    };
    const todayBonuses = {
      registration: todayRegistrationBonusResult[0]?.total || 0,
      referral: todayReferralBonusResult[0]?.total || 0,
      deposit: todayDepositBonusResult[0]?.total || 0,
      total:
        (todayRegistrationBonusResult[0]?.total || 0) +
        (todayReferralBonusResult[0]?.total || 0) +
        (todayDepositBonusResult[0]?.total || 0),
    };
    const todaySystemRevenue = {
      total: todaySystemRevenueResult[0]?.systemRevenue || 0,
      gamesPlayed: todaySystemRevenueResult[0]?.gameCount || 0,
    };

    // 6. Addispay Deposits (All-Time or Filtered)
    const AddispayDepositsPipeline = [
      {
        $match: {
          type: { $in: ["deposit", "Deposit"] },
          status: { $in: ["COMPLETED", "completed"] },
          amount: { $exists: true, $ne: null, $gt: 0 },
          ...applyDateFilter("createdAt"),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ];

    const AddispayDepositsResult = await Transaction.aggregate(
      AddispayDepositsPipeline
    );
    logger.debug("bingoDashboard: addispay deposits aggregated", {
      total: AddispayDepositsResult?.[0]?.total || 0,
      count: AddispayDepositsResult?.[0]?.count || 0,
    });
    const AddispayDeposits = {
      total: AddispayDepositsResult[0]?.total || 0,
      count: AddispayDepositsResult[0]?.count || 0,
    };

    // 7. Addispay Withdrawals (All-Time or Filtered)
    const AddispayWithdrawalsPipeline = [
      {
        $match: {
          type: { $in: ["withdrawal", "Withdrawal"] },
          status: { $in: ["COMPLETED", "completed"] },
          amount: { $exists: true, $ne: null, $gt: 0 },
          ...applyDateFilter("createdAt"),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ];

    const AddispayWithdrawalsResult = await Transaction.aggregate(
      AddispayWithdrawalsPipeline
    );
    logger.debug("bingoDashboard: addispay withdrawals aggregated", {
      total: AddispayWithdrawalsResult?.[0]?.total || 0,
      count: AddispayWithdrawalsResult?.[0]?.count || 0,
    });
    const AddispayWithdrawals = {
      total: AddispayWithdrawalsResult[0]?.total || 0,
      count: AddispayWithdrawalsResult[0]?.count || 0,
    };

    // 8. Manual Deposits
    const manualDepositsPipeline = [
      {
        $match: {
          source: { $ne: "sms" }, // Exclude SMS, include manual/admin/system
          type: { $in: ["deposit", "Deposit"] },
          receiptId: { $ne: null },
          amount: { $exists: true, $ne: null, $gt: 0 },
          ...applyDateFilter("createdAt"),
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
          "receipt.status": { $in: ["approved", "Approved"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ];

    const manualDepositsResult = await ManualTransaction.aggregate(
      manualDepositsPipeline
    );
    const manualDeposits = {
      total: manualDepositsResult[0]?.total || 0,
      count: manualDepositsResult[0]?.count || 0,
    };

    // 8b. SMS Deposits (All-Time or Filtered)
    const smsDepositsPipeline = [
      {
        $match: {
          source: "sms",
          status: { $in: ["approved", "Approved"] },
          amount: { $exists: true, $ne: null, $gt: 0 },
          ...applyDateFilter("createdAt"),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ];

    const smsDepositsResult = await ManualTransaction.aggregate(smsDepositsPipeline);
    const smsDeposits = {
      total: smsDepositsResult[0]?.total || 0,
      count: smsDepositsResult[0]?.count || 0,
    };

    // 9. Manual Withdrawals
    const manualWithdrawalsPipeline = [
      {
        $match: {
          type: { $in: ["withdrawal", "Withdrawal"] },
          amount: { $exists: true, $ne: null, $gt: 0 },
          ...applyDateFilter("createdAt"),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ];

    const manualWithdrawalsResult = await ManualTransaction.aggregate(
      manualWithdrawalsPipeline
    );
    const manualWithdrawals = {
      total: manualWithdrawalsResult[0]?.total || 0,
      count: manualWithdrawalsResult[0]?.count || 0,
    };
    // Bonuses (All-Time or Filtered)
    const registrationBonusPipeline = [
      {
        $match: {
          type: "registration_bonus",
          status: { $in: ["COMPLETED", "completed"] },
          amount: { $exists: true, $ne: null, $gt: 0 },
          ...applyDateFilter("createdAt"),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ];

    const referralBonusPipeline = [
      {
        $match: {
          type: "referral_bonus",
          status: { $in: ["COMPLETED", "completed"] },
          amount: { $exists: true, $ne: null, $gt: 0 },
          ...applyDateFilter("createdAt"),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ];

    // Deposit bonus (from bonusAmount field on deposit transactions) - ALL TIME
    const depositBonusPipeline = [
      {
        $match: {
          type: { $in: ["deposit", "Deposit"] },
          status: { $in: ["COMPLETED", "completed"] },
          bonusAmount: { $exists: true, $gt: 0 },
          ...applyDateFilter("createdAt"),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$bonusAmount" },
          count: { $sum: 1 },
        },
      },
    ];

    const [registrationBonusResult, referralBonusResult, depositBonusResult] = await Promise.all([
      Transaction.aggregate(registrationBonusPipeline),
      Transaction.aggregate(referralBonusPipeline),
      Transaction.aggregate(depositBonusPipeline),
    ]);

    const registrationBonus = {
      total: registrationBonusResult[0]?.total || 0,
      count: registrationBonusResult[0]?.count || 0,
    };

    const referralBonus = {
      total: referralBonusResult[0]?.total || 0,
      count: referralBonusResult[0]?.count || 0,
    };

    const depositBonus = {
      total: depositBonusResult[0]?.total || 0,
      count: depositBonusResult[0]?.count || 0,
    };
    // 10. Transfers Sent
    const transfersSentPipeline = [
      {
        $match: {
          type: "transfer",
          status: { $in: ["COMPLETED", "completed"] },
          amount: { $exists: true, $ne: null, $gt: 0 },
          ...applyDateFilter("createdAt"),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ];

    const transfersSentResult = await Transaction.aggregate(
      transfersSentPipeline
    );
    const transfersSent = {
      total: transfersSentResult[0]?.total || 0,
      count: transfersSentResult[0]?.count || 0,
    };

    // 11. Transfers Received
    const transfersReceivedPipeline = [
      {
        $match: {
          type: "receive",
          status: { $in: ["COMPLETED", "completed"] },
          amount: { $exists: true, $ne: null, $gt: 0 },
          ...applyDateFilter("createdAt"),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ];

    const transfersReceivedResult = await Transaction.aggregate(
      transfersReceivedPipeline
    );
    const transfersReceived = {
      total: transfersReceivedResult[0]?.total || 0,
      count: transfersReceivedResult[0]?.count || 0,
    };

    // 12. System Earnings
    const systemEarnings =
      AddispayDeposits.total +
      manualDeposits.total -
      (AddispayWithdrawals.total + manualWithdrawals.total);

    // 13. Previous Month Comparison
    const { prevStart, prevEnd } = getPreviousMonthRange();
    const prevSystemRevenuePipeline = [
      {
        $match: {
          status: "completed",
          ...applyDateFilter("completedAt"),
          stakeAmount: { $exists: true, $ne: null },
          numberOfPlayers: { $exists: true, $ne: null },
          winAmount: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          totalStake: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$stakeAmount", null] },
                    { $ne: ["$numberOfPlayers", null] },
                  ],
                },
                { $multiply: ["$stakeAmount", "$numberOfPlayers"] },
                0,
              ],
            },
          },
          totalWinAmount: { $sum: { $ifNull: ["$winAmount", 0] } },
        },
      },
      {
        $project: {
          systemRevenue: { $subtract: ["$totalStake", "$totalWinAmount"] },
        },
      },
    ];

    const prevAddispayDepositsPipeline = [
      {
        $match: {
          type: { $in: ["deposit", "Deposit"] },
          status: { $in: ["COMPLETED", "completed"] },
          createdAt: { $gte: prevStart, $lte: prevEnd },
          amount: { $exists: true, $ne: null, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ];

    const prevAddispayWithdrawalsPipeline = [
      {
        $match: {
          type: { $in: ["withdrawal", "Withdrawal"] },
          status: { $in: ["COMPLETED", "completed"] },
          createdAt: { $gte: prevStart, $lte: prevEnd },
          amount: { $exists: true, $ne: null, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ];

    const prevManualDepositsPipeline = [
      {
        $match: {
          type: { $in: ["deposit", "Deposit"] },
          receiptId: { $ne: null },
          createdAt: { $gte: prevStart, $lte: prevEnd },
          amount: { $exists: true, $ne: null, $gt: 0 },
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
          "receipt.status": { $in: ["approved", "Approved"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ];

    const prevManualWithdrawalsPipeline = [
      {
        $match: {
          type: { $in: ["withdrawal", "Withdrawal"] },
          createdAt: { $gte: prevStart, $lte: prevEnd },
          amount: { $exists: true, $ne: null, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ];

    const prevTransfersSentPipeline = [
      {
        $match: {
          type: "transfer",
          status: { $in: ["COMPLETED", "completed"] },
          createdAt: { $gte: prevStart, $lte: prevEnd },
          amount: { $exists: true, $ne: null, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ];

    const prevTransfersReceivedPipeline = [
      {
        $match: {
          type: "receive",
          status: { $in: ["COMPLETED", "completed"] },
          createdAt: { $gte: prevStart, $lte: prevEnd },
          amount: { $exists: true, $ne: null, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ];

    const [
      prevSystemRevenueResult,
      prevAddispayDepositsResult,
      prevAddispayWithdrawalsResult,
      prevManualDepositsResult,
      prevManualWithdrawalsResult,
      prevTransfersSentResult,
      prevTransfersReceivedResult,
    ] = await Promise.all([
      GameRoom.aggregate(prevSystemRevenuePipeline),
      Transaction.aggregate(prevAddispayDepositsPipeline),
      Transaction.aggregate(prevAddispayWithdrawalsPipeline),
      ManualTransaction.aggregate(prevManualDepositsPipeline),
      ManualTransaction.aggregate(prevManualWithdrawalsPipeline),
      Transaction.aggregate(prevTransfersSentPipeline),
      Transaction.aggregate(prevTransfersReceivedPipeline),
    ]);

    const prevSystemRevenue = prevSystemRevenueResult[0]?.systemRevenue || 0;
    const prevAddispayDeposits = prevAddispayDepositsResult[0]?.total || 0;
    const prevAddispayWithdrawals =
      prevAddispayWithdrawalsResult[0]?.total || 0;
    const prevManualDeposits = prevManualDepositsResult[0]?.total || 0;
    const prevManualWithdrawals = prevManualWithdrawalsResult[0]?.total || 0;
    const prevTransfersSent = prevTransfersSentResult[0]?.total || 0;
    const prevTransfersReceived = prevTransfersReceivedResult[0]?.total || 0;
    const prevSystemEarnings =
      prevSystemRevenue - (prevAddispayWithdrawals + prevManualWithdrawals);

    // 14. Player Retention
    const currentActiveUsersPipeline = [
      {
        $match: {
          $or: [
            {
              type: {
                $in: [
                  "deposit",
                  "Deposit",
                  "withdrawal",
                  "Withdrawal",
                  "transfer",
                  "receive",
                ],
              },
              status: { $in: ["COMPLETED", "completed"] },
              ...applyDateFilter("createdAt"),
            },
          ],
          userId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$userId",
        },
      },
      {
        $unionWith: {
          coll: "reservations",
          pipeline: [
            {
              $match: {
                status: "completed",
                gameStatus: { $in: ["won", "lost"] },
                userId: { $exists: true, $ne: null },
                ...applyDateFilter("updatedAt"),
              },
            },
            {
              $group: {
                _id: "$userId",
              },
            },
          ],
        },
      },
      {
        $match: {
          _id: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$_id",
        },
      },
    ];

    const prevActiveUsersPipeline = [
      {
        $match: {
          $or: [
            {
              type: {
                $in: [
                  "deposit",
                  "Deposit",
                  "withdrawal",
                  "Withdrawal",
                  "transfer",
                  "receive",
                ],
              },
              status: { $in: ["COMPLETED", "completed"] },
              createdAt: { $gte: prevStart, $lte: prevEnd },
            },
          ],
          userId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$userId",
        },
      },
      {
        $unionWith: {
          coll: "reservations",
          pipeline: [
            {
              $match: {
                status: "completed",
                gameStatus: { $in: ["won", "lost"] },
                userId: { $exists: true, $ne: null },
                updatedAt: { $gte: prevStart, $lte: prevEnd },
              },
            },
            {
              $group: {
                _id: "$userId",
              },
            },
          ],
        },
      },
      {
        $match: {
          _id: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$_id",
        },
      },
    ];

    const [currentActiveUsersResult, prevActiveUsersResult] = await Promise.all(
      [
        Transaction.aggregate(currentActiveUsersPipeline),
        Transaction.aggregate(prevActiveUsersPipeline),
      ]
    );

    const currentActiveUsers = new Set(
      currentActiveUsersResult
        .filter((u) => u._id != null)
        .map((u) => u._id.toString())
    );
    const prevActiveUsers = new Set(
      prevActiveUsersResult
        .filter((u) => u._id != null)
        .map((u) => u._id.toString())
    );
    const retainedUsers = [...currentActiveUsers].filter((userId) =>
      prevActiveUsers.has(userId)
    );
    const retentionRate =
      currentActiveUsers.size > 0
        ? (retainedUsers.length / currentActiveUsers.size) * 100
        : 0;

    // 15. Revenue Trends
    const revenueTrendsPipeline = [
      {
        $match: {
          status: "completed",
          ...applyDateFilter("completedAt"),
          stakeAmount: { $exists: true, $ne: null },
          numberOfPlayers: { $exists: true, $ne: null },
          winAmount: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$completedAt" },
          },
          dailyRevenue: {
            $sum: {
              $subtract: [
                {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$stakeAmount", null] },
                        { $ne: ["$numberOfPlayers", null] },
                      ],
                    },
                    { $multiply: ["$stakeAmount", "$numberOfPlayers"] },
                    0,
                  ],
                },
                { $ifNull: ["$winAmount", 0] },
              ],
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ];

    const revenueTrendsResult = await GameRoom.aggregate(revenueTrendsPipeline);
    const revenueTrends = revenueTrendsResult.map((trend) => ({
      date: trend._id,
      revenue: trend.dailyRevenue.toFixed(2),
    }));

    // 16. Transaction Breakdown
    const totalDeposits = AddispayDeposits.total + manualDeposits.total + smsDeposits.total;
    const totalWithdrawals =
      AddispayWithdrawals.total + manualWithdrawals.total;
    const totalTransfers = transfersSent.total + transfersReceived.total;
    const totalBonuses = registrationBonus.total + referralBonus.total + depositBonus.total;
    const transactionBreakdown = {
      AddispayDeposits: AddispayDeposits.total,
      manualDeposits: manualDeposits.total,
      smsDeposits: smsDeposits.total,
      registrationBonus: registrationBonus.total,
      referralBonus: referralBonus.total,
      depositBonus: depositBonus.total,
      AddispayWithdrawals: AddispayWithdrawals.total,
      manualWithdrawals: manualWithdrawals.total,
      transfersSent: transfersSent.total,
      transfersReceived: transfersReceived.total,
    };
    // 17. Retention Ratio
    const retentionRatio =
      totalDeposits > 0
        ? ((totalDeposits - totalWithdrawals) / totalDeposits) * 100
        : 0;

    // Format the response
    const dashboardData = {
      systemRevenue: {
        total: systemRevenue.total.toFixed(2),
        gameCount: systemRevenue.gameCount,
        uniquePlayerCount: systemRevenue.uniquePlayerCount,
        avgStake: systemRevenue.avgStake.toFixed(2),
        winRate: (systemRevenue.winRate * 100).toFixed(2),
      },
      userStats: {
        totalUserWallets: userStats.totalUserWallets.toFixed(2),
        totalRobotWallets: userStats.totalRobotWallets.toFixed(2),
        totalUsers: userStats.totalUsers,
        totalRobots: userStats.totalRobots,
      },
      todayStats: {
        deposits: {
          Addispay: todayDeposits.Addispay.toFixed(2),
          manual: todayDeposits.manual.toFixed(2),
          total: todayDeposits.total.toFixed(2),
        },
        bonuses: {
          registration: todayBonuses.registration.toFixed(2),
          referral: todayBonuses.referral.toFixed(2),
          deposit: todayBonuses.deposit.toFixed(2),
          total: todayBonuses.total.toFixed(2),
        },
        withdrawals: {
          Addispay: todayWithdrawals.Addispay.toFixed(2),
          manual: todayWithdrawals.manual.toFixed(2),
          total: todayWithdrawals.total.toFixed(2),
        },
        systemRevenue: todaySystemRevenue.total.toFixed(2),
        gamesPlayed: todaySystemRevenue.gamesPlayed,
      },
      deposits: {
        Addispay: {
          total: AddispayDeposits.total.toFixed(2),
          count: AddispayDeposits.count,
        },
        manual: {
          total: manualDeposits.total.toFixed(2),
          count: manualDeposits.count,
        },
        sms: {
          total: smsDeposits.total.toFixed(2),
          count: smsDeposits.count,
        },
        total: totalDeposits.toFixed(2),
      },
      bonuses: {
        registration: {
          total: registrationBonus.total.toFixed(2),
          count: registrationBonus.count,
        },
        referral: {
          total: referralBonus.total.toFixed(2),
          count: referralBonus.count,
        },
        deposit: {
          total: depositBonus.total.toFixed(2),
          count: depositBonus.count,
        },
        total: totalBonuses.toFixed(2),
      },
      withdrawals: {
        Addispay: {
          total: AddispayWithdrawals.total.toFixed(2),
          count: AddispayWithdrawals.count,
        },
        manual: {
          total: manualWithdrawals.total.toFixed(2),
          count: manualWithdrawals.count,
        },
        total: totalWithdrawals.toFixed(2),
      },
      transfers: {
        sent: {
          total: transfersSent.total.toFixed(2),
          count: transfersSent.count,
        },
        received: {
          total: transfersReceived.total.toFixed(2),
          count: transfersReceived.count,
        },
        total: totalTransfers.toFixed(2),
      },
      systemEarnings: systemEarnings.toFixed(2),
      monthOverMonth: {
        systemRevenue: {
          previous: prevSystemRevenue.toFixed(2),
          current: systemRevenue.total.toFixed(2),
          difference: (systemRevenue.total - prevSystemRevenue).toFixed(2),
          percentageChange:
            prevSystemRevenue !== 0
              ? (
                ((systemRevenue.total - prevSystemRevenue) /
                  prevSystemRevenue) *
                100
              ).toFixed(2)
              : systemRevenue.total > 0
                ? "100.00"
                : "0.00",
        },
        deposits: {
          previous: (prevAddispayDeposits + prevManualDeposits).toFixed(2),
          current: totalDeposits.toFixed(2),
          difference: (
            totalDeposits -
            (prevAddispayDeposits + prevManualDeposits)
          ).toFixed(2),
          percentageChange:
            prevAddispayDeposits + prevManualDeposits !== 0
              ? (
                ((totalDeposits -
                  (prevAddispayDeposits + prevManualDeposits)) /
                  (prevAddispayDeposits + prevManualDeposits)) *
                100
              ).toFixed(2)
              : totalDeposits > 0
                ? "100.00"
                : "0.00",
        },
        withdrawals: {
          previous: (prevAddispayWithdrawals + prevManualWithdrawals).toFixed(
            2
          ),
          current: totalWithdrawals.toFixed(2),
          difference: (
            totalWithdrawals -
            (prevAddispayWithdrawals + prevManualWithdrawals)
          ).toFixed(2),
          percentageChange:
            prevAddispayWithdrawals + prevManualWithdrawals !== 0
              ? (
                ((totalWithdrawals -
                  (prevAddispayWithdrawals + prevManualWithdrawals)) /
                  (prevAddispayWithdrawals + prevManualWithdrawals)) *
                100
              ).toFixed(2)
              : totalWithdrawals > 0
                ? "100.00"
                : "0.00",
        },
        transfers: {
          previous: (prevTransfersSent + prevTransfersReceived).toFixed(2),
          current: totalTransfers.toFixed(2),
          difference: (
            totalTransfers -
            (prevTransfersSent + prevTransfersReceived)
          ).toFixed(2),
          percentageChange:
            prevTransfersSent + prevTransfersReceived !== 0
              ? (
                ((totalTransfers -
                  (prevTransfersSent + prevTransfersReceived)) /
                  (prevTransfersSent + prevTransfersReceived)) *
                100
              ).toFixed(2)
              : totalTransfers > 0
                ? "100.00"
                : "0.00",
        },
        systemEarnings: {
          previous: prevSystemEarnings.toFixed(2),
          current: systemEarnings.toFixed(2),
          difference: (systemEarnings - prevSystemEarnings).toFixed(2),
          percentageChange:
            prevSystemEarnings !== 0
              ? (
                ((systemEarnings - prevSystemEarnings) / prevSystemEarnings) *
                100
              ).toFixed(2)
              : systemEarnings > 0
                ? "100.00"
                : "0.00",
        },
      },
      chartData: {
        revenueTrends,
        retentionRatio: retentionRatio.toFixed(2),
        transactionBreakdown: {
          AddispayDeposits: AddispayDeposits.total.toFixed(2),
          manualDeposits: manualDeposits.total.toFixed(2),
          smsDeposits: smsDeposits.total.toFixed(2),
          registrationBonus: registrationBonus.total.toFixed(2),
          referralBonus: referralBonus.total.toFixed(2),
          depositBonus: depositBonus.total.toFixed(2),
          AddispayWithdrawals: AddispayWithdrawals.total.toFixed(2),
          manualWithdrawals: manualWithdrawals.total.toFixed(2),
          transfersSent: transfersSent.total.toFixed(2),
          transfersReceived: transfersReceived.total.toFixed(2),
        },
        retentionRate: retentionRate.toFixed(2),
        winRate: (systemRevenue.winRate * 100).toFixed(2),
      },
      detailedStatistics: detailedStats,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };

    return res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    logger.error("bingoDashboard: error fetching dashboard", { err: error });
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};