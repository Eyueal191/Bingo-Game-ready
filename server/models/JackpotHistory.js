const mongoose = require("mongoose");

const JackpotHistorySchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    levelKey: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      default: "game_jackpot_lock", // important for handleGameOver lock
    },

    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    amount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// 🔒 CRITICAL: prevents duplicate jackpot in SAME game + level
JackpotHistorySchema.index(
  { roomId: 1, levelKey: 1, type: 1 },
  { unique: true }
);

module.exports = mongoose.model("JackpotHistory", JackpotHistorySchema);