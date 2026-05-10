/**
 * Bot Pacing Utility
 * 
 * DEPRECATED: This file is kept for backward compatibility.
 * The actual pacing logic has been moved to services/botPacingService.js
 * which provides countdown-aware adaptive pacing.
 * 
 * New code should use botPacingService directly.
 */
const botPacingService = require("../services/botPacingService");

/**
 * Get number of cards to reserve this tick
 * Delegates to the new adaptive pacing service
 */
const getCardsPerTick = async (params) => {
  return botPacingService.getCardsPerTick(params);
};

/**
 * Get delay before next reservation tick
 * Delegates to the new adaptive pacing service
 */
const getBotDelay = async (params) => {
  return botPacingService.getBotDelay(params);
};

/**
 * Get processing delay after reserving cards
 */
const getProcessingDelay = async (cardsReserved) => {
  return botPacingService.getProcessingDelay(cardsReserved);
};

module.exports = {
  getCardsPerTick,
  getBotDelay,
  getProcessingDelay,
};