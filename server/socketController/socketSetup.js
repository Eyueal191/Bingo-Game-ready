const { Server } = require("socket.io");
const mongoose = require("mongoose");

const { User, GameRoom, Reservation, BingoCard } = require("../models");

const reservationService = require("../services/reservationService");
const roomService = require("../services/roomService");
const logger = require("../utils/winstonLogger");

const {
  emitCounters,
  startCounter,
  stopCounter,
  initializeCounters,
  doesGameRoomExist,
} = require("./countHandler");

const {
  getCounter,
} = require("./sharedGameState");

const {
  fetchCardStatuses,
  attachBonusToRooms,
  getSettings,
  corsOptions,
} = require("../utils");
const {
  registerManualBingoClaim,
} = require("./bingoCardHandler");


/**
 * Reusable helper to fetch platform-wide statistics.
 */
const fetchPlatformStats = async () => {
  const activePlayersCount = await User.countDocuments({ isBanned: { $ne: true } });
  const totalGamesPlayed = await GameRoom.countDocuments({ status: "completed" });

  // Daily winners calculation (today's unique winners)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const winnersTodayAggregation = await GameRoom.aggregate([
    { 
      $match: { 
        status: "completed", 
        completedAt: { $gte: startOfDay } 
      } 
    },
    { $unwind: "$winners" },
    { $group: { _id: "$winners.userId" } },
    { $count: "count" }
  ]);

  const winnersToday = winnersTodayAggregation.length > 0 ? winnersTodayAggregation[0].count : 0;

  return {
    activePlayers: activePlayersCount,
    gamesPlayed: totalGamesPlayed,
    winnersToday: winnersToday
  };
};


const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: corsOptions,
  });

  io.on("connection", (socket) => {
    logger.info(`A user connected: ${socket.id}`);
    
    // If userId is provided in auth, join user-specific room
    const userId = socket.handshake.auth?.userId || socket.auth?.userId;
    if (userId && userId !== "pending") {
      socket.join(userId.toString());
      logger.info(`Socket ${socket.id} joined personal room ${userId}`);
    }

    registerManualBingoClaim(io, socket);
    socket.on("requestInitialData", async () => {
      try {
        const gameRooms = await GameRoom.find({
          status: { $ne: "completed" },
        });
        const roomsWithBonus = await attachBonusToRooms(gameRooms);
        socket.emit("rooms", roomsWithBonus);

        // Emit current settings
        const settings = await getSettings();
        socket.emit("settings", settings);

        // Emit platform stats using shared helper
        const platformStats = await fetchPlatformStats();
        socket.emit("platformStats", platformStats);

        emitCounters(io);
      } catch (error) {
        logger.error("Error fetching initial game rooms", error);
        socket.emit("error", { message: "Failed to load game rooms" });
      }
    });

    socket.on("get_platform_stats", async () => {
      try {
        const platformStats = await fetchPlatformStats();
        socket.emit("platformStats", platformStats);
      } catch (error) {
        logger.error("Error fetching platform stats", error);
      }
    });

    socket.on("update_auth", ({ userId }) => {
      logger.debug("Received update_auth", {
        socketId: socket.id,
        hasUserId: Boolean(userId),
      });
      if (!userId) {
        logger.warn("No userId provided in update_auth", { socketId: socket.id });
        socket.emit("error", { message: "Invalid userId" });
        return;
      }
      socket.auth = socket.auth || {};
      socket.auth.userId = userId;
      socket.join(userId.toString());
      logger.info(`Socket ${socket.id} joined personal room ${userId} via update_auth`);
      logger.debug("Updated auth for socket", { socketId: socket.id });
    });

    socket.on("get_room_by_stake", async ({ stakeAmount, userId }) => {
      try {
        const room = await roomService.getOrCreateRoomForStake(io, { stakeAmount, createIfNotFound: false });
        if (room) {
          const roomData = await roomService.getRoomData({ roomId: room._id });
          socket.emit("room_data", roomData);
        } else {
          socket.emit("room_not_found", { stakeAmount });
        }
      } catch (error) {
        logger.error("Error in get_room_by_stake socket handler", error);
        socket.emit("error", { message: error.message || "Failed to fetch room" });
      }
    });

    // --- Real-time: Get reserved cards for a user in a room ---
    socket.on("get_reserved_cards", async ({ userId, roomId }, callback) => {
      try {
        const result = await reservationService.getReservedCards({ userId, roomId });
        callback(result);
      } catch (err) {
        logger.error("Failed to fetch reserved cards socket handler", err);
        callback({ error: "Failed to fetch reserved cards" });
      }
    });

    // --- Real-time: Get player card data by cardId ---
    socket.on("get_player_card", async ({ cardId }, callback) => {
      try {
        const card = await BingoCard.findOne({ cardId });
        callback({ card });
      } catch (err) {
        callback({ error: "Failed to fetch card" });
      }
    });

    socket.on("get_wallet", async ({ userId }) => {
      try {
        const user = await User.findById(userId);
        if (user) {
          socket.emit("walletUpdate", { wallet: user.wallet, bonus: user.bonus });
        }
      } catch (error) {
        logger.error("Error fetching wallet", error);
        socket.emit("error", { message: "Failed to fetch wallet balance" });
      }
    });
    socket.on("get_active_games_by_stake", async ({ stakeAmount }) => {
      try {
        if (!stakeAmount || isNaN(stakeAmount)) {
          socket.emit("error", { message: "Invalid stake amount" });
          return;
        }

        const activeRooms = await GameRoom.find({
          stakeAmount: parseFloat(stakeAmount),
          status: { $ne: "completed" },
        });

        const activeGamesCount = Array.isArray(activeRooms)
          ? activeRooms.length
          : 0;
        logger.debug("Active games for stake", {
          stakeAmount,
          count: activeGamesCount,
        });

        socket.emit("active_games_by_stake", {
          stakeAmount,
          count: activeGamesCount,
        });
      } catch (error) {
        logger.error("Error in get_active_games_by_stake", error);
        socket.emit("error", { message: "Failed to fetch active games" });
      }
    });

    socket.on("join_room", async ({ roomId, userId }) => {
      try {
        await roomService.joinRoom(io, socket, { roomId, userId });
      } catch (error) {
        logger.error(`Error in join_room for ${roomId}`, error);
        socket.emit("error", { message: error.message || "Failed to join room" });
      }
    });

    socket.on("get_cards", async (roomId) => {
      try {
        if (!roomId) {
          socket.emit("error", { message: "Invalid roomId" });
          return;
        }
        const cardData = await fetchCardStatuses(roomId);
        socket.emit("cards", cardData);
      } catch (error) {
        logger.error(`Error in get_cards for ${roomId}`, error);
        socket.emit("error", { message: "Failed to fetch cards" });
      }
    });

    socket.on("update_play_mode", async ({ userId, playMode, roomId }) => {
      logger.info("Updating play mode", {
        playMode,
        roomId: roomId || null,
        hasUserId: Boolean(userId),
      });
      try {
        if (!userId || !playMode || !["manual", "auto"].includes(playMode)) {
          logger.warn("Invalid update_play_mode payload", {
            playMode,
            roomId: roomId || null,
          });
          return;
        }
        const query = {
          userId: new mongoose.Types.ObjectId(userId),
          status: { $in: ["active", "pending"] },
          isDisqualified: { $ne: true },
        };
        if (roomId) {
          query.roomId = new mongoose.Types.ObjectId(roomId);
        }

        const result = await Reservation.updateMany(query, {
          $set: { playMode },
        });
        logger.info("update_play_mode result", {
          matched: result.matchedCount || result.n,
          modified: result.modifiedCount || result.nModified,
        });
      } catch (err) {
        logger.error("Failed to update play mode", err);
      }
    });
    socket.on(
      "reserve_cards",
      async ({ roomId, cardIds, userId, playMode }, callback) => {
        const respond = (payload) => {
          if (typeof callback === "function") {
            callback(payload);
          }
        };

        try {
          const result = await reservationService.reserveCards(io, {
            roomId,
            cardIds,
            userId,
            playMode
          });

          if (result.error) {
            respond({ error: result.error });
          } else {
            respond(result);
          }
        } catch (error) {
          logger.error(`Error reserving cards for room ${roomId}`, error);
          respond({ error: { message: "Failed to reserve cards" } });
        }
      }
    );

    socket.on(
      "unreserve_cards",
      async ({ roomId, cardIds, userId }, callback) => {
        const respond = (payload) => {
          if (typeof callback === "function") {
            callback(payload);
          }
        };

        try {
          // The reservationService methods are imported as reservationService at the top of socketSetup.js
          const result = await reservationService.unReserveCards(io, {
            roomId,
            cardIds,
            userId,
          });

          if (result.error) {
            respond({ error: result.error });
          } else {
            respond(result);
          }
        } catch (error) {
          logger.error(`Error unreserving cards for room ${roomId}`, error);
          respond({ error: { message: "Failed to unreserve cards" } });
        }
      }
    );

    socket.on("get_settings", async () => {
      try {
        const settings = await getSettings();
        socket.emit("settings", settings);
      } catch (error) {
        logger.error("Error in get_settings socket handler", error);
      }
    });

    socket.on("disconnect", () => {
      logger.info(`A user disconnected: ${socket.id}`);
    });
  });

  const watchReservations = () => {
    const changeStream = Reservation.watch();
    changeStream.on("change", async (change) => {
      logger.debug("Reservation change detected", {
        operationType: change?.operationType,
        documentKey: change?.documentKey,
      });
      let roomId;
      switch (change.operationType) {
        case "insert":
          roomId = change.fullDocument.roomId.toString();
          break;
        case "update":
        case "delete":
          const reservation = await Reservation.findById(
            change.documentKey._id
          );
          roomId = reservation ? reservation.roomId.toString() : null;
          break;
      }

      if (!roomId) return;

      io.to(roomId).emit("cards", await fetchCardStatuses(roomId));
      const updatedRooms = await GameRoom.find({
        status: { $ne: "completed" },
      });
      const roomsWithBonus = await attachBonusToRooms(updatedRooms);
      io.emit("rooms", roomsWithBonus);

      const hasReservations = await doesGameRoomExist(roomId);
      if (hasReservations && !getCounter(roomId)?.intervalId) {
        await startCounter(io, roomId);
      } else if (!hasReservations && getCounter(roomId)?.intervalId) {
        stopCounter(io, roomId);
      }

      const gameRoom = await GameRoom.findById(roomId);
      if (gameRoom) {
        io.emit("get_active_games_by_stake", {
          stakeAmount: gameRoom.stakeAmount,
        });
      }
    });
    changeStream.on("error", (error) => {
      logger.error("Error in Reservation change stream", error);
    });
  };

  const watchGameRooms = () => {
    const changeStream = GameRoom.watch();
    changeStream.on("change", async () => {
      const gameRooms = await GameRoom.find({
        status: { $ne: "completed" },
      });
      const roomsWithBonus = await attachBonusToRooms(gameRooms);
      io.emit("rooms", roomsWithBonus);

      // Group rooms by stakeAmount and emit active games count for each
      const stakeAmounts = [
        ...new Set(gameRooms.map((room) => room.stakeAmount)),
      ];
      for (const stakeAmount of stakeAmounts) {
        const activeRooms = gameRooms.filter(
          (room) =>
            ["starting", "playing"].includes(room.status) &&
            room.stakeAmount === stakeAmount
        );
        io.emit("active_games_by_stake", {
          stakeAmount,
          count: activeRooms.length,
        });
      }
    });
    changeStream.on("error", (error) => {
      logger.error("Error in GameRoom change stream", error);
    });
  };

  initializeCounters(io);
  watchReservations();
  watchGameRooms();

  io.on("connect_error", (err) => {
    logger.error("Socket.IO connection error", { error: err?.message });
  });

  return io;
};

module.exports = { initializeSocket };