const mongoose = require("mongoose");
const LudoRoom = require("../models/LudoRoom");
const LudoGame = require("../models/LudoGame");
const User = require("../models/userModels");
const AppConfig = require("../models/appConfig");
const { GameTransaction, GameTransactionType, GameType, UserType } = require("../models/GameTransaction");
const walletService = require("./walletService");
const ludoLogic = require("../utils/ludoGameLogic");
const logger = require("../utils/winstonLogger");

/**
 * Create a new Ludo room
 */
const createRoom = async ({ userId, stakeAmount, mode, playerCount }) => {
    if (!stakeAmount || stakeAmount <= 0) throw new Error("Invalid stake amount");
    if (!["classic", "quick", "sprint"].includes(mode)) throw new Error("Invalid mode");
    if (![2, 4].includes(playerCount)) throw new Error("Invalid player count");

    // Strictly strictly validate against Admin AppConfig
    const config = await AppConfig.getConfig();
    const ludoAdmin = config.ludo || {};
    const allowedStakes = ludoAdmin.stakes || [];

    if (allowedStakes.length > 0 && !allowedStakes.includes(stakeAmount)) {
        throw new Error(`Stake amount ${stakeAmount} is not allowed by admin. Current stakes: ${allowedStakes.join(", ")}`);
    }
    if (mode === "classic" && ludoAdmin.classicModeEnabled === false) throw new Error("Classic mode is currently disabled by admin");
    if (mode === "quick" && ludoAdmin.quickModeEnabled === false) throw new Error("Quick mode is currently disabled by admin");
    if (mode === "sprint" && ludoAdmin.sprintModeEnabled === false) throw new Error("Sprint mode is currently disabled by admin");

    // Check if user is already in an active room
    const existingRoom = await LudoRoom.findOne({
        "players.userId": userId,
        status: { $in: ["waiting", "full", "playing"] },
    });
    if (existingRoom) {
        throw new Error("You are already in an active Ludo room");
    }

    let room;
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const user = await User.findById(userId).session(session);
            if (!user) throw new Error("User not found");
            if ((user.wallet + user.bonus) < stakeAmount) throw new Error("Insufficient balance");

            // Escrow deduction via walletService
            const deduction = await walletService.deductForGame(userId, stakeAmount, session);
            const walletBefore = deduction.walletAfter + deduction.walletUsed;

            const commissionPercent = ludoAdmin.commissionPercent ?? 10;
            const { winAmount } = ludoLogic.calculatePayout(stakeAmount, playerCount, commissionPercent);
            const colors = ludoLogic.assignColors(playerCount);

            room = new LudoRoom({
                stakeAmount,
                mode,
                playerCount,
                status: "waiting",
                creatorUserId: userId,
                winAmount,
                commissionPercent,
                players: [
                    {
                        userId,
                        color: colors[0],
                        status: "joined",
                    },
                ],
            });

            await room.save({ session });

            // Record escrow transaction
            await GameTransaction.create(
                [
                    {
                        userId,
                        userType: user.isRobot ? UserType.ROBOT : UserType.USER,
                        type: GameTransactionType.STAKE,
                        gameType: GameType.LUDO,
                        roomId: room._id,
                        amount: stakeAmount,
                        stakeAmount,
                        walletBefore,
                        walletAfter: deduction.walletAfter,
                        description: `Ludo game room creation escrow (${mode} ${playerCount}P)`,
                    },
                ],
                { session }
            );
        });
    } finally {
        session.endSession();
    }

    logger.info(`Ludo room created: ${room._id} by user ${userId}, stake ${stakeAmount}, mode ${mode}`);
    return room;
};

/**
 * Join an existing room or quick-match
 */
const joinRoom = async ({ userId, roomId, stakeAmount, mode, playerCount }) => {
    // Check if user is already in an active room
    const existingRoom = await LudoRoom.findOne({
        "players.userId": userId,
        status: { $in: ["waiting", "full", "playing"] },
    });
    if (existingRoom) {
        if (existingRoom._id.toString() === roomId) {
            return existingRoom; // Already in this room
        }
        throw new Error("You are already in an active Ludo room");
    }

    let room;
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const user = await User.findById(userId).session(session);
            if (!user) throw new Error("User not found");

            if (roomId) {
                room = await LudoRoom.findById(roomId).session(session);
                if (!room) throw new Error("Room not found");
            } else {
                // Quick match: find available room with matching criteria
                room = await LudoRoom.findOne({
                    stakeAmount,
                    mode: mode || "classic",
                    playerCount: playerCount || 2,
                    status: "waiting",
                    "players.userId": { $ne: userId },
                }).sort({ createdAt: 1 }).session(session); // FIFO
            }

            if (!room) throw new Error("No available room found");
            if (room.status !== "waiting") throw new Error("Room is not accepting players");

            // Check player isn't already in
            if (room.players.some((p) => p.userId.toString() === userId.toString())) {
                return; // Return early, handled outside transaction wrapper below
            }

            if ((user.wallet + user.bonus) < room.stakeAmount) throw new Error("Insufficient balance");

            // Deduct using walletService (wallet first, then bonus)
            const deduction = await walletService.deductForGame(userId, room.stakeAmount, session);
            const walletBefore = deduction.walletAfter + deduction.walletUsed;

            // Assign next available color
            const allColors = ludoLogic.assignColors(room.playerCount);
            const takenColors = room.players.map((p) => p.color);
            const nextColor = allColors.find((c) => !takenColors.includes(c));

            room.players.push({
                userId,
                color: nextColor,
                status: "joined",
            });

            // Check if room is full
            if (room.players.length >= room.playerCount) {
                room.status = "full";
            }

            await room.save({ session });

            // Record escrow transaction
            await GameTransaction.create(
                [
                    {
                        userId,
                        userType: user.isRobot ? UserType.ROBOT : UserType.USER,
                        type: GameTransactionType.STAKE,
                        gameType: GameType.LUDO,
                        roomId: room._id,
                        amount: room.stakeAmount,
                        stakeAmount: room.stakeAmount,
                        walletBefore,
                        walletAfter: deduction.walletAfter,
                        description: `Ludo game room join escrow (${room.mode} ${room.playerCount}P)`,
                    },
                ],
                { session }
            );
        });
    } finally {
        session.endSession();
    }

    if (!room) {
        // Exited early because player already in
        return await LudoRoom.findById(roomId || existingRoom?._id);
    }

    logger.info(`User ${userId} joined Ludo room ${room._id}, players: ${room.players.length}/${room.playerCount}`);

    return room;
};

/**
 * Start the game — called when room becomes full
 * Locks stakes using MongoDB transaction
 */
const startGame = async (roomId) => {
    const session = await mongoose.startSession();
    let room, game;

    try {
        await session.withTransaction(async () => {
            room = await LudoRoom.findById(roomId).session(session);
            if (!room || room.status !== "full") {
                throw new Error("Room is not ready to start");
            }

            // Stakes were already deducted at createRoom() / joinRoom().
            // Just verify players exist and mark them as playing.
            for (const player of room.players) {
                const user = await User.findById(player.userId).session(session);
                if (!user) throw new Error(`Player ${player.userId} not found`);
                player.status = "playing";
            }

            // Create game state
            const initialState = ludoLogic.createInitialState(
                room.players.map((p) => ({ userId: p.userId.toString(), color: p.color })),
                room.mode
            );

            game = await LudoGame.create(
                [
                    {
                        roomId: room._id,
                        mode: room.mode,
                        players: initialState.players.map((p) => ({
                            userId: p.userId,
                            color: p.color,
                            tokens: p.tokens,
                        })),
                        currentTurnIndex: 0,
                        status: "playing",
                    },
                ],
                { session }
            );
            game = game[0];

            room.status = "playing";
            room.gameId = game._id;
            room.startedAt = new Date();
            await room.save({ session });
        });
    } finally {
        session.endSession();
    }

    logger.info(`Ludo game started: ${game._id} for room ${roomId}`);
    return { room, game };
};

/**
 * Process payout when a winner is determined
 */
const processWinPayout = async (roomId, winnerUserId) => {
    const session = await mongoose.startSession();
    let room;

    try {
        await session.withTransaction(async () => {
            room = await LudoRoom.findById(roomId).session(session);
            if (!room) throw new Error("Room not found");

            const { winAmount, commission } = ludoLogic.calculatePayout(
                room.stakeAmount,
                room.playerCount,
                room.commissionPercent
            );

            const winner = await User.findById(winnerUserId).session(session);
            if (!winner) throw new Error("Winner not found");

            const walletBefore = winner.wallet;
            const creditResult = await walletService.creditWin(winnerUserId, winAmount, session);

            // Record win transaction
            await GameTransaction.create(
                [
                    {
                        userId: winnerUserId,
                        userType: winner.isRobot ? UserType.ROBOT : UserType.USER,
                        type: GameTransactionType.WIN,
                        gameType: GameType.LUDO,
                        roomId: room._id,
                        amount: winAmount,
                        stakeAmount: room.stakeAmount,
                        walletBefore,
                        walletAfter: creditResult.walletAfter,
                        description: `Ludo win (${room.mode} ${room.playerCount}P)`,
                    },
                ],
                { session }
            );

            room.winnerUserId = winnerUserId;
            room.winAmount = winAmount;
            room.status = "ended";
            room.endedAt = new Date();
            await room.save({ session });

            // Update game status
            await LudoGame.updateOne(
                { roomId: room._id },
                { $set: { status: "ended", winnerUserId } },
                { session }
            );
        });
    } finally {
        session.endSession();
    }

    logger.info(`Ludo game payout processed: room ${roomId}, winner ${winnerUserId}, amount ${room.winAmount}`);
    return room;
};

/**
 * Cancel/abort game — refund all stakes
 */
const cancelRoom = async (roomId, reason = "cancelled") => {
    const session = await mongoose.startSession();
    let room;

    try {
        await session.withTransaction(async () => {
            room = await LudoRoom.findById(roomId).session(session);
            if (!room) throw new Error("Room not found");
            if (room.status === "ended" || room.status === "cancelled") return;
            if (room.refundProcessed) return; // Idempotency guard against double refunds

            // Refund all players actively escrowed inside the room
            for (const player of room.players) {
                const user = await User.findById(player.userId).session(session);
                if (!user) continue;

                const walletBefore = user.wallet;
                // Use walletService for proper credit handling
                const creditResult = await walletService.creditWin(player.userId, room.stakeAmount, session);

                await GameTransaction.create(
                    [
                        {
                            userId: player.userId,
                            userType: user.isRobot ? UserType.ROBOT : UserType.USER,
                            type: GameTransactionType.REFUND,
                            gameType: GameType.LUDO,
                            roomId: room._id,
                            amount: room.stakeAmount,
                            stakeAmount: room.stakeAmount,
                            walletBefore,
                            walletAfter: creditResult.walletAfter,
                            description: `Ludo game refund: ${reason}`,
                        },
                    ],
                    { session }
                );
            }

            // Abort the game if it was active
            if (room.status === "playing") {
                await LudoGame.updateOne(
                    { roomId: room._id },
                    { $set: { status: "aborted" } },
                    { session }
                );
            }

            room.status = "cancelled";
            room.refundProcessed = true;
            room.endedAt = new Date();
            await room.save({ session });
        });
    } finally {
        session.endSession();
    }

    logger.info(`Ludo room cancelled: ${roomId}, reason: ${reason}`);
    return room;
};

/**
 * Get available rooms for listing
 */
const getAvailableRooms = async (filters = {}) => {
    const query = { status: "waiting" };
    if (filters.stakeAmount) query.stakeAmount = parseFloat(filters.stakeAmount);
    if (filters.mode) query.mode = filters.mode;
    if (filters.playerCount) query.playerCount = parseInt(filters.playerCount);

    const rooms = await LudoRoom.find(query)
        .populate("players.userId", "fullName phone")
        .sort({ createdAt: -1 })
        .limit(50);

    return rooms;
};

/**
 * Get all rooms (for admin)
 */
const getAllRooms = async (filters = {}) => {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.stakeAmount) query.stakeAmount = parseFloat(filters.stakeAmount);
    if (filters.mode) query.mode = filters.mode;

    const rooms = await LudoRoom.find(query)
        .populate("players.userId", "fullName phone")
        .populate("winnerUserId", "fullName")
        .sort({ createdAt: -1 })
        .limit(100);

    return rooms;
};

/**
 * Get room by ID with full details
 */
const getRoomById = async (roomId) => {
    const room = await LudoRoom.findById(roomId)
        .populate("players.userId", "fullName phone wallet");
    return room;
};

module.exports = {
    createRoom,
    joinRoom,
    startGame,
    processWinPayout,
    cancelRoom,
    getAvailableRooms,
    getAllRooms,
    getRoomById,
};
