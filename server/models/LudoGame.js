const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
    {
        id: { type: Number, required: true }, // 0-3 (classic) or 0-1 (quick)
        position: { type: Number, default: 0 }, // 0 = in base, cell number on board
        isHome: { type: Boolean, default: true }, // still in home base
        isFinished: { type: Boolean, default: false }, // reached final home
    },
    { _id: false }
);

const ludoPlayerStateSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
        },
        color: {
            type: String,
            enum: ["red", "green", "yellow", "blue"],
            required: true,
        },
        tokens: [tokenSchema],
        forfeited: { type: Boolean, default: false },
        consecutiveTimeouts: { type: Number, default: 0 },
    },
    { _id: false }
);

const diceRollSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
        },
        value: { type: Number, required: true, min: 1, max: 6 },
        timestamp: { type: Date, default: Date.now },
    },
    { _id: false }
);

const moveSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
        },
        tokenId: { type: Number, required: true },
        from: { type: Number, required: true },
        to: { type: Number, required: true },
        captured: { type: Boolean, default: false },
        capturedUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            default: null,
        },
        capturedTokenId: { type: Number, default: null },
        timestamp: { type: Date, default: Date.now },
    },
    { _id: false }
);

const ludoGameSchema = new mongoose.Schema(
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LudoRoom",
            required: true,
            index: true,
        },
        mode: {
            type: String,
            enum: ["classic", "quick", "sprint"],
            required: true,
        },
        players: [ludoPlayerStateSchema],
        currentTurnIndex: { type: Number, default: 0 },
        currentDiceValue: { type: Number, default: null },
        diceRolled: { type: Boolean, default: false }, // has current player rolled?
        consecutiveSixes: { type: Number, default: 0 },
        diceRolls: [diceRollSchema],
        moves: [moveSchema],
        winnerUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            default: null,
        },
        status: {
            type: String,
            enum: ["playing", "ended", "aborted"],
            default: "playing",
        },
        turnTimerSeconds: { type: Number, default: 15 },
        lastTurnAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
        collection: "ludo_games",
    }
);

ludoGameSchema.index({ status: 1 });

const LudoGame = mongoose.model("LudoGame", ludoGameSchema);
module.exports = LudoGame;
