const mongoose = require("mongoose");
const { User, GameRoom, Reservation, BingoCard } = require("../models");
const reservationService = require("../services/reservationService");
const roomService = require("../services/roomService");
const logger = require("../utils/winstonLogger");

const {
    emitCounters,
    startCounter,
    stopCounter,
    doesGameRoomExist,
} = require("./countHandler");

const {
    getCounter,
} = require("./sharedGameState");

const {
    fetchCardStatuses,
    attachBonusToRooms,
    getSettings,
} = require("../utils");

const {
    registerManualBingoClaim,
} = require("./bingoCardHandler");

const emitBingoPlayerCount = async (target) => {
  try {
    const result = await Reservation.aggregate([
      {
        $match: {
          status: { $in: ["active", "pending"] },
        },
      },
      {
        $lookup: {
          from: "gamerooms",
          localField: "roomId",
          foreignField: "_id",
          as: "room",
        },
      },
      {
        $unwind: "$room",
      },
      {
        $match: {
          "room.status": { $ne: "completed" },
        },
      },
      {
        $project: {
          cardCount: { $size: "$cardIds" },
        },
      },
      {
        $group: {
          _id: null,
          totalCards: { $sum: "$cardCount" },
        },
      },
    ]);

    const totalCards = result.length ? result[0].totalCards : 0;

    target.emit("bingo:player_count", { count: totalCards });
  } catch (error) {
    logger.error("Error emitting bingo player count", error);
  }
};

const initializeBingoSocket = (io) => {
    io.on("connection", (socket) => {
        registerManualBingoClaim(io, socket);

        emitBingoPlayerCount(socket);

        socket.on("bingo:get_player_count", () => {
            emitBingoPlayerCount(socket);
        });

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

                emitCounters(io);
            } catch (error) {
                logger.error("Error fetching initial game rooms", error);
                socket.emit("error", { message: "Failed to load game rooms" });
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

        socket.on("get_reserved_cards", async ({ userId, roomId }, callback) => {
            try {
                const result = await reservationService.getReservedCards({ userId, roomId });
                callback(result);
            } catch (err) {
                logger.error("Failed to fetch reserved cards socket handler", err);
                callback({ error: "Failed to fetch reserved cards" });
            }
        });

        socket.on("get_player_card", async ({ cardId }, callback) => {
            try {
                const card = await BingoCard.findOne({ cardId });
                callback({ card });
            } catch (err) {
                logger.error("Failed to fetch player card", err);
                callback({ error: "Failed to fetch card" });
            }
        });

        socket.on("get_wallet", async ({ userId }) => {
            try {
                const user = await User.findById(userId);
                if (user) {
                    socket.emit("wallet", { wallet: user.wallet });
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

        socket.on("get_settings", async () => {
            try {
                const settings = await getSettings();
                socket.emit("settings", settings);
            } catch (error) {
                logger.error("Error in get_settings socket handler", error);
            }
        });
    });

    let reservationChangeStream = null;
    let gameRoomChangeStream = null;
let isWatchingReservations = false;
let isWatchingGameRooms = false;

    const watchReservations = () => {
        if (isWatchingReservations) return;
    isWatchingReservations = true;
        reservationChangeStream = Reservation.watch();
        reservationChangeStream.on("change", async (change) => {
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
                case "delete":{
                    const reservation = await Reservation.findById(
                        change.documentKey._id
                    );
                    roomId = reservation ? reservation.roomId.toString() : null;
                    break;
                }
            }

            if (!roomId) return;

            emitBingoPlayerCount(io);

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
        reservationChangeStream.on("error", (error) => {
            if (error.message?.includes('client was closed')) return;
            logger.error("Error in Reservation change stream", error);
        });
    };

    const watchGameRooms = () => {
        if (isWatchingGameRooms) return;
  isWatchingGameRooms= true;
        gameRoomChangeStream = GameRoom.watch();
        gameRoomChangeStream.on("change", async () => {
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
        gameRoomChangeStream.on("error", (error) => {
            if (error.message?.includes('client was closed')) return;
            logger.error("Error in GameRoom change stream", error);
        });
    };

    watchReservations();
    watchGameRooms();

    // Return a cleanup function
    return async () => {
       await Promise.all([
        closeStream("Reservation", reservationChangeStream),
        closeStream("BingoRoom", gameRoomChangeStream),
    ]);
    reservationChangeStream = null;
    gameRoomChangeStream = null;
    isWatchingReservations = false;
    isWatchingGameRooms = false;
    };
};
const closeStream = async (name, streamRef) => {
    if (!streamRef.current) return;

    try {
        await streamRef.current.close();
        logger.info(`Closed ${name} change stream`);
    } catch (error) {
        if (!error.message?.includes("client was closed")) {
            logger.error(`Failed to close ${name} change stream`, error);
        }
    } finally {
        streamRef.current = null;
    }
};


module.exports = { initializeBingoSocket };
