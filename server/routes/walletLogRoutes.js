const express = require("express");
const { authenticate, isAdmin, isManager } = require("../middlewares/auth");

const {
  listWalletLogs,
  getWalletLog,
  deleteWalletLog,
} = require("../controllers/walletLogController");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", authenticate, isManager, asyncHandler(listWalletLogs));
router.get("/:id", authenticate, isManager, asyncHandler(getWalletLog));
router.delete("/:id", authenticate, isAdmin, asyncHandler(deleteWalletLog));

module.exports = router;