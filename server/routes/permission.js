const express = require("express");
const router = express.Router();
const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const {
  registerGameManager,
  updateUserPermissions,
  getUserPermissions,
  getGameManagers,
} = require("../controllers/permissionController");

router.post(
  "/game-managers/register",
  authenticate,
  isAdmin,
  asyncHandler(registerGameManager)
);
router.get(
  "/game-managers",
  authenticate,
  isAdmin,
  asyncHandler(getGameManagers)
);
router.patch(
  "/:userId",
  authenticate,
  isAdmin,
  asyncHandler(updateUserPermissions)
);
router.get(
  "/:userId",
  authenticate,
  isAdmin,
  asyncHandler(getUserPermissions)
);
module.exports = router;
