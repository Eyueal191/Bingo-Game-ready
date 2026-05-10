require("dotenv").config();
const mongoose = require("mongoose");
const PaymentMethod = require("./models/PaymentMethod");

async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to DB.");

    const methods = await PaymentMethod.find();
    console.log(`Found ${methods.length} payment methods.`);

    for (const method of methods) {
      // Legacy fields
      const { supportedChannels, supportedTypes } = method._doc;

      if (!supportedChannels || !supportedTypes) {
        console.log(`Method ${method.provider} already migrated or missing legacy fields. Skipping.`);
        continue;
      }

      const depositChannels = supportedTypes.includes("deposit") ? supportedChannels : [];
      const withdrawalChannels = supportedTypes.includes("withdrawal") ? supportedChannels : [];

      console.log(`Migrating ${method.provider}:`);
      console.log(`  Deposit Channels: ${depositChannels}`);
      console.log(`  Withdrawal Channels: ${withdrawalChannels}`);
      await PaymentMethod.updateOne(
        { _id: method._id },
        {
          $set: { depositChannels, withdrawalChannels },
          $unset: { supportedChannels: "", supportedTypes: "" }
        }
      );
    }

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
