const express = require("express");
const router = express.Router();
const withdrawalController = require("../controllers/withdrawalController");
const { authenticate, isSecretary } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
// Middleware to pass io to controllers
router.use((req, res, next) => {
  req.io = req.app.get("io");
  next();
});

// User submits a withdrawal request
router.post(
  "/request",
  authenticate,
  asyncHandler(withdrawalController.submitWithdrawalRequest)
);

// Admin fetches all withdrawal requests
router.get(
  "/requests",
  authenticate,
  isSecretary,
  asyncHandler(withdrawalController.getWithdrawalRequests)
);

// Admin approves a withdrawal
router.post(
  "/approve",
  authenticate,
  isSecretary,
  asyncHandler(withdrawalController.approveWithdrawal)
);

// Admin rejects a withdrawal
router.post(
  "/reject",
  authenticate,
  isSecretary,
  asyncHandler(withdrawalController.rejectWithdrawal)
);

// Admin deletes a withdrawal (only non-approved)
router.delete(
  "/requests/:withdrawalId",
  authenticate,
  isSecretary,
  asyncHandler(withdrawalController.deleteWithdrawal)
);

module.exports = router;
