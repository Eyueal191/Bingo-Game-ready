const mongoose = require("mongoose");

const SpinLogSchema = new mongoose.Schema(
  {
    spinId: { type: String, required: true, index: true, unique: true },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      index: true,
    },
    rank: { type: Number },
    commitHash: { type: String, required: true },
    seed: { type: String },
    targetIndex: { type: Number },
    segmentsCount: { type: Number },
    status: {
      type: String,
      enum: ["prepared", "started", "completed"],
      default: "prepared",
    },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SpinLog", SpinLogSchema);
