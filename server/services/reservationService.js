const mongoose = require("mongoose");
const GameRoom = require("../models/gameRoom");
const Reservation = require("../models/reservationModel");
const User = require("../models/userModels");
const StakeBonusSettings = require("../models/stakeBonusSettings");
const CardLock = require("../models/cardLockModel");
const { GameTransaction, GameTransactionType, GameType, UserType } = require("../models/GameTransaction");
const walletService = require("./walletService");
const logger = require("../utils/winstonLogger");
const {
    fetchCardStatuses,
    attachBonusToRooms,
    getSettings,
} = require("../utils");



/**
 * Handles card reservation for a user
 */
const reserveCards = async (io, { roomId, cardIds, userId, playMode }) => {
    try {
        if (!roomId || !Array.isArray(cardIds) || !userId) {
            return { error: { message: "Invalid roomId, cardIds, or userId" } };
        }

        const uniqueCardIds = [...new Set(cardIds.map((id) => id.toString()))];

        // Load settings for card reservation mode
        const settings = await getSettings();
        const cardReservation = settings.cardReservation || {
            mode: 'single',
            maxCardsPerUser: 1,
            maxCardsPerRoom: 5,
            allowCrossRoomReservations: false
        };

        // Check cross-room reservations if not allowed (Applies to both modes)
        if (!cardReservation.allowCrossRoomReservations) {
            const otherRoomReservations = await Reservation.find({
                userId: new mongoose.Types.ObjectId(userId),
                roomId: { $ne: new mongoose.Types.ObjectId(roomId) },
                status: 'active'
            });
            if (otherRoomReservations.length > 0) {
                return { error: { message: "You can only have reservations in one room at a time." } };
            }
        }

        const maxPerRoom = cardReservation.maxCardsPerRoom || 5;
        const maxPerUser = cardReservation.maxCardsPerUser || (cardReservation.mode === 'single' ? 1 : 5);

        // --- PREDICT FINAL STATE FOR VALIDATION ---

        // 1. Get existing reservation for this room
        let reservation = await Reservation.findOne({
            roomId,
            userId,
            status: "active",
        });

        const existingCardIds = reservation?.cardIds?.map((id) => id.toString()) || [];
        const existingSet = new Set(existingCardIds);

        // 2. Determine what would be added/removed
        const cardsToAdd = uniqueCardIds.filter((id) => !existingSet.has(id));
        const cardsToRemove = cardReservation.mode === 'single' ? existingCardIds.filter((id) => !uniqueCardIds.includes(id)) : [];

        // 3. Predicted final set for THIS room
        const newCardIds = cardReservation.mode === 'single' ? uniqueCardIds : [...new Set([...existingCardIds, ...uniqueCardIds])];
        const predictedRoomCardCount = newCardIds.length;

        // --- ENFORCE LIMITS ---

        // A. Room Limit
        if (predictedRoomCardCount > maxPerRoom) {
            return { error: { message: `Maximum ${maxPerRoom} cards allowed per room. You already have ${existingCardIds.length} and tried to add ${cardsToAdd.length}.` } };
        }

        // B. Global Limit (Across all rooms)
        const otherRoomReservations = await Reservation.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'active', roomId: { $ne: new mongoose.Types.ObjectId(roomId) } } },
            { $project: { cardCount: { $size: '$cardIds' } } },
            { $group: { _id: null, total: { $sum: '$cardCount' } } }
        ]);
        const otherRoomsCardCount = otherRoomReservations[0]?.total || 0;

        if (predictedRoomCardCount + otherRoomsCardCount > maxPerUser) {
            return {
                error: {
                    message: `Maximum ${maxPerUser} cards allowed total. You have ${otherRoomsCardCount} cards in other rooms and ${existingCardIds.length} here.`
                }
            };
        }

        const requestedCardId = uniqueCardIds[0];

        const roomService = require("./roomService");
        const gameRoom = await roomService.getOrCreateRoomForStake(io, { stakeAmount: null, roomId, createIfNotFound: true });

        if (!gameRoom || ["playing", "completed"].includes(gameRoom.status)) {
            return { error: { message: "Game is already in progress, completed, or room not found" } };
        }

        const user = await User.findById(userId);
        if (!user) {
            return { error: { message: "User not found" } };
        }

        const costDelta = Math.max(cardsToAdd.length - cardsToRemove.length, 0) * gameRoom.stakeAmount;

        if (costDelta > 0 && (user.wallet + user.bonus) < costDelta) {
            return { error: { message: "Insufficient balance" } };
        }

        // ============ ATOMIC CARD LOCKING ============
        // Try to acquire locks for all new cards atomically using MongoDB unique index
        const lockedCardIds = [];
        const failedCardIds = [];

        if (cardsToAdd.length > 0) {
            const lockDocs = cardsToAdd.map(cardId => ({
                roomId: new mongoose.Types.ObjectId(roomId),
                cardId,
                userId: new mongoose.Types.ObjectId(userId),
            }));

            try {
                // insertMany with ordered:false attempts all inserts; unique index rejects duplicates
                await CardLock.insertMany(lockDocs, { ordered: false });
                lockedCardIds.push(...cardsToAdd);
            } catch (lockError) {
                // Check which cards actually got locked
                if (lockError.writeErrors || lockError.code === 11000) {
                    // Some succeeded, some failed
                    const insertedIds = lockError.insertedDocs?.map(d => d.cardId) || [];

                    // Query to find which cards this user actually locked
                    const actualLocks = await CardLock.find({
                        roomId: new mongoose.Types.ObjectId(roomId),
                        userId: new mongoose.Types.ObjectId(userId),
                        cardId: { $in: cardsToAdd }
                    }).select('cardId').lean();

                    const actualLockedIds = actualLocks.map(l => l.cardId);
                    lockedCardIds.push(...actualLockedIds);

                    // Find which cards failed (already locked by others)
                    const lockedSet = new Set(actualLockedIds);
                    failedCardIds.push(...cardsToAdd.filter(id => !lockedSet.has(id)));

                    if (failedCardIds.length > 0) {
                        // Release any locks we did acquire
                        if (lockedCardIds.length > 0) {
                            await CardLock.deleteMany({
                                roomId: new mongoose.Types.ObjectId(roomId),
                                userId: new mongoose.Types.ObjectId(userId),
                                cardId: { $in: lockedCardIds }
                            });
                        }
                        return { error: { message: `Card(s) ${failedCardIds.join(", ")} already reserved by another player` } };
                    }
                } else {
                    throw lockError;
                }
            }
        }

        // Release locks for cards being removed (in single mode when switching cards)
        if (cardsToRemove.length > 0) {
            await CardLock.deleteMany({
                roomId: new mongoose.Types.ObjectId(roomId),
                userId: new mongoose.Types.ObjectId(userId),
                cardId: { $in: cardsToRemove }
            });
        }
        // ============ END ATOMIC CARD LOCKING ============

        if (!reservation) {
            reservation = new Reservation({
                roomId,
                cardIds: newCardIds,
                userId,
                gameStatus: "reserved",
                status: "active",
                playMode: settings.defaultPlayMode || "manual",
            });
        } else {
            reservation.cardIds = newCardIds;
            reservation.gameStatus = "reserved";
            // If no playMode provided, ensure it's set to the current default if not already set or to keep it synchronized with admin settings
            if (!playMode) {
                reservation.playMode = settings.defaultPlayMode || "manual";
            }
        }

        if (typeof playMode === "string" && ["manual", "auto"].includes(playMode)) {
            reservation.playMode = playMode;
        }

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                await reservation.save({ session });
                if (costDelta > 0) {
                    const deduction = await walletService.deductForGame(userId, costDelta, session);
                    // Reload user for accurate wallet value after deduction
                    const freshUser = await User.findById(userId).session(session);
                    const isRobot = freshUser.isRobot || freshUser.role === 'robot';
                    const gameTx = new GameTransaction({
                        userId,
                        userType: isRobot ? UserType.ROBOT : UserType.USER,
                        type: GameTransactionType.STAKE,
                        gameType: GameType.BINGO,
                        roomId,
                        amount: costDelta,
                        stakeAmount: gameRoom.stakeAmount,
                        cardIds: cardsToAdd,
                        walletBefore: deduction.walletAfter + deduction.walletUsed,
                        walletAfter: deduction.walletAfter,
                        description: `Reserved ${cardsToAdd.length} card(s) in room ${roomId}`,
                    });
                    await gameTx.save({ session });
                }
            });
        } catch (saveError) {
            // Rollback: release acquired locks if reservation save fails
            if (lockedCardIds.length > 0) {
                await CardLock.deleteMany({
                    roomId: new mongoose.Types.ObjectId(roomId),
                    userId: new mongoose.Types.ObjectId(userId),
                    cardId: { $in: lockedCardIds }
                });
            }
            if (saveError.code === 11000 || saveError.name === 'VersionError') {
                logger.warn(`Reservation conflict for room ${roomId} by user ${userId}`, { error: saveError.message });
                return { error: { message: "One or more cards are already reserved by another player. Please refresh and try again." } };
            }
            throw saveError;
        } finally {
            session.endSession();
        }

        if (costDelta > 0) {
            const freshUser = await User.findById(userId).select("wallet bonus");
            io.to(userId.toString()).emit("walletUpdate", { wallet: freshUser.wallet, bonus: freshUser.bonus });
        }

        // Update Room State
        await refreshRoomState(io, roomId, gameRoom);

        // Dynamic Imports for loop management
        const { startCounter, emitCounters } = require("../socketController/countHandler");
        const { getCounter } = require("../socketController/sharedGameState");
        const { startSystemReservationBot } = require("../socketController/bingoCardHandler");

        if (gameRoom.numberOfPlayers >= 2 && !getCounter(roomId)) {
            await startCounter(io, roomId);
        } else {
            emitCounters(io, roomId);
        }

        // Ensure System Bot is running
        try {
            startSystemReservationBot(io, roomId);
        } catch (e) {
            logger.error("Failed to trigger system bot from reservation", e);
        }


        const message = cardsToAdd.length === 0 && cardsToRemove.length === 0
            ? "Reservation updated."
            : cardsToRemove.length > 0
                ? `Card ${requestedCardId} reserved. Released ${cardsToRemove.join(", ")}.`
                : `Card ${requestedCardId} reserved successfully!`;

        return {
            success: true,
            reservedCardIds: reservation.cardIds.map((id) => id.toString()),
            otherRoomsCardCount,
            previousCardIds: cardsToRemove.map((id) => id.toString()),
            message,
        };

    } catch (error) {
        logger.error(`Error reserving cards for room ${roomId}`, error);
        return { error: { message: "Failed to reserve cards" } };
    }
};


// Helper: Refresh GameRoom stats and emit updates
const refreshRoomState = async (io, roomId, gameRoom) => {
    if (!gameRoom) gameRoom = await GameRoom.findById(roomId);
    const reservations = await Reservation.find({ roomId, status: "active" });

    // Use Set to deduplicate cards across all reservations
    const uniqueCardIds = new Set();
    reservations.forEach((r) => {
        (r.cardIds || []).forEach((cardId) => uniqueCardIds.add(cardId));
    });
    const totalCards = uniqueCardIds.size;
    const totalStake = totalCards * gameRoom.stakeAmount;

    const stakeSettings = await StakeBonusSettings.findOne({ stakeAmount: Number(gameRoom.stakeAmount) });
    const systemCommission = stakeSettings?.systemCommission || 0.2;
    const winAmount = totalStake * (1 - systemCommission);

    gameRoom.numberOfPlayers = totalCards;
    gameRoom.winAmount = winAmount;
    if (totalCards >= 2 && gameRoom.status === "waiting") {
        gameRoom.status = "starting";
    }
    // If totalCards < 2, should we revert to waiting? Usually yes but logic varies.
    // Keeping logic simple: if it dips below 2, it might still remain starting until counter finishes?
    // bingoCardHandler usually handles counter start/stop externally.
    await gameRoom.save();

    io.to(roomId).emit("cards", await fetchCardStatuses(roomId));

    // Update lobby rooms list
    const updatedRooms = await GameRoom.find({ status: { $ne: "completed" } });
    const roomsWithBonus = await attachBonusToRooms(updatedRooms);
    io.emit("rooms", roomsWithBonus);

    // Update active games count for this stake
    io.emit("get_active_games_by_stake", { stakeAmount: gameRoom.stakeAmount });
}

/**
 * Handles card unreservation for a user
 */
const unreserveCards = async (io, { roomId, cardIds, userId }) => {
    try {
        if (!roomId || !Array.isArray(cardIds) || cardIds.length === 0 || !userId) {
            return { error: { message: "Invalid request data" } };
        }

        const roomService = require("./roomService");
        const gameRoom = await roomService.getOrCreateRoomForStake(io, { stakeAmount: null, roomId, createIfNotFound: false });

        if (!gameRoom || ["playing", "completed"].includes(gameRoom.status)) {
            return { error: { message: "Game is already in progress, completed, or room not found" } };
        }

        const reservation = await Reservation.findOne({
            roomId,
            userId,
            status: "active",
        });

        if (!reservation) {
            return { error: { message: "Reservation not found" } };
        }

        const cardsToRemove = cardIds.filter(id => reservation.cardIds.map(String).includes(id.toString()));
        
        if (cardsToRemove.length === 0) {
             return { error: { message: "You don't have these cards reserved" } };
        }

        const refundAmount = cardsToRemove.length * gameRoom.stakeAmount;

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                // Remove cards from reservation
                reservation.cardIds = reservation.cardIds.filter(id => !cardsToRemove.includes(id.toString()));
                if (reservation.cardIds.length === 0) {
                    await Reservation.deleteOne({ _id: reservation._id }).session(session);
                } else {
                    await reservation.save({ session });
                }

                // Delete locks
                await CardLock.deleteMany({
                    roomId: new mongoose.Types.ObjectId(roomId),
                    userId: new mongoose.Types.ObjectId(userId),
                    cardId: { $in: cardsToRemove }
                }).session(session);

                // Refund wallet
                if (refundAmount > 0) {
                    await User.updateOne(
                        { _id: userId },
                        { $inc: { wallet: refundAmount } },
                        { session }
                    );
                    
                    const freshUser = await User.findById(userId).session(session);
                    const isRobot = freshUser.isRobot || freshUser.role === 'robot';
                    
                    const gameTx = new GameTransaction({
                        userId,
                        userType: isRobot ? UserType.ROBOT : UserType.USER,
                        type: GameTransactionType.WIN, 
                        gameType: GameType.BINGO,
                        roomId,
                        amount: refundAmount,
                        stakeAmount: gameRoom.stakeAmount,
                        cardIds: cardsToRemove,
                        walletBefore: freshUser.wallet - refundAmount,
                        walletAfter: freshUser.wallet,
                        description: `Unreserved ${cardsToRemove.length} card(s) in room ${roomId}`,
                    });
                    await gameTx.save({ session });
                }
            });
        } catch (error) {
            throw error;
        } finally {
            session.endSession();
        }

        const freshUser = await User.findById(userId).select("wallet bonus");
        io.to(userId.toString()).emit("walletUpdate", { wallet: freshUser.wallet, bonus: freshUser.bonus });

        await refreshRoomState(io, roomId, gameRoom);

        return {
            success: true,
            unreservedCardIds: cardsToRemove,
            message: `Successfully unreserved ${cardsToRemove.length} card(s).`,
        };
    } catch (error) {
        logger.error(`Error unreserving cards for room ${roomId}`, error);
        return { error: { message: "Failed to unreserve cards" } };
    }
};

/**

 * Fetches and aggregates reserved cards for a user in a room
 */
const getReservedCards = async ({ userId, roomId }) => {
    try {
        const reservations = await Reservation.find({
            userId,
            roomId,
            status: { $in: ["pending", "active"] },
        });

        const settings = await getSettings();
        const otherRoomReservations = await Reservation.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    status: 'active',
                    roomId: { $ne: new mongoose.Types.ObjectId(roomId) }
                }
            },
            { $project: { cardCount: { $size: '$cardIds' } } },
            { $group: { _id: null, total: { $sum: '$cardCount' } } }
        ]);
        const otherRoomsCardCount = otherRoomReservations[0]?.total || 0;

        if (!reservations || reservations.length === 0) {
            return {
                cardIds: [],
                otherRoomsCardCount,
                isDisqualified: false,
                disqualificationReason: null,
                playMode: settings.defaultPlayMode || "manual",
            };
        }

        const aggregatedCardIds = reservations.flatMap(r => r.cardIds || []).map(id => id.toString());
        const anyDisqualified = reservations.some((reservation) => reservation.isDisqualified);
        const firstWithReason = reservations.find((reservation) => reservation.disqualificationReason);

        const resolvedPlayMode = anyDisqualified
            ? "manual"
            : reservations.some((reservation) => reservation.playMode === "manual")
                ? "manual"
                : reservations.some((reservation) => reservation.playMode === "auto")
                    ? "auto"
                    : (settings.defaultPlayMode || "manual");

        return {
            cardIds: aggregatedCardIds,
            otherRoomsCardCount,
            isDisqualified: anyDisqualified,
            disqualificationReason: firstWithReason?.disqualificationReason || null,
            playMode: resolvedPlayMode,
        };
    } catch (err) {
        logger.error("Failed to fetch reserved cards in service", err);
        throw err;
    }
};

module.exports = {
    reserveCards,
    unreserveCards,
    getReservedCards
};