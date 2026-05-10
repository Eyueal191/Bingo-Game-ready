const mongoose = require("mongoose");

const agentPaymentSchema = new mongoose.Schema(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const AgentPayment = mongoose.model("AgentPayment", agentPaymentSchema);

module.exports = AgentPayment;
