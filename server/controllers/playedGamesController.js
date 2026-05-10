const PlayedGame = require("../models/playedGames");
const BingoGame = require("../models/bingoGameModel");
const logger = require("../utils/winstonLogger");
// Get all played games
exports.getAllPlayedGames = async (req, res) => {
  try {
    const games = await PlayedGame.find();
    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get played games by gameRoomId
exports.getPlayedGamesByRoomId = async (req, res) => {
  try {
    const { gameRoomId } = req.params;
    const games = await PlayedGame.find({ gameRoomId });

    if (games.length === 0) {
      return res.status(404).json({ message: "No games found for this room" });
    }

    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
exports.createGame = async (req, res) => {
  try {
    const { cutAmount, betAmount, winAmount, cartela, houseProfit, roomId } =
      req.body;

    if (!cutAmount || !betAmount || !winAmount || !cartela || !userId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (cartela.length === 0) {
      return res.status(400).json({ message: "Empty cartela " });
    }
    if (betAmount < 5) {
      return res.status(400).json({ message: "pick higher number" });
    }
    const lastGameId = await BingoGame.findOne({ userId: userId })
      .sort({ gameId: -1 })
      .limit(1);

    let gameId = 0; // Add this line before using gameId.

    if (lastGameId) {
      gameId = lastGameId.gameId + 1;
    }

    const bingoGame = new BingoGame({
      cutAmount,
      betAmount: betAmount * cartela.length,
      winAmount,
      houseProfit,
      cartela,
      gameId,
      roomId,
    });

    const newBingoGame = await bingoGame.save();

    res.status(201).json(newBingoGame);
  } catch (err) {
    logger.error("playedGamesController: error creating game", { err });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get played games with optional filters (by roomId, by date, or both)
exports.getPlayedGames = async (req, res) => {
  try {
    const { gameRoomId, date } = req.query;
    let query = {};

    if (gameRoomId) {
      query.gameRoomId = gameRoomId;
    }

    if (date) {
      // Filter by date (ignoring time, matching only the same day)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const games = await PlayedGame.find(query);

    if (games.length === 0) {
      return res
        .status(404)
        .json({ message: "No games found for the given filters" });
    }

    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get all bingo games
exports.getAllBingoGames = async (req, res) => {
  try {
    const games = await BingoGame.find();
    res.status(200).json(games);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch games", details: error.message });
  }
};

// Get bingo games by roomId
exports.getBingoGamesByRoomId = async (req, res) => {
  try {
    const { roomId } = req.params;
    const games = await BingoGame.find({ roomId });

    if (games.length === 0) {
      return res
        .status(404)
        .json({ message: "No games found for this roomId" });
    }
    let gameId = 9;
    res.status(200).json({ gameId, lastGame: games });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch games", details: error.message });
  }
};
