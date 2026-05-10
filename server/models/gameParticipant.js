const mongoose = require("mongoose");

const gameParticipantSchema = new mongoose.Schema(
  {
    game_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    numbers: {
      type: [Number],
      required: true,
      validate: {
        validator: function (v) {
          return v.every((num) => Number.isInteger(num) && num > 0);
        },
        message: "All numbers must be positive integers",
      },
    },
    paid_status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    rank: {
      type: [Number],
      default: [],
      validate: {
        validator: function (v) {
          return v.every((r) => Number.isInteger(r) && r >= 1);
        },
        message: "Ranks must be positive integers",
      },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "game_participants",
  }
);

// Ensure a user has at most one participant per game
gameParticipantSchema.index({ game_id: 1, user_id: 1 }, { unique: true });


module.exports = mongoose.model("GameParticipant", gameParticipantSchema);
