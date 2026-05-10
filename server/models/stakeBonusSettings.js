const mongoose = require("mongoose");

const stakeBonusSettingsSchema = new mongoose.Schema({
  stakeAmount: { type: Number, required: true, unique: true },
  bonusEnabled: { type: Boolean, default: false },
  bonusAmount: { type: Number, default: 0 },
  bonusDescription: { type: String },
  systemCommission: { type: Number, default: 0.2, min: 0, max: 1 }, // Commission as decimal (0.2 = 20%)
  robotEnabled: { type: Boolean, default: true }, // Enable robot for this stake
  robotMinCards: { type: Number, default: 200, min: 1, max: 500 }, // Min cards robot can reserve (default 200)
  robotMaxCards: { type: Number, default: 300, min: 1, max: 500 }, // Max cards robot can reserve (default 300)
  robotWinningPercent: { type: Number, default: 0, min: 0, max: 100 }, // Bias chance for robot wins
});


const StakeBonusSettings = mongoose.model(
  "StakeBonusSettings",
  stakeBonusSettingsSchema
);
module.exports = StakeBonusSettings;