const mongoose = require("mongoose");
const Game = require("../models/game");
const GameParticipant = require("../models/gameParticipant");
const Payout = require("../models/payout");
const User = require("../models/userModels");
const logger = require("../utils/winstonLogger");

const broadcastGameUpdate = (io, gameId, data) => {
  logger.info(
    `Broadcasting gameUpdate to room ${gameId}: ${JSON.stringify(data)}`
  );
  io.to(gameId).emit("gameUpdate", data);
};

// Helpers
const sanitizeTiers = (tiers) => {
  const arr = Array.isArray(tiers) ? tiers : [];
  const cleaned = arr
    .filter((t) => t && Number.isInteger(Number(t.rank)))
    .map((t) => ({ rank: Number(t.rank), percent: Number(t.percent || 0) }))
    .filter((t) => t.rank >= 1 && t.percent >= 0 && t.percent <= 100);
  // unique by rank, keep first occurrence
  const seen = new Set();
  const unique = [];
  for (const t of cleaned) {
    if (!seen.has(t.rank)) {
      unique.push(t);
      seen.add(t.rank);
    }
  }
  // sort by rank
  unique.sort((a, b) => a.rank - b.rank);
  return unique;
};

const computePrizeStructureFromTiers = (prize_amount, tiers) => {
  const first = tiers.find((t) => t.rank === 1)?.percent || 0;
  const second = tiers.find((t) => t.rank === 2)?.percent || 0;
  return {
    first: prize_amount * (first / 100),
    second: prize_amount * (second / 100),
  };
};

const createGameRoom = async (req, res) => {
  try {
    const { bet_amount, max_players, gameType } = req.body;
    let { prize_tiers, system_benefit } = req.body;
    if (
      !bet_amount ||
      !max_players ||
      isNaN(bet_amount) ||
      isNaN(max_players) ||
      max_players < 2
    ) {
      return res
        .status(400)
        .json({ error: "Invalid bet_amount or max_players" });
    }

    system_benefit = Number(system_benefit ?? 0);
    if (system_benefit < 0 || system_benefit > 100) {
      return res.status(400).json({ error: "Invalid system_benefit" });
    }
    let roomTiers = sanitizeTiers(prize_tiers);
    const tiersSum = roomTiers.reduce((s, t) => s + t.percent, 0);
    if (tiersSum + system_benefit > 100 + 1e-8) {
      return res.status(400).json({
        error:
          "Sum of prize tier percents plus system benefit cannot exceed 100%",
      });
    }
    // Default to single-winner 100% if no tiers provided
    if (!roomTiers.length)
      roomTiers = [{ rank: 1, percent: 100 - system_benefit }];

    const totalPool = bet_amount * max_players;
    const prize_amount = totalPool * (1 - system_benefit / 100);

    const game = await Game.create({
      prize_amount,
      bet_amount,
      max_players,
      status: "pending",
      gameType: gameType || "keshkesh",
      system_benefit,
      prize_tiers: roomTiers,
    });

    const roomData = {
      roomId: game._id,
      prize_amount,
      bet_amount,
      max_players,
      status: game.status,
      system_benefit,
      participants: [],
      prize_structure: computePrizeStructureFromTiers(prize_amount, roomTiers),
      prize_tiers: roomTiers.map((t) => ({
        rank: t.rank,
        amount: prize_amount * (t.percent / 100),
      })),
      gameType: game.gameType,
    };

    broadcastGameUpdate(req.app.get("io"), game._id, {
      type: "create",
      game: roomData,
    });

    res.status(201).json({
      _id: game._id,
      prize_amount,
      bet_amount,
      max_players,
      status: game.status,
      created_at: game.created_at?.toISOString() || null,
      system_benefit,
      prize_structure: roomData.prize_structure,
      prize_tiers: roomTiers.map((t) => ({
        rank: t.rank,
        amount: prize_amount * (t.percent / 100),
      })),
      gameType: game.gameType,
    });
  } catch (error) {
    logger.error(`Error creating game room: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

const listGameRooms = async (req, res) => {
  try {
    const { gameType } = req.query;
    const query = {
      status: { $in: ["pending", "in_progress"] },
    };

    if (gameType) {
      if (!["keshkesh"].includes(gameType)) {
        return res.status(400).json({ error: "Invalid gameType" });
      }
      query.gameType = gameType;
    } else {
      query.gameType = "keshkesh";
    }

    const games = await Game.find(query).populate({
      path: "participants",
      populate: { path: "user_id", select: "fullName" },
    });

    const gamesWithPrizeStructure = games.map((game) => {
      // Filter participants to only include those with valid user_id
      const validParticipants =
        game.participants?.filter(
          (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
        ) || [];

      const tierPercents =
        game.prize_tiers && game.prize_tiers.length
          ? [...game.prize_tiers].sort((a, b) => a.rank - b.rank)
          : [];
      return {
        _id: game._id,
        prize_amount: game.prize_amount,
        bet_amount: game.bet_amount,
        max_players: game.max_players,
        status: game.status,
        created_at: game.created_at?.toISOString() || null,
        system_benefit: game.system_benefit || 0,
        participants: validParticipants.map((p) => ({
          user_id: p.user_id._id,
          full_name: p.user_id.fullName,
          numbers: p.numbers,
          paid_status: p.paid_status,
          rank: p.rank,
        })),
        prize_structure: computePrizeStructureFromTiers(
          game.prize_amount,
          tierPercents
        ),
        prize_tiers: tierPercents.map((t) => ({
          rank: t.rank,
          amount: game.prize_amount * (t.percent / 100),
        })),
        gameType: game.gameType,
      };
    });

    res.json(gamesWithPrizeStructure);
  } catch (error) {
    logger.error(`Error listing game rooms: ${error.message}`);
    res.status(500).json({ error: "Failed to list game rooms" });
  }
};

// Admin reset for stuck games
const resetGameRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    // Mark current as completed to unblock
    game.status = "completed";
    await game.save();

    const totalPool = game.bet_amount * game.max_players;
    const prize_amount = totalPool * (1 - (game.system_benefit || 0) / 100);
    const newGame = await Game.create({
      prize_amount,
      bet_amount: game.bet_amount,
      max_players: game.max_players,
      status: "pending",
      gameType: game.gameType,
      system_benefit: game.system_benefit || 0,
      prize_tiers: game.prize_tiers || [],
    });

    // Emit updated rooms list that includes pending and in_progress
    const games = await Game.find({
      status: { $in: ["pending", "in_progress"] },
    }).populate({
      path: "participants",
      populate: { path: "user_id", select: "fullName" },
    });
    const gamesWithPrizeStructure = games.map((g) => ({
      _id: g._id,
      prize_amount: g.prize_amount,
      bet_amount: g.bet_amount,
      max_players: g.max_players,
      status: g.status,
      created_at: g.created_at?.toISOString() || null,
      system_benefit: g.system_benefit || 0,
      participants:
        g.participants?.map((p) => ({
          user_id: p.user_id._id,
          full_name: p.user_id.fullName,
          numbers: p.numbers,
          paid_status: p.paid_status,
          rank: p.rank,
        })) || [],
      prize_structure: computePrizeStructureFromTiers(
        g.prize_amount,
        (g.prize_tiers || []).sort((a, b) => a.rank - b.rank)
      ),
      prize_tiers: (g.prize_tiers || []).map((t) => ({
        rank: t.rank,
        amount: g.prize_amount * (t.percent / 100),
      })),
      gameType: g.gameType,
    }));
    req.app.get("io").emit("keshkesh_rooms", gamesWithPrizeStructure);

    res.json({
      message: "Game reset. Created a new pending room.",
      newRoomId: newGame._id,
    });
  } catch (error) {
    logger.error(`Error resetting game room: ${error.message}`);
    res.status(500).json({ error: "Failed to reset game room" });
  }
};
const updateGameRoom = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      bet_amount,
      max_players,
      status,
      prize_tiers,
      system_benefit,
      gameType,
    } = req.body;
    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    if (game.status === "completed") {
      return res.status(400).json({ error: "Cannot update a completed game" });
    }
    const updates = {};
    if (bet_amount !== undefined) {
      if (isNaN(bet_amount)) {
        return res.status(400).json({ error: "Invalid bet_amount" });
      }
      updates.bet_amount = bet_amount;
      const totalPool = bet_amount * (max_players || game.max_players);
      const sys =
        system_benefit !== undefined
          ? Number(system_benefit)
          : game.system_benefit || 0;
      updates.prize_amount = totalPool * (1 - sys / 100);
    }
    if (max_players !== undefined) {
      if (isNaN(max_players) || max_players < 2) {
        return res.status(400).json({ error: "Invalid max_players" });
      }
      updates.max_players = max_players;
      const totalPool = (bet_amount || game.bet_amount) * max_players;
      const sys =
        system_benefit !== undefined
          ? Number(system_benefit)
          : game.system_benefit || 0;
      updates.prize_amount = totalPool * (1 - sys / 100);
    }
    if (gameType !== undefined) {
      if (!["keshkesh"].includes(gameType)) {
        return res.status(400).json({ error: "Invalid gameType" });
      }
      updates.gameType = gameType;
    }
    if (status !== undefined) {
      if (!["pending", "in_progress", "completed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      updates.status = status;
    }
    if (system_benefit !== undefined) {
      system_benefit = Number(system_benefit);
      if (isNaN(system_benefit) || system_benefit < 0 || system_benefit > 100) {
        return res.status(400).json({ error: "Invalid system_benefit" });
      }
      updates.system_benefit = system_benefit;
      const totalPool =
        (updates.bet_amount || game.bet_amount) *
        (updates.max_players || game.max_players);
      updates.prize_amount = totalPool * (1 - system_benefit / 100);
    }
    if (Array.isArray(prize_tiers)) {
      const roomTiers = sanitizeTiers(prize_tiers);
      const sys = updates.system_benefit ?? game.system_benefit ?? 0;
      const tiersSum = roomTiers.reduce((s, t) => s + t.percent, 0);
      if (tiersSum + sys > 100 + 1e-8) {
        return res.status(400).json({
          error:
            "Sum of prize tier percents plus system benefit cannot exceed 100%",
        });
      }
      updates.prize_tiers = roomTiers;
    }

    await Game.findByIdAndUpdate(id, updates);
    const updatedGame = await Game.findById(id).populate({
      path: "participants",
      populate: { path: "user_id", select: "fullName" },
    });

    const roomData = {
      roomId: updatedGame._id,
      prize_amount: updatedGame.prize_amount,
      bet_amount: updatedGame.bet_amount,
      max_players: updatedGame.max_players,
      status: updatedGame.status,
      participants:
        updatedGame.participants?.map((p) => ({
          user_id: p.user_id._id,
          full_name: p.user_id.fullName,
          numbers: p.numbers,
          paid_status: p.paid_status,
          rank: p.rank,
        })) || [],
      system_benefit: updatedGame.system_benefit || 0,
      prize_structure: computePrizeStructureFromTiers(
        updatedGame.prize_amount,
        (updatedGame.prize_tiers || []).sort((a, b) => a.rank - b.rank)
      ),
      prize_tiers: (updatedGame.prize_tiers || []).map((t) => ({
        rank: t.rank,
        amount: updatedGame.prize_amount * (t.percent / 100),
      })),
      gameType: updatedGame.gameType,
    };

    broadcastGameUpdate(req.app.get("io"), id, {
      type: "update",
      game: roomData,
    });

    res.json({
      _id: updatedGame._id,
      prize_amount: updatedGame.prize_amount,
      bet_amount: updatedGame.bet_amount,
      max_players: updatedGame.max_players,
      status: updatedGame.status,
      created_at: updatedGame.created_at?.toISOString() || null,
      participants: roomData.participants,
      prize_structure: roomData.prize_structure,
      prize_tiers: roomData.prize_tiers,
      system_benefit: updatedGame.system_benefit || 0,
      gameType: updatedGame.gameType,
    });
  } catch (error) {
    logger.error(`Error updating game room: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
};

const listGameHistory = async (req, res) => {
  try {
    // Support optional query params for filtering
    // status: 'completed' | 'pending' | 'in_progress' | 'all'
    // from/to: ISO date or yyyy-mm-dd; inclusive end-of-day for 'to'
    const {
      status = "completed",
      from,
      to,
      fromDate,
      toDate,
      bet, // optional equality filter on bet_amount
      paged,
      page: pageStr,
      pageSize: pageSizeStr,
      sortField,
      sortOrder,
      gameType,
    } = req.query || {};

    const query = {};

    if (gameType) {
      if (!["keshkesh"].includes(gameType)) {
        return res.status(400).json({ error: "Invalid gameType filter" });
      }
      query.gameType = gameType;
    } else {
      query.gameType = "keshkesh";
    }

    // Status filter: default to completed only; allow 'all' to include any
    const statusVal = (status || "").toString().toLowerCase();
    if (statusVal && statusVal !== "all" && statusVal !== "any") {
      // Only allow known statuses
      const allowed = ["pending", "in_progress", "completed"];
      if (!allowed.includes(statusVal)) {
        return res.status(400).json({ error: "Invalid status filter" });
      }
      query.status = statusVal;
    }

    // Date range filter on created_at
    const startRaw = from || fromDate;
    const endRaw = to || toDate;
    if (startRaw || endRaw) {
      query.created_at = {};
      if (startRaw) {
        const start = new Date(startRaw);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ error: "Invalid from date" });
        }
        query.created_at.$gte = start;
      }
      if (endRaw) {
        const end = new Date(endRaw);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ error: "Invalid to date" });
        }
        // Inclusive end-of-day
        end.setHours(23, 59, 59, 999);
        query.created_at.$lte = end;
      }
    }

    if (bet !== undefined && bet !== null && bet !== "" && bet !== "all") {
      const betNum = Number(bet);
      if (!Number.isFinite(betNum)) {
        return res.status(400).json({ error: "Invalid bet filter" });
      }
      query.bet_amount = betNum;
    }

    // Pagination & sorting (optional)
    const isPaged = String(paged).toLowerCase() === "true";
    const page = Math.max(parseInt(pageStr || "0", 10) || 0, 0);
    const pageSize = Math.min(
      Math.max(parseInt(pageSizeStr || "10", 10) || 10, 1),
      100
    );
    const skip = page * pageSize;
    const sort = {};
    if (sortField) {
      const dir = (sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
      // allow only known fields for sorting to avoid injection
      const allowedSort = new Set([
        "created_at",
        "bet_amount",
        "prize_amount",
        "status",
      ]);
      sort[allowedSort.has(sortField) ? sortField : "created_at"] = dir;
    } else {
      sort.created_at = -1;
    }

    const total = isPaged ? await Game.countDocuments(query) : undefined;
    const q = Game.find(query)
      .sort(sort)
      .skip(isPaged ? skip : 0)
      .limit(isPaged ? pageSize : 0)
      .populate({
        path: "participants",
        populate: { path: "user_id", select: "fullName" },
      });
    const games = await q;
    const gameHistory = games.map((game) => {
      // Filter participants to only include those with valid user_id
      const validParticipants =
        game.participants?.filter(
          (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
        ) || [];

      const tiers = (game.prize_tiers || []).sort((a, b) => a.rank - b.rank);
      const winners = validParticipants
        .filter((p) => Array.isArray(p.rank) && p.rank.length)
        .flatMap((p) =>
          p.rank.map((r) => ({
            user_id: p.user_id._id,
            full_name: p.user_id.fullName,
            rank: r,
            numbers: p.numbers,
            prize:
              game.prize_amount *
              ((tiers.find((t) => t.rank === r)?.percent || 0) / 100),
          }))
        )
        .sort((a, b) => a.rank - b.rank);

      return {
        _id: game._id,
        prize_amount: game.prize_amount,
        bet_amount: game.bet_amount,
        max_players: game.max_players,
        status: game.status,
        created_at: game.created_at?.toISOString() || null,
        system_benefit: game.system_benefit || 0,
        participants: validParticipants.map((p) => ({
          user_id: p.user_id._id,
          full_name: p.user_id.fullName,
          numbers: p.numbers,
          paid_status: p.paid_status,
          rank: p.rank,
        })),
        winners,
        prize_structure: computePrizeStructureFromTiers(
          game.prize_amount,
          tiers
        ),
        system_benefit: game.system_benefit || 0,
        gameType: game.gameType,
      };
    });

    if (isPaged) {
      return res.json({ rows: gameHistory, rowCount: total || 0 });
    }
    res.json(gameHistory);
  } catch (error) {
    logger.error(`Error listing game history: ${error.message}`);
    res.status(500).json({ error: "Failed to list game history" });
  }
};

const fetchGameRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const game = await Game.findById(id).populate({
      path: "participants",
      populate: { path: "user_id", select: "fullName" },
    });
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    // Filter participants to only include those with valid user_id
    const validParticipants =
      game.participants?.filter(
        (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
      ) || [];

    res.json({
      _id: game._id,
      prize_amount: game.prize_amount,
      bet_amount: game.bet_amount,
      max_players: game.max_players,
      status: game.status,
      created_at: game.created_at?.toISOString() || null,
      system_benefit: game.system_benefit || 0,
      participants: validParticipants.map((p) => ({
        user_id: p.user_id._id,
        full_name: p.user_id.fullName,
        numbers: p.numbers,
        paid_status: p.paid_status,
        rank: p.rank,
      })),
      prize_structure: computePrizeStructureFromTiers(
        game.prize_amount,
        (game.prize_tiers || []).sort((a, b) => a.rank - b.rank)
      ),
      prize_tiers: (game.prize_tiers || []).map((t) => ({
        rank: t.rank,
        amount: game.prize_amount * (t.percent / 100),
      })),
      gameType: game.gameType,
    });
  } catch (error) {
    logger.error(`Error fetching game room: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
};
// Delete a pending game room
const deleteGameRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    if (game.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Only pending rooms can be deleted" });
    }
    // Remove participants first to avoid orphans
    await GameParticipant.deleteMany({ game_id: id });
    await Game.findByIdAndDelete(id);
    res.json({ message: "Room deleted" });
  } catch (error) {
    logger.error(`Error deleting game room: ${error.message}`);
    res.status(500).json({ error: "Failed to delete game room" });
  }
};
module.exports = {
  createGameRoom,
  listGameRooms,
  updateGameRoom,
  listGameHistory,
  fetchGameRoom,
  resetGameRoom,
  deleteGameRoom,
};
