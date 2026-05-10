const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const logger = require("../utils/winstonLogger");

async function deepFix() {
    try {
        const mongoUri = process.env.MONGOURL || "mongodb://localhost:27017/haywin_bingo";
        console.log(`Connecting to database...`);
        await mongoose.connect(mongoUri);

        // 1. Identify the correct collection
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log("Found collections:", collectionNames);

        // Mongoose Model "Users" usually creates "users"
        const targetCollection = collectionNames.find(n => n.toLowerCase() === "users") || "users";
        console.log(`Targeting collection: "${targetCollection}"`);
        const collection = mongoose.connection.collection(targetCollection);

        // 1. Drop existing indexes FIRST (to avoid duplicate key error during update)
        console.log("Fetching indexes...");
        const indexes = await collection.indexes();
        console.log("Current indexes:", indexes.map(i => i.name));

        const toDrop = ["telegramId_1", "email_1"];
        for (const name of toDrop) {
            if (indexes.find(i => i.name === name)) {
                console.log(`Dropping index: ${name}...`);
                try {
                    await collection.dropIndex(name);
                    console.log(`Dropped index ${name}`);
                } catch (e) {
                    console.warn(`Failed to drop index ${name}: ${e.message}`);
                }
            }
        }

        // 2. Clean up existing data
        // Now that indexes are gone, we can safely unset nulls
        console.log("Unsetting 'null' or empty strings for telegramId and email...");
        const result = await collection.updateMany(
            {
                $or: [
                    { telegramId: null },
                    { telegramId: "" },
                    { email: null },
                    { email: "" }
                ]
            },
            {
                $unset: { telegramId: "", email: "" }
            }
        );
        console.log(`Updated ${result.modifiedCount} documents to remove null/empty fields.`);

        console.log("\n✅ CLEANUP COMPLETE!");
        console.log("All 'null' values removed. Indexes dropped.");
        console.log("Now, RESTART your server. Mongoose will recreate the indexes as 'sparse'.");

        process.exit(0);
    } catch (error) {
        console.error("FATAL ERROR during repair:", error);
        process.exit(1);
    }
}

deepFix();
