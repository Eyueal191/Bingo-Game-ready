const { createServer } = require("http");
const mongoose = require("mongoose");
const app = require("./appSetup");
const { initializeSocket } = require("./socketController/socketSetup");
const connectDB = require("./config/database");
const CONFIG = require("./config/config");
const logger = require("./utils/winstonLogger");
const { startBotRuntime, stopBotRuntime } = require("./botRunner");
const server = createServer(app);

let io;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info("Shutdown initiated", { signal });

  const forceExitTimeout = setTimeout(() => {
    logger.error("Forcing shutdown after timeout", { signal });
    process.exit(1);
  }, 10_000);
  forceExitTimeout.unref?.();

  try {
    await stopBotRuntime();
  } catch (error) {
    logger.error("Error stopping bot", { error: error?.message || String(error) });
  }

  try {
    await mongoose.connection?.close?.(false);
    logger.info("MongoDB connection closed", { signal });
  } catch (error) {
    logger.error("Error closing MongoDB connection", {
      error: error?.message || String(error),
    });
  }

  try {
    io?.close?.();
  } catch (error) {
    logger.error("Error closing socket.io", { error: error?.message || String(error) });
  }

  try {
    await new Promise((resolve) => server.close(resolve));
    logger.info("HTTP server closed", { signal });
  } catch (error) {
    logger.error("Error closing HTTP server", { error: error?.message || String(error) });
  }

  process.exit(0);
}

// Catch unhandled promise rejections globally
process.on("unhandledRejection", (reason, promise) => {
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

const start = async () => {
  try {
    await connectDB(CONFIG.mongoUri);
    io = initializeSocket(server);
  app.set("io", io);
// Start the Telegram bot (optional). Recommended: run `node server/botRunner.js` separately in production.
    if (CONFIG.botEnabled && CONFIG.botRunInApi) {
      await startBotRuntime({ connectDb: false });
    }

    server.listen(CONFIG.port, () => {
      logger.info("Server started", { port: CONFIG.port });
    });
  } catch (error) {
    logger.error("Failed to start server", { error: error?.message || String(error), stack: error?.stack });
    process.exit(1);
  }
};

start();
