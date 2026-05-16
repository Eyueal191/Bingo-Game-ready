const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    type: {
      type: String,
      enum: ["deposit", "transfer", "Withdrawal", "bonus", "referral_bonus",],
      required: true,
    },
    amount: { type: Number, required: true },
    source: {
      type: String,
      enum: ["manual", "sms", "admin", "system"],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    creditedAmount: { type: Number, default: 0, min: 0 },
    bonusAmount: { type: Number, default: 0, min: 0 },
    bonusPercent: { type: Number, default: 0, min: 0, max: 100 },
    transactionId: { type: String, required: false },
    paymentMethod: { type: String, enum: ["CBE", "Telebirr", "Abyssinia", "CBEBirr", "Dashen"], required: false },
    description: { type: String },
    receiptId: { type: Schema.Types.ObjectId, ref: "Receipts", default: null },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("ManualTransactions", transactionSchema);
module.exports = Transaction;