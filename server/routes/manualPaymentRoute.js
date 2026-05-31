const express = require("express");
const router = express.Router();
const { receiptUpload } = require("../middlewares/fileUpload"); // Import your multer configuration
const paymentController = require("../controllers/manualPaymentController");
const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.post(
  "/receipt",
  authenticate,
  receiptUpload.single("receipt"),
  asyncHandler(paymentController.submitReceipt)
);
router.post(
  "/upload-receipt/:telegramId",
  receiptUpload.single("receipt"),
  asyncHandler(paymentController.submitReceiptTelegram)
);
router.get("/receipts", authenticate, isAdmin, asyncHandler(paymentController.getReceipts));
router.get(
  "/all-transactions",
  authenticate,
  isAdmin,
  asyncHandler(paymentController.getAdminTransactions)
);
router.get(
  "/referral-income",
  authenticate,
  asyncHandler(paymentController.getReferralData)
);
router.post("/deposit", authenticate, isAdmin, asyncHandler(paymentController.depositToWallet));

module.exports = router;
