const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * GameTransaction - Records all game-related financial movements
 * This is the SINGLE SOURCE OF TRUTH for game revenue calculations
 * 
 * Separates game activities from financial ledger (deposits/withdrawals)
 * Following fintech best practices for domain separation
 */

const GameTransactionType = {
    STAKE: "stake",       // User/Robot pays to play
    WIN: "win",           // User/Robot receives winnings
    REFUND: "refund",     // Stake returned (game cancelled, etc.)
};

const GameType = {
    BINGO: "bingo",
    KESHKESH: "keshkesh",
    MATERIAL_LOTTERY: "material_lottery",
    SPIN: "spin",
    LUDO: "ludo",
};

const UserType = {
    USER: "user",
    ROBOT: "robot",
};

const gameTransactionSchema = new Schema(
    {
        // Who
        userId: {
            type: Schema.Types.ObjectId,
            ref: "Users",
            required: true,
            index: true,
        },
        userType: {
            type: String,
            enum: Object.values(UserType),
            required: true,
            index: true,
        },

        // What type
        type: {
            type: String,
            enum: Object.values(GameTransactionType),
            required: true,
            index: true,
        },

        // Which game
        gameType: {
            type: String,
            enum: Object.values(GameType),
            required: true,
            index: true,
        },

        // Game reference (flexible for different game types)
        roomId: {
            type: Schema.Types.ObjectId,
            ref: "GameRoom",
            index: true,
        },
        gameId: {
            type: Schema.Types.ObjectId,
            ref: "Game", // For Keshkesh
            index: true,
        },

        // Financial
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        stakeAmount: {
            type: Number, // Original stake level for context
        },

        // For Bingo - which cards were involved
        cardIds: [{
            type: String,
        }],

        // Wallet tracking for audit trail
        walletBefore: {
            type: Number,
        },
        walletAfter: {
            type: Number,
        },

        // Additional context
        description: String,
        metadata: Schema.Types.Mixed,
    },
    {
        timestamps: true,
        collection: "game_transactions",
    }
);

// Compound indexes for efficient querying
gameTransactionSchema.index({ createdAt: -1 });
gameTransactionSchema.index({ gameType: 1, type: 1, createdAt: -1 });
gameTransactionSchema.index({ roomId: 1, type: 1 });
gameTransactionSchema.index({ userType: 1, type: 1, createdAt: -1 });
gameTransactionSchema.index({ userId: 1, createdAt: -1 });

/**
 * Static method: Get revenue breakdown by period
 */
gameTransactionSchema.statics.getRevenueByPeriod = async function (startDate, endDate, gameType) {
    const match = {};
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    if (gameType) match.gameType = gameType;

    return this.aggregate([
        { $match: match },
        {
            $group: {
                _id: {
                    type: "$type",
                    userType: "$userType",
                    gameType: "$gameType",
                },
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 },
            },
        },
    ]);
};

/**
 * Static method: Get summary stats for a specific room
 */
gameTransactionSchema.statics.getRoomStats = async function (roomId) {
    return this.aggregate([
        { $match: { roomId: new mongoose.Types.ObjectId(roomId) } },
        {
            $group: {
                _id: { type: "$type", userType: "$userType" },
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 },
            },
        },
    ]);
};

const GameTransaction = mongoose.model("GameTransaction", gameTransactionSchema);

module.exports = {
    GameTransaction,
    GameTransactionType,
    GameType,
    UserType,
};
