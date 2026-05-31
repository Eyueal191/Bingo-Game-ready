const express = require("express");
const router = express.Router();
const gameRoomController = require("../controllers/gameRoomController");
const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

// Get all game rooms (authenticated users can view)
router.get("/", authenticate, asyncHandler(gameRoomController.getAllGameRooms));

// Get a specific game room by ID
router.get("/:id", authenticate, asyncHandler(gameRoomController.getGameRoomById));

// Admin-only: Create a new game room
router.post("/", authenticate, isAdmin, asyncHandler(gameRoomController.createGameRoom));

// Admin-only: Update a game room by ID
router.put("/:id", authenticate, isAdmin, asyncHandler(gameRoomController.updateGameRoom));

// Admin: Update bonus settings for a game room
router.put("/:id/bonus", authenticate, isAdmin, asyncHandler(gameRoomController.updateRoomBonus));

// Admin-only: Delete a game room by ID
router.delete("/:id", authenticate, isAdmin, asyncHandler(gameRoomController.deleteGameRoom));

module.exports = router;
