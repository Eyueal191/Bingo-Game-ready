const {
  GameRoom,
  StakeBonusSettings,
  Reservation,
} = require("../models");
const logger = require("../utils/winstonLogger");
const {
  startNumberCallingLoop,
  stopNumberCallingLoop,
  stopSystemReservationBot,
} = require("./bingoCardHandler");
const { getSettings } = require("../utils");
const {
  counters,
  counterLocks,
  getCounter,
  setCounter,
  deleteCounter,
  isCounterLocked,
  lockCounter,
  unlockCounter,
} = require("./sharedGameState");

const emitCounters = (io, gameRoomId = null) => {
  const simplifiedCounters = {};
  for (const [counterId, counter] of Object.entries(counters)) {
    simplifiedCounters[counterId] =
      counter.count !== undefined ? counter.count : null;
  }
  if (gameRoomId) {
    const counterId = `counter${gameRoomId}`;
    const count =
      simplifiedCounters[counterId] !== undefined
        ? simplifiedCounters[counterId]
        : null;
    logger.debug(`Emitting counter for ${gameRoomId}: count=${count}`);
    io.to(gameRoomId).emit("counter", { counterId, count });
    io.emit("counters", simplifiedCounters);
  } else {
    logger.debug("Emitting all counters", { counters: simplifiedCounters });
    io.emit("counters", simplifiedCounters);
  }
};

const doesGameRoomExist = async (gameRoomId) => {
  const reservations = await Reservation.find({
    roomId: gameRoomId,
    status: "active",
  });
  const totalCardDepuis = reservations.reduce(
    (sum, r) => sum + (r.cardIds?.length || 0),
    0
  );
  logger.debug(`doesGameRoomExist(${gameRoomId}): ${totalCardDepuis} cardIds found`);
  return totalCardDepuis >= 2;
};

const startCounter = async (io, gameRoomId) => {
  try {
    logger.debug(`Attempting to start counter for ${gameRoomId}`);
    const hasReservation = await doesGameRoomExist(gameRoomId);
    if (!hasReservation) {
      logger.debug(`No reservations for ${gameRoomId}, counter not started`);
      io.to(gameRoomId).emit("error", {
        message: "Not enough reservations to start the game",
      });
      return;
    }

    const gameRoom = await GameRoom.findById(gameRoomId);
    if (!gameRoom) {
      logger.warn(`GameRoom ${gameRoomId} not found`);
      io.to(gameRoomId).emit("error", { message: "Game room not found" });
      return;
    }

    const counterId = `counter${gameRoom._id}`;
    if (gameRoom.status === "playing" || gameRoom.status === "completed") {
      logger.debug(`Game already ${gameRoom.status} for ${gameRoomId}, no counter needed`);
      emitCounters(io, gameRoomId);
      return;
    }

    const counter = getCounter(gameRoomId);
    if (counter) {
      logger.debug(
        `Counter ${counterId} already running with count=${counter.count}`
      );
      emitCounters(io, gameRoomId);
      return;
    }

    if (isCounterLocked(gameRoomId)) {
      logger.debug(`Counter start already in progress for ${gameRoomId}`);
      emitCounters(io, gameRoomId);
      return;
    }

    lockCounter(gameRoomId);

    const settings = await getSettings();
    const countdownDuration = settings.countdownDuration || 30;

    setCounter(gameRoomId, {
      count: countdownDuration,
      intervalId: null,
      gameStarted: false,
    });
    logger.debug(`Initialized counter ${counterId} with count=${countdownDuration}`);

    const intervalId = setInterval(async () => {
      try {
        const counter = getCounter(gameRoomId);
        if (!counter) {
          logger.warn(`Counter ${counterId} was deleted prematurely`);
          clearInterval(intervalId);
          return;
        }

        if (counter.count > 0) {
          counter.count--;
          logger.debug(
            `Counter ${counterId} decremented to ${counter.count}`
          );
          emitCounters(io, gameRoomId);
        } else if (!counter.gameStarted) {
          logger.info(`Counter ${counterId} reached 0, starting game`);
          counter.gameStarted = true; // Prevent duplicate starts

          const updatedGameRoom = await GameRoom.findById(gameRoomId);
          if (updatedGameRoom && updatedGameRoom.status === "starting") {
            updatedGameRoom.status = "playing";
            updatedGameRoom.playingStartedAt = new Date();
            stopSystemReservationBot(gameRoomId);
            const reservations = await Reservation.find({
              roomId: gameRoomId,
              status: "active",
            });

            // Update reservations to pending for the playing room
            await Reservation.updateMany(
              { roomId: gameRoomId, status: "active" },
              { $set: { status: "pending" } }
            );
            logger.info(`Set reservations for room ${gameRoomId} to pending`);

            // Use Set to deduplicate cards across all reservations
            const uniqueCardIds = new Set();
            reservations.forEach((r) => {
              (r.cardIds || []).forEach((cardId) => uniqueCardIds.add(cardId));
            });
            const totalCards = uniqueCardIds.size;
            const totalStake = totalCards * updatedGameRoom.stakeAmount;

            // Get system commission from stake bonus settings
            const stakeSettings = await StakeBonusSettings.findOne({
              stakeAmount: Number(updatedGameRoom.stakeAmount),
            });
            const systemCommission = stakeSettings?.systemCommission || 0.2; // Default to 20% if not set

            const houseProfit = totalStake * systemCommission;
            const winAmount = totalStake - houseProfit;

            updatedGameRoom.numberOfPlayers = totalCards;
            updatedGameRoom.winAmount = winAmount;
            await updatedGameRoom.save();

            // Emit start_game with userCards
            const userCards = {};
            reservations.forEach((res) => {
              if (res.userId) {
                userCards[res.userId] = res.cardIds;
              }
            });

            // Fetch bonus settings for this stake
            let bonusEnabled = false;
            let bonusAmount = 0;
            let bonusDescription = "";
            try {

              const bonus = await StakeBonusSettings.findOne({
                stakeAmount: updatedGameRoom.stakeAmount,
              });
              if (bonus) {
                bonusEnabled = !!bonus.bonusEnabled;
                bonusAmount = Number(bonus.bonusAmount) || 0;
                bonusDescription = bonus.bonusDescription || "";
              }
            } catch (e) {
              logger.warn("Failed to fetch bonus for counter start_game emit", {
                error: e?.message,
              });
            }

            io.to(gameRoomId).emit("start_game", {
              roomId: gameRoomId,
              drawnNumbers: [],
              numberOfPlayers: totalCards,
              winAmount,
              stakeAmount: updatedGameRoom.stakeAmount,
              userCards,
              bonusEnabled,
              bonusAmount,
              bonusDescription,
            });

            if ((winAmount || 0) === 0 && (totalCards || 0) > 0) {
              logger.warn(`Emitting start_game with winAmount 0 in startCounter for room ${gameRoomId}`, {
                totalCards,
                stake: updatedGameRoom.stakeAmount
              });
            }

            await startNumberCallingLoop(io, gameRoomId);
            io.emit(
              "rooms",
              await GameRoom.find({
                status: { $nin: ["completed"] },
              })
            );
          }

          // Clean up counter
          const finalCounter = getCounter(gameRoomId);
          if (finalCounter) {
            const currentIntervalId = finalCounter.intervalId;
            clearInterval(currentIntervalId);
            deleteCounter(gameRoomId);
            logger.info(`Counter ${counterId} stopped and removed`);
            emitCounters(io, gameRoomId);
          } else {
            logger.debug(`Counter ${counterId} already deleted or missing`);
          }
        }
      } catch (error) {
        logger.error(`Error in counter interval for ${gameRoomId}`, error);
        const currentCounter = getCounter(gameRoomId);
        const currentIntervalId = currentCounter?.intervalId;
        if (currentIntervalId) {
          clearInterval(currentIntervalId);
        }
        deleteCounter(gameRoomId);
        io.to(gameRoomId).emit("error", { message: "Game failed to proceed" });
      }
    }, 1000);

    const createdCounter = getCounter(gameRoomId);
    if (createdCounter) {
      createdCounter.intervalId = intervalId;
    }
  } catch (error) {
    logger.error(`Error starting counter for game room ${gameRoomId}`, error);
    io.to(gameRoomId).emit("error", { message: "Failed to start game" });
  } finally {
    unlockCounter(gameRoomId);
  }
};

const stopCounter = async (io, gameRoomId) => {
  const counterId = `counter${gameRoomId}`;
  const counter = getCounter(gameRoomId);
  if (counter?.intervalId) {
    logger.info(`Stopping counter ${counterId}`);
    const currentIntervalId = counter.intervalId;
    clearInterval(currentIntervalId);
    deleteCounter(gameRoomId);
    emitCounters(io, gameRoomId);
  }
  unlockCounter(gameRoomId);
};

const initializeCounters = async (io) => {
  logger.info("Initializing counters for starting rooms");
  const startingRooms = await GameRoom.find({ status: "starting" });
  for (const room of startingRooms) {
    if (await doesGameRoomExist(room._id)) {
      await startCounter(io, room._id);
    }
  }
};

let counterChangeStream = null;

const watchGameRoomCounter = (io) => {
    counterChangeStream = GameRoom.watch();
    counterChangeStream.on("change", async (change) => {
    if (change.operationType === "update") {
      const gameRoomId = change.documentKey._id.toString();
      const updatedGameRoom = await GameRoom.findById(gameRoomId);
      if (
        updatedGameRoom?.status === "waiting" ||
        updatedGameRoom?.status === "completed"
      ) {
        logger.info(`GameRoom ${gameRoomId} reset or completed, stopping counter`);
        stopCounter(io, gameRoomId);
        stopNumberCallingLoop(gameRoomId);
      }
    }
  });
  counterChangeStream.on("error", (error) => {
    if (error.message?.includes('client was closed')) return;
    logger.error("Error in GameRoom change stream", error);
  });
};

const closeCounterChangeStreams = async () => {
  try { if (counterChangeStream) await counterChangeStream.close(); } catch (error) {
    logger.error("Error closing counter change stream", error);
  }
};

module.exports = {
  emitCounters,
  startCounter,
  stopCounter,
  watchGameRoomCounter,
  initializeCounters,
  doesGameRoomExist,
  closeCounterChangeStreams,
};