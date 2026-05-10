/**
 * Jackpot Scheduler — Runs daily via node-cron, allocates yesterday's bingo profits to jackpot levels.
 *
 * Designed to be started once from index.js after server boot.
 * Checks if daily allocation has already been run today before executing.
 */

const cron = require("node-cron");
const jackpotService = require("./jackpotService");
const logger = require("../utils/winstonLogger");

let cronTask = null;

const runDailyAllocation = async () => {
    try {
        const result = await jackpotService.allocateDailyProfits();
        if (result) {
            logger.info("jackpotScheduler: daily allocation completed", result);
        }
    } catch (err) {
        logger.error("jackpotScheduler: daily allocation failed gracefully", { err: err.message });
    }
};

const startJackpotScheduler = async () => {
    if (cronTask) {
        logger.warn("jackpotScheduler: already scheduled");
        return;
    }

    logger.info("jackpotScheduler: starting (daily cron job at 00:05)");

    // Schedule to run every day at 00:05 (5 minutes past midnight)
    cronTask = cron.schedule("5 0 * * *", () => {
        logger.info("jackpotScheduler: running scheduled daily allocation");
        runDailyAllocation().catch(e => logger.error("Cron run err", { err: e.message }));
    });

    cronTask.start();

    // Run once after 5 seconds to ensure DB is fully connected
    setTimeout(() => {
        logger.info("jackpotScheduler: running initial catch-up allocation");
        runDailyAllocation().catch(e => logger.error("Startup run err", { err: e.message }));
    }, 5000);
};

const stopJackpotScheduler = () => {
    if (cronTask) {
        cronTask.stop();
        cronTask = null;
        logger.info("jackpotScheduler: cron job stopped");
    }
};

module.exports = { startJackpotScheduler, stopJackpotScheduler };
