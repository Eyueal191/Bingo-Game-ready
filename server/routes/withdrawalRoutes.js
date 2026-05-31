const express = require("express");
const router = express.Router();
const withdrawalController = require("../controllers/withdrawalController");
const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

// User submits a withdrawal request
router.post(
  "/request",
  authenticate,
  asyncHandler(withdrawalController.submitWithdrawalRequest)
);

// Admin fetches all withdrawal requests
router.get("/requests", authenticate, isAdmin, asyncHandler(withdrawalController.getWithdrawalRequests));

// Admin approves a withdrawal
router.post("/approve", authenticate, isAdmin, asyncHandler(withdrawalController.approveWithdrawal));

// Admin rejects a withdrawal
router.post("/reject", authenticate, isAdmin, asyncHandler(withdrawalController.rejectWithdrawal));

// Admin deletes a withdrawal (only non-approved)
router.delete(
  "/requests/:withdrawalId",
  authenticate,
  isAdmin,
  asyncHandler(withdrawalController.deleteWithdrawal)
);

module.exports = router;
