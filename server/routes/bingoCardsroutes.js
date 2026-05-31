const express = require("express");
const router = express.Router();
const bingoCardController = require("../controllers/bingoCardsController");
const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

// Route to create multiple Bingo cards in bulk (admin-only)
router.post("/create/", authenticate, isAdmin, asyncHandler(bingoCardController.createBulkBingoCards));
// Route to insert cards from bundled file (count=100|200) with optional override (admin-only)
router.post("/insert", authenticate, isAdmin, asyncHandler(bingoCardController.insertCardsFromFile));
// Get current count of bingo cards
router.get("/count", authenticate, asyncHandler(bingoCardController.getCardsCount));
// Get a bingo card by its cardId
router.get("/:roomId", authenticate, asyncHandler(bingoCardController.getAllBingoCards));
router.get("/:cardId", authenticate, asyncHandler(bingoCardController.getBingoCardByCardId));

// Update a bingo card by its cardId (admin-only)
router.put("/:cardId", authenticate, isAdmin, asyncHandler(bingoCardController.updateBingoCard));
router.post("/data", authenticate, asyncHandler(bingoCardController.getCardsData));
// Delete a bingo card by its cardId (admin-only)
router.delete("/", authenticate, isAdmin, asyncHandler(bingoCardController.deleteAllBingoCards));

module.exports = router;