const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, isAdmin, isManager, isFinance } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

// Middleware to pass io to controllers
router.use((req, res, next) => {
  req.io = req.app.get("io");
  next();
});

const allowAdminOrSelfTelegramId = (req, res, next) => {
  const paramTelegramId = req.params.telegramId?.toString();
  const userTelegramId = req.user?.telegramId?.toString();

  if (req.user?.role === "admin") return next();
  if (paramTelegramId && userTelegramId && paramTelegramId === userTelegramId) {
    return next();
  }

  return res.status(403).json({ message: "Forbidden" });
};

// Manager+ can view all users
router.get("/all", authenticate, isManager, asyncHandler(userController.getAllUsers));
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
  isManager,
  asyncHandler(userController.getUsersByInvitedCode)
);
// Admin: Get all agents with stats
router.get(
  "/admin/agents-with-stats",
  authenticate,
  isManager,
  asyncHandler(userController.getAllAgentsWithStats)
);
// Manager+ can view user summary
router.get("/:id/summary", authenticate, isManager, asyncHandler(userController.getUserSummary));

// Manager+ can view user details
router.get("/:id", authenticate, isManager, asyncHandler(userController.getUserById));

// Finance+ can update wallet
router.put(
  "/:id/wallet",
  authenticate,
  isFinance,
  asyncHandler(userController.updateWallet)
);
router.put(
  "/:id/bonus",
  authenticate,
  isFinance,
  asyncHandler(userController.updateBonus)
);

// Admin-only actions: delete, ban, unban, role change
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
