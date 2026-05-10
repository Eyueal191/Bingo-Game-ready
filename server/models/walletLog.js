const mongoose = require("mongoose");

const WalletLogSchema = new mongoose.Schema(
  {
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    amount: { type: Number, required: true }, // positive = credit, negative = debit
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, default: "" },
    source: {
      type: String,
      enum: [
        "manual",
        "receipt_approval",
        "withdrawal_adjustment",
        "system",
        "other",
      ],
      default: "manual",
    },
    balanceType: {
      type: String,
      enum: ["wallet", "bonus"],
      default: "wallet",
    },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

WalletLogSchema.index({ createdAt: -1 });
WalletLogSchema.index({ targetUser: 1, createdAt: -1 });
WalletLogSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.model("WalletLog", WalletLogSchema);