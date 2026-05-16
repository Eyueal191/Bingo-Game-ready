const GameRoom = require("../models/gameRoom");
const StakeBonusSettings = require("../models/stakeBonusSettings");
const Reservation = require("../models/reservationModel");
const logger = require("../utils/winstonLogger");
const {
    fetchCardStatuses,
    attachBonusToRooms,
} = require("../utils");

/**
 * Gets or creates a game room for a specific stake
 */
const getOrCreateRoomForStake = async (io, { stakeAmount, roomId, createIfNotFound = false }) => {
    try {
        if ((!stakeAmount || isNaN(stakeAmount)) && !roomId) {
            throw new Error("Invalid stake amount or roomId missing");
        }

        let room;
        if (stakeAmount && !isNaN(stakeAmount)) {
            room = await GameRoom.findOne({
                stakeAmount: parseFloat(stakeAmount),
                status: "starting",
            });
        } else if (roomId) {
            room = await GameRoom.findById(roomId);
            if (room && room.status === "completed") room = null;
        }

        if (!room) {
            const query = stakeAmount && !isNaN(stakeAmount)
                ? { stakeAmount: parseFloat(stakeAmount), status: { $ne: "completed" } }
                : { _id: roomId, status: { $ne: "completed" } };

            room = await GameRoom.findOne(query);
            if (!room && createIfNotFound) {
                if (!stakeAmount || isNaN(stakeAmount)) {
                    logger.debug(`Could not recreate room ${roomId} - stakeAmount missing`);
                    return null;
                }
                room = new GameRoom({
                    stakeAmount: parseFloat(stakeAmount),
                    status: "waiting",
                    numberOfPlayers: 0,
                    winAmount: 0,
                });
                await room.save();
                logger.info(`Created new waiting room ${room._id} for stake ${stakeAmount}`);

                // Dynamic import to avoid circular dependency
                const { startSystemReservationBot } = require("../socketController/bingoCardHandler");
                startSystemReservationBot(io, room._id);
            }
        }
        return room;
    } catch (error) {
        logger.error("Error in getOrCreateRoomForStake service", error);
        throw error;
    }
};

/**
 * Gets room data including bonus info
 */
const getRoomData = async ({ roomId }) => {
    try {
        const room = await GameRoom.findById(roomId);
        if (!room) throw new Error("Room not found");

        let bonusEnabled = false;
        let bonusAmount = 0;
        let bonusDescription = "";

        const bonus = await StakeBonusSettings.findOne({
            stakeAmount: room.stakeAmount,
        });

        if (bonus) {
            bonusEnabled = !!bonus.bonusEnabled;
            bonusAmount = Number(bonus.bonusAmount) || 0;
            bonusDescription = bonus.bonusDescription || "";
        }

        return {
            roomId: room._id,
            stakeAmount: room.stakeAmount,
            numberOfPlayers: room.numberOfPlayers || 0,
            bonusEnabled,
            bonusAmount,
            bonusDescription,
        };
    } catch (error) {
        logger.error("Error in getRoomData service", error);
        throw error;
    }
};

/**
 * Handles logic for joining a room
 */
const joinRoom = async (io, socket, { roomId, userId }) => {
    try {
        if (!roomId || !userId) {
            throw new Error("Invalid roomId or userId");
        }

        socket.join(roomId);
        socket.join(userId);
        socket.userId = userId;
        logger.info("Socket joined room via service", { socketId: socket.id, roomId, userId });

        const userReservation = await Reservation.findOne({
            roomId,
            userId,
            status: "active",
        });

        const cardData = await fetchCardStatuses(roomId);
        socket.emit("cards", cardData);

        const gameRoom = await GameRoom.findById(roomId);
        if (!gameRoom) {
            throw new Error("Game room not found");
        }

        if (gameRoom.status === "playing") {
            // Get bonus data
            const roomMeta = await getRoomData({ roomId });

            socket.emit("start_game", {
                roomId,
                numberOfPlayers: gameRoom.numberOfPlayers,
                winAmount: gameRoom.winAmount,
                drawnNumbers: gameRoom.drawnNumbers || [],
                userCards: userReservation ? userReservation.cardIds : [],
                stakeAmount: gameRoom.stakeAmount,
                bonusEnabled: roomMeta.bonusEnabled,
                bonusAmount: roomMeta.bonusAmount,
                bonusDescription: roomMeta.bonusDescription,
            });

            if ((gameRoom.winAmount || 0) === 0 && (gameRoom.numberOfPlayers || 0) > 0) {
                logger.warn(`Emitting start_game with winAmount 0 in joinRoom for room ${roomId}`, {
                    players: gameRoom.numberOfPlayers,
                    stake: gameRoom.stakeAmount
                });
            }

            // Start number calling loop if not already running
            const { startNumberCallingLoop, numberCallingIntervals } = require("../socketController/bingoCardHandler");
            if (!numberCallingIntervals.has(roomId)) {
                startNumberCallingLoop(io, roomId);
            }
        } else {
            const { emitCounters, startCounter, doesGameRoomExist } = require("../socketController/countHandler");

            emitCounters(io, roomId);
            if (await doesGameRoomExist(roomId)) {
                await startCounter(io, roomId);
            }
        }

        // Refresh lobby state
        socket.emit("get_active_games_by_stake", {
            stakeAmount: gameRoom.stakeAmount,
        });

        const updatedRooms = await GameRoom.find({ status: { $ne: "completed" } });
        const roomsWithBonus = await attachBonusToRooms(updatedRooms);
        io.emit("rooms", roomsWithBonus);

    } catch (error) {
        logger.error(`Error in joinRoom service for ${roomId}`, error);
        throw error;
    }
};

module.exports = {
    getOrCreateRoomForStake,
    getRoomData,
    joinRoom,
};