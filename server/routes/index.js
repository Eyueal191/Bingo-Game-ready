const express = require("express");
const router = express.Router();

// Routes
router.use((req, res, next) => {
  req.io = req.app.get("io");
  next();
});
router.use("/users", require("./userRoutes"));
router.use("/bingo-cards", require("./bingoCardsroutes"));
router.use("/gamerooms", require("./gameRoomRoutes"));
router.use("/bingo", require("./bingoCardRoutes"));
router.use("/games-history", require("./gameHistoryRoutes"));
router.use("/auth", require("./authRoute"));
router.use("/transactions", require("./transactionRoutes"));
router.use("/addis-pay", require("./addisPayPaymentRoutes"));
router.use("/cards", require("./bingoCardRoutes"));
router.use("/manual-payment", require("./manualPaymentRoute"));
router.use("/withdrawal", require("./withdrawalRoutes"));
router.use("/transfer", require("./transferRoutes"));
router.use("/dashboard", require("./reportsRoutes"));
router.use("/stake-bonus", require("./stakeBonusSettingsRoutes"));
router.use("/send-user-notice", require("./notificationRoutes"));
router.use("/sms-deposit", require("./smsDepositRoutes"));
router.use("/agent-payments", require("./agentPaymentRoutes"));
router.use("/admin", require("./admin"));
router.use("/history", require("./history"));
router.use("/permissions", require("./permission"));
router.use("/settings", require("./settingRoutes"));
router.use("/config", require("./appConfigRoutes"));
router.use("/admin/settings", require("./adminSettingRoutes"));
router.use("/wallet-logs", require("./walletLogRoutes"));
router.use("/revenue", require("./revenueRoutes"));
router.use("/robots", require("./robotRoutes"));
router.use("/bot-pacing", require("./botPacingRoutes"));


module.exports = router;
