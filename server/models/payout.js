const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    rank: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "payouts",
  }
);

// Ensure we never create duplicate payouts for the same game and rank
payoutSchema.index({ game_id: 1, rank: 1 }, { unique: true });

module.exports = mongoose.model("Payout", payoutSchema);
