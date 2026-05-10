const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const gameSchema = new Schema(
  {
    prize_amount: {
      type: Number,
      required: true,
    },
    bet_amount: {
      type: Number,
      required: true,
    },
    max_players: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "GameParticipant",
      },
    ],
    gameType: {
      type: String,
      enum: ["keshkesh", "fetan-spin"],
      default: "keshkesh",
    },
    // Per-room system benefit percentage (house cut) for Kesh-Kesh
    // Used to compute prize_amount = bet_amount * max_players * (1 - system_benefit/100)
    system_benefit: {
      type: Number,
      min: 0,
      max: 100,
      default: 20,
    },
    // Per-room prize configuration for Kesh-Kesh
    // Example: [{ rank: 1, percent: 70 }, { rank: 2, percent: 10 }]
    prize_tiers: [
      new Schema(
        {
          rank: { type: Number, required: true, min: 1 },
          percent: { type: Number, required: true, min: 0, max: 100 },
        },
        { _id: false }
      ),
    ],
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "games",
  }
);

module.exports = mongoose.model("Game", gameSchema);
