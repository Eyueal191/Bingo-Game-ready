// models/adminSetting.js
const mongoose = require("mongoose");

const adminSettingSchema = new mongoose.Schema(
  {
    isBonusEnabled: {
      type: Boolean,
      default: false,
    },
        isReferralBonusEnabled: {
      type: Boolean,
      default: false,
    },
    bonusAmount: {
      type: Number,
      default: 10,
      min: [0, "Bonus amount cannot be negative"],
      max: [10000, "Bonus amount too large"],
    },
    referralBonus: {
      type: Number,
      default: 0,
      min: [0, "Referral bonus cannot be negative"],
      max: [100, "Referral bonus percent cannot exceed 100"],
    },
  },
  { timestamps: true }
);

// Ensure only one settings document (Singleton)
adminSettingSchema.statics.getSettings = async function () {
  let setting = await this.findOne();
  if (!setting) {
    setting = await this.create({});
  }
  return setting;
};

// Prevent deletion of all settings accidentally
adminSettingSchema.pre("deleteMany", function (next) {
  return next(new Error("Admin settings cannot be deleted"));
});

const AdminSetting = mongoose.model("AdminSetting", adminSettingSchema);

module.exports = AdminSetting;
