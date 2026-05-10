const express = require("express");
const router = express.Router();
const ludoController = require("../controllers/ludoRoomController");
const { authenticate, isAdmin } = require("../middlewares/auth");

// Player routes
router.post("/rooms/create", authenticate, ludoController.createRoom);
router.post("/rooms/join", authenticate, ludoController.joinRoom);
router.get("/rooms", authenticate, ludoController.listRooms);
router.get("/rooms/:roomId", authenticate, ludoController.getRoom);

// Admin routes
router.post("/rooms/:roomId/cancel", authenticate, isAdmin, ludoController.cancelRoom);
router.get("/admin/rooms", authenticate, isAdmin, ludoController.adminListRooms);
router.get("/admin/games/:roomId", authenticate, isAdmin, ludoController.adminGetGame);
router.get("/admin/stats", authenticate, isAdmin, ludoController.adminGetStats);

module.exports = router;
