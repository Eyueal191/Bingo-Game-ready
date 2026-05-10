const express = require("express");
const {
  deposit,
  withdraw,
  getStatus,
  depositSuccessCallback,
  depositFailureCallback,
  withdrawalCallback,
} = require("../controllers/addisPayPaymentController");
const { authenticate } = require("../middlewares/auth");
const withdrawalLimiter = require("../middlewares/withdrawalRateLimit");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post("/deposit", authenticate, asyncHandler(deposit));
router.post(
  "/withdraw",
  authenticate,
  withdrawalLimiter,
  asyncHandler(withdraw)
);
router.get("/status", asyncHandler(getStatus));
router.post("/deposit/success", asyncHandler(depositSuccessCallback));
router.post("/deposit/failure", asyncHandler(depositFailureCallback));
router.post("/withdraw/callback", asyncHandler(withdrawalCallback));

module.exports = router;
