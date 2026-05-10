/**
 * Main application entry point.
 * Initializes the server, databases, WebSockets, and background processes.
 * Includes a robust graceful shutdown manager for production environments.
 */
const { createServer } = require("http");
const mongoose = require("mongoose");
const app = require("./appSetup");
const { initializeSocket, closeAllChangeStreams } = require("./socketController/socketSetup");
const connectDB = require("./config/database");
const CONFIG = require("./config/config");
const logger = require("./utils/winstonLogger");
const { startBotRuntime, stopBotRuntime } = require("./botRunner");
const { startJackpotScheduler, stopJackpotScheduler } = require("./services/jackpotScheduler");

const server = createServer(app);
let io = null;
let isShuttingDown = false;

/**
 * Graceful shutdown manager.
 * Ensures all services, connections, and streams are closed safely before exit.
 * Uses a staged approach to teardown dependencies in the correct order.
 */
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("Shutdown sequence initiated", { signal });

  // 1. Enforce a maximum teardown time before hard exit
  setTimeout(() => {
    logger.error("Shutdown timeout exceeded. Forcing exit.", { signal });
    process.exit(1);
  }, 10_000).unref();

  // Helper to execute teardown tasks safely
  const safelyClose = async (name, operation) => {
    try {
      await Promise.resolve(operation());
      logger.info(`Successfully closed: ${name}`);
    } catch (error) {
      logger.error(`Failed to close: ${name}`, { error: error?.message || String(error) });
    }
  };

  // 2. Teardown Sequence
  // Stop background processors first so no new jobs start
  await safelyClose("Telegram Bot", stopBotRuntime);
  await safelyClose("Jackpot Scheduler", stopJackpotScheduler);

  // Close MongoDB change streams before the connection pool drops
  await safelyClose("MongoDB Change Streams", closeAllChangeStreams);

  // Close active WebSockets
  if (io) {
    await safelyClose("Socket.IO Connections", () => new Promise(res => io.close(res)));
  }

  // Disconnect from database
  if (mongoose.connection.readyState !== 0) {
    await safelyClose("MongoDB Connection", () => mongoose.connection.close(false));
  }

  // Stop accepting new HTTP requests and wait for existing ones to finish
  await safelyClose("HTTP Server", () => new Promise(res => server.close(res)));

  logger.info("Graceful shutdown completed successfully.", { signal });
  process.exit(0);
};

/* ─── Global Error Handlers ────────────────────────────────────────────── */
const handleFatalError = (type, error) => {
  const errPayload = error instanceof Error 
    ? { message: error.message, stack: error.stack } 
    : { message: String(error) };
    
  logger.error(`Fatal ${type}`, errPayload);

  // Use stderr as a fallback in case the logger fails
  try { process.stderr.write(`Fatal ${type}: ${errPayload.message}\n`); } catch (_) {}
  
  gracefulShutdown(type);
};

process.on("unhandledRejection", (reason) => handleFatalError("UnhandledRejection", reason));
process.on("uncaughtException", (error) => handleFatalError("UncaughtException", error));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

const syncIndexes = async () => {
  const modelNames = mongoose.modelNames();

  const results = await Promise.allSettled(
    modelNames.map(async (name) => {
      const model = mongoose.model(name);
      await model.syncIndexes();
      return name;
    })
  );

  const failed = results
    .map((r, i) => ({ r, model: modelNames[i] }))
    .filter(x => x.r.status === "rejected");

  logger.info("Index sync completed", {
    total: modelNames.length,
    failed: failed.length,
  });

  if (failed.length) {
    logger.warn("Some index syncs failed", {
      failed: failed.map(f => ({
        model: f.model,
        error: f.r.reason?.message || String(f.r.reason),
      })),
    });
  }
};
/* ─── Application server Bootstrap ────────────────────────────────────────────── */
const startServerApp = async () => {
  try {
    // 1. Connect to Database
    await connectDB(CONFIG.mongoUri);

    // 2. Sync indexes — fixes stale indexes (e.g. missing sparse flag)
   await syncIndexes();

    // 3. Initialize WebSockets
    io = initializeSocket(server);
    app.set("io", io);

    // 3. Start Background Services
    if (CONFIG.botEnabled && CONFIG.botRunInApi) {
      await startBotRuntime({ connectDb: false });
    }
    startJackpotScheduler();

    // 4. Register server error handlers BEFORE listening
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Failed to bind to port ${CONFIG.port}. Address already in use.`, { port: CONFIG.port });
        gracefulShutdown("EADDRINUSE");
      } else {
        logger.error("HTTP Server experienced an unexpected error", { error: error?.message || String(error) });
        gracefulShutdown("SERVER_ERROR");
      }
    });

    // 5. Start HTTP Server
    server.listen(CONFIG.port, () => {
      logger.info("Server running and ready to accept connections", { port: CONFIG.port });
    });

  } catch (error) {
    logger.error("Application bootstrap failed", { 
      error: error?.message || String(error), 
      stack: error?.stack 
    });
    process.exit(1);
  }
};

// Start the application
startServerApp();
