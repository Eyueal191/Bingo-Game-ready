const express = require("express");
const {
  getDashboard,
  getTransactions,
  getPayouts,
  updatePayout,
  getStats,
} = require("../controllers/adminController");
const { authenticate } = require("../middlewares/auth");
const router = express.Router();
const restrictAccess = require("../middlewares/restrictAccess");
const asyncHandler = require("../utils/asyncHandler");

router.get(
  "/dashboard",
  authenticate,
  restrictAccess(["bingo", "keshkesh"]),
  asyncHandler(getDashboard)
);
router.get("/transactions", authenticate, restrictAccess(), asyncHandler(getTransactions));
router.get("/payouts", authenticate, restrictAccess(), asyncHandler(getPayouts));
router.put("/payouts/:payoutId", authenticate, restrictAccess(), asyncHandler(updatePayout));
router.get("/stats", authenticate, restrictAccess(), asyncHandler(getStats));

module.exports = router;
