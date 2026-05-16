const logger = require("../utils/winstonLogger");
const { NotifyUserTelegram } = require("../botController/notification");

const {User, MaterialLottery, MaterialPayout} = require("../models");

const initializeMaterialLotterySocket = (io) => {
  io.on("connection", (socket) => {
    logger.info(`Material Lottery socket connected: ${socket.id}`);

    // Normalize possibly populated user references to ObjectId
    const normalizeUserRef = (u) => (u && u._id ? u._id : u);

    // Reconcile a material lottery game to avoid stuck states
    const reconcileMaterialGame = async (gameDoc) => {
      try {
        if (!gameDoc) return null;
        const fresh = await MaterialLottery.findById(gameDoc._id).populate({
          path: "participants.user_id",
          select: "fullName",
        });
        if (!fresh) return null;

        // If pending but capacity reached, move to in_progress idempotently
        const totalTaken = (fresh.participants || []).reduce(
          (s, p) => s + (Array.isArray(p.numbers) ? p.numbers.length : 0),
          0
        );
        if (
          fresh.status === "pending" &&
          fresh.max_players &&
          totalTaken >= fresh.max_players
        ) {
          await MaterialLottery.updateOne(
            { _id: fresh._id, status: "pending" },
            { $set: { status: "in_progress" } }
          );
          fresh.status = "in_progress";
        }

        // If in_progress but winners already recorded, mark completed and ensure payouts
        if (
          fresh.status === "in_progress" &&
          Array.isArray(fresh.winners) &&
          fresh.winners.length > 0
        ) {
          for (const w of fresh.winners) {
            const reward = (fresh.rewards || []).find((r) => r.rank === w.rank);
            if (!reward) continue;
            const userId = normalizeUserRef(w.user_id);
            if (reward.type === "monetary" && userId) {
              const exists = await MaterialPayout.findOne({
                game_id: fresh._id,
                user_id: userId,
                rank: w.rank,
              });
              if (!exists) {
                await MaterialPayout.create({
                  user_id: userId,
                  game_id: fresh._id,
                  amount: reward.amount || 0,
                  description: reward.description,
                  type: reward.type,
                  rank: w.rank,
                  status: "paid",
                });
                await User.updateOne(
                  { _id: userId },
                  { $inc: { wallet: reward.amount || 0 } }
                );
                try {
                  const u = await User.findById(userId).select("wallet bonus telegramId");
                  if (u) {
                    io.to(userId.toString()).emit("walletUpdate", {
                      wallet: u.wallet,
                      bonus: u.bonus,
                    });
                    const isRobotUser = u.isRobot || u.role === "robot";
                    if (u.telegramId && !isRobotUser && !u.telegramId.startsWith("web_")) {
                       await NotifyUserTelegram(u.telegramId, `🔴 Material Lottery Win!\nYou've won from a recent game. Your new wallet balance is ${u.wallet} ETB.`);
                    }
                  }
                } catch {}
              }
            }
          }
          await MaterialLottery.updateOne(
            { _id: fresh._id, status: "in_progress" },
            { $set: { status: "completed", completed_at: new Date() } }
          );
          fresh.status = "completed";
        }

        return fresh;
      } catch (e) {
        logger.error(
          `reconcileMaterialGame error for ${gameDoc?._id}: ${e.message}`
        );
        return gameDoc;
      }
    };

    socket.on("requestMaterialLotteryData", async () => {
      try {
        const games = await MaterialLottery.find({
          status: { $in: ["pending", "in_progress"] },
          gameType: "material_lottery",
        }).populate({
          path: "participants.user_id",
          select: "fullName",
        });

        // Reconcile games to avoid stuck pending/in_progress
        for (const g of games) {
          await reconcileMaterialGame(g);
        }

        logger.debug("Material Lottery rooms fetched", {
          socketId: socket.id,
          count: Array.isArray(games) ? games.length : 0,
        });

        const gamesWithRewards = games.map((game) => ({
          _id: game._id,
          bet_amount: game.bet_amount,
          max_players: game.max_players,
          round: game.round || 1,
          status: game.status,
          created_at: game.created_at?.toISOString() || null,
          participants:
            game.participants
              ?.filter(
                (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
              )
              .map((p) => ({
                user_id: p.user_id._id,
                full_name: p.user_id.fullName,
                numbers: p.numbers,
                paid_status: p.paid_status,
                rank: p.rank || [],
              })) || [],
          rewards: game.rewards,
          gameType: "material_lottery",
        }));

        socket.emit("material_lottery_rooms", gamesWithRewards);
      } catch (error) {
        logger.error(
          `Error fetching Material Lottery game rooms: ${error.message}`
        );
        socket.emit("error", {
          message: "Failed to load Material Lottery game rooms",
        });
      }
    });

    socket.on(
      "material_lottery_get_room_by_stake",
      async ({ stakeAmount, userId, maxPlayers }) => {
        try {
          if (!stakeAmount || isNaN(stakeAmount)) {
            socket.emit("error", { message: "Invalid stake amount" });
            return;
          }
          const max_players =
            maxPlayers && !isNaN(maxPlayers) ? parseInt(maxPlayers) : 10;

          let game = await MaterialLottery.findOne({
            bet_amount: parseFloat(stakeAmount),
            max_players,
            status: "pending",
            gameType: "material_lottery",
          });

          if (!game) {
            const rewards = [
              { rank: 1, type: "material", description: "Smartphone" },
              {
                rank: 2,
                type: "monetary",
                description: "Cash Prize",
                amount: parseFloat(stakeAmount) * max_players * 0.5,
              },
            ];
            game = await MaterialLottery.create({
              bet_amount: parseFloat(stakeAmount),
              max_players,
              status: "pending",
              gameType: "material_lottery",
              rewards,
            });
            logger.info(
              `Created new Material Lottery game ${game._id} for stake ${stakeAmount}, max_players ${max_players}`
            );
          }

          socket.emit("material_lottery_room_data", {
            roomId: String(game._id),
            bet_amount: game.bet_amount,
            max_players: game.max_players,
            round: game.round || 1,
            status: game.status,
            participants: [],
            rewards: game.rewards,
            gameType: "material_lottery",
          });

          const games = await MaterialLottery.find({
            status: { $in: ["pending", "in_progress"] },
            gameType: "material_lottery",
          }).populate({
            path: "participants.user_id",
            select: "fullName",
          });

          logger.debug("material_lottery_get_room_by_stake games", {
            socketId: socket.id,
            count: Array.isArray(games) ? games.length : 0,
          });

          const gamesWithRewards = games.map((game) => ({
            _id: game._id,
            bet_amount: game.bet_amount,
            max_players: game.max_players,
            round: game.round || 1,
            status: game.status,
            created_at: game.created_at?.toISOString() || null,
            participants:
              game.participants
                ?.filter(
                  (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
                )
                .map((p) => ({
                  user_id: p.user_id._id,
                  full_name: p.user_id.fullName,
                  numbers: p.numbers,
                  paid_status: p.paid_status,
                  rank: p.rank || [],
                })) || [],
            rewards: game.rewards,
            gameType: "material_lottery",
          }));

          io.emit("material_lottery_rooms", gamesWithRewards);
        } catch (error) {
          logger.error(
            `Error in Material Lottery get_room_by_stake: ${error.message}`
          );
          socket.emit("error", {
            message: "Failed to fetch or create Material Lottery room",
          });
        }
      }
    );

    socket.on(
      "get_active_material_lottery_games_by_stake",
      async ({ stakeAmount, maxPlayers }) => {
        try {
          if (!stakeAmount || isNaN(stakeAmount)) {
            socket.emit("error", { message: "Invalid stake amount" });
            return;
          }
          const max_players =
            maxPlayers && !isNaN(maxPlayers) ? parseInt(maxPlayers) : 10;

          const activeGames = await MaterialLottery.find({
            bet_amount: parseFloat(stakeAmount),
            max_players,
            status: { $in: ["pending", "in_progress"] },
            gameType: "material_lottery",
          });

          socket.emit("active_material_lottery_games_by_stake", {
            stakeAmount,
            maxPlayers: max_players,
            count: activeGames.length,
            gameType: "material_lottery",
          });
        } catch (error) {
          logger.error(
            `Error in Material Lottery get_active_games_by_stake: ${error.message}`
          );
          socket.emit("error", {
            message: "Failed to fetch active Material Lottery games",
          });
        }
      }
    );

    socket.on("join_material_lottery", async (gameId) => {
      try {
        logger.debug("Attempting to join material lottery game", {
          socketId: socket.id,
          gameId,
        });
        if (!gameId) {
          socket.emit("error", { message: "Invalid gameId", gameId });
          return;
        }

        let game = await MaterialLottery.findById(gameId).populate({
          path: "participants.user_id",
          select: "fullName",
        });

        game = (await reconcileMaterialGame(game)) || game;

        logger.debug("join_material_lottery fetched game", {
          socketId: socket.id,
          gameId,
          status: game?.status,
        });

        if (!game || game.gameType !== "material_lottery") {
          socket.emit("error", {
            message: "Material Lottery game not found",
            gameId,
          });
          return;
        }

        // Prevent duplicate joins
        if (socket.rooms.has(gameId)) {
          logger.debug("Socket already in room", { socketId: socket.id, gameId });
          return;
        }

        socket.join(gameId);
        logger.info("Socket joined material lottery room", {
          socketId: socket.id,
          gameId,
        });

        const roomData = {
          roomId: String(game._id),
          bet_amount: game.bet_amount,
          max_players: game.max_players,
          round: game.round || 1,
          status: game.status,
          participants:
            game.participants
              ?.filter(
                (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
              )
              .map((p) => ({
                user_id: p.user_id._id,
                full_name: p.user_id.fullName,
                numbers: p.numbers,
                paid_status: p.paid_status,
                rank: p.rank || [],
              })) || [],
          rewards: game.rewards,
          gameType: "material_lottery",
        };

        socket.emit("material_lottery_room_data", roomData);
        socket.to(gameId).emit("material_lottery_room_data", roomData);
      } catch (error) {
        logger.error(
          `Error joining Material Lottery game ${gameId}: ${error.message}`
        );
        socket.emit("error", {
          message: "Failed to join Material Lottery game",
          gameId,
        });
      }
    });

    socket.on(
      "join_material_lottery_game",
      async ({ gameId, userId, selectedNumbers }, callback) => {
        try {
          logger.debug("join_material_lottery_game inputs", {
            socketId: socket.id,
            gameId,
            selectedNumbersCount: Array.isArray(selectedNumbers)
              ? selectedNumbers.length
              : 0,
          });

          // Validate inputs
          if (
            !gameId ||
            !userId ||
            !selectedNumbers ||
            !Array.isArray(selectedNumbers) ||
            selectedNumbers.length === 0
          ) {
            logger.warn("Validation failed for join_material_lottery_game", {
              socketId: socket.id,
              gameId,
              hasUserId: Boolean(userId),
              selectedNumbersCount: Array.isArray(selectedNumbers)
                ? selectedNumbers.length
                : 0,
            });
            callback({
              error: { message: "Invalid gameId, userId, or selectedNumbers" },
            });
            return;
          }

          // Check for duplicate numbers
          const uniqueNumbers = [...new Set(selectedNumbers)];
          if (uniqueNumbers.length !== selectedNumbers.length) {
            logger.warn("Validation failed: duplicate numbers", {
              socketId: socket.id,
              gameId,
            });
            callback({
              error: { message: "Duplicate numbers are not allowed" },
            });
            return;
          }

          // Validate game
          const game = await MaterialLottery.findById(gameId);
          logger.debug("Material Lottery game loaded", {
            socketId: socket.id,
            gameId,
            found: Boolean(game),
            status: game?.status,
          });
          if (
            !game ||
            game.status !== "pending" ||
            game.gameType !== "material_lottery"
          ) {
            logger.warn("Material Lottery game validation failed", {
              gameId,
              status: game?.status,
              gameType: game?.gameType,
            });
            callback({
              error: { message: "Material Lottery game not available" },
            });
            return;
          }

          // Validate numbers
          const invalidNumbers = selectedNumbers.filter(
            (num) => num < 1 || num > game.max_players || !Number.isInteger(num)
          );
          if (invalidNumbers.length > 0) {
            logger.warn("Invalid numbers in material lottery selection", {
              socketId: socket.id,
              gameId,
              invalidCount: invalidNumbers.length,
            });
          }
          if (invalidNumbers.length > 0) {
            callback({
              error: {
                message: `Invalid numbers: ${invalidNumbers.join(
                  ", "
                )}. Must be integers between 1 and ${game.max_players}`,
              },
            });
            return;
          }

          // Check for taken numbers
          const takenNumbers = game.participants.flatMap((p) =>
            Array.isArray(p.numbers) ? p.numbers : []
          );
          const alreadyTaken = selectedNumbers.filter((num) =>
            takenNumbers.includes(num)
          );
          if (alreadyTaken.length > 0) {
            callback({
              error: {
                message: `Numbers ${alreadyTaken.join(", ")} are already taken`,
              },
            });
            return;
          }

          // Validate user
          const user = await User.findById(userId);
          if (!user) {
            callback({ error: { message: "User not found" } });
            return;
          }

          // Check wallet + bonus balance
          const totalCost = game.bet_amount * selectedNumbers.length;
          const totalAvailable = (user.wallet || 0) + (user.bonus || 0);
          if (totalAvailable < totalCost) {
            callback({
              error: {
                message: `Insufficient balance. Required: ${totalCost} ETB, Available: ${totalAvailable} ETB`,
              },
            });
            return;
          }

          // Deduct from wallet first, then bonus
          let walletUsed = 0;
          let bonusUsed = 0;
          if (user.wallet >= totalCost) {
            walletUsed = totalCost;
          } else {
            walletUsed = user.wallet;
            bonusUsed = totalCost - walletUsed;
          }
          user.wallet -= walletUsed;
          user.bonus -= bonusUsed;
          await user.save();

          const existingParticipant = game.participants.find((p) =>
            p.user_id.equals(userId)
          );
          if (existingParticipant) {
            const combinedNumbers = [
              ...new Set([...existingParticipant.numbers, ...selectedNumbers]),
            ];
            if (combinedNumbers.length > game.max_players) {
              callback({
                error: {
                  message: `Cannot select more than ${game.max_players} numbers`,
                },
              });
              return;
            }
            existingParticipant.numbers = combinedNumbers;
            existingParticipant.paid_status = "paid";
          } else {
            game.participants.push({
              user_id: userId,
              full_name: user.fullName,
              numbers: selectedNumbers,
              paid_status: "paid",
              rank: [],
            });
          }

          const totalNumbersTaken = game.participants.reduce(
            (sum, p) => sum + (Array.isArray(p.numbers) ? p.numbers.length : 0),
            0
          );
          if (totalNumbersTaken >= game.max_players) {
            game.status = "in_progress";
          }

          await game.save();

          let updatedGame = await MaterialLottery.findById(gameId).populate({
            path: "participants.user_id",
            select: "fullName",
          });

          logger.debug("Material Lottery game updated", {
            socketId: socket.id,
            gameId,
            status: updatedGame?.status,
            participantsCount: Array.isArray(updatedGame?.participants)
              ? updatedGame.participants.length
              : 0,
          });

          const roomData = {
            roomId: String(gameId),
            bet_amount: updatedGame.bet_amount,
            max_players: updatedGame.max_players,
            round: updatedGame.round || 1,
            status: updatedGame.status,
            participants:
              updatedGame.participants
                ?.filter(
                  (p) => p && p.user_id && p.user_id._id && p.user_id.fullName
                )
                .map((p) => ({
                  user_id: p.user_id._id,
                  full_name: p.user_id.fullName,
                  numbers: p.numbers,
                  paid_status: p.paid_status,
                  rank: p.rank || [],
                })) || [],
            rewards: updatedGame.rewards,
            gameType: "material_lottery",
            shake: totalNumbersTaken >= updatedGame.max_players,
          };

          io.to(gameId).emit("material_lottery_room_data", roomData);
          socket.emit("join_success", { gameId });
          callback({
            success: true,
            message: `Joined game with numbers: ${selectedNumbers.join(", ")}`,
          });

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
              const totalPaid = perPrice * selectedNumbers.length;
              const msg = `🎫 MATERIAL LOTTERY TICKET CONFIRMATION\n\nRound: ${
                updatedGame.round || 1
              }\nNumbers: ${
                selectedNumbers.join(", ") || "-"
              }\nPrice per number: ${perPrice} ETB\nTotal paid: ${totalPaid} ETB\nNew balance: ${freshUser.wallet.toFixed(
                2
              )} ETB`;
              await notify.NotifyUserTelegram(freshUser.telegramId, msg);
            }
          } catch (notifyErr) {
            logger.warn("Failed to send Material Lottery purchase confirmation", {
              error: notifyErr?.message,
            });
          }

          if (totalNumbersTaken >= updatedGame.max_players) {
            io.to(gameId).emit("gameUpdate", {
              type: "status",
              status: "in_progress",
              message: "Material Lottery game starting...",
              gameType: "material_lottery",
              roomId: String(gameId),
            });
            setTimeout(async () => {
              // Emit shake state and trigger client reshake
              io.to(gameId).emit("material_lottery_room_data", {
                ...roomData,
                shake: true,
              });
              io.to(gameId).emit("material_lottery_reshake", {
                roomId: String(gameId),
                shake: true,
              });
            }, 500);
            setTimeout(async () => {
              // Determine winners from a fresh snapshot and finalize
              const refreshed = await MaterialLottery.findById(gameId).populate(
                {
                  path: "participants.user_id",
                  select: "fullName",
                }
              );
              const winners = selectWinners(refreshed);
              refreshed.winners = winners;
              refreshed.status = "completed";
              refreshed.completed_at = new Date();
              await refreshed.save();

              // Announce each winner with a delay
              const DELAY_MS = 2000;
              winners.forEach((winner, idx) => {
                setTimeout(async () => {
                  const reward = refreshed.rewards.find(
                    (r) => r.rank === winner.rank
                  );
                  // Record payout
                  const payout = new MaterialPayout({
                    user_id: winner.user_id,
                    game_id: gameId,
                    amount: reward.type === "monetary" ? reward.amount : 0,
                    description: reward.description,
                    type: reward.type,
                    rank: winner.rank,
                    status: reward.type === "monetary" ? "paid" : "pending",
                  });
                  await payout.save();
                  // Update user wallet if monetary
                  if (reward.type === "monetary") {
                    const winnerUser = await User.findById(winner.user_id);
                    winnerUser.wallet += reward.amount;
                    await winnerUser.save();
                    io.to(winner.user_id.toString()).emit("walletUpdate", {
                      wallet: winnerUser.wallet,
                      bonus: winnerUser.bonus,
                    });
                  }
                  // Emit individual winner event
                  io.to(gameId).emit("gameUpdate", {
                    type: "winner",
                    rank: winner.rank,
                    number: winner.numbers[0],
                    prize:
                      reward.type === "monetary"
                        ? reward.amount
                        : reward.description,
                    user: winner.full_name,
                    gameType: "material_lottery",
                    roomId: String(gameId),
                  });
                }, (idx + 1) * DELAY_MS);
              });

              // After all winners, send final status and notifications
              setTimeout(async () => {
                const completedGame = await MaterialLottery.findById(
                  gameId
                ).populate({
                  path: "participants.user_id",
                  select: "fullName",
                });
                const afterData = {
                  roomId: String(gameId),
                  bet_amount: completedGame.bet_amount,
                  max_players: completedGame.max_players,
                  round: completedGame.round || 1,
                  status: completedGame.status,
                  participants:
                    completedGame.participants
                      ?.filter((p) => p && p.user_id && p.user_id.fullName)
                      .map((p) => ({
                        user_id: p.user_id._id,
                        full_name: p.user_id.fullName,
                        numbers: p.numbers,
                        paid_status: p.paid_status,
                        rank: p.rank || [],
                      })) || [],
                  rewards: completedGame.rewards,
                  gameType: "material_lottery",
                };
                io.to(gameId).emit("material_lottery_room_data", afterData);
                io.to(gameId).emit("gameUpdate", {
                  type: "status",
                  status: "completed",
                  gameType: "material_lottery",
                  roomId: String(gameId),
                });

                // Notify all participants via Telegram
                try {
                  const notify = require("../botController/notification.js");
                  const participantIds = completedGame.participants.map(
                    (p) => p.user_id._id
                  );
                  const users = await User.find({
                    _id: { $in: participantIds },
                  });
                  const date = new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                  users.forEach(async (user) => {
                    if (user.telegramId) {
                      let msg = `🎉 <b>MATERIAL LOTTERY RESULTS</b> 🎉\n\nRound: ${
                        completedGame.round || 1
                      }\nDraw Date: ${date}\n━━━━━━━━━━━━━\n\n`;
                      msg += `<b>WINNERS</b>\n`;
                      winners.forEach((w) => {
                        const r = completedGame.rewards.find(
                          (x) => x.rank === w.rank
                        );
                        msg += `🥇 Rank ${r.rank}: <b>${w.numbers[0]}</b> (${
                          w.full_name
                        }) - ${
                          r.type === "monetary"
                            ? `${r.amount} ETB`
                            : r.description
                        }\n`;
                      });
                      const wins = winners.filter((w) => {
                        const wId = normalizeUserRef(w.user_id);
                        return wId && wId.toString() === user._id.toString();
                      });
                      msg += `\n${
                        wins.length
                          ? `✨ <b>Congratulations ${
                              user.fullName
                            }! You won rank ${wins
                              .map((w) => w.rank)
                              .join(", ")}</b>`
                          : `🙁 <b>Sorry ${user.fullName}, no win this time.</b>`
                      }\n\n🎫 Next tickets are open!`;
                      await notify.NotifyUserTelegram(user.telegramId, msg);
                    }
                  });
                } catch (e) {
                  logger.warn("Material Lottery notification error", {
                    error: e?.message,
                  });
                }

                // No auto-creation: only admin can create new material lottery games
              }, winners.length * DELAY_MS + 1000);
            }, 15000);
          }
        } catch (error) {
          logger.error(`Error in join_material_lottery_game: ${error.message}`);
          callback({ error: { message: "Server error" } });
        }
      }
    );

    socket.on("disconnect", () => {
      logger.info(`Material Lottery socket disconnected: ${socket.id}`);
    });
  });
};

const selectWinners = (game) => {
  const participants = [...game.participants];
  const availableNumbers = participants.flatMap((p) =>
    Array.isArray(p.numbers)
      ? p.numbers.map((n) => ({
          user_id: p.user_id && p.user_id._id ? p.user_id._id : p.user_id,
          full_name: (p.user_id && p.user_id.fullName) || p.full_name,
          number: n,
        }))
      : []
  );
  const winners = [];

  const ranks = game.rewards.map((r) => r.rank).sort((a, b) => a - b);
  for (const rank of ranks) {
    if (availableNumbers.length === 0) break;
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const winner = availableNumbers[randomIndex];
    if (winner) {
      winners.push({
        user_id: winner.user_id,
        full_name: winner.full_name,
        numbers: [winner.number],
        rank,
      });
      availableNumbers.splice(randomIndex, 1);
      const participant = participants.find((p) => {
        const pid = p.user_id && p.user_id._id ? p.user_id._id : p.user_id;
        return pid && pid.equals
          ? pid.equals(winner.user_id)
          : pid === winner.user_id;
      });
      if (participant) {
        participant.numbers = participant.numbers.filter(
          (n) => n !== winner.number
        );
        if (participant.numbers.length === 0) {
          participants.splice(participants.indexOf(participant), 1);
        }
      }
    }
  }

  return winners;
};

module.exports = initializeMaterialLotterySocket;