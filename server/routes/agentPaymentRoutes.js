const express = require("express");
const router = express.Router();
const agentPaymentController = require("../controllers/agentPaymentController");
const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

// Admin: Create a new payment for an agent
router.post(
  "/",
  authenticate,
  isAdmin,
  asyncHandler(agentPaymentController.createAgentPayment)
);

// Admin: Get all payments for a specific agent
router.get(
  "/:agentId",
  authenticate,
  isAdmin,
  asyncHandler(agentPaymentController.getPaymentsForAgent)
);

// Agent: Get their own payments
router.get("/", authenticate, asyncHandler(agentPaymentController.getMyPayments));
module.exports = router;
