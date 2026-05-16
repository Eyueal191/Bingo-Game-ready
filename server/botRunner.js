const mongoose = require("mongoose");
const connectDB = require("./config/database");
const CONFIG = require("./config/config");
const logger = require("./utils/winstonLogger");
const { startBot, stopBot } = require("./botController/bot");
const { startBotPollingLease } = require("./botController/utils/botPollingLease");

let lease = null;
let leadershipLoopTimer = null;
let runtimeStarted = false;
let botRunning = false;

async function startBotRuntime({ connectDb = false } = {}) {
  if (runtimeStarted) return;
  runtimeStarted = true;

  if (!CONFIG.botEnabled) {
    logger.info("BOT_ENABLED is false; bot runtime not started");
    return;
  }

  if (connectDb) {
    await connectDB(CONFIG.mongoUri);
  }

  if (!CONFIG.botPollingLeaseEnabled) {
    await startBot();
    botRunning = true;
    logger.info("Bot runtime started", { transport: "polling", lease: "disabled" });
    return;
  }

  lease = startBotPollingLease({
    mongoose,
    logger,
    leaseKey: "telegram-polling",
    instanceId: CONFIG.botInstanceId,
    ttlMs: CONFIG.botPollingLeaseTtlMs,
  });

  await lease.start();

  const loopEveryMs = 5_000;

  async function leadershipTick() {
    const isLeader = lease.isLeaderNow();
    if (isLeader && !botRunning) {
      await startBot();
      botRunning = true;
      logger.info("Bot runtime became leader", {
        transport: "polling",
        lease: "enabled",
        instanceId: lease.instanceId,
      });
    }

    if (!isLeader && botRunning) {
      await stopBot();
      botRunning = false;
      logger.warn("Bot runtime stepped down (lease lost)", {
        instanceId: lease.instanceId,
      });
    }
  }

  await leadershipTick();
  leadershipLoopTimer = setInterval(() => {
    leadershipTick().catch((error) => {
      logger.error("Bot leadership tick failed", {
        error: error?.message || String(error),
      });
    });
  }, loopEveryMs);
  leadershipLoopTimer.unref?.();

  logger.info("Bot runtime supervision started", {
    lease: "enabled",
    instanceId: lease.instanceId,
  });
}

async function stopBotRuntime() {
  if (!runtimeStarted) return;
  runtimeStarted = false;

  if (leadershipLoopTimer) {
    clearInterval(leadershipLoopTimer);
    leadershipLoopTimer = null;
  }

  try {
    await stopBot();
  } catch (error) {
    logger.error("Error stopping bot", { error: error?.message || String(error) });
  }
  botRunning = false;

  try {
    await lease?.stop?.();
  } catch (error) {
    logger.error("Error stopping bot lease", { error: error?.message || String(error) });
  }
  lease = null;
}

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info("Bot runner shutdown initiated", { signal });

  const forceExitTimeout = setTimeout(() => {
    logger.error("Forcing bot runner shutdown after timeout", { signal });
    process.exit(1);
  }, 10_000);
  forceExitTimeout.unref?.();

  await stopBotRuntime();

  try {
    await mongoose.connection?.close?.(false);
    logger.info("MongoDB connection closed", { signal });
  } catch (error) {
    logger.error("Error closing MongoDB connection", {
      error: error?.message || String(error),
    });
  }

  process.exit(0);
}

process.on("unhandledRejection", (reason) => {
  try {
    logger.error("Unhandled Rejection", {
      reason:
        reason instanceof Error
          ? { message: reason.message, stack: reason.stack }
          : String(reason),
    });
  } catch (e) {
    try {
      process.stderr.write(`Unhandled Rejection: ${String(reason)}\n`);
    } catch {}
  }
  shutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  try {
    logger.error("Uncaught Exception", {
      error: error?.message || String(error),
      stack: error?.stack,
    });
  } catch (e) {
    try {
      process.stderr.write(`Uncaught Exception: ${String(error)}\n`);
    } catch {}
  }
  shutdown("uncaughtException");
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function main() {
  await startBotRuntime({ connectDb: true });
}

module.exports = { startBotRuntime, stopBotRuntime };

if (require.main === module) {
  main().catch((error) => {
    logger.error("Bot runner failed to start", {
      error: error?.message || String(error),
      stack: error?.stack,
    });
    process.exit(1);
  });
}
