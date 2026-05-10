const GameRoom = require("../models/gameRoom");
const Reservation = require("../models/reservationModel");
const mongoose = require("mongoose");
const logger = require("../utils/winstonLogger");

// Create a new game room
exports.createGameRoom = async (req, res) => {
  try {
    const { stakeAmount, createdBy } = req.body;
    if (!stakeAmount || !createdBy) {
      return res
        .status(400)
        .json({ message: "stakeAmount and createdBy are required" });
    }
    let waitingRoom = await GameRoom.findOne({
      stakeAmount: stakeAmount,
      status: { $ne: "completed" },
    });
    if (waitingRoom) {
      // If a waiting room exists, return it
      return res.status(409).json({
        message: `A ${waitingRoom.status} room already exists for this stake amount`,
        room: waitingRoom,
      });
    }
    const gameRoom = new GameRoom({
      stakeAmount,
      createdBy,
    });
    const savedRoom = await gameRoom.save();
    return res.status(201).json(savedRoom);
  } catch (error) {
    logger.error("gameRoomController: error creating game room", { err: error });
    return res.status(500).json({ message: "Error creating game room", error });
  }
};

// Get all game rooms
exports.getAllGameRooms = async (req, res) => {
  try {
    const gameRooms = await GameRoom.find({ status: { $ne: "completed" } });
    return res.status(200).json(gameRooms);
  } catch (error) {
    logger.error("gameRoomController: error fetching game rooms", { err: error });
    return res
      .status(500)
      .json({ message: "Error fetching game rooms", error: error.message });
  }
};

// Get a single game room by ID
exports.getGameRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await GameRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: "Game room not found" });
    }
    return res.status(200).json(room);
  } catch (error) {
    logger.error("gameRoomController: error fetching game room", { err: error });
    return res.status(500).json({ message: "Error fetching game room", error });
  }
};

// Update a game room by ID (e.g., reset after game over)
exports.updateGameRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, numberOfPlayers, winAmount } = req.body;

    const room = await GameRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: "Game room not found" });
    }

    if (status) room.status = status;
    if (numberOfPlayers !== undefined) room.numberOfPlayers = numberOfPlayers;
    if (winAmount !== undefined) room.winAmount = winAmount;

    const updatedRoom = await room.save();
    return res.status(200).json(updatedRoom);
  } catch (error) {
    logger.error("gameRoomController: error updating game room", { err: error });
    return res.status(500).json({ message: "Error updating game room", error });
  }
};

// Delete a game room by ID
exports.deleteGameRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRoom = await GameRoom.findByIdAndDelete(id);
    if (!deletedRoom) {
      return res.status(404).json({ message: "Game room not found" });
    }

    // Clean up related reservations (optional, depending on your logic)
    await Reservation.deleteMany({ roomId: id });
    return res.status(200).json({ message: "Game room deleted successfully" });
  } catch (error) {
    logger.error("gameRoomController: error deleting game room", { err: error });
    return res.status(500).json({ message: "Error deleting game room", error });
  }
};

// Admin: Update bonus settings for a game room
exports.updateRoomBonus = async (req, res) => {
  try {
    const { id } = req.params;
    const { bonusEnabled, bonusAmount, bonusDescription } = req.body;
    const room = await GameRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: "Game room not found" });
    }
    if (typeof bonusEnabled === "boolean") room.bonusEnabled = bonusEnabled;
    if (typeof bonusAmount === "number") room.bonusAmount = bonusAmount;
    if (typeof bonusDescription === "string")
      room.bonusDescription = bonusDescription;
    const updatedRoom = await room.save();
    return res
      .status(200)
      .json({ message: "Bonus settings updated", room: updatedRoom });
  } catch (error) {
    logger.error("gameRoomController: error updating room bonus settings", { err: error });
    return res
      .status(500)
      .json({ message: "Error updating room bonus settings", error });
  }
};
