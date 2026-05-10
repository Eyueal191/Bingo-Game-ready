const express = require("express");
const router = express.Router();
const gameRoomController = require("../controllers/gameRoomController");
const asyncHandler = require("../utils/asyncHandler");
    
// Create a new game room
router.post("/", asyncHandler(gameRoomController.createGameRoom));

// Get all game rooms
router.get("/", asyncHandler(gameRoomController.getAllGameRooms));

// Get a specific game room by ID
router.get("/:id", asyncHandler(gameRoomController.getGameRoomById));

// Update a game room by ID
router.put("/:id", asyncHandler(gameRoomController.updateGameRoom));

// Admin: Update bonus settings for a game room
router.put("/:id/bonus", asyncHandler(gameRoomController.updateRoomBonus));

// Delete a game room by ID
router.delete("/:id", asyncHandler(gameRoomController.deleteGameRoom));

module.exports = router;
