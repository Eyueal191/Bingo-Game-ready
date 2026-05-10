const Game = require("../models/game");
const GameParticipant = require("../models/gameParticipant");
const User = require("../models/userModels");
const logger = require("../utils/winstonLogger");

const getLeaderboard = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const total = await Game.countDocuments({ status: "completed" });
    const games = await Game.find({ status: "completed" })
      .populate({
        path: "participants",
        // ranks now can include any integer >=1; keep only winners
        match: { rank: { $exists: true, $ne: [] } },
        populate: { path: "user_id", select: "id fullName" },
      })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const gameGroups = {};
    games.forEach((game) => {
      const key = `${game.bet_amount}_${game.max_players}`;
      if (!gameGroups[key]) {
        gameGroups[key] = [];
      }
      gameGroups[key].push(game);
    });

    const leaderboard = Object.entries(gameGroups).map(([key, groupGames]) => {
      const [bet_amount, max_players] = key.split("_").map(Number);
      const latestGames = groupGames.slice(0, 2);

      // Build winners based on per-room prize_tiers
      return {
        bet_amount,
        max_players,
        games: latestGames.map((game) => {
          // Normalize tiers; if empty, no tier-based winners fallback
          const tiers =
            Array.isArray(game.prize_tiers) && game.prize_tiers.length
              ? game.prize_tiers.slice().sort((a, b) => a.rank - b.rank)
              : [];

          const prizeAmount = game.prize_amount || 0;

          // Participants.rank is an array; flatten to pairs of (user, rank)
          const winnerEntries = (game.participants || []).flatMap((p) =>
            (Array.isArray(p.rank) ? p.rank : [])
              .filter((r) => Number.isInteger(r) && r >= 1)
              .map((r) => ({ user: p.user_id, rank: r }))
          );

          const winners = winnerEntries
            .sort((a, b) => a.rank - b.rank)
            .map((we) => {
              const tier = tiers.find((t) => t.rank === we.rank);
              const percent = tier?.percent ?? 0;
              return {
                user_id: we.user?._id || we.user,
                full_name: we.user?.fullName,
                rank: we.rank,
                prize: +(prizeAmount * (percent / 100)).toFixed(2),
              };
            });

          return {
            id: game._id,
            created_at: game.created_at ? game.created_at.toISOString() : null,
            prize_amount: prizeAmount,
            winners,
          };
        }),
      };
    });

    res.json({
      data: leaderboard,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`Error fetching leaderboard: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};

module.exports = { getLeaderboard };
