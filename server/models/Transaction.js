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
  JACKPOT: "jackpot",
  BET: "bet",
  WIN: "win",
  REFUND: "refund",
};

const TransactionStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELED",
  APPROVED: "approved",
  REJECTED: "rejected",
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
      required: true,
    },
    source: {
      type: String,
      enum: ["manual", "sms", "admin", "system", "addispay", "telebirr"],
      default: "system",
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
      default: TransactionStatus.PENDING,
    },
    reference: {
      type: String,
      sparse: true,
      unique: true,
    },
    transactionId: {
      type: String,
      required: false,
    },
    receiptId: {
      type: Schema.Types.ObjectId,
      ref: "Receipts",
      default: null,
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    addispayNonce: { type: String, unique: true, sparse: true },
    addispayTransactionId: { type: String, unique: true, sparse: true },
    description: String,
    localAmount: { type: Number },
    localCurrency: { type: String },
    exchangeRate: { type: Number },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = { Transaction, TransactionType, TransactionStatus };
