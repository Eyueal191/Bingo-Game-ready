// models/Receipt.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const receiptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    fileUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    amount: { type: Number },
    paymentMethod: { type: String },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Receipt = mongoose.model("Receipts", receiptSchema);
module.exports = Receipt;