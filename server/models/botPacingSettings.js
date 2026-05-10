/**
 * Bot Pacing Settings Model
 * 
 * SIMPLIFIED: Only 3 essential settings for predictable bot behavior.
 * Controls how fast the robot can reserve cards during the countdown.
 */
const mongoose = require("mongoose");

const botPacingSettingsSchema = new mongoose.Schema(
    {
        // How many cards to reserve per tick (batch size)
        maxCardsPerTick: {
            type: Number,
            default: 50,
            min: [1, "Max cards per tick must be at least 1"],
            max: [100, "Max cards per tick cannot exceed 100"],
        },

        // Fixed delay between reservation ticks (in milliseconds)
        delayMs: {
            type: Number,
            default: 100,
            min: [20, "Delay must be at least 20ms"],
            max: [1000, "Delay cannot exceed 1000ms"],
        },

        // Enable verbose logging for debugging
        verboseLogging: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true, collection: "bot_pacing_settings" }
);

/**
 * Get the singleton pacing settings document
 */
botPacingSettingsSchema.statics.getSettings = async function () {
    let doc = await this.findOne();
    if (!doc) {
        doc = await this.create({});
    }
    return doc;
};

/**
 * Update pacing settings
 */
botPacingSettingsSchema.statics.updateSettings = async function (updates) {
    const doc = await this.getSettings();
    Object.assign(doc, updates);
    await doc.save();
    return doc;
};

const BotPacingSettings = mongoose.model("BotPacingSettings", botPacingSettingsSchema);

module.exports = BotPacingSettings;
