const express = require("express");
const router = express.Router();
const bingoCardController = require("../controllers/bingoCardsController");
const asyncHandler = require("../utils/asyncHandler");

// Route to create multiple Bingo cards in bulk
router.post("/create/", asyncHandler(bingoCardController.createBulkBingoCards));
// Route to insert cards from bundled file (count=100|200) with optional override
router.post("/insert", asyncHandler(bingoCardController.insertCardsFromFile));
// Get current count of bingo cards
router.get("/count", asyncHandler(bingoCardController.getCardsCount));
// Get a bingo card by its cardId
router.get("/:roomId", asyncHandler(bingoCardController.getAllBingoCards));
router.get("/:cardId", asyncHandler(bingoCardController.getBingoCardByCardId));

// Update a bingo card by its cardId
router.put("/:cardId", asyncHandler(bingoCardController.updateBingoCard));
router.post("/data", asyncHandler(bingoCardController.getCardsData));
// Delete a bingo card by its cardId
router.delete("/", asyncHandler(bingoCardController.deleteAllBingoCards));

module.exports = router;