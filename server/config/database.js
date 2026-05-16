const mongoose = require("mongoose");
const logger = require("../utils/winstonLogger");

async function connectDB(mongoUri) {
  try {
    // Setting up connection event listeners for debugging purposes
    mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
    mongoose.connection.on("disconnected", () =>
      logger.warn("MongoDB disconnected")
    );
    mongoose.connection.on("reconnected", () =>
      logger.info("MongoDB reconnected")
    );
    mongoose.connection.on("error", (error) =>
      logger.error("MongoDB connection error:", error)
    );

    // Establishing the connection
    await mongoose.connect(mongoUri, {
      autoIndex: true, // Enable automatic index creation for better performance on schema indexing
      autoCreate: true, // Create collections automatically if they don't exist
      serverSelectionTimeoutMS: 30000,
    });

    logger.info("Successfully connected to MongoDB");
  } catch (error) {
    logger.error("MongoDB connection failed:", error.message);
    logger.error(error.stack); // Log the stack trace for better debugging
    process.exit(1); // Exit the application in case of a connection failure
  }
}

module.exports = connectDB;
