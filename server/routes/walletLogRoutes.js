const express = require("express");
const { authenticate, isAdmin } = require("../middlewares/auth");

const {
  listWalletLogs,
  getWalletLog,
  deleteWalletLog,
} = require("../controllers/walletLogController");
const asyncHandler = require("../utils/asyncHandler");
    
const router = express.Router();

router.get("/", authenticate, isAdmin, asyncHandler(listWalletLogs));
router.get("/:id", authenticate, isAdmin, asyncHandler(getWalletLog));
router.delete("/:id", authenticate, isAdmin, asyncHandler(deleteWalletLog));

module.exports = router;