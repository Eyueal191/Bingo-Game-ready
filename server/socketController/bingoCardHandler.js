// server/socketController/bingoCardHandler.js
// Models
const {
  GameRoom,
  Reservation,
  BingoCard,
  User,
  MainTransaction,
  TransactionStatus,
  StakeBonusSettings,
  AppConfig,
  CardLock,
  GameTransaction,
  GameTransactionType,
  GameType,
  UserType
} = require("../models");

const mongoose = require("mongoose");
const logger = require("../utils/winstonLogger");
const { NotifyUserTelegram } = require("../botController/notification");
const robotService = require("../services/robotService");

const { ensureTarget, clearTarget } = require("./systemReservationState");

// utils
const {
  fetchCardStatuses,
  attachBonusToRooms,
  maleEthiopianNames,
  drawNumber,
  checkForWin,
  buildCardGrid,
  getCardsPerTick,
  getBotDelay,
  getProcessingDelay,
  getSettings
} = require("../utils");

const {
  numberCallingIntervals,
  numberCallingInProgress,
  systemReservationIntervals,
  botReservationCounts,
  roomLocks,
  isNumberCallingInProgress,
  setNumberCallingProgress,
  getCounter,
} = require("./sharedGameState")

// Gather the configured robot bias for this room and translate cards to grids.
const resolveRobotDrawOptions = async (gameRoom, gameRoomId) => {
  try {
    if (!gameRoom?.stakeAmount) return null;

    const stakeAmount = Number(gameRoom.stakeAmount);
    if (Number.isNaN(stakeAmount)) return null;

    const stakeSettings = await StakeBonusSettings.findOne({
      stakeAmount,
    })
      .select("robotEnabled robotWinningPercent")
      .lean();

    if (!stakeSettings || stakeSettings.robotEnabled === false) {
      return null;
    }

    const robotWinningPercent = Math.max(
      0,
      Math.min(100, Number(stakeSettings.robotWinningPercent ?? 0))
    );
    if (!robotWinningPercent || robotWinningPercent <= 0) {
      return null;
    }

    // Dynamic Robot Resolution: Find all active reservations, then filter by isRobot
    const activeReservations = await Reservation.find({
      roomId: gameRoomId,
      status: { $in: ["pending", "active"] },
      playMode: "auto",
    }).lean();

    if (!activeReservations.length) return null;

    const userIds = [...new Set(activeReservations.map((r) => r.userId.toString()))];
    const robotUsers = await User.find({
      _id: { $in: userIds },
      $or: [{ role: "robot" }, { isRobot: true }],
    }).select("_id").lean();

    const robotUserIds = new Set(robotUsers.map((u) => u._id.toString()));
    const robotReservations = activeReservations.filter((r) =>
      robotUserIds.has(r.userId.toString())
    );

    const robotCardIds = robotReservations.flatMap((res) => res.cardIds || []);
    if (!robotCardIds.length) {
      return null;
    }

    const uniqueRobotCardIds = Array.from(new Set(robotCardIds));

    const robotCards = await BingoCard.find({
      cardId: { $in: uniqueRobotCardIds },
    })
      .select(
        "cardId b1 i1 n1 g1 o1 b2 i2 n2 g2 o2 b3 i3 n3 g3 o3 b4 i4 n4 g4 o4 b5 i5 n5 g5 o5"
      )
      .lean();

    const robotCardGrids = robotCards
      .map(buildCardGrid)
      .filter((grid) => Array.isArray(grid));

    if (!robotCardGrids.length) {
      return null;
    }

    return {
      robotWinningPercent,
      robotCardGrids,
    };
  } catch (err) {
    console.error(
      `Failed to resolve robot draw options for room ${gameRoomId}:`,
      err
    );
    return null;
  }
};
const refreshRoomState = async (io, roomId) => {
  try {
    const gameRoom = await GameRoom.findById(roomId);
    if (!gameRoom) return;

    const reservations = await Reservation.find({
      roomId,
      status: { $in: ["pending", "active"] },
    });

    // Use Set to deduplicate cards across all reservations
    const uniqueCardIds = new Set();
    reservations.forEach((reservation) => {
      (reservation.cardIds || []).forEach((cardId) => uniqueCardIds.add(cardId));
    });
    const totalCards = uniqueCardIds.size;

    const totalStake = totalCards * gameRoom.stakeAmount;
    const stakeSettings = await StakeBonusSettings.findOne({
      stakeAmount: Number(gameRoom.stakeAmount),
    });
    const systemCommission = stakeSettings?.systemCommission || 0.2;
    const houseProfit = totalStake * systemCommission;
    const winAmount = totalStake - houseProfit;

    gameRoom.numberOfPlayers = totalCards;
    gameRoom.winAmount = winAmount;
    await gameRoom.save();

    io.to(roomId).emit("cards", await fetchCardStatuses(roomId));

    const activeRooms = await GameRoom.find({
      status: { $nin: ["completed"] },
    });
    const roomsWithBonus = await attachBonusToRooms(activeRooms);
    io.emit("rooms", roomsWithBonus);
  } catch (error) {
    logger.error(`Failed to refresh room state for ${roomId}`, error);
  }
};



const callBingoNumber = async (io, gameRoomId) => {
  try {
    logger.debug(`Calling bingo number for ${gameRoomId}`);
    const gameRoom = await GameRoom.findById(gameRoomId);
    if (!gameRoom || gameRoom.status !== "playing") {
      logger.debug(`GameRoom ${gameRoomId} not in playing state`, {
        status: gameRoom?.status,
      });
      return;
    }

    let drawnNumbers = gameRoom.drawnNumbers || [];
    const drawOptions = await resolveRobotDrawOptions(gameRoom, gameRoomId);
    const drawnNumber = drawNumber(drawnNumbers, drawOptions);
    if (drawnNumber === null) {
      await handleGameOver(io, gameRoomId, []);
      return;
    }

    drawnNumbers.push(drawnNumber);
    gameRoom.drawnNumbers = drawnNumbers;
    await gameRoom.save();

    io.to(gameRoomId).emit("number_called", {
      number: drawnNumber,
      drawnNumbers,
      totalCalledNumbers: drawnNumbers.length,
    });

    // Check for winners in auto mode after each number
    if (drawnNumbers.length >= 4) {
      const autoWinners = await checkForWinners(
        gameRoomId,
        drawnNumbers,
        "auto"
      );
      if (autoWinners.length > 0) {
        // Emit bingo winner event for auto mode and end game
        autoWinners.forEach((winner) => {
          io.to(gameRoomId).emit("bingo_winner", {
            userId: winner.userId,
            cardId: winner.cardId,
            winningCombo: winner.winningCombo,
          });
        });
        await handleGameOver(io, gameRoomId, autoWinners, "auto");
      }
    }
  } catch (error) {
    logger.error(`Error in callBingoNumber for ${gameRoomId}`, error);
    io.to(gameRoomId).emit("error", { message: "Failed to call bingo number" });
  }
};

const checkForWinners = async (gameRoomId, drawnNumbers, playMode) => {
  const reservations = await Reservation.find({
    roomId: gameRoomId,
    status: { $in: ["pending", "active"] },
    playMode: playMode,
    isDisqualified: false,
  });
  const winners = [];

  // Read win pattern from settings
  const settings = await getSettings();
  const winPattern = settings.winPattern || "two_line";

  for (const reservation of reservations) {
    logger.debug("Checking reservation for winners", {
      roomId: String(gameRoomId),
      cardsCount: Array.isArray(reservation.cardIds) ? reservation.cardIds.length : 0,
      playMode,
      drawnCount: Array.isArray(drawnNumbers) ? drawnNumbers.length : 0,
    });
    // Check each card, but stop after finding one winning pattern for this user
    for (const cardId of reservation.cardIds) {
      const card = await BingoCard.findOne({ cardId });
      logger.debug("Fetched bingo card", {
        roomId: String(gameRoomId),
        found: Boolean(card),
      });

      if (!card) continue;

      const cardGrid = buildCardGrid(card);
      if (!cardGrid) continue;

      const winningCard = checkForWin(cardGrid, drawnNumbers, winPattern);
      if (winningCard) {
        winners.push({
          userId: reservation.userId,
          cardId,
          winningCombo: winningCard.winningCombo,
          cardGrid: cardGrid,
        });
        break; // Stop checking other cards for this user after one win
      }
    }
  }
  return winners;
};

const handleGameOver = async (io, gameRoomId, winners = [], type = "auto") => {
  try {
    const gameRoom = await GameRoom.findById(gameRoomId);
    const reservations = await Reservation.find({
      roomId: gameRoomId,
      status: { $in: ["pending", "active"] },
    });

    const reservationMap = new Map(
      reservations.map((reservation) => [
        reservation.userId.toString(),
        reservation,
      ])
    );

    const uniqueWinnersMap = new Map();
    for (const winner of winners) {
      if (!winner) continue;
      const userIdValue =
        winner.userId && typeof winner.userId.toString === "function"
          ? winner.userId.toString()
          : String(winner.userId);
      const key = `${userIdValue}-${winner.cardId}`;
      if (!uniqueWinnersMap.has(key)) {
        uniqueWinnersMap.set(key, winner);
      }
    }
    const uniqueWinners = Array.from(uniqueWinnersMap.values());

    const eligibleWinners = uniqueWinners.filter((winner) => {
      const winnerId =
        winner.userId && typeof winner.userId.toString === "function"
          ? winner.userId.toString()
          : String(winner.userId);
      const reservation = reservationMap.get(winnerId);
      return !(reservation?.isDisqualified);
    });

    // Calculate total stake and prize distribution (deduplicate cards)
    const uniqueCardIds = new Set();
    reservations.forEach((r) => {
      (r.cardIds || []).forEach((cardId) => uniqueCardIds.add(cardId));
    });
    const totalCards = uniqueCardIds.size;
    const totalStake = totalCards * gameRoom.stakeAmount;

    // Get system commission from stake bonus settings
    const stakeSettings = await StakeBonusSettings.findOne({
      stakeAmount: Number(gameRoom.stakeAmount),
    });
    const systemCommission = stakeSettings?.systemCommission || 0.2; // Default to 20% if not set

    const houseProfit = totalStake * systemCommission;
    const winAmount = totalStake - houseProfit;

    if (totalCards === 0 && gameRoom.status === 'playing') {
      logger.error(`Critical: Game ${gameRoomId} ended with 0 total cards!`, {
        roomId: gameRoomId,
        stake: gameRoom.stakeAmount
      });
    }

    if (winAmount === 0 && totalCards > 0) {
      logger.warn(`Win Amount is 0 despite having cards for room ${gameRoomId}`, {
        totalCards,
        totalStake,
        systemCommission
      });
    }

    const prizePerWinner =
      eligibleWinners.length > 0 ? winAmount / eligibleWinners.length : 0;

    // Use random name for system bot winner
    const winnersWithDetails = await Promise.all(
      eligibleWinners.map(async (winner) => {
        const user = await User.findById(winner.userId);
        if (user && (user.isRobot || user.role === 'robot')) {
          // Use robot profile names or fallback
          const names = await robotService.getRobotNames(user._id);
          const namePool = (names && names.length > 0) ? names : maleEthiopianNames;

          const firstName =
            namePool[
            Math.floor(Math.random() * namePool.length)
            ];
          return {
            ...winner,
            firstName,
          };
        } else {
          // Real user
          const fullName = user?.fullName || "Unknown";
          const firstName = fullName.includes(" ")
            ? fullName.split(" ")[0]
            : fullName;
          return {
            ...winner,
            firstName,
          };
        }
      })
    );

    // Update GameRoom with winners and prize
    gameRoom.winners = eligibleWinners.map((w) => ({
      userId: w.userId,
      cardId: w.cardId,
      prize: prizePerWinner,
    }));
    gameRoom.houseProfit = houseProfit;
    gameRoom.completedAt = new Date();
    gameRoom.status = "completed";
    await gameRoom.save();



    const stake = parseFloat(gameRoom.stakeAmount);
    let waitingRoom = await GameRoom.findOne({
      stakeAmount: stake,
      status: { $in: ["waiting", "starting"] },
    });
    let roomToEmit = waitingRoom;

    if (!waitingRoom) {
      const bonusSettings = await StakeBonusSettings.findOne({
        stakeAmount: gameRoom.stakeAmount,
      });

      roomToEmit = new GameRoom({
        status: "waiting",
        numberOfPlayers: 0,
        stakeAmount: stake,
        winAmount: 0,
        bonusEnabled: bonusSettings?.bonusEnabled || false,
        bonusAmount: bonusSettings?.bonusAmount || 0,
        bonusDescription: bonusSettings?.bonusDescription || "",
      });
      await roomToEmit.save();
      logger.info(`Created new game room ${roomToEmit._id} for stake ${stake}`);
    } else {
      logger.debug(`Reusing existing waiting room ${waitingRoom._id} for stake ${stake}`);
    }

    // Notify clients which room they should join next
    io.to(gameRoomId).emit("new_room_created", {
      stakeAmount: stake,
      roomId: roomToEmit._id,
    });

    // Update Reservations with game outcome
    for (const reservation of reservations) {
      if (reservation.isDisqualified) {
        reservation.gameStatus = "lost";
        reservation.status = "completed";
        await reservation.save();
        continue;
      }
      const isManual = reservation.playMode === "manual";
      const isWinner = eligibleWinners.some(
        (w) => w.userId.toString() === reservation.userId.toString()
      );
      if (isManual && !isWinner) continue;
      reservation.gameStatus = isWinner ? "won" : "lost";
      reservation.status = "completed";
      await reservation.save();
    }

    // Release all CardLocks for this room (game has ended)
    await CardLock.deleteMany({ roomId: gameRoomId });
    const winnerUpdates = eligibleWinners.map(async (winner) => {
      const user = await User.findById(winner.userId);
      if (user) {
        const isRobot = user.isRobot || user.role === 'robot';
        const walletBefore = user.wallet;

        if (isRobot) {
          await robotService.addRobotWinnings(
            winner.userId.toString(),
            prizePerWinner,
            `Won game in room ${gameRoomId}`
          );
        } else {
          user.wallet += prizePerWinner;
          await user.save();

          io.to(winner.userId.toString()).emit("walletUpdate", {
            wallet: user.wallet,
            bonus: user.bonus,
          });

          if (user.telegramId && (!isRobot||user.role!=='robot')&& !user.telegramId.startsWith("web_")) {
            try {
              await NotifyUserTelegram(user.telegramId, `💰 Congratulations!\nYou've won ${prizePerWinner} ETB in Bingo room ${gameRoomId.toString().slice(-6)}. Your new balance is ${user.wallet} ETB.`);
            } catch (e) {
              logger.error("Failed to notify bingo winner via Telegram", { userId: user._id, error: e.message });
            }
          }
        }

        const gameTx = new GameTransaction({
          userId: winner.userId,
          userType: isRobot ? UserType.ROBOT : UserType.USER,
          type: GameTransactionType.WIN,
          gameType: GameType.BINGO,
          roomId: gameRoomId,
          amount: prizePerWinner,
          stakeAmount: gameRoom.stakeAmount,
          cardIds: [winner.cardId],
          walletBefore: walletBefore,
          walletAfter: walletBefore + prizePerWinner,
          description: `Won ${prizePerWinner} with card ${winner.cardId}`,
        });
        await gameTx.save();
      }
    });
    await Promise.all(winnerUpdates);

    // Award bonus for fast win if enabled
    if (gameRoom.bonusEnabled && gameRoom.bonusAmount > 0) {
      for (const winner of eligibleWinners) {
        if (gameRoom.drawnNumbers.length <= 4) {
          const user = await User.findById(winner.userId);
          if (user && !user.isRobot && user.role !== 'robot') {
            // Fast win bonus goes to bonus (play-only balance), not wallet
            user.bonus = (user.bonus || 0) + gameRoom.bonusAmount;
            await user.save();
            const bonusTx = new MainTransaction({
              userId: winner.userId,
              type: "game_bonus",
              amount: gameRoom.bonusAmount,
              status: TransactionStatus.COMPLETED,
              reference: `bonus-${gameRoom._id}-${winner.userId}-${Date.now()}`,
              description: `Bonus for fast win (<=4 calls) in room ${gameRoom._id}`,
            });
            await bonusTx.save();
            io.to(winner.userId.toString()).emit("walletUpdate", {
              wallet: user.wallet,
              bonus: user.bonus,
            });
            io.to(winner.userId.toString()).emit("bonusAwarded", {
              amount: gameRoom.bonusAmount,
              reason: "Fast win bonus",
            });
          }
        }
      }
    }

    // Notify all players of game result
    for (const reservation of reservations) {
      const userId = reservation.userId.toString();
      const userCards = reservation.cardIds;
      const isWinner = eligibleWinners.some(
        (w) => w.userId.toString() === userId
      );
      const userPrize = isWinner ? prizePerWinner : 0;
      const userLoss = isWinner ? 0 : gameRoom.stakeAmount * userCards.length;

      const winnerCards = eligibleWinners
        .filter((w) => w.userId.toString() === userId)
        .map((w) => w.cardId);

      const winningCombos = eligibleWinners
        .filter((w) => w.userId.toString() === userId)
        .map((w) => w.winningCombo);

      const winningCardGrids = eligibleWinners
        .filter((w) => w.userId.toString() === userId)
        .map((w) => w.cardGrid);

      const payload = {
        result: isWinner ? "Won" : "Lost",
        winners: eligibleWinners.map((w) => w.userId),
        winningCards: eligibleWinners.map((w) => w.cardId),
        winningCombos: eligibleWinners.map((w) => w.winningCombo),
        firstNames: winnersWithDetails.map((w) => w.firstName),
        prizes: eligibleWinners.map(() => prizePerWinner),
        drawnNumbers: gameRoom.drawnNumbers,
        numberOfPlayers: totalCards,
        winAmount,
        winningCardGrids: eligibleWinners.map((w) => w.cardGrid),
        userPrize,
        userLoss,
      };

      io.to(gameRoomId).emit(`game_over_${userId}`, payload);
    }

    io.to(gameRoomId).emit("cards", await fetchCardStatuses(gameRoomId));
    io.emit(
      "rooms",
      await GameRoom.find({
        status: { $nin: ["completed"] },
      })
    );

    stopNumberCallingLoop(gameRoomId);

    // Kick off system bot reservations for the next (waiting) room after slight delay
    setTimeout(() => {
      try {
        startSystemReservationBot(io, roomToEmit._id);
      } catch (e) {
        logger.error("Failed to start system reservation bot for new room", e);
      }
    }, 1200);
  } catch (error) {
    logger.error(`Error in handleGameOver for ${gameRoomId}`, error);
    io.to(gameRoomId).emit("error", { message: "Failed to end game" });
  }
};



const startNumberCallingLoop = async (io, gameRoomId) => {
  if (numberCallingIntervals.has(gameRoomId)) {
    logger.debug(`Number calling loop already running for ${gameRoomId}`);
    return;
  }

  const interval = 4000;
  const tick = async () => {
    try {
      if (isNumberCallingInProgress(gameRoomId)) {
        logger.warn(
          `Previous callBingoNumber still in progress for ${gameRoomId}, skipping this tick`
        );
        numberCallingIntervals.set(gameRoomId, setTimeout(tick, interval));
        return;
      }
      setNumberCallingProgress(gameRoomId, true);
      const gameRoom = await GameRoom.findById(gameRoomId);
      if (!gameRoom || gameRoom.status !== "playing") {
        stopNumberCallingLoop(gameRoomId);
        setNumberCallingProgress(gameRoomId, false);
        return;
      }
      await callBingoNumber(io, gameRoomId);
    } catch (err) {
      logger.error(`Tick error for room ${gameRoomId}`, err);
    } finally {
      setNumberCallingProgress(gameRoomId, false);
      if (numberCallingIntervals.has(gameRoomId)) {
        numberCallingIntervals.set(gameRoomId, setTimeout(tick, interval));
      }
    }
  };

  // Initial call - fetch settings first
  const settings = await getSettings();
  const initialInterval = settings.numberCallingInterval || 4000;
  numberCallingIntervals.set(gameRoomId, setTimeout(tick, initialInterval));
  logger.info(`Started number calling loop (sequential) for ${gameRoomId} with interval ${initialInterval}ms`);
};

const stopNumberCallingLoop = (gameRoomId) => {
  if (numberCallingIntervals.has(gameRoomId)) {
    clearTimeout(numberCallingIntervals.get(gameRoomId));
    numberCallingIntervals.delete(gameRoomId);
    setNumberCallingProgress(gameRoomId, false);
    logger.info(`Stopped number calling loop for ${gameRoomId}`);
  }
};

function registerManualBingoClaim(io, socket) {
  socket.on(
    "manual_bingo_claim",
    async ({ userId, cardId, roomId, cardGrid }) => {
      try {
        const gameRoom = await GameRoom.findById(roomId);
        if (!gameRoom || gameRoom.status !== "playing") {
          socket.emit("bingo_invalid", {
            message: "Game is not in playing state.",
          });
          return;
        }

        const reservation = await Reservation.findOne({
          userId,
          roomId,
          status: { $in: ["pending", "active"] },
          playMode: "manual",
        });

        if (!reservation) {
          socket.emit("bingo_invalid", {
            message: "Invalid card or reservation.",
          });
          return;
        }

        if (!reservation.cardIds.includes(cardId)) {
          socket.emit("bingo_invalid", {
            message: "Invalid card or reservation.",
          });
          return;
        }

        if (reservation.isDisqualified) {
          socket.emit("bingo_invalid", {
            message:
              reservation.disqualificationReason ||
              "You're already watching this round after an invalid claim.",
            disqualified: true,
            watcherOnly: true,
            cards: reservation.cardIds || [],
          });
          return;
        }

        // Read win pattern from settings
        const currentSettings = await getSettings();
        const winPattern = currentSettings.winPattern || "two_line";

        const isWinner = checkForWin(cardGrid, gameRoom.drawnNumbers, winPattern);
        if (!isWinner) {
          const disqualificationNotice =
            "Invalid Bingo claim. All of your cards are disqualified and you're now watching this round.";

          try {
            const activeReservations = await Reservation.find({
              userId,
              roomId,
              status: { $in: ["pending", "active"] },
            });

            const disqualifiedCardIds = [
              ...new Set(
                activeReservations.flatMap((res) => res.cardIds || [])
              ),
            ];

            if (activeReservations.length > 0) {
              const reservationIds = activeReservations.map((res) => res._id);
              await Reservation.updateMany(
                { _id: { $in: reservationIds } },
                {
                  $set: {
                    gameStatus: "lost",
                    isDisqualified: true,
                    disqualifiedAt: new Date(),
                    disqualificationReason: disqualificationNotice,
                  },
                }
              );
            }

            await refreshRoomState(io, roomId);

            socket.emit("bingo_invalid", {
              message: disqualificationNotice,
              disqualified: true,
              watcherOnly: true,
              cards: disqualifiedCardIds,
            });
          } catch (disqualificationError) {
            logger.error("Failed to disqualify invalid bingo claim", disqualificationError);
            socket.emit("bingo_invalid", {
              message: disqualificationNotice,
              disqualified: true,
              watcherOnly: true,
              cards: reservation.cardIds || [],
            });
          }
          return;
        }

        // End the game with the claiming winner
        await handleGameOver(
          io,
          roomId,
          [
            {
              userId,
              cardId,
              winningCombo: isWinner.winningCombo,
              cardGrid,
            },
          ],
          "manual"
        );
      } catch (err) {
        logger.error("Error in manual_bingo_claim", err);
        socket.emit("error", { message: "Manual Bingo claim failed." });
      }
    }
  );
}


// ---------------- System Reservation Bot Logic ----------------
async function startSystemReservationBot(io, roomId) {
  if (systemReservationIntervals.has(roomId)) return; // already running
  const loop = async () => {
    let cardsReservedThisTick = 0;
    let nextBotCapacityHint = 0;
    let settings = null;
    let targetCards = 0;
    try {
      settings = await getSettings();

      if (roomLocks.get(roomId)) return; // skip this tick if locked
      roomLocks.set(roomId, true);

      const gameRoom = await GameRoom.findById(roomId);
      if (!gameRoom || ["playing", "completed"].includes(gameRoom.status)) {
        stopSystemReservationBot(roomId);
        roomLocks.delete(roomId);
        return;
      }

      // Dynamic Robot Retrieval (must happen AFTER gameRoom is fetched)
      let systemUserId = null;
      try {
        const robotUser = await robotService.getRobotForStake(gameRoom.stakeAmount);
        systemUserId = robotUser._id.toString();
      } catch (e) {
        logger.error("Failed to get robot user for system reservation", e);
        roomLocks.delete(roomId);
        return;
      }

      let reservations = await Reservation.find({ roomId, status: "active" });
      let totalCards = reservations.reduce((s, r) => s + r.cardIds.length, 0);
      let userReservedCards = reservations
        .filter((r) => r.userId.toString() !== systemUserId)
        .reduce((s, r) => s + r.cardIds.length, 0);

      // Check if robot is enabled globally and for this stake
      const appConfig = await AppConfig.getConfig();
      const robotStakeSettings = await StakeBonusSettings.findOne({ stakeAmount: gameRoom.stakeAmount });
      if (!appConfig.robotEnabledGlobal || !robotStakeSettings?.robotEnabled) {
        roomLocks.delete(roomId);
        return;
      }

      // Stop ONLY if room has reached maximum total cards
      // NOTE: Robot target is managed separately via robotMinCards/robotMaxCards
      if (totalCards >= settings.maxTotalCards) {
        roomLocks.delete(roomId);
        stopSystemReservationBot(roomId);
        logger.debug(`Room ${roomId} reached maxTotalCards (${settings.maxTotalCards}), stopping bot`);
        return;
      }


      // Get bot's current total cards
      const botReservations = reservations.filter(
        (r) => r.userId.toString() === systemUserId
      );
      let botTotalCards = botReservations.reduce(
        (sum, r) => sum + r.cardIds.length,
        0
      );
      const robotMinCards = Math.max(
        1,
        robotStakeSettings.robotMinCards || 1
      );
      const robotMaxCards = Math.max(
        robotMinCards,
        robotStakeSettings.robotMaxCards || robotMinCards
      );
      targetCards = await ensureTarget(
        roomId,
        gameRoom.stakeAmount,
        robotMinCards,
        robotMaxCards
      );

      // Stop if bot has reached its target OR room is full
      if (botTotalCards >= targetCards) {
        roomLocks.delete(roomId);
        stopSystemReservationBot(roomId);
        logger.info(`Room ${roomId}: Bot reached target ${targetCards} cards, stopping`);
        return;
      }
      if (totalCards >= settings.maxTotalCards) {
        roomLocks.delete(roomId);
        stopSystemReservationBot(roomId);
        logger.debug(`Room ${roomId}: Reached maxTotalCards, stopping bot`);
        return;
      }

      const maxTotalAllowed = Math.min(
        settings.maxTotalCards ?? Infinity,
        settings.cardAmount ?? Infinity
      );
      const totalCapacityRemaining = Math.max(0, maxTotalAllowed - totalCards);
      let botCapacityRemaining = Math.max(0, targetCards - botTotalCards);
      nextBotCapacityHint = botCapacityRemaining;


      if (totalCapacityRemaining <= 0 || botCapacityRemaining <= 0) {
        roomLocks.delete(roomId);
        stopSystemReservationBot(roomId);
        return;
      }

      const reservedIds = reservations.flatMap((r) => r.cardIds);

      // Also exclude cards that are already locked (prevents race conditions)
      const existingLocks = await CardLock.find({ roomId: new mongoose.Types.ObjectId(roomId) }).select('cardId').lean();
      const lockedCardIds = existingLocks.map(l => l.cardId);
      const excludedIds = [...new Set([...reservedIds, ...lockedCardIds])];

      const availableCards = await BingoCard.find({
        cardId: { $nin: excludedIds },
      });
      if (availableCards.length === 0) {
        roomLocks.delete(roomId);
        stopSystemReservationBot(roomId);
        return;
      }


      if (botCapacityRemaining <= 0) {
        roomLocks.delete(roomId);
        stopSystemReservationBot(roomId);
        return;
      }

      // SIMPLIFIED PACING: Just use essential capacity parameters
      const cardsThisTick = Math.min(
        await getCardsPerTick({
          botCapacityRemaining,
          totalCapacityRemaining,
          availableCards: availableCards.length,
        }),
        availableCards.length,
        totalCapacityRemaining,
        botCapacityRemaining
      );

      const shuffled = [...availableCards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const selectedCards = shuffled.slice(0, cardsThisTick);


      if (selectedCards.length === 0) {
        roomLocks.delete(roomId);
        stopSystemReservationBot(roomId);
        return;
      }

      let successfullyLockedCardIds = [];
      cardsReservedThisTick = selectedCards.length;

      try {
        // ============ ATOMIC CARD LOCKING FOR ROBOTS ============
        const lockDocs = selectedCards.map(c => ({
          roomId: new mongoose.Types.ObjectId(roomId),
          cardId: c.cardId,
          userId: new mongoose.Types.ObjectId(systemUserId),
        }));

        try {
          // ordered: false to allow partial success if some are already locked
          await CardLock.insertMany(lockDocs, { ordered: false });
        } catch (lockError) {
          // If 11000 occurs, some cards were already locked. 
          // However, startSystemReservationBot already filters by $nin reservedIds.
          // This is an extra safety layer against race conditions.
          if (lockError.code !== 11000) throw lockError;
        }

        // Verify which cards we actually locked (to handle race conditions)
        const actualLocks = await CardLock.find({
          roomId: new mongoose.Types.ObjectId(roomId),
          userId: new mongoose.Types.ObjectId(systemUserId),
          cardId: { $in: selectedCards.map(c => c.cardId) }
        }).select('cardId').lean();

        successfullyLockedCardIds = actualLocks.map(l => l.cardId);
        if (successfullyLockedCardIds.length === 0) {
          roomLocks.delete(roomId);
          return;
        }

        await Reservation.findOneAndUpdate(
          { roomId, userId: systemUserId, status: "active" },
          {
            $setOnInsert: {
              roomId,
              userId: systemUserId,
              status: "active",
              gameStatus: "reserved",
              playMode: "auto",
            },
            $addToSet: { cardIds: { $each: successfullyLockedCardIds } },
          },
          { upsert: true, new: true }
        );

        cardsReservedThisTick = successfullyLockedCardIds.length;
        // ============ END ATOMIC CARD LOCKING FOR ROBOTS ============
      } catch (e) {
        if (e.code === 11000) {
          logger.warn(`Bot reservation conflict for room ${roomId}. Retrying next tick.`);
          roomLocks.delete(roomId);
          return;
        }
        throw e;
      }

      // Track Robot Stake and Deduct Wallet
      const cost = cardsReservedThisTick * gameRoom.stakeAmount;
      if (cost > 0) {
        // Deduct wallet
        const updatedRobot = await robotService.deductRobotWallet(
          systemUserId,
          cost,
          `Buy ${cardsReservedThisTick} cards in room ${roomId}`
        );

        // Record Transaction for Revenue Calculation
        await GameTransaction.create({
          userId: systemUserId,
          userType: UserType.ROBOT,
          type: GameTransactionType.STAKE,
          gameType: GameType.BINGO,
          roomId: roomId,
          amount: cost,
          stakeAmount: gameRoom.stakeAmount,
          cardIds: successfullyLockedCardIds, // Use successfully locked IDs
          walletBefore: updatedRobot.wallet + cost,
          walletAfter: updatedRobot.wallet,
          description: `System Bot reserved ${cardsReservedThisTick} cards`
        });
      }

      const processingDelay = await getProcessingDelay(cardsReservedThisTick);
      if (processingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, processingDelay));
      }

      botTotalCards += cardsReservedThisTick;
      botCapacityRemaining = Math.max(0, targetCards - botTotalCards);
      nextBotCapacityHint = botCapacityRemaining;

      reservations = await Reservation.find({ roomId, status: "active" });
      // Use Set to deduplicate cards across all reservations
      const uniqueCardIds = new Set();
      reservations.forEach((r) => {
        (r.cardIds || []).forEach((cardId) => uniqueCardIds.add(cardId));
      });
      totalCards = uniqueCardIds.size;
      const totalStake = totalCards * gameRoom.stakeAmount;
      const stakeSettings = await StakeBonusSettings.findOne({
        stakeAmount: Number(gameRoom.stakeAmount),
      });
      const systemCommission = stakeSettings?.systemCommission || 0.2;
      const houseProfit = totalStake * systemCommission;
      const winAmount = totalStake - houseProfit;
      gameRoom.numberOfPlayers = totalCards;
      gameRoom.winAmount = winAmount;
      if (totalCards >= 2 && gameRoom.status === "waiting")
        gameRoom.status = "starting";
      await gameRoom.save();

      io.to(roomId).emit("cards", await fetchCardStatuses(roomId));
      const updatedRooms = await GameRoom.find({
        status: { $nin: ["completed"] },
      });
      const roomsWithBonus = await attachBonusToRooms(updatedRooms);
      io.emit("rooms", roomsWithBonus);

      if (totalCards >= 2) {
        if (!getCounter(roomId)) {
          const { startCounter } = require("./countHandler");
          await startCounter(io, roomId);
        }
      }
    } catch (e) {
      logger.error(`System reservation bot tick error for room ${roomId}`, e);
    } finally {
      roomLocks.delete(roomId);
      if (systemReservationIntervals.has(roomId)) {
        // count how many times we've reserved in this room
        const curr = botReservationCounts.get(roomId) || 0;
        const nextCount = curr + 1;
        botReservationCounts.set(roomId, nextCount);

        // SIMPLIFIED PACING: Fixed delay from settings
        const delay = await getBotDelay();

        systemReservationIntervals.set(
          roomId,
          setTimeout(() => loop(), delay)
        );
      }
    }
  };
  const initialDelay = 500 + Math.random() * 300;
  botReservationCounts.set(roomId, 0);
  systemReservationIntervals.set(
    roomId,
    setTimeout(() => loop(), initialDelay)
  );
  logger.info(`Started system reservation bot for room ${roomId}`);
}

function stopSystemReservationBot(roomId) {
  if (systemReservationIntervals.has(roomId)) {
    clearTimeout(systemReservationIntervals.get(roomId));
    systemReservationIntervals.delete(roomId);
    logger.info(`Stopped system reservation bot for room ${roomId}`);
  }
  botReservationCounts.delete(roomId);
  clearTarget(roomId);
}

module.exports = {
  callBingoNumber,
  startNumberCallingLoop,
  stopNumberCallingLoop,
  numberCallingIntervals,
  checkForWin,
  registerManualBingoClaim,
  numberCallingInProgress,
  startSystemReservationBot,
  stopSystemReservationBot,
};