// server/socketController/bingoCardHandler/gameLifecycle.js
const {
  GameRoom,
  Reservation,
  User,
  MainTransaction,
  TransactionStatus,
  StakeBonusSettings,
  CardLock,
  GameTransaction,
  GameTransactionType,
  GameType,
  UserType
} = require("../../models");
const logger = require("../../utils/winstonLogger");
const robotService = require("../../services/robotService");
const walletService = require("../../services/walletService");
const jackpotService = require("../../services/jackpotService");
const {
  fetchCardStatuses,
  attachBonusToRooms,
  maleEthiopianNames
} = require("../../utils");
const robotReservationHandler = require("./robotReservation");
const mongoose = require("mongoose");
// Lazy load numberCalling to avoid circular dependency issues
const getNumberCalling = () => require("./numberCalling");


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

const handleGameOver = async (io, gameRoomId, winners = [], type = "auto") => {
  // Use circular-safe module references
  const { stopNumberCallingLoop } = getNumberCalling();
  const { startSystemReservationBot } = robotReservationHandler;


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

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const winner of eligibleWinners) {
          const user = await User.findById(winner.userId).session(session);
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
              const creditResult = await walletService.creditWin(winner.userId, prizePerWinner, session);
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
            await gameTx.save({ session });
          }
        }
      });

      // Emit wallet updates after a successful transaction commit
      for (const winner of eligibleWinners) {
        const user = await User.findById(winner.userId);
        if (user && !(user.isRobot || user.role === 'robot')) {
          io.to(winner.userId.toString()).emit("walletUpdate", {
            wallet: user.wallet,
            bonus: user.bonus,
          });
        }
      }
    } catch (e) {
      logger.error(`Bingo handleGameOver winner payout transaction failed: ${e.message}`);
    } finally {
      session.endSession();
    }

    // ──────── Jackpot System Check ────────
    try {
      const jackpotConfig = await jackpotService.getJackpotConfig();
      if (jackpotConfig.enabled && eligibleWinners.length > 0) {
        // Calculate elapsed seconds from when game started playing
        const playingStartedAt = gameRoom.playingStartedAt || gameRoom.createdAt;
        const now = new Date();
        const elapsedSeconds = Math.floor((now - playingStartedAt) / 1000);
        const callCount = (gameRoom.drawnNumbers || []).length;

        const matchedLevel = await jackpotService.checkJackpotWin(callCount, elapsedSeconds);
        if (matchedLevel) {
          // Award jackpot to the first eligible real (non-robot) winner
          const realWinner = eligibleWinners.find((w) => {
            const res = reservationMap.get(
              w.userId && typeof w.userId.toString === "function"
                ? w.userId.toString()
                : String(w.userId)
            );
            return res && !res.isRobot && w.isCrossWin;
          }) || null;
       if(realWinner){
const jackpotResult = await jackpotService.awardJackpot(
            matchedLevel.key,
            realWinner.userId,
            gameRoomId,
            io
          );

          if (jackpotResult) {
            // Emit jackpot won event to the room
            io.to(gameRoomId).emit("jackpotWon", {
              level: matchedLevel.label,
              levelKey: matchedLevel.key,
              color: matchedLevel.color,
              icon: matchedLevel.icon,
              amount: jackpotResult.awarded,
              winnerId: realWinner.userId,
              winnerName: winnersWithDetails.find(
                (w) => w.userId?.toString() === realWinner.userId?.toString()
              )?.firstName || "Player",
              callCount,
              elapsedSeconds,
            });

            logger.info(`Jackpot ${matchedLevel.label} won in room ${gameRoomId}`, {
              winner: realWinner.userId,
              amount: jackpotResult.awarded,
              callCount,
              elapsedSeconds,
            });
          }
        }
       }  
      }
    } catch (jackpotErr) {
      logger.error("Jackpot check/award failed (non-critical)", { err: jackpotErr.message });
    }

    // ──────── Game Completion & Results Emission ────────
    
    const globalResultPayload = {
      winners: eligibleWinners.map((w) => w.userId),
      winningCards: eligibleWinners.map((w) => w.cardId),
      winningCombos: eligibleWinners.map((w) => w.winningCombo),
      winningCardGrids: eligibleWinners.map((w) => w.cardGrid),
      firstNames: winnersWithDetails.map((w) => w.firstName),
      prizes: eligibleWinners.map(() => prizePerWinner),
      drawnNumbers: gameRoom.drawnNumbers,
      numberOfPlayers: totalCards,
      winAmount,
    };

    logger.info(`Game finished in room ${gameRoomId}. Winners: ${globalResultPayload.winningCards.length}`, {
      winnerIds: globalResultPayload.winners,
      cardIds: globalResultPayload.winningCards,
      gridsCount: globalResultPayload.winningCardGrids.length
    });

    // Notify ALL players (including watchers) of game completion
    io.to(gameRoomId).emit("game_finished", globalResultPayload);

    // Notify individual players of their specific result
    for (const reservation of reservations) {
      const userId = reservation.userId.toString();
      const userCards = reservation.cardIds;
      const isWinner = eligibleWinners.some(
        (w) => w.userId.toString() === userId
      );
      const userPrize = isWinner ? prizePerWinner : 0;
      const userLoss = isWinner ? 0 : gameRoom.stakeAmount * userCards.length;

      const payload = {
        ...globalResultPayload,
        result: isWinner ? "Won" : "Lost",
        userPrize,
        userLoss,
      };

      // TARGETED EMISSION - Send ONLY to the specific user
      io.to(userId).emit(`game_over_${userId}`, payload);
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
    io.to(gameRoomId).emit("error", { message: `Failed to end game ${gameRoomId}` });
  }
};

module.exports = {
  refreshRoomState,
  handleGameOver
};