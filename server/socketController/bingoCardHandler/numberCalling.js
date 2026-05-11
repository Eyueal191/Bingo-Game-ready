// server/socketController/bingoCardHandler/numberCalling.js
const { GameRoom } = require("../../models");
const logger = require("../../utils/winstonLogger");
const { getAppSettings } = require("../../services/appSettingsService");
const { drawNumber } = require("../../utils");
const winDetection = require("./winDetection");
const {
  numberCallingIntervals,
  isNumberCallingInProgress,
  setNumberCallingProgress
} = require("../sharedGameState");
// Lazy load gameLifecycle to avoid circular dependency
const getGameLifecycle = () => require("./gameLifecycle");


const callBingoNumber = async (io, gameRoomId) => {
  // Use circular-safe module references
  const { resolveRobotDrawOptions, checkForWinners } = winDetection;
  const { handleGameOver } = getGameLifecycle();


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

const startNumberCallingLoop = async (io, gameRoomId) => {
  if (numberCallingIntervals.has(gameRoomId)) {
    logger.debug(`Number calling loop already running for ${gameRoomId}`);
    return;
  }

  const tick = async () => {
    let nextTickInterval;
    try {
      // Use cached settings to avoid per-tick DB queries
      const appSettings = await getAppSettings().catch(() => null);
      nextTickInterval = (appSettings?.bingo?.callInterval || 4) * 1000;

      if (isNumberCallingInProgress(gameRoomId)) {
        logger.warn(
          `Previous callBingoNumber still in progress for ${gameRoomId}, skipping this tick`
        );
        numberCallingIntervals.set(gameRoomId, setTimeout(tick, nextTickInterval));
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
        numberCallingIntervals.set(gameRoomId, setTimeout(tick, nextTickInterval));
      }
    }
  };

  const appSettings = await getAppSettings().catch(() => null);
  const initialInterval = (appSettings?.bingo?.callInterval || 4) * 1000;

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

module.exports = {
  callBingoNumber,
  startNumberCallingLoop,
  stopNumberCallingLoop
};