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

const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

// Admin route (assumed to be protected by admin middleware elsewhere)
router.get("/all", authenticate, isAdmin, asyncHandler(getAllAddispayTransactions));
// User route with authentication middleware
router.get("/mine", authenticate, asyncHandler(getUserTransactions));
// Bonus transactions route
router.get("/bonuses", authenticate, asyncHandler(getBonusTransactions));
router.get("/", authenticate, isAdmin, asyncHandler(getTransactions));
router.get("/:transactionId", authenticate, isAdmin, asyncHandler(getTransaction));
router.put("/:transactionId", authenticate, isAdmin, asyncHandler(updateTransactionDetails));
router.delete("/:transactionId", authenticate, isAdmin, asyncHandler(deleteTransactionRecord));

module.exports = router;
