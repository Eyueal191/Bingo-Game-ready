const express = require("express");
const {
  register,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  getInvitedUsers,
  changePassword,
  resetPassword,
  forgotPassword,
  telegramAuth,
  registerAgent,
  registerGuest,
  registerStaff,
  sendEmailVerification,
  verifyEmail,
  getMySummary,
} = require("../controllers/authController");
const {
  authenticate,
  isAdmin,
  isManager,
  isFinance,
  isSecretary,
  isNotGuest,
} = require("../middlewares/auth");
const validateRequest = require("../middlewares/validator");
const asyncHandler = require("../utils/asyncHandler");
const {
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  passwordSchema,
} = require("../lib/schema");
const router = express.Router();

// Public routes
router.post("/register", asyncHandler(register));
router.post("/register-guest", asyncHandler(registerGuest));
router.post("/telegram", asyncHandler(telegramAuth));
router.post("/login", validateRequest(loginSchema), asyncHandler(login));

// Email verification (public — token-based)
router.get("/verify-email/:token", asyncHandler(verifyEmail));

// Authenticated routes
router.get("/profile", authenticate, asyncHandler(getProfile));
router.get("/my-summary", authenticate, asyncHandler(getMySummary));
router.put(
  "/profile",
  authenticate,
  isNotGuest,
  validateRequest(updateProfileSchema),
  asyncHandler(updateProfile)
);
router.delete("/delete-account", authenticate, isNotGuest, asyncHandler(deleteAccount));
router.get("/invited-users", authenticate, isNotGuest, asyncHandler(getInvitedUsers));
router.put(
  "/change-password",
  authenticate,
  isNotGuest,
  validateRequest(changePasswordSchema),
  asyncHandler(changePassword)
);
router.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  asyncHandler(forgotPassword)
);
router.post(
  "/reset-password/:token",
  validateRequest(passwordSchema),
  asyncHandler(resetPassword)
);

// Send email verification (authenticated)
router.post(
  "/send-verification-email",
  authenticate,
  isNotGuest,
  asyncHandler(sendEmailVerification)
);

// Admin/Manager: Register a new agent
router.post(
  "/admin/register-agent",
  authenticate,
  isManager,
  asyncHandler(registerAgent)
);

// Admin/Manager: Register staff (finance, secretary, manager)
router.post(
  "/admin/register-staff",
  authenticate,
  isManager,
  asyncHandler(registerStaff)
);

module.exports = router;
