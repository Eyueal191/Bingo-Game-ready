const express = require("express");
const {
  getTransaction,
  getTransactions,
  updateTransactionDetails,
  deleteTransactionRecord,
  getAllAddispayTransactions,
  getUserTransactions,
  getBonusTransactions,
} = require("../controllers/transactionController");

const router = express.Router();

const { authenticate, isAdmin, isFinance } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

// Admin/Finance route
router.get("/all", authenticate, isFinance, asyncHandler(getAllAddispayTransactions));
// User route with authentication middleware
router.get("/mine", authenticate, asyncHandler(getUserTransactions));
// Bonus transactions route
router.get("/bonuses", authenticate, asyncHandler(getBonusTransactions));
router.get("/", asyncHandler(getTransactions));
router.get("/:transactionId", asyncHandler(getTransaction));
router.put("/:transactionId", asyncHandler(updateTransactionDetails));
router.delete("/:transactionId", asyncHandler(deleteTransactionRecord));

module.exports = router;
