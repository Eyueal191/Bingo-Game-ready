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
} = require("../controllers/authController");
const { authenticate, isAdmin } = require("../middlewares/auth");
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

router.post("/register", asyncHandler(register));
router.post("/telegram", asyncHandler(telegramAuth));
// Validate body against loginSchema
router.post("/login", validateRequest(loginSchema), asyncHandler(login));
router.get("/profile", authenticate, asyncHandler(getProfile));
// Validate updates to profile
router.put(
  "/profile",
  authenticate,
  validateRequest(updateProfileSchema),
  asyncHandler(updateProfile)
);
router.delete("/delete-account", authenticate, asyncHandler(deleteAccount));
router.get("/invited-users", authenticate, asyncHandler(getInvitedUsers));
// Validate change password body
router.put(
  "/change-password",
  authenticate,
  validateRequest(changePasswordSchema),
  asyncHandler(changePassword)
);
// Validate forgot password body
router.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  asyncHandler(forgotPassword)
);
// Validate reset password body (token is in params, body contains new password)
router.post(
  "/reset-password/:token",
  validateRequest(passwordSchema),
  asyncHandler(resetPassword)
);

// Admin: Register a new agent
router.post(
  "/admin/register-agent",
  authenticate,
  isAdmin,
  asyncHandler(registerAgent)
);

module.exports = router;
