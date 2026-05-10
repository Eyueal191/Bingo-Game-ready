const mongoose = require("mongoose");

const ludoPlayerSchema = new mongoose.Schema(
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
        status: {
            type: String,
            enum: ["joined", "ready", "playing", "disconnected", "forfeit"],
            default: "joined",
        },
        joinedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const ludoRoomSchema = new mongoose.Schema(
    {
        stakeAmount: { type: Number, required: true, min: 0 },
        mode: {
            type: String,
            enum: ["classic", "quick", "sprint"],
            default: "classic",
        },
        playerCount: {
            type: Number,
            enum: [2, 4],
            default: 2,
        },
        status: {
            type: String,
            enum: ["waiting", "full", "playing", "ended", "cancelled"],
            default: "waiting",
        },
        players: [ludoPlayerSchema],
        commissionPercent: { type: Number, default: 20, min: 0, max: 100 },
        winnerUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            default: null,
        },
        winAmount: { type: Number, default: 0 },
        creatorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            default: null,
        },
        gameId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LudoGame",
            default: null,
        },
        startedAt: { type: Date, default: null },
        endedAt: { type: Date, default: null },
        refundProcessed: { type: Boolean, default: false },
        timeoutMinutes: { type: Number, default: 5 },
    },
    {
        timestamps: true,
        collection: "ludo_rooms",
    }
);

// Index for finding available rooms
ludoRoomSchema.index({ stakeAmount: 1, mode: 1, status: 1 });
ludoRoomSchema.index({ status: 1 });
ludoRoomSchema.index({ "players.userId": 1 });

const LudoRoom = mongoose.model("LudoRoom", ludoRoomSchema);
module.exports = LudoRoom;
