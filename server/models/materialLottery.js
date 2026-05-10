const mongoose = require("mongoose");

const materialLotterySchema = new mongoose.Schema(
  {
    bet_amount: { type: Number, required: true },
    max_players: { type: Number, required: true },
    // Logical "draw" or iteration counter for this lottery document
    // Increments when admins reset the game; defaults to 1 for existing/new docs
    round: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    participants: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
          required: true,
        },
        full_name: { type: String, required: true },
        numbers: [{ type: Number, required: true }],
        paid_status: {
          type: String,
          enum: ["pending", "paid"],
          default: "pending",
        },
        rank: [{ type: Number }],
      },
    ],
    winners: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
        full_name: { type: String },
        numbers: [{ type: Number }],
        rank: { type: Number },
        prize: { type: String }, // Can be monetary (e.g., "100 coins") or material (e.g., "Smartphone")
      },
    ],
    rewards: [
      {
        rank: { type: Number, required: true },
        type: { type: String, enum: ["monetary", "material"], required: true },
        amount: { type: Number, default: 0 }, // For monetary rewards
        description: { type: String, required: true }, // For material rewards or monetary description
        photo: { type: String },
      },
    ],
    gameType: { type: String, default: "material_lottery" },
    created_at: { type: Date, default: Date.now },
    completed_at: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MaterialLottery", materialLotterySchema);