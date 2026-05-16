const mongoose = require("mongoose");

const appConfigSchema = new mongoose.Schema(
  {
    identity: {
      appName: { type: String, default: "" },
      appNameLocalized: { type: String, default: "" },
      shortName: { type: String, default: "" },
      tagline: { type: String, default: "Play. Win. Celebrate." },
    },
    branding: {
      logoUrl: { type: String, default: "" },
      squareLogoUrl: { type: String, default: "" },
      faviconUrl: { type: String, default: "" },
      primaryColor: { type: String, default: "#1e88e5" },
      secondaryColor: { type: String, default: "#f5b301" },
      assetBaseUrl: { type: String, default: "" },
    },
    bot: {
      botName: { type: String, default: "" },
      botUserName: { type: String, default: "" },
      supportUserName: { type: String, default: "" },
      supportChannelUrl: { type: String, default: "" },
    },
    leaderboard: {
      enabled: { type: Boolean, default: true },
      includeRobots: { type: Boolean, default: false },
    },
    paymentAccounts: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },

    // Bot payment method/flow toggles (admin configurable)
    botPayments: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },

    depositBonus: {
      enabled: { type: Boolean, default: false },
      percent: {
        type: Number,
        default: 20,
        min: [0, "Deposit bonus percent cannot be negative"],
        max: [100, "Deposit bonus percent cannot exceed 100"],
      },
    },

    robotEnabledGlobal: { type: Boolean, default: true }, // Global toggle for robot automation
    walletRules: {
      minDepositAmount: { type: Number, default: 50, min: 0 },
      minAutomaticDepositAmount: { type: Number, default: 50, min: 0 },
      minWithdrawalAmount: { type: Number, default: 100, min: 0 },
      minBalanceAfterWithdrawal: { type: Number, default: 10, min: 0 },
      minWinsForWithdrawal: { type: Number, default: 3, min: 0 },
      minDepositsForWithdrawal: { type: Number, default: 1, min: 0 },
      minTransferAmount: { type: Number, default: 10, min: 0 },
      maxTransferAmount: { type: Number, default: 500, min: 0 },
    },


    promoBanner: {
      enabled: { type: Boolean, default: false },
      version: { type: Number, default: 1 },
      imageUrl: { type: String },
      title: { type: String },
      body: { type: String },
      expiresAt: { type: Date },
      theme: {
        headerBg: { type: String },
        headerText: { type: String },
        bgStart: { type: String },
        bgEnd: { type: String },
        ctaColor: { type: String },
      },
      action: {
        label: { type: String },
        url: { type: String },
      },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      updatedAt: { type: Date },
    },

  },
  { timestamps: true, collection: "app_configs" }
);

appConfigSchema.statics.getConfig = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

module.exports = mongoose.model("AppConfig", appConfigSchema);