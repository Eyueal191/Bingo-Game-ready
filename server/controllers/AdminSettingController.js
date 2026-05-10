// controllers/AdminSettingController.js
const AdminSetting = require("../models/adminSetting");
const logger = require("../utils/winstonLogger");

exports.getSettings = async (req, res) => {
  try {
    const settings = await AdminSetting.getSettings();
    res.status(200).json(settings);
  } catch (error) {
    logger.error("Error fetching settings:", error);
    res.status(500).json({ message: "Error fetching settings" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    let {
      isBonusEnabled,
      isReferralBonusEnabled,
      bonusAmount,
      referralBonus,
    } = req.body;

    const toBoolean = (value) => {
      if (typeof value === "string") {
        return ["true", "1", "yes", "on"].includes(value.toLowerCase());
      }
      return Boolean(value);
    };

    // Type coercion and validation
    isBonusEnabled = toBoolean(isBonusEnabled);
    isReferralBonusEnabled = toBoolean(isReferralBonusEnabled);
    bonusAmount = Number(bonusAmount);
    referralBonus = Number(referralBonus);

    if (isNaN(bonusAmount) || bonusAmount < 0 || bonusAmount > 10000) {
      return res.status(400).json({ message: "Invalid bonus amount value" });
    }
    if (isNaN(referralBonus) || referralBonus < 0 || referralBonus > 100) {
      return res
        .status(400)
        .json({ message: "Invalid referral bonus percent (0-100)" });
    }

    const updated = await AdminSetting.findOneAndUpdate(
      {},
      {
        isBonusEnabled,
        isReferralBonusEnabled,
        bonusAmount,
        referralBonus,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      message: "Settings updated successfully",
      settings: updated,
    });
  } catch (error) {
    logger.error("Error updating settings:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
};