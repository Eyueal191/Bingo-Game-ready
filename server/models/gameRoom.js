const mongoose = require("mongoose");

const gameRoomSchema = new mongoose.Schema({
  stakeAmount: { type: Number, required: true, min: 0, default: 10 },
  winAmount: { type: Number, default: 0 },
  numberOfPlayers: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["waiting", "starting", "playing", "completed"],
    default: "waiting",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: false,
  },
  createdAt: { type: Date, default: Date.now },
  drawnNumbers: { type: [Number], default: [] },
  winners: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
      },
      cardId: { type: String, required: true },
      prize: { type: Number, required: true },
    },
  ],
  houseProfit: { type: Number, default: 0 },
  completedAt: { type: Date, default: null },
  playingStartedAt: { type: Date, default: null },
  // Bonus system fields
  bonusEnabled: { type: Boolean, default: false },
  bonusAmount: { type: Number, default: 0 },
  bonusDescription: { type: String }, // Optional, for admin notes
});

// Only one non-completed room (waiting/starting/playing) per stakeAmount at a time
gameRoomSchema.index(
  { stakeAmount: 1 },
  {
    name: "uniq_stake_non_completed",
    unique: true,
    partialFilterExpression: {
      status: { $in: ["waiting", "starting", "playing"] },
    },
  }
);
const GameRoom = mongoose.model("GameRoom", gameRoomSchema);
module.exports = GameRoom;
