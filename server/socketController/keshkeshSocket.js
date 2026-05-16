const mongoose = require("mongoose");

const{
  Game, User, GameParticipant, Payout, SpinLog}  = require("../models");
const logger = require("../utils/winstonLogger");
const { NotifyUserTelegram } = require("../botController/notification");

const initializeKeshKeshSocket = (io) => {
  io.on("connection", (socket) => {
    logger.info(`Kesh-Kesh socket connected: ${socket.id}`);

    // Helper: derive per-room prize tiers from room or global settings
    const getRoomPrizeTiers = async (game) => {
      // Prefer room tiers
      if (Array.isArray(game.prize_tiers) && game.prize_tiers.length > 0) {
        return [...game.prize_tiers].sort((a, b) => a.rank - b.rank);
      }
      // Default single winner 100 - system_benefit
      const sys = Number(game.system_benefit || 0);
      const remaining = Math.max(0, 100 - sys);
      return remaining > 0 ? [{ rank: 1, percent: remaining }] : [];
    };

    // Convert sorted tiers into a simple structure for UI based on TOTAL POOL
    // Use totalPool = bet_amount * max_players to avoid double-applying system_benefit
    const tiersToStructure = (totalPoolAmount, tiers) => {
      const first = tiers.find((t) => t.rank === 1)?.percent || 0;
      const second = tiers.find((t) => t.rank === 2)?.percent || 0;
      return {
        first: totalPoolAmount * (first / 100),
        second: totalPoolAmount * (second / 100),
      };
    };

    // Helper to produce per-gameType event names (keeps backwards compatibility)
    const eventNameFor = (gameType, suffix) => {
      if (!gameType) gameType = "keshkesh";
      const gt = String(gameType).replace(/-/g, "_");
      return `${gt}_${suffix}`;
    };

    // Helper: payout-safe finalize when all configured winners already present
    const finalizeIfWinnersPresent = async (gameDoc) => {
      try {
        if (!gameDoc || gameDoc.status !== "in_progress") return gameDoc;

        // Load a fresh copy with participants populated to be safe
        const freshGame = await Game.findById(gameDoc._id).populate({
          path: "participants",
          populate: { path: "user_id", select: "fullName" },
        });
        if (!freshGame || freshGame.status !== "in_progress") return gameDoc;

        const participants = (freshGame.participants || []).filter(Boolean);
        const tiers = await getRoomPrizeTiers(freshGame);
        if (!tiers.length) return gameDoc;
        // Check if all ranks present
        const missing = tiers.find(
          (t) =>
            !participants.some(
              (p) => Array.isArray(p.rank) && p.rank.includes(t.rank)
            )
        );
        if (missing) return gameDoc;

        const session = await mongoose.startSession();
        const walletChangedUserIds = new Set();
        try {
          await session.withTransaction(async () => {
            // Reconcile each rank payout — compute from TOTAL POOL to avoid double house-cut
            for (const t of tiers) {
              const winner = participants.find(
                (p) => Array.isArray(p.rank) && p.rank.includes(t.rank)
              );
              if (!winner || !winner.user_id) continue;
              const totalPool = freshGame.bet_amount * freshGame.max_players;
              const prize = totalPool * (t.percent / 100);
              const existing = await Payout.findOne({
                game_id: freshGame._id,
                rank: t.rank,
              }).session(session);
              if (!existing) {
                await Payout.create(
                  [
                    {
                      user_id: winner.user_id._id || winner.user_id,
                      game_id: freshGame._id,
                      amount: prize,
                      rank: t.rank,
                      status: "paid",
                    },
                  ],
                  { session }
                );
                await User.updateOne(
                  { _id: winner.user_id._id || winner.user_id },
                  { $inc: { wallet: prize } },
                  { session }
                );
                walletChangedUserIds.add(
                  String(winner.user_id._id || winner.user_id)
                );
              } else if (existing.status !== "paid") {
                await Payout.updateOne(
                  { _id: existing._id },
                  { $set: { status: "paid" } },
                  { session }
                );
                await User.updateOne(
                  { _id: winner.user_id._id || winner.user_id },
                  { $inc: { wallet: prize } },
                  { session }
                );
                walletChangedUserIds.add(
                  String(winner.user_id._id || winner.user_id)
                );
              }
            }

            // Mark completed idempotently
            await Game.updateOne(
              { _id: freshGame._id, status: "in_progress" },
              { $set: { status: "completed" } },
              { session }
            );
          });
        } finally {
          session.endSession();
        }

        // Emit wallet updates after commit
        for (const id of walletChangedUserIds) {
          try {
            const u = await User.findById(id).select("wallet bonus telegramId role isRobot");
            if (u) {
              io.to(id.toString()).emit("walletUpdate", { wallet: u.wallet, bonus: u.bonus });
              const isRobotUser = u.isRobot || u.role === "robot";
              if (u.telegramId && !isRobotUser && !u.telegramId.startsWith("web_")) {
                await NotifyUserTelegram(u.telegramId, `🔴 Kesh-Kesh Win!\nYou've won from a recent game. Your new wallet balance is ${u.wallet} ETB.`);
              }
            }
          } catch (e) {
            logger.error(`Failed to emit walletUpdate or notify for ${id}: ${e.message}`);
          }
        }

        gameDoc.status = "completed"; // reflect for caller
        logger.warn(
          `[KeshSocket] Reconciled payouts and completed stuck game ${freshGame._id}`
        );
      } catch (e) {
        logger.error(
          `Error finalizing stuck game ${gameDoc?._id}: ${e.message}`
        );
      }
      return gameDoc;
    };

    // List all pending & in-progress games
    socket.on("requestKeshKeshData", async () => {
      try {
        const games = await Game.find({
          status: { $in: ["pending", "in_progress"] },
        }).populate({
          path: "participants",
          populate: { path: "user_id", select: "fullName" },
        });

        logger.debug("Games for requestKeshKeshData fetched", {
          socketId: socket.id,
          count: Array.isArray(games) ? games.length : 0,
        });

        // Auto-finalize any stuck in_progress games with both winners present
        for (const g of games) {
          await finalizeIfWinnersPresent(g);
        }

        const gamesWithPrizeStructure = games
          .filter((game) => game.status !== "completed")
          .map((game) => {
            const validParticipants =
              game.participants?.filter(
                (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
              ) || [];
            const tierPercents =
              game.prize_tiers && game.prize_tiers.length
                ? [...game.prize_tiers].sort((a, b) => a.rank - b.rank)
                : [
                    {
                      rank: 1,
                      percent: Math.max(0, 100 - (game.system_benefit || 0)),
                    },
                  ];
            const totalPool = game.bet_amount * game.max_players;
            const tiers = tierPercents.map((t) => ({
              rank: t.rank,
              amount: totalPool * (t.percent / 100),
            }));

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
                rank: p.rank || [],
              })),
              prize_structure: tiersToStructure(totalPool, tierPercents),
              prize_tiers: tiers,
              gameType: game.gameType || "keshkesh",
            };
          });

        // Emit legacy keshkesh list and per-gameType lists
        const keshList = gamesWithPrizeStructure.filter(
          (g) => (g.gameType || "keshkesh") === "keshkesh"
        );
        socket.emit("keshkesh_rooms", keshList); // Always emit, even if empty
        const others = gamesWithPrizeStructure.filter(
          (g) => (g.gameType || "keshkesh") !== "keshkesh"
        );
        // group by gameType
        const grouped = others.reduce((acc, g) => {
          const key = (g.gameType || "keshkesh").replace(/-/g, "_");
          acc[key] = acc[key] || [];
          acc[key].push(g);
          return acc;
        }, {});
        Object.keys(grouped).forEach((k) =>
          socket.emit(`${k}_rooms`, grouped[k])
        );
      } catch (error) {
        logger.error(`Error fetching Kesh-Kesh game rooms: ${error.message}`);
        socket.emit("error", {
          message: "Failed to load Kesh-Kesh game rooms",
        });
      }
    });

    // Find or create a room by stake
    socket.on(
      "kesh_get_room_by_stake",
      async ({ stakeAmount, userId, maxPlayers }) => {
        try {
          if (!stakeAmount || isNaN(stakeAmount)) {
            socket.emit("error", { message: "Invalid stake amount" });
            return;
          }
          const max_players =
            maxPlayers && !isNaN(maxPlayers) ? parseInt(maxPlayers) : 10;

          let game = await Game.findOne({
            bet_amount: parseFloat(stakeAmount),
            max_players,
            status: "pending",
          });

          if (!game) {
            const totalPool = parseFloat(stakeAmount) * max_players;
            const sys = 0; // default system benefit when auto-creating
            const prize_amount = totalPool * (1 - sys / 100);
            const roomTiers = [{ rank: 1, percent: 100 }];

            game = await Game.create({
              prize_amount,
              bet_amount: parseFloat(stakeAmount),
              max_players,
              status: "pending",
              gameType: "keshkesh",
              system_benefit: sys,
              prize_tiers: roomTiers,
            });

            logger.info(
              `Created new Kesh-Kesh game ${game._id} for stake ${stakeAmount}, max_players ${max_players}`
            );
          }

          const tierPercents =
            game.prize_tiers && game.prize_tiers.length
              ? [...game.prize_tiers].sort((a, b) => a.rank - b.rank)
              : [
                  {
                    rank: 1,
                    percent: Math.max(0, 100 - (game.system_benefit || 0)),
                  },
                ];
          const totalPool = game.bet_amount * game.max_players;
          const tiers = tierPercents.map((t) => ({
            rank: t.rank,
            amount: totalPool * (t.percent / 100),
          }));
          socket.emit(eventNameFor(game.gameType, "room_data"), {
            roomId: String(game._id),
            stakeAmount: game.bet_amount,
            max_players: game.max_players,
            status: game.status,
            participants: [],
            prize_structure: tiersToStructure(totalPool, tierPercents),
            prize_tiers: tiers,
            gameType: game.gameType || "keshkesh",
          });

          const games = await Game.find({
            status: { $in: ["pending", "in_progress"] },
            gameType: "keshkesh",
          }).populate({
            path: "participants",
            populate: { path: "user_id", select: "fullName" },
          });

          logger.debug("Games for kesh_get_room_by_stake fetched", {
            socketId: socket.id,
            count: Array.isArray(games) ? games.length : 0,
          });

          const gamesWithPrizeStructure = games.map((game) => {
            const validParticipants =
              game.participants?.filter(
                (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
              ) || [];
            const tierPercents =
              game.prize_tiers && game.prize_tiers.length
                ? [...game.prize_tiers].sort((a, b) => a.rank - b.rank)
                : [
                    {
                      rank: 1,
                      percent: Math.max(0, 100 - (game.system_benefit || 0)),
                    },
                  ];
            const totalPool = game.bet_amount * game.max_players;
            const tiers = tierPercents.map((t) => ({
              rank: t.rank,
              amount: totalPool * (t.percent / 100),
            }));

            return {
              _id: game._id,
              prize_amount: game.prize_amount,
              bet_amount: game.bet_amount,
              max_players: game.max_players,
              status: game.status,
              created_at: game.created_at?.toISOString() || null,
              participants: validParticipants.map((p) => ({
                user_id: p.user_id._id,
                full_name: p.user_id.fullName,
                numbers: p.numbers,
                paid_status: p.paid_status,
                rank: p.rank || [],
              })),
              prize_structure: tiersToStructure(totalPool, tierPercents),
              prize_tiers: tiers,
              gameType: "keshkesh",
            };
          });

          // Emit grouped rooms per type including legacy keshkesh
          const keshRooms = gamesWithPrizeStructure.filter(
            (g) => (g.gameType || "keshkesh") === "keshkesh"
          );
          if (keshRooms.length) io.emit("keshkesh_rooms", keshRooms);
          const otherRooms = gamesWithPrizeStructure.filter(
            (g) => (g.gameType || "keshkesh") !== "keshkesh"
          );
          const groupedOthers = otherRooms.reduce((acc, g) => {
            const key = (g.gameType || "keshkesh").replace(/-/g, "_");
            acc[key] = acc[key] || [];
            acc[key].push(g);
            return acc;
          }, {});
          Object.keys(groupedOthers).forEach((k) =>
            io.emit(`${k}_rooms`, groupedOthers[k])
          );
        } catch (error) {
          logger.error(
            `Error in Kesh-Kesh get_room_by_stake: ${error.message}`
          );
          socket.emit("error", {
            message: "Failed to fetch or create Kesh-Kesh room",
          });
        }
      }
    );

    // Count active rooms for stake
    socket.on(
      "get_active_games_by_stake",
      async ({ stakeAmount, maxPlayers }) => {
        try {
          if (!stakeAmount || isNaN(stakeAmount)) {
            socket.emit("error", { message: "Invalid stake amount" });
            return;
          }
          const max_players =
            maxPlayers && !isNaN(maxPlayers) ? parseInt(maxPlayers) : 10;

          const activeGames = await Game.find({
            bet_amount: parseFloat(stakeAmount),
            max_players,
            status: { $in: ["pending", "in_progress"] },
          });

          socket.emit("active_games_by_stake", {
            stakeAmount,
            maxPlayers: max_players,
            count: activeGames.length,
            gameType: activeGames.length ? activeGames[0].gameType : "keshkesh",
          });
        } catch (error) {
          logger.error(
            `Error in Kesh-Kesh get_active_games_by_stake: ${error.message}`
          );
          socket.emit("error", {
            message: "Failed to fetch active Kesh-Kesh games",
          });
        }
      }
    );

    // Join a room to receive updates
    socket.on("join_keshkesh", async (gameId) => {
      try {
        if (!gameId) {
          socket.emit("error", { message: "Invalid gameId", gameId });
          return;
        }

        let game = await Game.findById(gameId).populate({
          path: "participants",
          populate: { path: "user_id", select: "fullName" },
        });

        logger.debug("join_keshkesh loaded game", {
          socketId: socket.id,
          gameId,
          found: Boolean(game),
          status: game?.status,
        });

        if (!game) {
          socket.emit("error", { message: "Game not found", gameId });
          return;
        }

        // Auto-finalize if already has both winners
        game = await finalizeIfWinnersPresent(game);
        if (game.status === "completed") {
          socket.emit("gameUpdate", {
            type: "status",
            status: "completed",
            gameType: "keshkesh",
            roomId: String(gameId),
          });
        }

        socket.join(gameId);
        logger.info("Socket joined Kesh-Kesh room", {
          socketId: socket.id,
          gameId,
        });

        const validParticipants =
          game.participants?.filter(
            (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
          ) || [];
        const tierPercents =
          game.prize_tiers && game.prize_tiers.length
            ? [...game.prize_tiers].sort((a, b) => a.rank - b.rank)
            : [
                {
                  rank: 1,
                  percent: Math.max(0, 100 - (game.system_benefit || 0)),
                },
              ];
        const totalPool = game.bet_amount * game.max_players;
        const tiers = tierPercents.map((t) => ({
          rank: t.rank,
          amount: totalPool * (t.percent / 100),
        }));

        const roomData = {
          roomId: String(game._id),
          prize_amount: game.prize_amount,
          bet_amount: game.bet_amount,
          max_players: game.max_players,
          status: game.status,
          participants: validParticipants.map((p) => ({
            user_id: p.user_id._id,
            full_name: p.user_id.fullName,
            numbers: p.numbers,
            paid_status: p.paid_status,
            rank: p.rank || [],
          })),
          prize_structure: tiersToStructure(totalPool, tierPercents),
          prize_tiers: tiers,
          gameType: game.gameType || "keshkesh",
        };

        const evt = eventNameFor(game.gameType, "room_data");
        socket.emit(evt, roomData);
        socket.to(gameId).emit(evt, roomData);
      } catch (error) {
        logger.error(
          `Error joining Kesh-Kesh game ${game - gameId}: ${error.message}`
        );
        socket.emit("error", {
          message: "Failed to join Kesh-Kesh game",
          gameId,
        });
      }
    });

    // Reserve numbers and start game if full
    socket.on(
      "join_keshkesh_game",
      async ({ gameId, userId, selectedNumbers }) => {
        try {
          if (!gameId || !userId || !Array.isArray(selectedNumbers)) {
            socket.emit("error", {
              message: "Invalid gameId, userId, or selectedNumbers",
              gameId,
            });
            return;
          }

          // Normalize & de-duplicate
          selectedNumbers = [
            ...new Set(selectedNumbers.map((n) => parseInt(n, 10))),
          ];

          // Transactional reservation
          const session = await mongoose.startSession();
          let game,
            user,
            participant,
            numbersAdded = 0,
            addedNumbers = [];
          try {
            await session.withTransaction(async () => {
              game = await Game.findById(gameId).session(session);
              if (!game || game.status !== "pending") {
                throw new Error("Game not available");
              }

              const invalidNumbers = selectedNumbers.filter(
                (num) =>
                  num < 1 || num > game.max_players || !Number.isInteger(num)
              );
              if (invalidNumbers.length > 0) {
                throw new Error(
                  `Invalid numbers: ${invalidNumbers.join(
                    ", "
                  )}. Must be between 1 and ${game.max_players}`
                );
              }

              user = await User.findById(userId).session(session);
              if (!user) {
                throw new Error("User not found");
              }

              // Ensure one participant per user/game and attach to game
              participant = await GameParticipant.findOne({
                game_id: gameId,
                user_id: userId,
              }).session(session);
              if (!participant) {
                const created = await GameParticipant.create(
                  [
                    {
                      game_id: gameId,
                      user_id: userId,
                      numbers: [],
                      paid_status: "pending",
                      rank: [],
                    },
                  ],
                  { session }
                );
                participant = created[0];
                await Game.findByIdAndUpdate(
                  gameId,
                  { $addToSet: { participants: participant._id } },
                  { session }
                );
              }

              // Compute existing and to-add
              const existingSet = new Set(participant.numbers || []);
              const alreadyOwned = selectedNumbers.filter((n) =>
                existingSet.has(n)
              );
              const numbersToAdd = selectedNumbers.filter(
                (n) => !existingSet.has(n)
              );

              // Check numbers taken by other participants
              let takenByOthers = [];
              if (numbersToAdd.length > 0) {
                const conflicts = await GameParticipant.find({
                  game_id: gameId,
                  numbers: { $in: numbersToAdd },
                  _id: { $ne: participant._id },
                })
                  .select("numbers")
                  .session(session);
                const takenSet = new Set(conflicts.flatMap((p) => p.numbers));
                takenByOthers = numbersToAdd.filter((n) => takenSet.has(n));
              }

              // Capacity check
              const allParts = await GameParticipant.find({ game_id: gameId })
                .select("numbers")
                .session(session);
              const totalTaken = allParts.reduce(
                (s, p) => s + (Array.isArray(p.numbers) ? p.numbers.length : 0),
                0
              );
              const remainingSlots = Math.max(0, game.max_players - totalTaken);

              // All-or-nothing enforcement
              if (
                takenByOthers.length > 0 ||
                numbersToAdd.length > remainingSlots
              ) {
                const err = new Error("Some selected numbers are unavailable");
                err.code = "NUMBERS_UNAVAILABLE";
                err.details = {
                  takenByOthers,
                  alreadyOwned,
                  remainingSlots,
                  requestedCount: selectedNumbers.length,
                };
                throw err;
              }

              if (numbersToAdd.length === 0) {
                const err = new Error("You already own the selected numbers");
                err.code = "NO_NEW_NUMBERS";
                err.details = { alreadyOwned };
                throw err;
              }

              // Check funds for the intended numbers only (wallet + bonus)
              const intendedCost = game.bet_amount * numbersToAdd.length;
              const totalAvailable = (user.wallet || 0) + (user.bonus || 0);
              if (totalAvailable < intendedCost) {
                throw new Error("Insufficient balance");
              }

              // Add all numbers atomically
              const beforeLen = participant.numbers.length;
              const updated = await GameParticipant.findOneAndUpdate(
                { _id: participant._id },
                {
                  $addToSet: { numbers: { $each: numbersToAdd } },
                  $set: { paid_status: "paid" },
                },
                { new: true, session }
              );
              numbersAdded = updated.numbers.length - beforeLen;
              addedNumbers = numbersToAdd;

              if (numbersAdded > 0) {
                const cost = game.bet_amount * numbersAdded;
                // Deduct from wallet first, then bonus
                let walletUsed = 0;
                let bonusUsed = 0;
                if (user.wallet >= cost) {
                  walletUsed = cost;
                } else {
                  walletUsed = user.wallet;
                  bonusUsed = cost - walletUsed;
                }
                user.wallet -= walletUsed;
                user.bonus -= bonusUsed;
                await user.save({ session });
              }
            });
          } finally {
            session.endSession();
          }

          if (!game) {
            socket.emit("error", {
              message: "Kesh-Kesh game not available",
              gameId,
            });
            return;
          }

          // Build and broadcast the latest room state
          const updatedGame = await Game.findById(gameId).populate({
            path: "participants",
            populate: { path: "user_id", select: "fullName" },
          });

          logger.debug("Updated game for join_keshkesh_game", {
            socketId: socket.id,
            gameId,
            status: updatedGame?.status,
            participantsCount: Array.isArray(updatedGame?.participants)
              ? updatedGame.participants.length
              : 0,
          });

          const validParticipants =
            updatedGame.participants?.filter(
              (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
            ) || [];
          const tiers = (
            updatedGame.prize_tiers && updatedGame.prize_tiers.length
              ? [...updatedGame.prize_tiers].sort((a, b) => a.rank - b.rank)
              : await getRoomPrizeTiers(updatedGame)
          ).map((t) => ({
            rank: t.rank,
            amount: updatedGame.prize_amount * (t.percent / 100),
          }));

          const roomData = {
            roomId: String(gameId),
            prize_amount: updatedGame.prize_amount,
            bet_amount: updatedGame.bet_amount,
            max_players: updatedGame.max_players,
            status: updatedGame.status,
            participants: validParticipants.map((p) => ({
              user_id: p.user_id._id,
              full_name: p.user_id.fullName,
              numbers: p.numbers,
              paid_status: p.paid_status,
              rank: p.rank || [],
            })),
            prize_structure: tiersToStructure(
              updatedGame.prize_amount,
              tiers.map((t) => ({
                rank: t.rank,
                percent: (t.amount / updatedGame.prize_amount) * 100,
              }))
            ),
            prize_tiers: tiers,
            gameType: updatedGame.gameType || "keshkesh",
          };

          io.to(gameId).emit(
            eventNameFor(updatedGame.gameType, "room_data"),
            roomData
          );
          socket.emit("join_success", { gameId, added: addedNumbers || [] });

          if (user) {
            io.to(userId.toString()).emit("walletUpdate", {
              wallet: user.wallet,
              bonus: user.bonus,
            });

            // Telegram confirmation to the purchasing user
            try {
              const notify = require("../botController/notification.js");
              const freshUser = await User.findById(userId);
              if (freshUser && freshUser.telegramId) {
                const perPrice = updatedGame.bet_amount;
                const totalPaid = perPrice * (addedNumbers?.length || 0);
                const msg = `🎫 KESH-KESH TICKET CONFIRMATION\n\nNumbers: ${
                  (addedNumbers || []).join(", ") || "-"
                }\nPrice per number: ${perPrice} ETB\nTotal paid: ${totalPaid} ETB\nNew balance: ${freshUser.wallet.toFixed(
                  2
                )} ETB`;
                await notify.NotifyUserTelegram(freshUser.telegramId, msg);
              }
            } catch (notifyErr) {
              logger.warn("Failed to send Kesh-Kesh purchase confirmation", {
                error: notifyErr?.message,
              });
            }
          }

          // Idempotent flip to in_progress when full
          const totalNumbersTaken = updatedGame.participants.reduce(
            (sum, p) => sum + p.numbers.length,
            0
          );
          if (
            updatedGame.status === "pending" &&
            totalNumbersTaken >= updatedGame.max_players
          ) {
            const started = await Game.findOneAndUpdate(
              { _id: gameId, status: "pending" },
              { $set: { status: "in_progress" } },
              { new: true }
            ).populate({
              path: "participants",
              populate: { path: "user_id", select: "fullName" },
            });
            const refreshedGame = started || updatedGame;

            logger.debug("Kesh-Kesh game moved to in_progress", {
              gameId,
              status: refreshedGame?.status,
              participantsCount: Array.isArray(refreshedGame?.participants)
                ? refreshedGame.participants.length
                : 0,
            });

            const refreshedValidParticipants =
              refreshedGame.participants?.filter(
                (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
              ) || [];

            const tiers2 = (
              refreshedGame.prize_tiers && refreshedGame.prize_tiers.length
                ? [...refreshedGame.prize_tiers].sort((a, b) => a.rank - b.rank)
                : await getRoomPrizeTiers(refreshedGame)
            ).map((t) => ({
              rank: t.rank,
              amount:
                refreshedGame.bet_amount *
                refreshedGame.max_players *
                (t.percent / 100),
            }));

            const refreshedRoomData = {
              roomId: String(gameId),
              prize_amount: refreshedGame.prize_amount,
              bet_amount: refreshedGame.bet_amount,
              max_players: refreshedGame.max_players,
              status: refreshedGame.status,
              participants: refreshedValidParticipants.map((p) => ({
                user_id: p.user_id._id,
                full_name: p.user_id.fullName,
                numbers: p.numbers,
                paid_status: p.paid_status,
                rank: p.rank || [],
              })),
              prize_structure: tiersToStructure(
                refreshedGame.bet_amount * refreshedGame.max_players,
                tiers2.map((t) => ({
                  rank: t.rank,
                  percent:
                    (t.amount /
                      (refreshedGame.bet_amount * refreshedGame.max_players)) *
                    100,
                }))
              ),
              prize_tiers: tiers2,
              gameType: "keshkesh",
              shake: true,
            };

            io.to(gameId).emit("gameUpdate", {
              type: "status",
              status: "in_progress",
              message: `${
                refreshedGame.gameType || "Kesh-Kesh"
              } game starting...`,
              gameType: refreshedGame.gameType || "keshkesh",
              roomId: String(gameId),
            });

            setTimeout(async () => {
              io.to(gameId).emit(
                eventNameFor(refreshedGame.gameType, "room_data"),
                refreshedRoomData
              );
            }, 1000);

            // Winners flow
            setTimeout(async () => {
              const refreshedGame2 = await Game.findById(gameId).populate({
                path: "participants",
                populate: { path: "user_id", select: "fullName" },
              });

              logger.debug("Refreshed game snapshot for winners", {
                gameId,
                status: refreshedGame2?.status,
                participantsCount: Array.isArray(refreshedGame2?.participants)
                  ? refreshedGame2.participants.length
                  : 0,
              });

              const allNumbers = refreshedGame2.participants.flatMap((p) =>
                p.numbers.map((n) => ({
                  user: p.user_id,
                  number: n,
                  participant: p,
                }))
              );
              if (allNumbers.length === 0) return;
              // Generalized multi-winner flow using prize_tiers
              const sortedTiers = (refreshedRoomData.prize_tiers || [])
                .slice()
                .sort((a, b) => a.rank - b.rank);
              const available = [...allNumbers];

              const winners = [];
              // If fetan-spin, prepare segments for wheel UI (one slice per ticket)
              let segments = null;
              if ((refreshedGame2.gameType || "keshkesh") === "fetan-spin") {
                segments = allNumbers.map((a, i) => ({
                  id: i,
                  label: a.user.fullName || String(a.user._id).slice(0, 6),
                  number: a.number,
                }));
              }

              for (const t of sortedTiers) {
                if (available.length === 0) break;
                const idx = Math.floor(Math.random() * available.length);
                const pick = available[idx];
                winners.push({ rank: t.rank, pick, amount: t.amount });

                // If fetan-spin: prepare a commit-reveal and emit prepare -> start
                if ((refreshedGame2.gameType || "keshkesh") === "fetan-spin") {
                  const crypto = require("crypto");
                  const spinId = `${gameId.toString()}-${Date.now()}-${t.rank}`;
                  const seed = crypto.randomBytes(16).toString("hex");
                  const commitHash = crypto
                    .createHash("sha256")
                    .update(seed)
                    .digest("hex");
                  // store prepare record
                  try {
                    await SpinLog.create({
                      spinId,
                      gameId,
                      rank: t.rank,
                      commitHash,
                      seed,
                      segmentsCount: segments.length,
                      status: "prepared",
                    });
                  } catch (e) {
                    logger.error(`Failed to create SpinLog: ${e.message}`);
                  }

                  // emit prepare with commitHash so clients can show it
                  io.to(gameId).emit("fetan_spin_prepare", {
                    roomId: String(gameId),
                    spinId,
                    commitHash,
                    issuedAt: Date.now(),
                    gameType: "fetan-spin",
                  });

                  // small delay before start so clients can render commit
                  await new Promise((res) => setTimeout(res, 600));

                  const durationMs = 4500;
                  // emit start with targetIndex
                  await SpinLog.updateOne(
                    { spinId },
                    { $set: { status: "started" } }
                  ).catch(() => {});
                  io.to(gameId).emit("fetan_spin_start", {
                    roomId: String(gameId),
                    spinId,
                    segments,
                    targetIndex: idx,
                    durationMs,
                    rank: t.rank,
                    gameType: "fetan-spin",
                  });
                  // wait for animation + small buffer
                  await new Promise((res) => setTimeout(res, durationMs + 500));

                  // after animation, reveal seed and persist result later after payout
                  // we'll save seed after payouts below when emitting result
                }

                // Remove picked number to avoid duplicates
                available.splice(idx, 1);
                // Update participant rank and payout
                const part = refreshedGame2.participants.find((p) =>
                  p._id.equals(pick.participant._id)
                );
                if (part) {
                  try {
                    // Use atomic update to avoid version conflicts on subdocuments
                    await Game.updateOne(
                      { _id: gameId, "participants._id": part._id },
                      { $addToSet: { "participants.$.rank": t.rank } }
                    ).catch(() => {});
                  } catch (e) {
                    logger.error(
                      `Failed to update participant rank: ${e.message}`
                    );
                  }

                  const winUser = await User.findById(part.user_id);
                  if (winUser) {
                    winUser.wallet += t.amount;
                    await winUser.save().catch(() => {});
                  }

                  await Payout.create({
                    user_id: part.user_id,
                    game_id: gameId,
                    amount: t.amount,
                    rank: t.rank,
                    status: "paid",
                  }).catch(() => {});

                  if (part.user_id) {
                    io.to(part.user_id.toString()).emit("walletUpdate", {
                      wallet: winUser ? winUser.wallet : null,
                      bonus: winUser ? winUser.bonus : null,
                    });
                  }
                }

                io.to(gameId).emit("gameUpdate", {
                  type: "winner",
                  rank: t.rank,
                  number: pick.number,
                  prize: t.amount,
                  user: pick.user.fullName,
                  gameType: refreshedGame.gameType || "keshkesh",
                  roomId: String(gameId),
                });

                // Emit fetan_spin_result for this rank if fetan-spin (reveal seed)
                if ((refreshedGame2.gameType || "keshkesh") === "fetan-spin") {
                  try {
                    const log = await SpinLog.findOne({
                      gameId,
                      rank: t.rank,
                    }).sort({ createdAt: -1 });
                    const seed = log?.seed || null;
                    const spinId =
                      log?.spinId ||
                      `${gameId.toString()}-${Date.now()}-${t.rank}`;
                    // update record as completed with seed and targetIndex
                    await SpinLog.updateOne(
                      { spinId },
                      { $set: { status: "completed", seed, targetIndex: idx } }
                    ).catch(() => {});
                    io.to(gameId).emit("fetan_spin_result", {
                      roomId: String(gameId),
                      spinId,
                      rank: t.rank,
                      winner: {
                        userId: pick.user._id,
                        fullName: pick.user.fullName,
                        number: pick.number,
                      },
                      prize: t.amount,
                      seed: seed || null,
                      gameType: "fetan-spin",
                    });
                  } catch (e) {
                    logger.error(
                      `Failed to emit fetan_spin_result: ${e.message}`
                    );
                    io.to(gameId).emit("fetan_spin_result", {
                      roomId: String(gameId),
                      spinId: `${gameId.toString()}-${Date.now()}-${t.rank}`,
                      rank: t.rank,
                      winner: {
                        userId: pick.user._id,
                        fullName: pick.user.fullName,
                        number: pick.number,
                      },
                      prize: t.amount,
                      seed: null,
                      gameType: "fetan-spin",
                    });
                  }
                }

                // small delay between ranks to mimic previous behavior
                await new Promise((res) => setTimeout(res, 1500));
              }

              // Emit updated room after winners
              const afterWinnersGame = await Game.findById(gameId).populate({
                path: "participants",
                populate: { path: "user_id", select: "fullName" },
              });
              const afterValidParticipants =
                afterWinnersGame.participants?.filter(
                  (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
                ) || [];
              const afterRoomData = {
                roomId: String(gameId),
                prize_amount: afterWinnersGame.prize_amount,
                bet_amount: afterWinnersGame.bet_amount,
                max_players: afterWinnersGame.max_players,
                status: afterWinnersGame.status,
                participants: afterValidParticipants.map((p) => ({
                  user_id: p.user_id._id,
                  full_name: p.user_id.fullName,
                  numbers: p.numbers,
                  paid_status: p.paid_status,
                  rank: p.rank || [],
                })),
                prize_structure: tiersToStructure(
                  afterWinnersGame.bet_amount * afterWinnersGame.max_players,
                  (afterWinnersGame.prize_tiers || []).sort(
                    (a, b) => a.rank - b.rank
                  )
                ),
                prize_tiers: (afterWinnersGame.prize_tiers || []).map((t) => ({
                  rank: t.rank,
                  amount:
                    afterWinnersGame.bet_amount *
                    afterWinnersGame.max_players *
                    (t.percent / 100),
                })),
                gameType: "keshkesh",
              };
              io.to(gameId).emit(
                eventNameFor(afterWinnersGame.gameType, "room_data"),
                afterRoomData
              );
              io.to(gameId).emit(
                eventNameFor(afterWinnersGame.gameType, "reshake"),
                {
                  roomId: String(gameId),
                  shake: true,
                }
              );

              // Notifications for all participants
              try {
                const notification = require("../botController/notification.js");
                const allParticipantIds = afterWinnersGame.participants.map(
                  (p) => p.user_id._id
                );
                const users = await User.find({
                  _id: { $in: allParticipantIds },
                });
                const drawDate = new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                for (const usr of users) {
                  if (usr.telegramId) {
                    let message = `🎰 <b>KESH-KESH GAME RESULTS</b> 🎰\n\nDraw Date: ${drawDate}\n━━━━━━━━━━━━━━━━━━\n\n`;
                    message += ` <b>WINNING NUMBERS</b>\n`;
                    for (const w of winners.sort((a, b) => a.rank - b.rank)) {
                      message += `Rank ${w.rank}: <b>${w.pick.number}</b> (${w.pick.user.fullName}) - ${w.amount} ETB\n`;
                    }
                    const myWins = winners.filter(
                      (w) => String(w.pick.user._id) === String(usr._id)
                    );
                    message += `\n$${
                      myWins.length
                        ? `✨ <b>Congratulations ${
                            usr.fullName
                          }! You won rank ${myWins
                            .map((x) => x.rank)
                            .join(", ")}</b>`
                        : `🙁 <b>You didn't win this time. Try again in the next game!</b>`
                    }`;
                    message += `\n\n🎫 Kesh kesh Tickets for the next game are available now!`;
                    try {
                      await notification.NotifyUserTelegram(
                        usr.telegramId,
                        message
                      );
                    } catch (err) {
                      logger.warn("Failed to notify user via Telegram", {
                        userId: String(usr?._id),
                        error: err?.message,
                      });
                    }
                  }
                }
              } catch (notifyErr) {
                logger.warn("Error notifying participants via Telegram", {
                  error: notifyErr?.message,
                });
              }

              // Complete and auto-create next game
              setTimeout(async () => {
                await Game.findByIdAndUpdate(gameId, { status: "completed" });
                io.to(gameId).emit("gameUpdate", {
                  type: "status",
                  status: "completed",
                  gameType: afterWinnersGame.gameType || "keshkesh",
                  roomId: String(gameId),
                });

                const afterCompletedGame = await Game.findById(gameId).populate(
                  {
                    path: "participants",
                    populate: { path: "user_id", select: "fullName" },
                  }
                );

                const afterCompletedValidParticipants =
                  afterCompletedGame.participants?.filter(
                    (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
                  ) || [];

                const tiersDone = await getRoomPrizeTiers(afterCompletedGame);
                const afterCompletedRoomData = {
                  roomId: String(gameId),
                  prize_amount: afterCompletedGame.prize_amount,
                  bet_amount: afterCompletedGame.bet_amount,
                  max_players: afterCompletedGame.max_players,
                  status: afterCompletedGame.status,
                  participants: afterCompletedValidParticipants.map((p) => ({
                    user_id: p.user_id._id,
                    full_name: p.user_id.fullName,
                    numbers: p.numbers,
                    paid_status: p.paid_status,
                    rank: p.rank || [],
                  })),
                  prize_structure: tiersToStructure(
                    afterCompletedGame.bet_amount *
                      afterCompletedGame.max_players,
                    tiersDone
                  ),
                  prize_tiers: tiersDone.map((t) => ({
                    rank: t.rank,
                    amount:
                      afterCompletedGame.bet_amount *
                      afterCompletedGame.max_players *
                      (t.percent / 100),
                  })),
                  gameType: "keshkesh",
                };
                io.to(gameId).emit(
                  eventNameFor(afterCompletedGame.gameType, "room_data"),
                  afterCompletedRoomData
                );

                try {
                  const oldGame = await Game.findById(gameId);
                  const newGame = await Game.create({
                    prize_amount:
                      oldGame.bet_amount *
                      oldGame.max_players *
                      (1 - (oldGame.system_benefit || 0) / 100),
                    bet_amount: oldGame.bet_amount,
                    max_players: oldGame.max_players,
                    status: "pending",
                    gameType: oldGame.gameType || "keshkesh",
                    system_benefit: oldGame.system_benefit || 0,
                    prize_tiers: oldGame.prize_tiers, // carry same tiers to next round
                  });
                  const nextTiers = await getRoomPrizeTiers(newGame);
                  io.to(gameId).emit(
                    eventNameFor(newGame.gameType, "room_data"),
                    {
                      roomId: String(newGame._id),
                      prize_amount: newGame.prize_amount,
                      bet_amount: newGame.bet_amount,
                      max_players: newGame.max_players,
                      status: newGame.status,
                      participants: [],
                      prize_structure: tiersToStructure(
                        newGame.bet_amount * newGame.max_players,
                        nextTiers
                      ),
                      prize_tiers: nextTiers.map((t) => ({
                        rank: t.rank,
                        amount:
                          newGame.bet_amount *
                          newGame.max_players *
                          (t.percent / 100),
                      })),
                      gameType: newGame.gameType || "keshkesh",
                    }
                  );
                  logger.info(
                    `[Backend] Created and emitted new game ${newGame._id} for room ${gameId}`
                  );
                } catch (err) {
                  logger.error(
                    `Error auto-creating new Kesh-Kesh game after completion: ${err.message}`
                  );
                }
              }, 15000);
            }, 15000);
          }
        } catch (error) {
          logger.error(`Error in join_keshkesh_game: ${error.message}`);
          socket.emit("error", {
            message: error.message,
            code: error.code,
            details: error.details,
            gameId,
          });
        }
      }
    );

    socket.on("disconnect", () => {
      logger.info(`Kesh-Kesh socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initializeKeshKeshSocket };
