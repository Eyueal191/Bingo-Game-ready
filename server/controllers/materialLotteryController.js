const MaterialLottery = require("../models/materialLottery");
const MaterialPayout = require("../models/materialPayout");
const User = require("../models/userModels");
const logger = require("../utils/winstonLogger");
const fs = require("fs");
const path = require("path");

// Safely delete a file if it exists; supports absolute or relative /uploads paths
const safeUnlink = (p) => {
  if (!p || typeof p !== "string") return;
  try {
    const candidates = [];
    if (path.isAbsolute(p)) {
      candidates.push(p);
    } else {
      const rel = p.replace(/^\.\//, "").replace(/^\//, "");
      candidates.push(path.resolve(__dirname, "..", rel));
      if (rel.startsWith("uploads/")) {
        candidates.push(path.resolve(__dirname, "..", rel));
      } else if (rel.startsWith("/uploads/")) {
        candidates.push(path.resolve(__dirname, "..", rel.slice(1)));
      }
    }
    for (const fp of candidates) {
      if (fs.existsSync(fp)) {
        fs.unlinkSync(fp);
        break;
      }
    }
  } catch (e) {
    logger.warn(`safeUnlink failed for ${p}: ${e.message}`);
  }
};

const getMaterialLotteryDashboard = async (req, res) => {
  try {
    const { from, to } = req.query || {};
    const dateFilter = {};
    if (from) {
      const d = new Date(from);
      if (isNaN(d.getTime()))
        return res.status(400).json({ error: "Invalid from date" });
      dateFilter.$gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (isNaN(d.getTime()))
        return res.status(400).json({ error: "Invalid to date" });
      d.setHours(23, 59, 59, 999);
      dateFilter.$lte = d;
    }

    // Get dashboard statistics
    const [
      totalGames,
      activeGames,
      completedGames,
      totalParticipants,
      totalBetAmount,
      monetaryPayouts,
      materialRewards,
      pendingMaterialPayouts,
      totalRevenue,
    ] = await Promise.all([
      // Total games created
      MaterialLottery.countDocuments(
        Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}
      ),

      // Active games (pending + in_progress)
      MaterialLottery.countDocuments({
        status: { $in: ["pending", "in_progress"] },
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      }),

      // Completed games
      MaterialLottery.countDocuments({
        status: "completed",
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      }),

      // Total participants
      MaterialLottery.aggregate([
        ...(Object.keys(dateFilter).length
          ? [{ $match: { createdAt: dateFilter } }]
          : []),
        { $unwind: "$participants" },
        { $count: "totalParticipants" },
      ]).then((result) => result[0]?.totalParticipants || 0),

      // Total bet amount collected
      MaterialLottery.aggregate([
        ...(Object.keys(dateFilter).length
          ? [{ $match: { createdAt: dateFilter } }]
          : []),
        {
          $group: {
            _id: null,
            totalBetAmount: {
              $sum: { $multiply: ["$bet_amount", { $size: "$participants" }] },
            },
          },
        },
      ]).then((result) => result[0]?.totalBetAmount || 0),

      // Total monetary payouts
      MaterialPayout.aggregate([
        {
          $match: {
            type: "monetary",
            status: "paid",
            ...(Object.keys(dateFilter).length
              ? { createdAt: dateFilter }
              : {}),
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).then((result) => result[0]?.total || 0),

      // Total material rewards distributed
      MaterialPayout.countDocuments({
        type: "material",
        status: "paid",
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      }),

      // Pending material payouts
      MaterialPayout.countDocuments({
        type: "material",
        status: "pending",
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      }),

      // Total revenue (bet amount - monetary payouts)
      Promise.all([
        MaterialLottery.aggregate([
          ...(Object.keys(dateFilter).length
            ? [{ $match: { createdAt: dateFilter } }]
            : []),
          {
            $group: {
              _id: null,
              totalBetAmount: {
                $sum: {
                  $multiply: ["$bet_amount", { $size: "$participants" }],
                },
              },
            },
          },
        ]).then((result) => result[0]?.totalBetAmount || 0),
        MaterialPayout.aggregate([
          {
            $match: {
              type: "monetary",
              status: "paid",
              ...(Object.keys(dateFilter).length
                ? { createdAt: dateFilter }
                : {}),
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]).then((result) => result[0]?.total || 0),
      ]).then(([betAmount, payouts]) => betAmount - payouts),
    ]);

    const dashboardData = {
      totalGames,
      activeGames,
      completedGames,
      totalParticipants,
      totalBetAmount,
      monetaryPayouts,
      materialRewards,
      pendingMaterialPayouts,
      totalRevenue,
      // Additional calculated metrics
      averageBetPerGame: totalGames > 0 ? totalBetAmount / totalGames : 0,
      averageParticipantsPerGame:
        totalGames > 0 ? totalParticipants / totalGames : 0,
      payoutRatio:
        totalBetAmount > 0 ? (monetaryPayouts / totalBetAmount) * 100 : 0,
    };

    logger.info(
      `Material Lottery Dashboard Data: ${JSON.stringify(dashboardData)}`
    );
    res.status(200).json(dashboardData);
  } catch (error) {
    logger.error("Error fetching material lottery dashboard:", error);
    res.status(500).json({ message: "Server error" });
  }
};
const createGame = async (req, res) => {
  try {
    const { bet_amount, max_players, rewards: rewardsString } = req.body;

    // Validate input
    if (!bet_amount || !max_players || !rewardsString) {
      return res.status(400).json({
        message: "Missing required fields: bet_amount, max_players, or rewards",
      });
    }

    // Parse rewards
    let rewards;
    try {
      rewards = JSON.parse(rewardsString);
    } catch (parseError) {
      logger.error("Error parsing rewards:", parseError);
      return res.status(400).json({
        message: "Invalid rewards format. Must be a valid JSON string.",
      });
    }

    if (!Array.isArray(rewards) || rewards.length === 0) {
      return res
        .status(400)
        .json({ message: "Rewards must be a non-empty array" });
    }

    // Map files to rewards based on rank
    for (const reward of rewards) {
      if (!reward.rank || !reward.type || !reward.description) {
        return res.status(400).json({
          message: `Invalid reward data at rank ${reward.rank || "unknown"}`,
        });
      }
      if (
        reward.type === "monetary" &&
        (!reward.amount || reward.amount <= 0)
      ) {
        return res.status(400).json({
          message: `Monetary reward at rank ${reward.rank} must have a valid amount`,
        });
      }
      if (
        reward.type === "material" &&
        req.files &&
        req.files[`reward_photos_rank_${reward.rank}`]
      ) {
        reward.photo = req.files[`reward_photos_rank_${reward.rank}`][0].path;
      }
    }

    const newGame = new MaterialLottery({
      bet_amount: parseFloat(bet_amount),
      max_players: parseInt(max_players),
      rewards,
      gameType: "material_lottery",
    });

    await newGame.save();
    res.status(201).json({
      message: "Material lottery created successfully",
      game: newGame,
    });
  } catch (error) {
    if (error instanceof multer.MulterError) {
      logger.error("Multer error:", error.message, error.stack);
      return res
        .status(400)
        .json({ message: `File upload error: ${error.message}` });
    }
    logger.error(
      "Error creating material lottery:",
      error.message,
      error.stack
    );
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

const getGames = async (req, res) => {
  try {
    const { from, to } = req.query || {};
    const dateFilter = {};
    if (from) {
      const d = new Date(from);
      if (isNaN(d.getTime()))
        return res.status(400).json({ error: "Invalid from date" });
      dateFilter.$gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (isNaN(d.getTime()))
        return res.status(400).json({ error: "Invalid to date" });
      d.setHours(23, 59, 59, 999);
      dateFilter.$lte = d;
    }

    const query = {
      status: { $in: ["pending", "in_progress"] },
      gameType: "material_lottery",
    };

    if (Object.keys(dateFilter).length) {
      query.createdAt = dateFilter;
    }

    const games = await MaterialLottery.find(query).populate({
      path: "participants.user_id",
      select: "fullName",
    });
    // Ensure clients receive round field
    res
      .status(200)
      .json(games.map((g) => ({ ...g.toObject(), round: g.round || 1 })));
  } catch (error) {
    logger.error("Error fetching material lotteries:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getGameHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      startDate,
      endDate,
      status,
      sortField,
      sortOrder,
    } = req.query;

    const escapeRegex = (str = "") =>
      str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const query = { gameType: "material_lottery" };

    // Search functionality (avoid $regex on ObjectId or numeric fields)
    if (search) {
      const safe = escapeRegex(search);
      const or = [];
      // If search looks like an ObjectId, match _id exactly
      if (/^[0-9a-fA-F]{24}$/.test(search)) {
        or.push({ _id: search });
      }
      // If search is numeric, match numeric fields exactly
      const asNumber = Number(search);
      if (!Number.isNaN(asNumber)) {
        or.push({ bet_amount: asNumber });
        or.push({ max_players: asNumber });
      } else {
        // For non-numeric text searches, match textual fields
        or.push({ status: { $regex: safe, $options: "i" } });
      }
      query.$or = or;
    }

    // Date filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        if (!isNaN(d.getTime())) d.setHours(23, 59, 59, 999);
        query.createdAt.$lte = d;
      }
    }

    // Status filtering
    if (status && status !== "all") {
      query.status = status;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1)
      return res.status(400).json({ message: "Invalid page number" });
    if (isNaN(limitNum) || limitNum < 1)
      return res.status(400).json({ message: "Invalid limit value" });

    const skip = (pageNum - 1) * limitNum;
    const totalGames = await MaterialLottery.countDocuments(query);

    // Sorting
    const allowedSort = new Set([
      "createdAt",
      "bet_amount",
      "max_players",
      "status",
      "completed_at",
    ]);
    const dir = String(sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sort =
      sortField && allowedSort.has(sortField)
        ? { [sortField]: dir }
        : { createdAt: -1 };

    const games = await MaterialLottery.find(query)
      .populate({
        path: "participants.user_id",
        select: "fullName",
      })
      .populate({
        path: "winners.user_id",
        select: "fullName",
      })
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(totalGames / limitNum);

    res.status(200).json({
      success: true,
      count: games.length,
      totalGames,
      totalPages,
      currentPage: pageNum,
      games: games.map((g) => ({ ...g.toObject(), round: g.round || 1 })),
    });
  } catch (error) {
    logger.error("Error fetching material lottery history:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const {
      bet_amount,
      max_players,
      status,
      rewards: rewardsString,
    } = req.body;

    const game = await MaterialLottery.findById(gameId);
    if (!game) return res.status(404).json({ message: "Game not found" });

    if (bet_amount !== undefined) game.bet_amount = parseFloat(bet_amount);
    if (max_players !== undefined) game.max_players = parseInt(max_players, 10);
    if (status && ["pending", "in_progress", "completed"].includes(status)) {
      game.status = status;
    }

    // Update rewards if provided; support image replacement via multer fields
    if (rewardsString) {
      let newRewards = [];
      try {
        newRewards = JSON.parse(rewardsString);
        if (!Array.isArray(newRewards))
          throw new Error("rewards must be array");
      } catch (e) {
        return res.status(400).json({ message: "Invalid rewards JSON" });
      }

      // Map files by rank field names reward_photos_rank_{rank}
      const files = req.files || {};
      const mapped = newRewards.map((r) => {
        const rank = parseInt(r.rank, 10);
        const base = {
          rank,
          type: r.type,
          description: r.description,
          amount: r.type === "monetary" ? Number(r.amount || 0) : 0,
        };
        const fieldName = `reward_photos_rank_${rank}`;
        if (r.type === "material" && files[fieldName] && files[fieldName][0]) {
          base.photo = files[fieldName][0].path; // store server path, frontend should transform to URL
        } else if (r.type === "material" && r.photo) {
          // allow keeping existing photo if provided
          base.photo = r.photo;
        }
        return base;
      });

      // Determine old photos to delete
      const oldByRank = new Map((game.rewards || []).map((o) => [o.rank, o]));
      for (const [rank, oldR] of oldByRank.entries()) {
        if (!oldR || !oldR.photo) continue;
        const newR = mapped.find((x) => Number(x.rank) === Number(rank));
        const shouldDelete =
          !newR ||
          newR.type !== "material" ||
          (newR.type === "material" && newR.photo && newR.photo !== oldR.photo);
        if (shouldDelete) safeUnlink(oldR.photo);
      }

      game.rewards = mapped;
    }

    await game.save();
    res.status(200).json({ message: "Game updated successfully", game });
  } catch (error) {
    logger.error("Error updating material lottery:", error);
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

const resetGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = await MaterialLottery.findById(gameId);
    if (!game) return res.status(404).json({ message: "Game not found" });
    game.participants = [];
    game.winners = [];
    game.status = "pending";
    game.completed_at = undefined;
    // Increment logical round on reset; initialize if missing
    game.round = Number(game.round || 1) + 1;
    await game.save();
    res.status(200).json({ message: "Game reset successfully", game });
  } catch (error) {
    logger.error("Error resetting material lottery:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = await MaterialLottery.findById(gameId);
    if (!game) return res.status(404).json({ message: "Game not found" });
    // delete any material reward images on disk
    for (const r of game.rewards || []) {
      if (r && r.type === "material" && r.photo) safeUnlink(r.photo);
    }
    await MaterialLottery.deleteOne({ _id: gameId });
    res.status(200).json({ message: "Game deleted successfully" });
  } catch (error) {
    logger.error("Error deleting material lottery:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getPayouts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      startDate,
      endDate,
      status,
      sortField,
      sortOrder,
    } = req.query;

    const escapeRegex = (str = "") =>
      str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const query = {};

    // Search over payout id, user fullName or game id
    if (search) {
      const safe = escapeRegex(search);
      const or = [];
      // If search looks like an ObjectId (24 hex chars), match _id or game_id exactly
      if (/^[0-9a-fA-F]{24}$/.test(search)) {
        or.push({ _id: search });
        or.push({ game_id: search });
      } else {
        // game_id is an ObjectId in the schema — don't use $regex/$options on it
        // Instead, search textual fields and numeric amount if the search looks numeric
        or.push({ description: { $regex: safe, $options: "i" } });
        // If the search is numeric, also match exact amounts
        const asNumber = Number(search);
        if (!Number.isNaN(asNumber)) {
          or.push({ amount: asNumber });
        }
      }
      // Also search users by fullName and include matching user ids
      const matchingUsers = await User.find({
        fullName: { $regex: safe, $options: "i" },
      })
        .select("_id")
        .lean();
      if (matchingUsers && matchingUsers.length) {
        or.push({ user_id: { $in: matchingUsers.map((u) => u._id) } });
      }
      query.$or = or;
    }

    // Date filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        if (!isNaN(d.getTime())) d.setHours(23, 59, 59, 999);
        query.createdAt.$lte = d;
      }
    }

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1)
      return res.status(400).json({ message: "Invalid page number" });
    if (isNaN(limitNum) || limitNum < 1)
      return res.status(400).json({ message: "Invalid limit value" });

    const skip = (pageNum - 1) * limitNum;
    const totalPayouts = await MaterialPayout.countDocuments(query);

    // Sorting
    const allowedSort = new Set([
      "createdAt",
      "amount",
      "rank",
      "status",
      "type",
    ]);
    const dir = String(sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sort =
      sortField && allowedSort.has(sortField)
        ? { [sortField]: dir }
        : { createdAt: -1 };

    const payouts = await MaterialPayout.find(query)
      .populate("user_id", "fullName")
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({ success: true, payouts, totalPayouts });
  } catch (error) {
    logger.error("Error fetching material payouts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updatePayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { status } = req.body;

    if (!status || !["pending", "paid"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const payout = await MaterialPayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({ message: "Payout not found" });
    }

    payout.status = status;
    await payout.save();

    if (payout.type === "monetary" && status === "paid") {
      const user = await User.findById(payout.user_id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.wallet += payout.amount;
      await user.save();
    }

    res.status(200).json({ message: "Payout updated successfully", payout });
  } catch (error) {
    logger.error("Error updating material payout:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createGame,
  getGames,
  getGameHistory,
  updateGame,
  getPayouts,
  updatePayout,
  getMaterialLotteryDashboard,
  resetGame,
  deleteGame,
};