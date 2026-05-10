const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GameRoom",
    required: true,
  },
  cardIds: { type: [String], required: true },
  gameStatus: {
    type: String,
    enum: ["reserved", "playing", "won", "lost"],
    default: "reserved",
  },
  status: { type: String, enum: ["active", "completed", 'pending'], default: "active" },
  playMode: { type: String, enum: ["manual", "auto"] },
  isDisqualified: { type: Boolean, default: false },
  disqualifiedAt: { type: Date },
  disqualificationReason: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Add unique index to prevent duplicate card reservations in the same room
reservationSchema.index(
  { roomId: 1, cardIds: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["active", "pending"] } }
  }
);

const Reservation = mongoose.model("Reservation", reservationSchema);

module.exports = Reservation;
