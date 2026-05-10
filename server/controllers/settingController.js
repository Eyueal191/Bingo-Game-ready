const Setting = require("../models/settingModel");
const logger = require("../utils/winstonLogger");
const { clearSettingsCache } = require("../utils");

// Get current settings
exports.getSettings = async (req, res) => {
  try {
    const setting = await Setting.findOne().sort({ createdAt: -1 });

    // Return default values if no settings found to prevent 404 crash
    const settingsData = {
      cardAmount: setting?.cardAmount ?? 10,
      maxUserReservedCards: setting?.maxUserReservedCards ?? 5,
      maxTotalCards: setting?.maxTotalCards ?? 20,
      countdownDuration: setting?.countdownDuration ?? 30,
      defaultPlayMode: setting?.defaultPlayMode || 'manual',
      cardReservation: setting?.cardReservation || {
        mode: 'single',
        maxCardsPerUser: 1,
        maxCardsPerRoom: 5,
        allowCrossRoomReservations: false,
        isClickToReserve: false
      },
      createdAt: setting?.createdAt || new Date(),
    };

    res.status(200).json({
      success: true,
      data: settingsData,
    });
  } catch (error) {
    logger.error("settingController: error fetching settings", { err: error });
    res.status(500).json({
      success: false,
      message: "Server error while fetching settings",
    });
  }
};

// Update settings (creates a new document)
exports.updateSettings = async (req, res) => {
  try {
    const { cardAmount, maxUserReservedCards, maxTotalCards, countdownDuration, defaultPlayMode, cardReservation } = req.body;

    // Validate inputs
    if (!Number.isInteger(cardAmount) || cardAmount < 1) {
      return res.status(400).json({
        success: false,
        message: "cardAmount must be an integer greater than or equal to 1",
      });
    }
    if (!Number.isInteger(maxUserReservedCards) || maxUserReservedCards < 1) {
      return res.status(400).json({
        success: false,
        message: "maxUserReservedCards must be an integer greater than or equal to 1",
      });
    }
    if (!Number.isInteger(maxTotalCards) || maxTotalCards < 2) {
      return res.status(400).json({
        success: false,
        message: "maxTotalCards must be an integer greater than or equal to 2",
      });
    }
    if (countdownDuration !== undefined && (!Number.isInteger(countdownDuration) || countdownDuration < 10)) {
      return res.status(400).json({
        success: false,
        message: "countdownDuration must be an integer at least 10 seconds",
      });
    }

    if (defaultPlayMode && !['manual', 'auto'].includes(defaultPlayMode)) {
      return res.status(400).json({
        success: false,
        message: "defaultPlayMode must be 'manual' or 'auto'",
      });
    }

    // Create new settings document
    const newSetting = new Setting({
      cardAmount,
      maxUserReservedCards,
      maxTotalCards,
      countdownDuration: countdownDuration ?? 30,
      defaultPlayMode: defaultPlayMode || 'manual',
      cardReservation: cardReservation || {
        mode: 'single',
        maxCardsPerUser: 1,
        maxCardsPerRoom: 5,
        allowCrossRoomReservations: false,
        isClickToReserve: false
      },
    });

    await newSetting.save();
    clearSettingsCache();

    // Broadcast update via socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("settings", {
        cardAmount: newSetting.cardAmount,
        maxUserReservedCards: newSetting.maxUserReservedCards,
        maxTotalCards: newSetting.maxTotalCards,
        countdownDuration: newSetting.countdownDuration,
        defaultPlayMode: newSetting.defaultPlayMode,
        cardReservation: newSetting.cardReservation
      });
    }

    res.status(201).json({
      success: true,
      message: "Settings updated successfully",
      data: {
        cardAmount: newSetting.cardAmount,
        maxUserReservedCards: newSetting.maxUserReservedCards,
        maxTotalCards: newSetting.maxTotalCards,
        countdownDuration: newSetting.countdownDuration,
        defaultPlayMode: newSetting.defaultPlayMode,
        cardReservation: newSetting.cardReservation,
        createdAt: newSetting.createdAt,
      },
    });
  } catch (error) {
    logger.error("settingController: error updating settings", { err: error });
    res.status(500).json({
      success: false,
      message: "Server error while updating settings",
    });
  }
};

// Get card reservation settings only
exports.getCardReservationSettings = async (req, res) => {
  try {
    const setting = await Setting.findOne().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: setting?.cardReservation || {
        mode: 'single',
        maxCardsPerUser: 1,
        maxCardsPerRoom: 5,
        allowCrossRoomReservations: false
      },
    });
  } catch (error) {
    logger.error("settingController: error fetching card reservation settings", { err: error });
    res.status(500).json({
      success: false,
      message: "Server error while fetching card reservation settings",
    });
  }
};

// Update card reservation settings only
exports.updateCardReservationSettings = async (req, res) => {
  try {
    const { mode, maxCardsPerUser, maxCardsPerRoom, allowCrossRoomReservations, isClickToReserve } = req.body;

    // Validate mode
    if (mode && !['single', 'multiple'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: "mode must be 'single' or 'multiple'",
      });
    }

    // Validate limits
    if (maxCardsPerUser !== undefined && (!Number.isInteger(maxCardsPerUser) || maxCardsPerUser < 1)) {
      return res.status(400).json({
        success: false,
        message: "maxCardsPerUser must be an integer at least 1",
      });
    }
    if (maxCardsPerRoom !== undefined && (!Number.isInteger(maxCardsPerRoom) || maxCardsPerRoom < 1)) {
      return res.status(400).json({
        success: false,
        message: "maxCardsPerRoom must be an integer at least 1",
      });
    }

    // Find existing settings or create new
    let setting = await Setting.findOne().sort({ createdAt: -1 });
    if (!setting) {
      setting = new Setting({});
    }

    // Update only the card reservation fields
    setting.cardReservation = {
      mode: mode || setting.cardReservation?.mode || 'single',
      maxCardsPerUser: maxCardsPerUser ?? setting.cardReservation?.maxCardsPerUser ?? 1,
      maxCardsPerRoom: maxCardsPerRoom ?? setting.cardReservation?.maxCardsPerRoom ?? 5,
      allowCrossRoomReservations: allowCrossRoomReservations ?? setting.cardReservation?.allowCrossRoomReservations ?? false,
      isClickToReserve: isClickToReserve ?? setting.cardReservation?.isClickToReserve ?? false,
    };

    await setting.save();
    clearSettingsCache();

    // Broadcast update via socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("settings", {
        cardAmount: setting.cardAmount,
        maxUserReservedCards: setting.maxUserReservedCards,
        maxTotalCards: setting.maxTotalCards,
        defaultPlayMode: setting.defaultPlayMode,
        cardReservation: setting.cardReservation
      });
    }

    res.status(200).json({
      success: true,
      message: "Card reservation settings updated successfully",
      data: setting.cardReservation,
    });
  } catch (error) {
    logger.error("settingController: error updating card reservation settings", { err: error });
    res.status(500).json({
      success: false,
      message: "Server error while updating card reservation settings",
    });
  }
};