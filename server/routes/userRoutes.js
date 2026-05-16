const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const allowAdminOrSelfTelegramId = (req, res, next) => {
  const paramTelegramId = req.params.telegramId?.toString();
  const userTelegramId = req.user?.telegramId?.toString();

  if (req.user?.role === "admin") return next();
  if (paramTelegramId && userTelegramId && paramTelegramId === userTelegramId) {
    return next();
  }

  return res.status(403).json({ message: "Forbidden" });
};

router.get("/all", authenticate, isAdmin, asyncHandler(userController.getAllUsers));
// Place specific routes BEFORE the generic "/:id" to avoid shadowing
router.get(
  "/by-telegram-id/:telegramId",
  authenticate,
  allowAdminOrSelfTelegramId,
  asyncHandler(userController.getUserByTelegramId)
);
router.get(
  "/balance/:telegramId",
  authenticate,
  allowAdminOrSelfTelegramId,
  asyncHandler(userController.WalletBalanceTelegramId)
);
router.get(
  "/invited/:invitedBy",
  authenticate,
  isAdmin,
  asyncHandler(userController.getUsersByInvitedCode)
);
// Admin: Get all agents with stats
router.get(
  "/admin/agents-with-stats",
  authenticate,
  isAdmin,
  asyncHandler(userController.getAllAgentsWithStats)
);
router.get("/:id/summary", authenticate, isAdmin, asyncHandler(userController.getUserSummary));

router.get("/:id", authenticate, isAdmin, asyncHandler(userController.getUserById));
router.put(
  "/:id/wallet",
  authenticate,
  isAdmin,
  asyncHandler(userController.updateWallet)
);
// Admin protected actions
router.delete(
  "/delete/:id",
  authenticate,
  isAdmin,
  asyncHandler(userController.deleteUser)
);
router.put("/:id/ban", authenticate, isAdmin, asyncHandler(userController.banUser));
router.put(
  "/:id/unban",
  authenticate,
  isAdmin,
  asyncHandler(userController.unbanUser)
);

// Agent: Get referred users and their play/earnings
router.get(
  "/agent/earnings",
  authenticate,
  asyncHandler(userController.getAgentEarnings)
);

// Admin: Update user role
router.put(
  "/:id/role",
  authenticate,
  isAdmin,
  asyncHandler(userController.updateUserRole)
);

module.exports = router;
