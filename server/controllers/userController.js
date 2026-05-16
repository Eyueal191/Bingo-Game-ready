const User = require("../models/userModels");
const AgentPayment = require("../models/AgentPayment");
const StakeBonusSettings = require("../models/stakeBonusSettings");
const logger = require("../utils/winstonLogger");
const { createWalletLog } = require("./walletLogController");
const { NotifyUserTelegram } = require("../botController/notification");
const ManualTransaction = require("../models/ManualTransaction");
const { Transaction: AddisTransaction, TransactionType } = require("../models/Transaction");
const Reservation = require("../models/reservationModel");

// **Get All Users**
exports.getAllUsers = async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 10,
      search = "",
      startDate,
      endDate,
      sortField = "createdAt",
      sortOrder = "desc",
      filters,
      filtersLogic = "and",
    } = req.query;

    // Build the query object
    const query = {};

    const escapeRegex = (str = "") =>
      String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Handle search (fullName, phone, referralCode, invitedBy)
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { referralCode: { $regex: search, $options: "i" } },
        { invitedBy: { $regex: search, $options: "i" } },
      ];
    }

    // DataGrid server filters: `filters` should be a JSON string of { items: [], logicOperator }
    if (filters) {
      try {
        const parsed = typeof filters === "string" ? JSON.parse(filters) : filters;
        const items = Array.isArray(parsed?.items) ? parsed.items : [];
        const logic = String(parsed?.logicOperator || filtersLogic || "and").toLowerCase();

        const clauses = [];
        for (const item of items) {
          const field = item?.field;
          const operator = String(item?.operator || item?.operatorValue || "contains");
          const value = item?.value;
          if (!field || value == null || String(value).trim() === "") continue;

          // string fields
          if (["fullName", "phone", "referralCode", "invitedBy", "telegramId", "role"].includes(field)) {
            if (operator === "isAnyOf") {
              const values = Array.isArray(value) ? value : String(value).split(",");
              const ors = values
                .map((v) => String(v).trim())
                .filter(Boolean)
                .map((v) => ({ [field]: { $regex: `^${escapeRegex(v)}$`, $options: "i" } }));
              if (ors.length) clauses.push({ $or: ors });
              continue;
            }
            const safe = escapeRegex(value);
            if (operator === "equals" || operator === "is") {
              clauses.push({ [field]: { $regex: `^${safe}$`, $options: "i" } });
            } else if (operator === "startsWith") {
              clauses.push({ [field]: { $regex: `^${safe}`, $options: "i" } });
            } else if (operator === "endsWith") {
              clauses.push({ [field]: { $regex: `${safe}$`, $options: "i" } });
            } else {
              // contains (default)
              clauses.push({ [field]: { $regex: safe, $options: "i" } });
            }
            continue;
          }

          // boolean fields
          if (["isBanned"].includes(field)) {
            const boolVal =
              value === true ||
              value === "true" ||
              value === 1 ||
              value === "1" ||
              String(value).toLowerCase() === "yes";
            clauses.push({ [field]: boolVal });
            continue;
          }

          // numeric fields
          if (["wallet", "bonus"].includes(field)) {
            const num = Number(value);
            if (!Number.isFinite(num)) continue;
            if (operator === ">" || operator === "greaterThan") clauses.push({ [field]: { $gt: num } });
            else if (operator === ">=" || operator === "greaterThanOrEqual" || operator === "greaterThanOrEqualTo")
              clauses.push({ [field]: { $gte: num } });
            else if (operator === "<" || operator === "lessThan") clauses.push({ [field]: { $lt: num } });
            else if (operator === "<=" || operator === "lessThanOrEqual" || operator === "lessThanOrEqualTo")
              clauses.push({ [field]: { $lte: num } });
            else clauses.push({ [field]: num });
            continue;
          }
        }

        if (clauses.length) {
          if (logic === "or") {
            query.$and = query.$and || [];
            query.$and.push({ $or: clauses });
          } else {
            query.$and = query.$and || [];
            query.$and.push(...clauses);
          }
        }
      } catch (e) {
        logger.warn("Invalid filters param for getAllUsers", { error: e?.message });
      }
    }

    // Handle date range filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid startDate format" });
        }
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ message: "Invalid endDate format" });
        }
        query.createdAt.$lte = end;
      }
    }

    // Convert page and limit to numbers and validate
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({ message: "Invalid limit value" });
    }

    // Calculate skip value for pagination
    const skip = (pageNum - 1) * limitNum;

    // Sorting (server-side)
    const allowedSort = new Set([
      "createdAt",
      "fullName",
      "phone",
      "referralCode",
      "invitedBy",
      "telegramId",
      "wallet",
      "bonus",
      "role",
      "isBanned",
    ]);
    const dir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;
    const sort = allowedSort.has(sortField) ? { [sortField]: dir } : { createdAt: -1 };

    // Get total count of matching users
    const totalUsers = await User.countDocuments(query);

    // Fetch users with pagination and exclude password
    const users = await User.find(query)
      .select("-password")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalUsers / limitNum);

    return res.status(200).json({
      success: true,
      count: users.length,
      totalUsers,
      totalPages,
      currentPage: pageNum,
      users,
    });
  } catch (error) {
    logger.error("Error fetching users:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};


/* update user wallet*/
exports.updateWallet = async (req, res) => {
  try {
    const { amount, reason = "", source = "manual" } = req.body;
    const userId = req.params.id;

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt === 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const before = Number(user.wallet || 0);
    const after = before + amt;
    if (after < 0) {
      return res
        .status(400)
        .json({ message: "Insufficient balance for this adjustment" });
    }
    user.wallet = after;

    await user.save();
    createWalletLog({
      targetUser: user._id,
      performedBy: req.user?._id,
      amount: amt,
      balanceBefore: before,
      balanceAfter: user.wallet,
      reason,
      source,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Notify user on Telegram (best-effort; should not break API)
    try {
      if (user.telegramId) {
        const escapeHtml = (s = "") =>
          String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

          const adminName = req.user?.fullName || "Admin";
        const sign = amt > 0 ? "+" : "";
        const msg =
          `<b>Wallet Adjustment</b>\n` +
          `User: <b>${escapeHtml(user.fullName || "Unknown")}</b>${user.phone ? ` (${escapeHtml(user.phone)})` : ""}\n` +
          `Before: ${before.toFixed(2)} ETB\n` +
          `After: <b>${Number(user.wallet || 0).toFixed(2)} ETB</b>\n` +
          `Source: ${escapeHtml(source || "manual")}\n` +
          (reason ? `Reason: ${escapeHtml(reason)}\n` : "") +
          `Updated by: ${escapeHtml(adminName)}\n` +
          `Date: ${escapeHtml(new Date().toLocaleString())}`;

        if (user.telegramId && user.role !== "robot" && !user.telegramId.startsWith("web_")) {
          await NotifyUserTelegram(user.telegramId, msg);
        }
      }
    } catch (e) {
      logger.error("Failed to notify user via Telegram after wallet adjustment", {
        userId: String(user._id),
        telegramId: user.telegramId,
        error: e?.message,
      });
    }

    if (req.io) {
      req.io.to(user._id.toString()).emit("walletUpdate", { wallet: user.wallet, bonus: user.bonus });
    }

    res.json({ message: "Wallet updated", wallet: user.wallet });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: user full financial + game history (for User Summary table)
exports.getUserSummary = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId)
      .select("_id fullName phone telegramId wallet bonus createdAt")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });


    const [
      smsDeposits,
      manualDeposits,
      addisDeposits,
      manualWithdrawals,
      addisWithdrawals,
      gameHistory,
    ] = await Promise.all([
      ManualTransaction.find({ userId: user._id, source: "sms" })
        .sort({ createdAt: -1 })
        .lean(),
      ManualTransaction.find({ userId: user._id, type: "deposit", source: { $ne: "sms" } })
        .sort({ createdAt: -1 })
        .lean(),
      AddisTransaction.find({ userId: user._id, type: TransactionType.DEPOSIT })
        .sort({ createdAt: -1 })
        .lean(),
      ManualTransaction.find({ userId: user._id, type: "Withdrawal" })
        .sort({ createdAt: -1 })
        .lean(),
      AddisTransaction.find({ userId: user._id, type: TransactionType.WITHDRAWAL })
        .sort({ createdAt: -1 })
        .lean(),
      Reservation.find({ userId: user._id })
        .populate("roomId", "stakeAmount winAmount status createdAt")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const toAmountSum = (arr) =>
      (arr || []).reduce((sum, x) => sum + Number(x?.amount || 0), 0);

    const wins = (gameHistory || []).filter((g) => g.gameStatus === "won").length;
    const losses = (gameHistory || []).filter((g) => g.gameStatus === "lost").length;

    res.json({
      success: true,
      user,
      deposits: {
        sms: smsDeposits,
        manual: manualDeposits,
        addispay: addisDeposits,
      },
      withdrawals: {
        manual: manualWithdrawals,
        addispay: addisWithdrawals,
      },
      games: {
        history: gameHistory,
      },
      stats: {
        totalDeposit:
          toAmountSum(smsDeposits) +
          toAmountSum(manualDeposits) +
          toAmountSum(addisDeposits),
        totalWithdraw: toAmountSum(manualWithdrawals) + toAmountSum(addisWithdrawals),
        totalGames: (gameHistory || []).length,
        wins,
        losses,
      },
    });
  } catch (error) {
    logger.error("Error building user summary", { error: error?.message });
    res.status(500).json({ message: "Server error" });
  }
};
// **Get User by ID**
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
/**
 *Get User by telegram id
 **/
exports.getUserByTelegramId = async (req, res) => {
  try {
    const user = await User.findOne({
      telegramId: req.params.telegramId,
    }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    logger.error("Error fetching user by Telegram ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};
exports.WalletBalanceTelegramId = async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.telegramId }).select(
      "fullName phone wallet bonus telegramId"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({
      telegramId: user.telegramId,
      fullName: user.fullName,
      phone: user.phone,
      wallet: user.wallet,
      bonus: user.bonus,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// **Get Users by Invited Referral Code**
exports.getUsersByInvitedCode = async (req, res) => {
  try {
    const { invitedBy } = req.params;
    const users = await User.find({ invitedBy });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Admin: Ban user
exports.banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isBanned)
      return res.status(200).json({ message: "User already banned" });
    user.isBanned = true;
    user.banReason = reason || "Violation of terms";
    user.bannedAt = new Date();
    await user.save();
    res.status(200).json({
      message: "User banned",
      user: {
        _id: user._id,
        isBanned: user.isBanned,
        banReason: user.banReason,
        bannedAt: user.bannedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin: Unban user
exports.unbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.isBanned)
      return res.status(200).json({ message: "User is not banned" });
    user.isBanned = false;
    user.banReason = undefined;
    user.bannedAt = undefined;
    await user.save();
    res.status(200).json({
      message: "User unbanned",
      user: { _id: user._id, isBanned: user.isBanned },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin: Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Agent: Get referred users and their play count/earnings
exports.getAgentEarnings = async (req, res) => {
  try {
    // Only allow agents
    if (!req.user || req.user.role !== "agent") {
      return res.status(403).json({ message: "Agent access required" });
    }
    // Find users referred by this agent
    const referredUsers = await User.find({
      invitedBy: req.user.referralCode,
    }).select("_id fullName phone createdAt");
    if (!referredUsers.length) {
      return res.status(200).json({
        referralCode: req.user.referralCode,
        referredUsers: [],
        totalRevenue: 0,
        totalGames: 0,
      });
    }
    // Get reservation counts and revenue for each referred user

    const reservations = await Reservation.aggregate([
      { $match: { userId: { $in: referredUsers.map((u) => u._id) } } },
      {
        $lookup: {
          from: "gamerooms",
          localField: "roomId",
          foreignField: "_id",
          as: "roomInfo",
        },
      },
      { $unwind: "$roomInfo" },
      {
        $project: {
          userId: 1,
          playCount: { $literal: 1 },
          stakeAmount: "$roomInfo.stakeAmount",
          cardCount: { $size: "$cardIds" },
        },
      },
    ]);
    // Map userId to playCount and total revenue
    const playCountMap = {};
    const revenueMap = {};

    // Get unique stake amounts and fetch their commission settings
    const uniqueStakeAmounts = [
      ...new Set(reservations.map((r) => r.stakeAmount)),
    ];
    const stakeSettings = await StakeBonusSettings.find({
      stakeAmount: { $in: uniqueStakeAmounts },
    });
    const commissionMap = {};
    stakeSettings.forEach((setting) => {
      commissionMap[setting.stakeAmount] = setting.systemCommission || 0.2;
    });

    reservations.forEach((r) => {
      const uid = r.userId.toString();
      playCountMap[uid] = (playCountMap[uid] || 0) + 1;
      // Revenue = commission% of stakeAmount * number of cards reserved in this reservation
      const commission = commissionMap[r.stakeAmount] || 0.2;
      const rev = (r.stakeAmount || 0) * (r.cardCount || 1) * commission;
      revenueMap[uid] = (revenueMap[uid] || 0) + rev;
    });
    // Sum up for agent
    let totalGames = 0;
    let totalRevenue = 0;
    const usersWithStats = referredUsers.map((u) => {
      const playCount = playCountMap[u._id.toString()] || 0;
      const revenue = revenueMap[u._id.toString()] || 0;
      totalGames += playCount;
      totalRevenue += revenue;
      return {
        id: u._id,
        fullName: u.fullName,
        phone: u.phone,
        createdAt: u.createdAt,
        playCount,
        totalRevenue: revenue,
      };
    });
    res.status(200).json({
      referralCode: req.user.referralCode,
      referredUsers: usersWithStats,
      totalRevenue,
      totalGames,
    });
  } catch (error) {
    logger.error("userController: error fetching agent earnings", { err: error });
    res.status(500).json({ message: "Failed to fetch agent earnings" });
  }
};

// Admin: Get all agents, their referred users, and total games played by those users
exports.getAllAgentsWithStats = async (req, res) => {
  try {
    // Only allow admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    // Find all agents
    const agents = await User.find({ role: "agent" }).select(
      "_id fullName phone referralCode createdAt wallet telegramId"
    );
    if (!agents.length) {
      return res.status(200).json({ agents: [] });
    }

    // Get all payments for all agents
    const agentIds = agents.map((a) => a._id);
    const payments = await AgentPayment.aggregate([
      { $match: { agent: { $in: agentIds } } },
      { $group: { _id: "$agent", totalPaid: { $sum: "$amount" } } },
    ]);

    const paymentsMap = payments.reduce((acc, p) => {
      acc[p._id.toString()] = p.totalPaid;
      return acc;
    }, {});

    // For each agent, find referred users and their play count
    const users = await User.find({
      invitedBy: { $in: agents.map((a) => a.referralCode) },
    }).select("_id fullName phone invitedBy");
    // Map referralCode to agent
    const agentMap = {};
    agents.forEach((a) => {
      agentMap[a.referralCode] = {
        ...a.toObject(),
        referredUsers: [],
        totalGames: 0,
      };
    });
    // Assign users to agents
    users.forEach((u) => {
      if (agentMap[u.invitedBy]) {
        agentMap[u.invitedBy].referredUsers.push(u);
      }
    });
    // For all referred users, get their reservation counts and total stakes
    const allUserIds = users.map((u) => u._id);
    const reservations = await Reservation.aggregate([
      { $match: { userId: { $in: allUserIds } } },
      {
        $lookup: {
          from: "gamerooms",
          localField: "roomId",
          foreignField: "_id",
          as: "roomInfo",
        },
      },
      { $unwind: "$roomInfo" },
      {
        $project: {
          userId: 1,
          playCount: { $literal: 1 },
          stakeAmount: "$roomInfo.stakeAmount",
          cardCount: { $size: "$cardIds" },
        },
      },
    ]);

    // Map userId to playCount and total revenue
    const playCountMap = {};
    const revenueMap = {};

    // Get unique stake amounts and fetch their commission settings
    const uniqueStakeAmounts = [
      ...new Set(reservations.map((r) => r.stakeAmount)),
    ];
    const stakeSettings = await StakeBonusSettings.find({
      stakeAmount: { $in: uniqueStakeAmounts },
    });
    const commissionMap = {};
    stakeSettings.forEach((setting) => {
      commissionMap[setting.stakeAmount] = setting.systemCommission || 0.2;
    });

    reservations.forEach((r) => {
      const uid = r.userId.toString();
      playCountMap[uid] = (playCountMap[uid] || 0) + 1;
      // Revenue = commission% of stakeAmount * number of cards reserved in this reservation
      const commission = commissionMap[r.stakeAmount] || 0.2;
      const rev = (r.stakeAmount || 0) * (r.cardCount || 1) * commission;
      revenueMap[uid] = (revenueMap[uid] || 0) + rev;
    });

    // Sum up for each agent
    agents.forEach((agent) => {
      let totalGames = 0;
      let totalRevenue = 0;
      const referredUsers = users.filter(
        (u) => u.invitedBy === agent.referralCode
      );
      referredUsers.forEach((u) => {
        const playCount = playCountMap[u._id.toString()] || 0;
        const revenue = revenueMap[u._id.toString()] || 0;
        totalGames += playCount;
        totalRevenue += revenue;
      });
      const totalPaid = paymentsMap[agent._id.toString()] || 0;
      agentMap[agent.referralCode].totalGames = totalGames;
      agentMap[agent.referralCode].totalRevenue = totalRevenue;
      agentMap[agent.referralCode].remainingBalance = totalRevenue - totalPaid;
      agentMap[agent.referralCode].referredUsers = referredUsers;
    });

    res.status(200).json({ agents: Object.values(agentMap) });
  } catch (error) {
    logger.error("userController: error in getAllAgentsWithStats", { err: error });
    res.status(500).json({ message: "Failed to get agent stats" });
  }
};

// Admin: Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const allowedRoles = ["user", "agent", "admin"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.role = role;
    await user.save();
    res.status(200).json({ message: "Role updated successfully", user });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating role", error: error.message });
  }
};
