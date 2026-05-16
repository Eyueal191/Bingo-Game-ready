const Game = require("../models/game");
const GameParticipant = require("../models/gameParticipant");
const Payout = require("../models/payout");
const User = require("../models/userModels");
const { Transaction } = require("../models/Transaction");
const logger = require("../utils/winstonLogger");
const ManualTransaction = require("../models/ManualTransaction");

const getDashboard = async (req, res) => {
  try {
    const { from, to } = req.query || {};
    // per-game system cut: use game.system_benefit if set, otherwise default to 20%

    // Build date filter for createdAt (transactions/users) and created_at (games/payouts)
    const txDateFilter = {};
    const gameDateFilter = {};
    if (from) {
      const d = new Date(from);
      if (isNaN(d.getTime()))
        return res.status(400).json({ error: "Invalid from date" });
      txDateFilter.$gte = d;
      gameDateFilter.$gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (isNaN(d.getTime()))
        return res.status(400).json({ error: "Invalid to date" });
      d.setHours(23, 59, 59, 999);
      txDateFilter.$lte = d;
      gameDateFilter.$lte = d;
    }

    const [
      totalUsers,
      totalGames,
      keshMoney,
      totalSystemEarnings,
      totalPayouts,
      activeUsers,
      recentTransactions,
      transactionDistribution,
    ] = await Promise.all([
      User.countDocuments(
        Object.keys(txDateFilter).length ? { createdAt: txDateFilter } : {}
      ).then((result) => {
        logger.info(`Total Users: ${result}`);
        return result;
      }),
      Game.countDocuments(
        Object.keys(gameDateFilter).length ? { created_at: gameDateFilter } : {}
      ).then((result) => {
        logger.info(`Total Games: ${result}`);
        return result;
      }),
      // Unified money metrics via facet + unionWith
      Transaction.aggregate([
        // Optional date filter first to narrow scan
        ...(Object.keys(txDateFilter).length
          ? [{ $match: { createdAt: txDateFilter } }]
          : []),
        {
          $project: {
            amount: 1,
            createdAt: 1,
            typeLower: { $toLower: "$type" },
            statusUpper: { $toUpper: "$status" },
          },
        },
        {
          $facet: {
            depositsTx: [
              {
                $match: {
                  typeLower: "deposit",
                  statusUpper: { $in: ["COMPLETED", "SUCCESS"] },
                },
              },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ],
            withdrawalsTx: [
              {
                $match: {
                  typeLower: "withdrawal",
                  statusUpper: { $in: ["COMPLETED", "SUCCESS"] },
                },
              },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ],
            betsTx: [
              {
                $match: {
                  typeLower: "bet",
                  statusUpper: { $in: ["COMPLETED", "SUCCESS"] },
                },
              },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ],
            betsManual: [
              {
                $unionWith: {
                  coll: "manualtransactions",
                  pipeline: [
                    {
                      $project: {
                        amount: 1,
                        createdAt: 1,
                        typeLower: { $toLower: "$type" },
                      },
                    },
                    ...(Object.keys(txDateFilter).length
                      ? [{ $match: { createdAt: txDateFilter } }]
                      : []),
                    { $match: { typeLower: "game_stake" } },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                  ],
                },
              },
            ],
            rewardsTx: [
              {
                $match: {
                  typeLower: "reward",
                  statusUpper: { $in: ["COMPLETED", "SUCCESS"] },
                },
              },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ],
            rewardsManual: [
              {
                $unionWith: {
                  coll: "manualtransactions",
                  pipeline: [
                    {
                      $project: {
                        amount: 1,
                        createdAt: 1,
                        typeLower: { $toLower: "$type" },
                      },
                    },
                    ...(Object.keys(txDateFilter).length
                      ? [{ $match: { createdAt: txDateFilter } }]
                      : []),
                    { $match: { typeLower: "game_win" } },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                  ],
                },
              },
            ],
            depositsManual: [
              {
                $unionWith: {
                  coll: "manualtransactions",
                  pipeline: [
                    {
                      $project: {
                        amount: 1,
                        createdAt: 1,
                        typeLower: { $toLower: "$type" },
                      },
                    },
                    ...(Object.keys(txDateFilter).length
                      ? [{ $match: { createdAt: txDateFilter } }]
                      : []),
                    { $match: { typeLower: "deposit" } },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                  ],
                },
              },
            ],
            withdrawalsManual: [
              {
                $unionWith: {
                  coll: "manualtransactions",
                  pipeline: [
                    {
                      $project: {
                        amount: 1,
                        createdAt: 1,
                        typeLower: { $toLower: "$type" },
                      },
                    },
                    ...(Object.keys(txDateFilter).length
                      ? [{ $match: { createdAt: txDateFilter } }]
                      : []),
                    { $match: { typeLower: "withdrawal" } },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                  ],
                },
              },
            ],
          },
        },
        {
          $project: {
            totalDeposits: {
              $add: [
                { $ifNull: [{ $arrayElemAt: ["$depositsTx.total", 0] }, 0] },
                {
                  $ifNull: [{ $arrayElemAt: ["$depositsManual.total", 0] }, 0],
                },
              ],
            },
            totalWithdrawals: {
              $add: [
                {
                  $ifNull: [{ $arrayElemAt: ["$withdrawalsTx.total", 0] }, 0],
                },
                {
                  $ifNull: [
                    { $arrayElemAt: ["$withdrawalsManual.total", 0] },
                    0,
                  ],
                },
              ],
            },
            totalBets: {
              $add: [
                { $ifNull: [{ $arrayElemAt: ["$betsTx.total", 0] }, 0] },
                { $ifNull: [{ $arrayElemAt: ["$betsManual.total", 0] }, 0] },
              ],
            },
            totalRewards: {
              $add: [
                { $ifNull: [{ $arrayElemAt: ["$rewardsTx.total", 0] }, 0] },
                {
                  $ifNull: [{ $arrayElemAt: ["$rewardsManual.total", 0] }, 0],
                },
              ],
            },
          },
        },
      ]).then(
        (x) =>
          x[0] || {
            totalDeposits: 0,
            totalWithdrawals: 0,
            totalBets: 0,
            totalRewards: 0,
          }
      ),
      Game.aggregate([
        {
          $match: {
            status: "completed",
            ...(Object.keys(gameDateFilter).length
              ? { created_at: gameDateFilter }
              : {}),
          },
        },
        {
          $lookup: {
            from: "game_participants",
            localField: "_id",
            foreignField: "game_id",
            as: "participants",
          },
        },
        {
          $project: {
            total: {
              $multiply: [
                "$bet_amount",
                {
                  $sum: {
                    $map: {
                      input: "$participants",
                      as: "p",
                      in: { $size: "$$p.numbers" },
                    },
                  },
                },
                // use per-game system_benefit (percent) if available, otherwise default to 20
                { $divide: [{ $ifNull: ["$system_benefit", 20] }, 100] },
              ],
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]).then((result) => {
        const total = result[0]?.total || 0;
        logger.info(`Total System Earnings: ${total}`);
        return total;
      }),
      Payout.aggregate([
        {
          $match: {
            status: "paid",
            ...(Object.keys(gameDateFilter).length
              ? { created_at: gameDateFilter }
              : {}),
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).then((result) => {
        const total = result[0]?.total || 0;
        logger.info(`Total Payouts: ${total}`);
        return total;
      }),
      User.countDocuments({ is_active: true }).then((result) => {
        logger.info(`Active Users: ${result}`);
        return result;
      }),
      Transaction.aggregate([
        ...(Object.keys(txDateFilter).length
          ? [{ $match: { createdAt: txDateFilter } }]
          : []),
        {
          $project: {
            amount: 1,
            createdAt: 1,
            typeLower: { $toLower: "$type" },
            statusUpper: { $toUpper: "$status" },
            userId: 1,
          },
        },
        {
          $project: {
            amount: 1,
            createdAt: 1,
            userId: 1,
            // normalize automatic transaction types
            type: {
              $switch: {
                branches: [
                  { case: { $eq: ["$typeLower", "deposit"] }, then: "deposit" },
                  {
                    case: { $eq: ["$typeLower", "withdrawal"] },
                    then: "withdrawal",
                  },
                  { case: { $eq: ["$typeLower", "bet"] }, then: "bet" },
                  { case: { $eq: ["$typeLower", "reward"] }, then: "reward" },
                ],
                default: "other",
              },
            },
          },
        },
        {
          $unionWith: {
            coll: "manualtransactions",
            pipeline: [
              {
                $project: {
                  amount: 1,
                  // prefer createdAt if present, otherwise fallback to custom date
                  createdAt: { $ifNull: ["$createdAt", "$date"] },
                  typeLower: { $toLower: "$type" },
                  userId: "$userId",
                },
              },
              ...(Object.keys(txDateFilter).length
                ? [{ $match: { createdAt: txDateFilter } }]
                : []),
              {
                $project: {
                  amount: 1,
                  createdAt: 1,
                  userId: 1,
                  // map manual types to standard categories
                  type: {
                    $switch: {
                      branches: [
                        {
                          case: { $eq: ["$typeLower", "deposit"] },
                          then: "deposit",
                        },
                        {
                          case: { $eq: ["$typeLower", "withdrawal"] },
                          then: "withdrawal",
                        },
                        {
                          case: { $eq: ["$typeLower", "game_stake"] },
                          then: "bet",
                        },
                        {
                          case: { $eq: ["$typeLower", "game_win"] },
                          then: "reward",
                        },
                      ],
                      default: "other",
                    },
                  },
                },
              },
            ],
          },
        },
        {
          $match: { type: { $in: ["deposit", "withdrawal", "bet", "reward"] } },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 20 },
      ]).then((result) => {
        logger.info(
          `Recent Transactions (merged): ${JSON.stringify(
            result.map((t) => ({
              type: t.type,
              amount: t.amount,
              createdAt: t.createdAt,
            }))
          )}`
        );
        return result;
      }),
      // Distribution across both collections (amount totals and counts)
      (async () => {
        const [autoAgg, manualAgg] = await Promise.all([
          Transaction.aggregate([
            ...(Object.keys(txDateFilter).length
              ? [{ $match: { createdAt: txDateFilter } }]
              : []),
            {
              $project: {
                amount: 1,
                typeLower: { $toLower: "$type" },
                statusUpper: { $toUpper: "$status" },
              },
            },
            {
              $match: {
                typeLower: { $in: ["deposit", "withdrawal", "bet", "reward"] },
                statusUpper: { $in: ["COMPLETED", "SUCCESS"] },
              },
            },
            {
              $group: {
                _id: "$typeLower",
                total: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
          ]),
          ManualTransaction.aggregate([
            {
              $project: {
                amount: 1,
                typeLower: { $toLower: "$type" },
                createdAt: 1,
              },
            },
            ...(Object.keys(txDateFilter).length
              ? [{ $match: { createdAt: txDateFilter } }]
              : []),
            {
              $project: {
                amount: 1,
                type: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$typeLower", "deposit"] },
                        then: "deposit",
                      },
                      {
                        case: { $eq: ["$typeLower", "withdrawal"] },
                        then: "withdrawal",
                      },
                      {
                        case: { $eq: ["$typeLower", "game_stake"] },
                        then: "bet",
                      },
                      {
                        case: { $eq: ["$typeLower", "game_win"] },
                        then: "reward",
                      },
                    ],
                    default: "other",
                  },
                },
              },
            },
            {
              $match: {
                type: { $in: ["deposit", "withdrawal", "bet", "reward"] },
              },
            },
            {
              $group: {
                _id: "$type",
                total: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
          ]),
        ]);
        const init = () => ({ total: 0, count: 0 });
        const dist = {
          deposit: init(),
          withdrawal: init(),
          bet: init(),
          reward: init(),
        };
        for (const r of autoAgg)
          if (dist[r._id]) {
            dist[r._id].total += r.total || 0;
            dist[r._id].count += r.count || 0;
          }
        for (const r of manualAgg)
          if (dist[r._id]) {
            dist[r._id].total += r.total || 0;
            dist[r._id].count += r.count || 0;
          }
        return dist;
      })(),
    ]);

    res.status(200).json({
      totalUsers,
      totalGames,
      totalRevenue: totalSystemEarnings || 0,
      totalDeposits: keshMoney.totalDeposits || 0,
      totalWithdrawals: keshMoney.totalWithdrawals || 0,
      totalBets: keshMoney.totalBets || 0,
      totalRewards: keshMoney.totalRewards || 0,
      totalSystemEarnings: totalSystemEarnings || 0,
      totalPayouts: totalPayouts || 0,
      activeUsers: activeUsers || 0,
      recentTransactions,
      transactionDistribution,
    });
  } catch (err) {
    logger.error("Admin dashboard fetch failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getStats = async (req, res) => {
  try {
    // per-game system_benefit will be used inside aggregations (fallback to 20% when missing)

    const [moneyByMonth, systemEarningsData, userGrowthData, gameStatsData] =
      await Promise.all([
        Transaction.aggregate([
          {
            $project: {
              amount: 1,
              createdAt: 1,
              typeLower: { $toLower: "$type" },
              statusUpper: { $toUpper: "$status" },
              month: {
                $dateToString: { format: "%Y-%m-01", date: "$createdAt" },
              },
            },
          },
          {
            $facet: {
              deposits: [
                {
                  $match: {
                    typeLower: "deposit",
                    statusUpper: { $in: ["COMPLETED", "SUCCESS"] },
                  },
                },
                { $group: { _id: "$month", total: { $sum: "$amount" } } },
                { $sort: { _id: 1 } },
                {
                  $unionWith: {
                    coll: "manualtransactions",
                    pipeline: [
                      {
                        $project: {
                          amount: 1,
                          createdAt: 1,
                          typeLower: { $toLower: "$type" },
                          month: {
                            $dateToString: {
                              format: "%Y-%m-01",
                              date: "$createdAt",
                            },
                          },
                        },
                      },
                      { $match: { typeLower: "deposit" } },
                      { $group: { _id: "$month", total: { $sum: "$amount" } } },
                      { $sort: { _id: 1 } },
                    ],
                  },
                },
              ],
              withdrawals: [
                {
                  $match: {
                    typeLower: "withdrawal",
                    statusUpper: { $in: ["COMPLETED", "SUCCESS"] },
                  },
                },
                { $group: { _id: "$month", total: { $sum: "$amount" } } },
                { $sort: { _id: 1 } },
                {
                  $unionWith: {
                    coll: "manualtransactions",
                    pipeline: [
                      {
                        $project: {
                          amount: 1,
                          createdAt: 1,
                          typeLower: { $toLower: "$type" },
                          month: {
                            $dateToString: {
                              format: "%Y-%m-01",
                              date: "$createdAt",
                            },
                          },
                        },
                      },
                      { $match: { typeLower: "withdrawal" } },
                      { $group: { _id: "$month", total: { $sum: "$amount" } } },
                      { $sort: { _id: 1 } },
                    ],
                  },
                },
              ],
              bets: [
                {
                  $match: {
                    typeLower: "bet",
                    statusUpper: { $in: ["COMPLETED", "SUCCESS"] },
                  },
                },
                { $group: { _id: "$month", total: { $sum: "$amount" } } },
                { $sort: { _id: 1 } },
                {
                  $unionWith: {
                    coll: "manualtransactions",
                    pipeline: [
                      {
                        $project: {
                          amount: 1,
                          createdAt: 1,
                          typeLower: { $toLower: "$type" },
                          month: {
                            $dateToString: {
                              format: "%Y-%m-01",
                              date: "$createdAt",
                            },
                          },
                        },
                      },
                      { $match: { typeLower: "game_stake" } },
                      { $group: { _id: "$month", total: { $sum: "$amount" } } },
                      { $sort: { _id: 1 } },
                    ],
                  },
                },
              ],
              rewards: [
                {
                  $match: {
                    typeLower: "reward",
                    statusUpper: { $in: ["COMPLETED", "SUCCESS"] },
                  },
                },
                { $group: { _id: "$month", total: { $sum: "$amount" } } },
                { $sort: { _id: 1 } },
                {
                  $unionWith: {
                    coll: "manualtransactions",
                    pipeline: [
                      {
                        $project: {
                          amount: 1,
                          createdAt: 1,
                          typeLower: { $toLower: "$type" },
                          month: {
                            $dateToString: {
                              format: "%Y-%m-01",
                              date: "$createdAt",
                            },
                          },
                        },
                      },
                      { $match: { typeLower: "game_win" } },
                      { $group: { _id: "$month", total: { $sum: "$amount" } } },
                      { $sort: { _id: 1 } },
                    ],
                  },
                },
              ],
            },
          },
        ]).then(
          (x) =>
            x[0] || { deposits: [], withdrawals: [], bets: [], rewards: [] }
        ),
        Game.aggregate([
          { $match: { status: "completed" } },
          {
            $lookup: {
              from: "game_participants",
              localField: "_id",
              foreignField: "game_id",
              as: "participants",
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-01", date: "$created_at" },
              },
              total: {
                $sum: {
                  $multiply: [
                    "$bet_amount",
                    {
                      $sum: {
                        $map: {
                          input: "$participants",
                          as: "p",
                          in: { $size: "$$p.numbers" },
                        },
                      },
                    },
                    // use per-game system_benefit (percent) if available, otherwise default to 20
                    { $divide: [{ $ifNull: ["$system_benefit", 20] }, 100] },
                  ],
                },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]).then((result) => {
          logger.info(`System Earnings Data: ${JSON.stringify(result)}`);
          return result;
        }),
        User.aggregate([
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-01", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]).then((result) => {
          logger.info(`User Growth Data: ${JSON.stringify(result)}`);
          return result;
        }),
        Game.aggregate([
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-01", date: "$created_at" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]).then((result) => {
          logger.info(`Game Stats Data: ${JSON.stringify(result)}`);
          return result;
        }),
      ]);

    // Merge same-month buckets that came from union (facet arrays may have duplicates for same month)
    const mergeMonthly = (arr) => {
      const byMonth = new Map();
      for (const row of arr) {
        const k = row._id;
        byMonth.set(k, (byMonth.get(k) || 0) + (row.total || 0));
      }
      return Array.from(byMonth.entries())
        .map(([k, total]) => ({ _id: k, total }))
        .sort((a, b) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0));
    };

    const depositData = mergeMonthly(moneyByMonth.deposits || []);
    const withdrawalData = mergeMonthly(moneyByMonth.withdrawals || []);
    const betData = mergeMonthly(moneyByMonth.bets || []);
    const rewardData = mergeMonthly(moneyByMonth.rewards || []);

    const statsResponse = {
      revenue: systemEarningsData.map((r) => ({
        month: new Date(r._id).toISOString(),
        total: r.total || 0,
      })),
      deposits: depositData.map((r) => ({
        month: new Date(r._id).toISOString(),
        total: r.total || 0,
      })),
      withdrawals: withdrawalData.map((r) => ({
        month: new Date(r._id).toISOString(),
        total: r.total || 0,
      })),
      bets: betData.map((r) => ({
        month: new Date(r._id).toISOString(),
        total: r.total || 0,
      })),
      rewards: rewardData.map((r) => ({
        month: new Date(r._id).toISOString(),
        total: r.total || 0,
      })),
      systemEarnings: systemEarningsData.map((r) => ({
        month: new Date(r._id).toISOString(),
        total: r.total || 0,
      })),
      userGrowth: userGrowthData.map((u) => ({
        month: new Date(u._id).toISOString(),
        count: u.count || 0,
      })),
      gameStats: gameStatsData.map((g) => ({
        month: new Date(g._id).toISOString(),
        count: g.count || 0,
      })),
    };

    logger.info(`Stats Response: ${JSON.stringify(statsResponse)}`);

    res.status(200).json(statsResponse);
  } catch (err) {
    logger.error("Stats fetch failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getTransactions = async (req, res) => {
  try {
    // Query params
    const {
      paged,
      page: pageStr,
      pageSize: pageSizeStr,
      type,
      status,
      from,
      to,
      q,
      sortField,
      sortOrder,
    } = req.query || {};

    const isPaged = String(paged).toLowerCase() === "true";
    const page = Math.max(parseInt(pageStr || "0", 10) || 0, 0);
    const pageSize = Math.min(
      Math.max(parseInt(pageSizeStr || "10", 10) || 10, 1),
      100
    );
    const skip = page * pageSize;

    // Build filter
    const query = {};
    if (type && type !== "all") query.type = type; // stored in lowercase
    if (status && status !== "all") query.status = status.toUpperCase();
    if (from || to) {
      query.createdAt = {};
      if (from) {
        const d = new Date(from);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ error: "Invalid from date" });
        }
        query.createdAt.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ error: "Invalid to date" });
        }
        d.setHours(23, 59, 59, 999);
        query.createdAt.$lte = d;
      }
    }

    // Sorting
    const sort = {};
    if (sortField) {
      const dir = (sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
      const allowed = new Set(["createdAt", "amount", "type", "status"]);
      sort[allowed.has(sortField) ? sortField : "createdAt"] = dir;
    } else {
      sort.createdAt = -1;
    }

    // Base query
    let findQ = Transaction.find(query)
      .sort(sort)
      .skip(isPaged ? skip : 0)
      .limit(isPaged ? pageSize : 0)
      .select("userId type amount status createdAt reference")
      .populate({ path: "userId", select: "fullName" })
      .lean();

    // Optional keyword filter applied post-populate (user name or reference)
    const [rows, total] = await Promise.all([
      findQ,
      isPaged ? Transaction.countDocuments(query) : Promise.resolve(undefined),
    ]);

    const filteredRows = q
      ? rows.filter((t) => {
          const name = t.userId?.fullName?.toLowerCase() || "";
          const id = String(t._id || "").toLowerCase();
          const ref = String(t.reference || "").toLowerCase();
          const qq = String(q || "").toLowerCase();
          return name.includes(qq) || id.includes(qq) || ref.includes(qq);
        })
      : rows;

    if (isPaged) {
      return res.status(200).json({ rows: filteredRows, rowCount: total || 0 });
    }
    logger.info(`Fetched Transactions: ${filteredRows.length}`);
    res.status(200).json(filteredRows);
  } catch (err) {
    logger.error("Transactions fetch failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getPayouts = async (req, res) => {
  try {
    const payouts = await Payout.find()
      .sort({ created_at: -1 })
      .populate([
        { path: "user_id", select: "fullName" },
        { path: "game_id", select: "prize_amount" },
      ]);
    logger.info(`Fetched Payouts: ${payouts.length}`);
    res.status(200).json(payouts);
  } catch (err) {
    logger.error("Payouts fetch failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updatePayout = async (req, res) => {
  const { payoutId } = req.params;
  const { status } = req.body;

  try {
    const payout = await Payout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({ error: "Payout not found" });
    }

    payout.status = status;
    await payout.save();

    res.status(200).json(payout);
  } catch (err) {
    logger.error("Payout update failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getDashboard,
  getStats,
  getTransactions,
  getPayouts,
  updatePayout,
};