const mongoose = require("mongoose");

const jackpotLevelSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    balance: { type: Number, default: 0, min: 0 },
    awardAmount: { type: Number, default: 0, min: 0 },
    allocationPercent: { type: Number, required: true, min: 0, max: 100 },
    rollbackPercent: { type: Number, default: 20, min: 0, max: 100 },
    winConditions: {
      maxCalls: { type: Number, required: true, min: 1 },
      maxSeconds: { type: Number, required: true, min: 1 },
    },
    color: { type: String, default: "#FFD700" },
    icon: { type: String, default: "🏆" },
    enabled: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    savedBalance: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const allocationHistorySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    totalProfit: { type: Number, required: true },
    allocated: { type: Number, required: true },
    saved: { type: Number, default: 0 },
    breakdown: [
      {
        key: String,
        amount: Number,
        savedAmount: { type: Number, default: 0 },
      },
    ],
  },
  { _id: true, timestamps: false }
);

const jackpotConfigSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    centralWallet: { type: Number, default: 0, min: 0 },
    dailyAllocationPercent: { type: Number, default: 10, min: 0, max: 100 },
    levels: { type: [jackpotLevelSchema], default: [] },
    lastDailyAllocation: { type: Date, default: null },
    lastProcessedTimestamp: { type: Date, default: null },
    allocationHistory: { type: [allocationHistorySchema], default: [] },
  },
  { timestamps: true, collection: "jackpot_configs" }
);

// 🔒 enforce SINGLE document
jackpotConfigSchema.index({}, { unique: true });

// ✅ atomic singleton with defaults
jackpotConfigSchema.statics.getConfig = async function () {
  return await this.findOneAndUpdate(
    {},
    {
      $setOnInsert: {
        enabled: false,
        centralWallet: 0,
        dailyAllocationPercent: 10,
        levels: [
          {
            key: "super_bingo",
            label: "Super Bingo",
            balance: 0,
            allocationPercent: 40,
            awardAmount: 4000,
            rollbackPercent: 20,
            winConditions: { maxCalls: 4, maxSeconds: 5 },
            color: "#FF6B35",
            icon: "🏆",
            enabled: true,
            priority: 0,
          },
          {
            key: "gold",
            label: "Gold",
            balance: 0,
            allocationPercent: 17,
            awardAmount: 17000,
            rollbackPercent: 20,
            winConditions: { maxCalls: 5, maxSeconds: 10 },
            color: "#FFD700",
            icon: "🥇",
            enabled: true,
            priority: 1,
          },
          {
            key: "silver",
            label: "Silver",
            balance: 0,
            allocationPercent: 15,
            awardAmount: 9000,
            rollbackPercent: 20,
            winConditions: { maxCalls: 6, maxSeconds: 15 },
            color: "#C0C0C0",
            icon: "🥈",
            enabled: true,
            priority: 2,
          },
          {
            key: "bronze",
            label: "Bronze",
            balance: 0,
            allocationPercent: 5,
            awardAmount: 4000,
            rollbackPercent: 20,
            winConditions: { maxCalls: 7, maxSeconds: 20 },
            color: "#CD7F32",
            icon: "🥉",
            enabled: true,
            priority: 3,
          },
        ],
      },
    },
    {
      new: true,
      upsert: true,
    }
  );
};

module.exports = mongoose.model("JackpotConfig", jackpotConfigSchema);