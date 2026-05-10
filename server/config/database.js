const mongoose = require("mongoose");
const logger = require("../utils/winstonLogger");

let isConnected = false;

async function connectDB(mongoUri) {
  try {
    if (!mongoUri) {
      throw new Error("Mongo URI is missing");
    }

    // Avoid attaching multiple listeners
    if (!isConnected) {
      mongoose.connection.on("connected", () =>
        logger.info("MongoDB connected")
      );

      mongoose.connection.on("disconnected", () =>
        logger.warn("MongoDB disconnected")
      );

      mongoose.connection.on("reconnected", () =>
        logger.info("MongoDB reconnected")
      );

      mongoose.connection.on("error", (error) =>
        logger.error("MongoDB connection error:", {
          message: error.message,
        })
      );
    }

    // Connect with safer options
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
    });

    isConnected = true;

    logger.info("Successfully connected to MongoDB");
  } catch (error) {
    logger.error("MongoDB connection failed:", {
      message: error.message,
      stack: error.stack,
    });

    process.exit(1);
  }
}

module.exports = connectDB;