// server/socketController/bingoCardHandler/robotReservation.js
const mongoose = require("mongoose");
const {
  GameRoom,
  Reservation,
  BingoCard,
  CardLock,
  GameTransaction,
  GameTransactionType,
  GameType,
  UserType,
  StakeBonusSettings
} = require("../../models");
const logger = require("../../utils/winstonLogger");
const robotService = require("../../services/robotService");
const { getAppSettings } = require("../../services/appSettingsService");
const { ensureTarget, clearTarget } = require("../systemReservationState");
const {
  getSettings,
  fetchCardStatuses,
  attachBonusToRooms,
  getCardsPerTick,
  getBotDelay,
  getProcessingDelay
} = require("../../utils");
const {
  systemReservationIntervals,
  botReservationCounts,
  roomLocks,
  getCounter
} = require("../sharedGameState");
const countHandler = require("../countHandler");

async function startSystemReservationBot(io, roomId) {
  if (systemReservationIntervals.has(roomId)) return;
  const loop = async () => {
    let cardsReservedThisTick;
    let nextBotCapacityHint = 0;
    try {
     const settings = await getSettings();

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
      const appSettings = await getAppSettings().catch(() => ({ robotEnabledGlobal: true }));
      const robotStakeSettings = await StakeBonusSettings.findOne({ stakeAmount: gameRoom.stakeAmount });
      if (!appSettings.robotEnabledGlobal || !robotStakeSettings?.robotEnabled) {
        roomLocks.delete(roomId);
        return;
      }

      // Stop ONLY if room has reached maximum total cards
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
      const targetCards = await ensureTarget(
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

      // Also exclude cards that are already locked
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
          cardIds: successfullyLockedCardIds,
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
          const { startCounter } = countHandler;
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
  startSystemReservationBot,
  stopSystemReservationBot
};