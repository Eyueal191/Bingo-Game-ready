const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const withdrawalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    accountNumber: { type: String, required: true },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected"],
    },
    localAmount: { type: Number },
    localCurrency: { type: String },
    exchangeRate: { type: Number },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const WithdrawalRequest = mongoose.model("WithdrawalRequest", withdrawalSchema, "withdrawals");
module.exports = WithdrawalRequest;

