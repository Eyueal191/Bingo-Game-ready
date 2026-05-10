const Setting = require("../models/settingModel");
const logger = require("./winstonLogger");

let cachedSettings = null;

const getSettings = async () => {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    const setting = await Setting.findOne().sort({ createdAt: -1 });
    if (!setting) {
      logger.warn("No settings found, creating default settings");
      const defaultSetting = new Setting({
        cardAmount: 1000, // Target for room (robots strive to reach this)
        maxUserReservedCards: 1000,
        maxTotalCards: 500, // Allow up to 500 cards total per room
      });
      await defaultSetting.save();
      cachedSettings = {
        cardAmount: 1000,
        maxUserReservedCards: 1000,
        maxTotalCards:1000,
      };
      return cachedSettings;
    }


    const settings = {
      cardAmount:
        Number.isInteger(setting.cardAmount) && setting.cardAmount > 0
          ? setting.cardAmount
          : 1000,
      maxUserReservedCards:
        Number.isInteger(setting.maxUserReservedCards) &&
          setting.maxUserReservedCards > 0
          ? setting.maxUserReservedCards
          : 1000,
      maxTotalCards:
        Number.isInteger(setting.maxTotalCards) && setting.maxTotalCards >= 2
          ? setting.maxTotalCards
          : 1000,
      countdownDuration:
        Number.isInteger(setting.countdownDuration) && setting.countdownDuration >= 10
          ? setting.countdownDuration
          : 30,
      defaultPlayMode: setting.defaultPlayMode || 'manual',
      cardReservation: {
        mode: setting.cardReservation?.mode || 'single',
        maxCardsPerUser: setting.cardReservation?.maxCardsPerUser || 1000,
        maxCardsPerRoom: setting.cardReservation?.maxCardsPerRoom || 1000,
        allowCrossRoomReservations: setting.cardReservation?.allowCrossRoomReservations ?? false,
        isClickToReserve: setting.cardReservation?.isClickToReserve ?? false
      }
    };

    cachedSettings = settings;
    logger.debug("Settings loaded", settings);
    return settings;
  } catch (error) {
    logger.error("Error fetching settings", error);
    cachedSettings = {
      cardAmount: 500,
      maxUserReservedCards: 10,
      maxTotalCards: 500,
    };
    return cachedSettings;
  }

};

const clearSettingsCache = () => {
  cachedSettings = null;
  logger.info("Settings cache cleared");
};

module.exports = { getSettings, clearSettingsCache };