const express = require("express");
const router = express.Router();
const BingoCard = require("../models/bingoCardModel");
const Reservation = require("../models/reservationModel");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/winstonLogger");

router.get("/get/:cardId", asyncHandler(async (req, res) => {
  try {
    const { cardId } = req.params; // Extract cardId as a string
    const bingoCard = await BingoCard.findOne({ cardId: cardId }); // Query with correct format

    if (!bingoCard) {
      return res.status(404).json({ message: "Bingo card not found" });
    }

    res.status(200).json(bingoCard);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}));
router.get("/reservation/:userId", asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    // Find the reservation by userId and roomId
    const reservation = await Reservation.findOne({ userId, status: "active" });

    if (!reservation) {
      // No reservation found, return empty array instead of 404
      return res.status(200).json([]);
    }

    // Fetch the cards from BingoCard based on reserved cardIds
    const bingoCards = await BingoCard.find({
      cardId: { $in: reservation.cardIds },
    });

    // If no matching cards, still return empty array
    res.status(200).json(bingoCards || []);
  } catch (err) {
    logger.error("bingoCardRoutes: error in /reservation", { err });
    res.status(500).json({ message: err.message });
  }
}));


router.get("/all/cards/:userId", asyncHandler(async (req, res) => {
  try {
    const userId = req.params.userId;
    // Find all bingo cards belonging to the specified user
    const userBingoCards = await BingoCard.find({ userId })
      .sort({ cardId: -1 })
      .select("-_id -__v -createdAt");

    // If user has no bingo cards, return a 404 error
    if (!userBingoCards) {
      return res
        .status(404)
        .json({ message: "No bingo cards found for the specified user" });
    }

    // If bingo cards are found, return them
    res.json(userBingoCards);
  } catch (err) {
    // Handle any errors that occur during the database operation
    logger.error("bingoCardRoutes: error fetching all cards for user", { err });
    res.status(500).json({ message: "Server error" });
  }
}));

router.get("/get/:userId/:cardId", asyncHandler(async (req, res) => {
  try {
    const userId = "65b4a2f56d2e4f0015dcb1c3";
    const cardId = req.params.cardId;
    // Find the Bingo card by userId and cardId
    const bingoCard = await BingoCard.findOne({ userId, cardId }).select(
      "-createdAt -__v -_id -cardId -userId" // Exclude unwanted fields
    );

    if (!bingoCard) {
      return res.status(404).json({ message: "Bingo card not found" });
    }

    // If found, return the Bingo card
    res.json(bingoCard);
  } catch (err) {
    logger.error("bingoCardRoutes: error fetching card by userId/cardId", { err });
    res.status(500).json({ message: "Server error" });
  }
}));

router.get("/getCardIds", asyncHandler(async (req, res) => {
  try {
    const bingoCards = await BingoCard.find();

    if (bingoCards.length === 0) {
      return res.status(404).json({ message: "No Bingo cards found" });
    }

    const cardIds = bingoCards.map((card) => card.cardId);

    res
      .status(200)
      .json(cardIds.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}));

router.post("/create", asyncHandler(async (req, res) => {
  try {
    const {
      cardId,
      b1,
      b2,
      b3,
      b4,
      b5,
      i1,
      i2,
      i3,
      i4,
      i5,
      n1,
      n2,
      n4,
      n5,
      g1,
      g2,
      g3,
      g4,
      g5,
      o1,
      o2,
      o3,
      o4,
      o5,
      userId,
    } = req.body;

    // Validate input: Ensure all required fields are present
    if (
      !cardId ||
      ![
        b1,
        b2,
        b3,
        b4,
        b5,
        i1,
        i2,
        i3,
        i4,
        i5,
        n1,
        n2,
        n4,
        n5,
        g1,
        g2,
        g3,
        g4,
        g5,
        o1,
        o2,
        o3,
        o4,
        o5,
      ].every(Boolean)
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }

    // Create a new instance of BingoCard model
    const bingoCard = new BingoCard({
      cardId,
      b1,
      b2,
      b3,
      b4,
      b5,
      i1,
      i2,
      i3,
      i4,
      i5,
      n1,
      n2,
      n4,
      n5,
      g1,
      g2,
      g3,
      g4,
      g5,
      o1,
      o2,
      o3,
      o4,
      o5,
      userId,
    });

    // Save the new Bingo card to the database
    const newBingoCard = await bingoCard.save();

    // Send a JSON response with the newly created Bingo card
    res.status(201).json(newBingoCard);
  } catch (err) {
    // Handle errors
    logger.error("bingoCardRoutes: error creating bingo card", { err });
    res.status(500).json({ message: "Internal Server Error" });
  }
}));

router.post("/create/bulk", asyncHandler(async (req, res) => {
  try {
    const cardsData = req.body; // Assuming req.body is an array of objects
    // Create an array to store promises for saving each Bingo card
    const savePromises = [];
    if (!Array.isArray(cardsData)) {
      return res
        .status(400)
        .json({ message: "Invalid data format. Expected an array of cards." });
    }

    // Iterate through each card data and create/save BingoCard instances
    cardsData.forEach((card) => {
      const bingoCard = new BingoCard(card);
      savePromises.push(bingoCard.save());
    });

    // Wait for all save operations to complete
    const savedCards = await Promise.all(savePromises);

    // Send a JSON response with the newly created Bingo cards
    res.status(201).json(savedCards);
  } catch (err) {
    // Handle errors
    logger.error("bingoCardRoutes: error creating bingo cards (bulk)", { err });
    res.status(500).json({ message: "Internal Server Error" });
  }
}));

// PUT route to update a Bingo card if userId and cardId match
router.put("/update/:userId/:cardId", asyncHandler(async (req, res) => {
  const { userId, cardId } = req.params;

  try {
    // Check if there's a Bingo card with the given userId and cardId
    const existingCard = await BingoCard.findOne({
      userId: userId,
      cardId: cardId,
    });

    if (!existingCard) {
      return res.status(404).json({ message: "Bingo card not found" });
    }

    // Update the card if userId and cardId match
    const updatedCard = await BingoCard.findOneAndUpdate(
      { userId: userId, cardId: cardId },
      { $set: req.body }, // Update with request body
      { new: true } // Return the updated document
    );

    res.json(updatedCard);
  } catch (error) {
    logger.error("bingoCardRoutes: error updating bingo card", { err: error });
    res.status(500).json({ message: "Server error" });
  }
}));

router.delete("/remove/all/:userId", asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Find all Bingo cards for the specified user
    const userBingoCards = await BingoCard.find({ userId });

    if (userBingoCards.length === 0) {
      return res
        .status(404)
        .json({ message: "No Bingo cards found for the specified user" });
    }

    // Remove all Bingo cards for the specified user
    await BingoCard.deleteMany({ userId });

    res
      .status(200)
      .json({
        message: "All Bingo cards removed successfully for the specified user",
      });
  } catch (err) {
    logger.error("bingoCardRoutes: error removing all bingo cards for user", { err });
    res.status(500).json({ message: "Internal Server Error" });
  }
}));

router.delete("/remove/:userId/:cardId", asyncHandler(async (req, res) => {
  const { userId, cardId } = req.params;

  try {
    // Check if the bingo card exists for the specified user
    const existingCard = await BingoCard.findOne({ userId, cardId });
    if (!existingCard) {
      return res
        .status(404)
        .json({ message: "Bingo card not found for the specified user" });
    }

    // Remove the bingo card from the database
    await BingoCard.findOneAndDelete({ userId, cardId });

    res.status(200).json({ message: "Bingo card removed successfully" });
  } catch (err) {
    logger.error("bingoCardRoutes: error removing bingo card", { err });
    res.status(500).json({ message: "Internal Server Error" });
  }
}));

// Dummy data in the exact format specified
const dummyLastGameData = {
  lastGame: [
    {
      _id: "67b341a7346aadf91fea9def",
      gameId: 1932,
      cartela: [26, 4, 45, 36, 39, 31],
      cutAmount: 20,
      winAmount: 48,
      betAmount: 60,
      houseProfit: 12,
      finished: true,
      userId: "6751b4e6f4af77c40e32acb9",
      winnerNumbers: [
        61, 68, 9, 20, 31, 2, 55, 65, 50, 1, 64, 6, 27, 42, 54, 30, 17, 19, 47,
        38, 36, 21, 75, 12, 28, 15, 7, 23, 49, 13, 39, 72, 43, 22, 46, 56, 44,
        66, 32, 67, 14, 58, 4, 73, 71, 24, 33, 48, 53, 5, 52, 74, 41, 18, 70,
        69, 45, 37, 34, 26, 3, 11, 60, 57, 25, 59, 8, 51, 16, 10, 40, 35, 62,
        63, 29,
      ],
      startedAt: "Mon, 17 Feb 2025 14:03:19 GMT",
      __v: 0,
    },
  ],
};

// Endpoint to return the dummy JSON
router.get("/last-game/test", (req, res) => {
  try {
    // Return the dummy data directly
    res.status(200).json(dummyLastGameData);
  } catch (error) {
    logger.error("bingoCardRoutes: error fetching last game data", { err: error });
    res
      .status(500)
      .json({ message: "Error fetching last game data", error: error.message });
  }
});

module.exports = router;
