const express = require("express");
const { authenticate } = require("../middlewares/auth");
const router = express.Router();
const {
  automaticDeposit,
  validateAutomaticDeposit,
} = require("../controllers/smsDepositController");
const asyncHandler = require("../utils/asyncHandler");

router.use((req, res, next) => {
  req.io = req.app.get("io");
  next();
});

router.post(
  "/automatic-deposit/validate",
  asyncHandler(validateAutomaticDeposit)
);
router.post(
  "/automatic-deposit",
  authenticate,
  asyncHandler(automaticDeposit)
);
module.exports = router;