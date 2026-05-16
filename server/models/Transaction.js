const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TransactionType = {
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
  TRANSFER: "transfer",
  RECEIVE: "receive",
  REGISTRATION_BONUS: "registration_bonus",
  REFERRAL_BONUS: "referral_bonus",
  BONUS: "game_bonus",
};

const TransactionStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELED",
};

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    creditedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    bonusAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    bonusPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    addispayNonce: { type: String, unique: true, sparse: true },
    addispayTransactionId: { type: String, unique: true, sparse: true },
    description: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = { Transaction, TransactionType, TransactionStatus };
