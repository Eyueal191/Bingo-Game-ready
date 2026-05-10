/**
 * Bot Pacing Service
 * 
 * SIMPLIFIED: Uses fixed, predictable pacing without complex adaptive algorithms.
 * Robots reserve cards at a steady, configurable rate.
 */
const BotPacingSettings = require("../models/botPacingSettings");
const logger = require("../utils/winstonLogger");

// In-memory cache for pacing settings (refreshed every 30 seconds)
let cachedSettings = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30000;

/**
 * Default pacing settings if DB fails
 */
const DEFAULT_SETTINGS = {
    maxCardsPerTick: 50,
    delayMs: 100,
    verboseLogging: false,
};

/**
 * Get pacing settings with caching
 */
const getPacingSettings = async () => {
    const now = Date.now();
    if (cachedSettings && now - cacheTimestamp < CACHE_TTL_MS) {
        return cachedSettings;
    }

    try {
        const settings = await BotPacingSettings.getSettings();
        cachedSettings = {
            maxCardsPerTick: settings.maxCardsPerTick ?? DEFAULT_SETTINGS.maxCardsPerTick,
            delayMs: settings.delayMs ?? DEFAULT_SETTINGS.delayMs,
            verboseLogging: settings.verboseLogging ?? DEFAULT_SETTINGS.verboseLogging,
        };
        cacheTimestamp = now;
        return cachedSettings;
    } catch (error) {
        logger.error("Failed to load bot pacing settings, using defaults", error);
        return DEFAULT_SETTINGS;
    }
};

/**
 * Clear the pacing settings cache (call after admin updates)
 */
const clearPacingCache = () => {
    cachedSettings = null;
    cacheTimestamp = 0;
    logger.info("Bot pacing settings cache cleared");
};

/**
 * Get cards to reserve this tick - simple fixed approach
 * 
 * @param {Object} params
 * @param {number} params.botCapacityRemaining - How many cards bot still needs to reserve
 * @param {number} params.totalCapacityRemaining - Room capacity remaining
 * @param {number} params.availableCards - Available unreserved cards in DB
 * @returns {number} Number of cards to reserve this tick
 */
const getCardsPerTick = async ({
    botCapacityRemaining,
    totalCapacityRemaining,
    availableCards,
}) => {
    const settings = await getPacingSettings();

    // No capacity left
    if (botCapacityRemaining <= 0 || totalCapacityRemaining <= 0 || availableCards <= 0) {
        return 0;
    }

    // Simple: reserve up to maxCardsPerTick, limited by all capacities
    const cardsThisTick = Math.min(
        settings.maxCardsPerTick,
        botCapacityRemaining,
        totalCapacityRemaining,
        availableCards
    );

    if (settings.verboseLogging) {
        logger.debug("Bot pacing - getCardsPerTick", {
            maxCardsPerTick: settings.maxCardsPerTick,
            botCapacityRemaining,
            totalCapacityRemaining,
            availableCards,
            result: cardsThisTick,
        });
    }

    return cardsThisTick;
};

/**
 * Get delay for next tick - simple fixed delay with small jitter
 * 
 * @returns {number} Delay in milliseconds before next reservation tick
 */
const getBotDelay = async () => {
    const settings = await getPacingSettings();

    // Add small jitter (±10%) to avoid perfectly predictable patterns
    const jitter = settings.delayMs * 0.1 * (Math.random() - 0.5);
    const delay = Math.max(20, Math.floor(settings.delayMs + jitter));

    if (settings.verboseLogging) {
        logger.debug("Bot pacing - getBotDelay", {
            baseDelay: settings.delayMs,
            jitter: Math.floor(jitter),
            result: delay,
        });
    }

    return delay;
};

/**
 * Processing delay after reserving cards
 * Simplified: No processing delay needed
 * 
 * @returns {number} Always returns 0
 */
const getProcessingDelay = async () => {
    return 0;
};

module.exports = {
    getPacingSettings,
    clearPacingCache,
    getCardsPerTick,
    getBotDelay,
    getProcessingDelay,
};
