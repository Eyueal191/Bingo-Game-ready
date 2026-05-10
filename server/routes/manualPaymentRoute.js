const express = require("express");
const router = express.Router();

const { receiptUpload } = require("../middlewares/fileUpload"); // Import your multer configuration
const paymentController = require("../controllers/manualPaymentController");
const {
  authenticate,
  isAdmin,
  isFinance,
  isSecretary,
} = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

// Middleware to pass io to controllers
router.use((req, res, next) => {
  req.io = req.app.get("io");
  next();
});

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
router.get(
  "/receipts",
  authenticate,
  isSecretary,
  asyncHandler(paymentController.getReceipts)
);
router.get(
  "/all-transactions",
  authenticate,
  isFinance,
  asyncHandler(paymentController.getAdminTransactions)
);
router.get(
  "/referral-income",
  authenticate,
  asyncHandler(paymentController.getReferralData)
);
router.post(
  "/reject/:id",
  authenticate,
  isSecretary,
  asyncHandler(paymentController.rejectReceipt)
);
router.delete(
  "/:id",
  authenticate,
  isSecretary,
  asyncHandler(paymentController.deleteReceipt)
);
router.post(
  "/deposit",
  authenticate,
  isSecretary,
  asyncHandler(paymentController.depositToWallet)
);

module.exports = router;
