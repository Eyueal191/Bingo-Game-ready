const Reservation = require("../models/reservationModel");
const User = require("../models/userModels");
const GameRoom = require("../models/gameRoom");

const leaderboardService = require("../services/leaderboardService");
const { getAppSettings } = require("../services/appSettingsService");

const GAME_ROOM_COLLECTION =
  (GameRoom.collection && GameRoom.collection.collectionName) || "gamerooms";

exports.getMyGameHistory = async (req, res) => {
  try {
    const telegramId = req.params.userId;

    // Verify user exists
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Fetch reservations with completed status, populate GameRoom
    const reservations = await Reservation.find({
      userId: user._id,
      status: "completed",
    })
      .populate({
        path: "roomId",
        select:
          "stakeAmount winners status _id winAmount drawnNumbers completedAt",
      })
      .sort({ createdAt: -1 }) // Newest first
      .limit(10); // Limit to 10 for performance

    // Format game history
    const gameHistory = reservations
      .map((reservation) => {
        const gameRoom = reservation.roomId;
        if (!gameRoom) {
          return null; // Skip if GameRoom is missing
        }

        const isWinner = gameRoom.winners.some(
          (winner) => winner.userId.toString() === user._id.toString()
        );
        const winnerData = gameRoom.winners.find(
          (winner) => winner.userId.toString() === user._id.toString()
        );

        return {
          name: user.fullName,
          game: gameRoom._id.toString().slice(-6),
          amount: gameRoom.stakeAmount,
          status: isWinner ? "won" : "lost",
          winAmount: isWinner ? winnerData.prize : 0,
        };
      })
      .filter((entry) => entry !== null);

    res.json({ success: true, games: gameHistory });
  } catch (error) {
    console.error("Error fetching game history:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch game history" });
  }
};

// Fetch game history for the authenticated user
exports.getGameHistory = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User not authenticated" });
    }

    // Pagination parameters from query (e.g., /api/game-history?page=1&limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch reservations for the user with completed status
    const reservations = await Reservation.find({
      userId,
      status: "completed",
    })
      .populate({
        path: "roomId",
        select: "stakeAmount winAmount winners drawnNumbers completedAt",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalGames = await Reservation.countDocuments({
      userId,
      status: "completed",
    });
    const totalPages = Math.ceil(totalGames / limit);

    // Transform the data to match the frontend's expected format
    const gameHistory = reservations
      .map((reservation) => {
        const gameRoom = reservation.roomId;
        if (!gameRoom) return null;

        const isWinner = gameRoom.winners.some(
          (winner) => winner.userId.toString() === userId.toString()
        );
        const winnerData = gameRoom.winners.find(
          (winner) => winner.userId.toString() === userId.toString()
        );

        return {
          id: reservation._id.toString(),
          stake: `${gameRoom.stakeAmount}`,
          gameWinning: isWinner ? `${winnerData.prize}` : "0",
          winnerCards: gameRoom.winners.map((winner) => winner.cardId),
          yourCards: reservation.cardIds,
          date: gameRoom.completedAt
            ? gameRoom.completedAt.toISOString()
            : new Date().toISOString(),
          result: isWinner ? "Won" : "Lost",
        };
      })
      .filter((entry) => entry !== null);

    // Send the response with pagination metadata
    res.status(200).json({
      gameHistory,
      currentPage: page,
      totalPages,
      totalGames,
    });
  } catch (error) {
    console.error("Error fetching game history:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching game history" });
  }
};


exports.getLeaderboard = async (req, res) => {
  try {
    const settings = await getAppSettings();

    if (!settings.leaderboard?.enabled) {
      return res.status(200).json({
        summary: {},
        meta: {},
        stakeOptions: [],
        leaderboard: [],
        currentUser: null,
      });
    }

    const includeBots = settings.leaderboard?.includeRobots || false;
    console.log(`[DEBUG] getLeaderboard: includeBots computed as ${includeBots} (settings.leaderboard.includeRobots=${settings.leaderboard?.includeRobots})`);

    const stakeAmount = leaderboardService.parseStakeAmount(req.query.stakeAmount);
    const limit = leaderboardService.clampLimit(req.query.limit, 10, 100);
    const { start, end } = leaderboardService.resolveDateRange(
      req.query.startDate,
      req.query.endDate
    );

    const core = await leaderboardService.buildLeaderboardCore({
      stakeAmount,
      startDate: start,
      endDate: end,
      includeCurrentUserId: req.user?._id,
      includeBots,
    });

    const stakeOptions = await leaderboardService.collectStakeOptions();

    const meta = {
      generatedAt: new Date().toISOString(),
      filters: {
        stakeAmount,
        limit,
      },
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        label: leaderboardService.formatPeriodLabel(start, end),
        timeRemaining: leaderboardService.buildTimeRemaining(end),
      },
    };

    const leaderboard = core.players
      .slice(0, limit)
      .map((player) => leaderboardService.sanitizePlayerForUser(player));
    const currentUser = core.currentUser
      ? leaderboardService.sanitizePlayerForUser(core.currentUser)
      : null;

    res.status(200).json({
      summary: core.summary,
      meta,
      stakeOptions,
      leaderboard,
      currentUser,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching leaderboard" });
  }
};

exports.getAdminLeaderboard = async (req, res) => {
  try {
    const stakeAmount = leaderboardService.parseStakeAmount(req.query.stakeAmount);
    const includeBots = req.query.includeBots === "true";
    const pageSize = leaderboardService.clampLimit(
      req.query.pageSize ?? req.query.limit,
      25,
      500
    );
    const requestedPage = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const allowedSortFields = new Set([
      "rank",
      "fullName",
      "gamesPlayed",
      "winCount",
      "totalPrize",
      "totalStake",
      "amountLost",
      "netEarnings",
      "biggestWin",
      "averagePrize",
      "lastWinAt",
    ]);
    const sortByRaw = req.query.sortBy;
    const sortBy = allowedSortFields.has(sortByRaw) ? sortByRaw : "totalPrize";
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
    const searchTerm = (req.query.search || "").trim().toLowerCase();

    const defaultStart = new Date();
    defaultStart.setHours(0, 0, 0, 0);
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setHours(23, 59, 59, 999);
    const { start, end } = leaderboardService.resolveDateRange(
      req.query.startDate,
      req.query.endDate,
      { defaultStart, defaultEnd }
    );

    const core = await leaderboardService.buildLeaderboardCore({
      stakeAmount,
      startDate: start,
      endDate: end,
      includeCurrentUserId: null,
      includeBots,
    });

    const stakeOptions = await leaderboardService.collectStakeOptions();

    const decoratedPlayers = core.players.map((player) => ({
      ...player,
      maskedPhone: leaderboardService.maskPhone(player.phone),
      displayName: leaderboardService.formatDisplayName(player.fullName, player.phone),
    }));

    const filteredPlayers = searchTerm
      ? decoratedPlayers.filter((player) => {
        const tokens = [
          player.fullName,
          player.displayName,
          player.phone,
          player.maskedPhone,
          player.telegramId,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        return tokens.some((value) => value.includes(searchTerm));
      })
      : decoratedPlayers;

    const extractorMap = {
      rank: (player) => player.rank ?? Number.MAX_SAFE_INTEGER,
      fullName: (player) => (player.fullName || "").toLowerCase(),
      gamesPlayed: (player) => Number(player.gamesPlayed || 0),
      winCount: (player) => Number(player.winCount || 0),
      totalPrize: (player) => Number(player.totalPrize || 0),
      totalStake: (player) => Number(player.totalStake || 0),
      amountLost: (player) => Number(player.amountLost || 0),
      netEarnings: (player) => Number(player.netEarnings || 0),
      biggestWin: (player) => Number(player.biggestWin || 0),
      averagePrize: (player) => Number(player.averagePrize || 0),
      lastWinAt: (player) =>
        player.lastWinAt ? new Date(player.lastWinAt).getTime() : 0,
    };

    const sortExtractor = extractorMap[sortBy] || extractorMap.totalPrize;
    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
      const valueA = sortExtractor(a);
      const valueB = sortExtractor(b);

      if (typeof valueA === "string" || typeof valueB === "string") {
        const result = String(valueA).localeCompare(String(valueB));
        return sortOrder === "asc" ? result : -result;
      }

      if (valueA === valueB) return 0;
      return sortOrder === "asc"
        ? valueA - valueB
        : valueB - valueA;
    });

    const totalRecords = sortedPlayers.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const currentPage = Math.min(requestedPage, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedPlayers = sortedPlayers.slice(
      startIndex,
      startIndex + pageSize
    );

    const meta = {
      generatedAt: new Date().toISOString(),
      filters: {
        stakeAmount,
        includeBots,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        label: leaderboardService.formatPeriodLabel(start, end),
        timeRemaining: leaderboardService.buildTimeRemaining(end),
      },
      pagination: {
        page: currentPage,
        pageSize,
        totalPages,
        totalRecords,
      },
      sort: {
        sortBy,
        sortOrder,
      },
      search: searchTerm || null,
    };

    res.status(200).json({
      summary: core.summary,
      meta,
      stakeOptions,
      systemUserIds: core.systemUserIds,
      leaderboard: paginatedPlayers,
      total: totalRecords,
    });
  } catch (error) {
    console.error("Error fetching admin leaderboard:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching admin leaderboard" });
  }
};
