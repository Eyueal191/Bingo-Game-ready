
const mongoose = require("mongoose");

const materialPayoutSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    game_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MaterialLottery",
      required: true,
    },
    amount: { type: Number, default: 0, min: 0 }, // For monetary rewards
    description: { type: String, required: true }, // For material rewards
    type: { type: String, enum: ["monetary", "material"], required: true },
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    rank: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MaterialPayout", materialPayoutSchema);