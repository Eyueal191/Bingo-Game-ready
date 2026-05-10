const express = require("express");
const router = express.Router();
const robotController = require("../controllers/robotController");
const { authenticate, isAdmin } = require("../middlewares/auth");

// All routes require admin authentication
router.use(authenticate, isAdmin);

// Create a new robot
router.post("/", robotController.createRobot);

// Delete a robot
router.delete("/:id", robotController.deleteRobot);

// Adjust robot wallet
router.put("/:id/wallet", robotController.adjustWallet);

// Manage robot names
router.get("/:id/names", robotController.getRobotNames);
router.put("/:id/names", robotController.updateRobotNames);

module.exports = router;
