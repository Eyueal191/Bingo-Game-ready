
const mongoose = require("mongoose");

const cardLockSchema = new mongoose.Schema({
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GameRoom",
        required: true,
    },
    cardId: {
        type: String,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
    },
    reservationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reservation",
        required: false, // Set after reservation is created
    },
    lockedAt: {
        type: Date,
        default: Date.now,
    },
});

// Compound unique index - MongoDB enforces uniqueness atomically
cardLockSchema.index({ roomId: 1, cardId: 1 }, { unique: true });

// Index for fast lookups by room
cardLockSchema.index({ roomId: 1 });

// Index for fast lookups by user in a room
cardLockSchema.index({ roomId: 1, userId: 1 });

const CardLock = mongoose.model("CardLock", cardLockSchema);

module.exports = CardLock;
