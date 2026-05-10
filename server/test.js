// tempCodeRunnerFile.js
import { MongoClient } from "mongodb";

async function run() {
  const uri = "mongodb://localhost:27017"; 
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("ludo_bingo");
    const users = db.collection("users");

    const newUser = {
      telegramId: "779768457",
      isEmailVerified: false,
      fullName: "Samuel",
      phone: "+251914919399",
      password: "$2b$12$wio4c/Zhd4kWqfS0bfCcPOyRw7ZQhIGHPIV7c6x8HViLSoj7Q62z6",
      referralCode: "82833886",
      tempCards: [],
      wallet: 1000,
      language: "en",
      bonus: 0,
      transactions: [],
      role: "user",
      isRobot: false,
      isGuest: false,
      gamePermissions: {
        bingo: false,
        keshkesh: false,
        spin: false,
        material_lottery: false,
        ludo: false
      },
      paidInvitedPlayers: [],
      isBanned: false,
      createdAt: new Date("2026-02-25T12:05:03.655Z"),
      updatedAt: new Date("2026-03-03T07:04:27.985Z"),
      __v: 0
    };

    const result = await users.insertOne(newUser);
    console.log("Inserted document id:", result.insertedId);

  } finally {
    await client.close();
  }
}

run().catch(console.dir);