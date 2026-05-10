const express = require("express");
const router = express.Router();
const controller = require("../controllers/stakeBonusSettingsController");
const bonusAdminViewController = require("../controllers/bonusAdminViewController");
const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.get(
  "/",
  authenticate,
  isAdmin,
  asyncHandler(controller.getAllStakeBonuses)
);
router.get(
  "/:stakeAmount",
  authenticate,
  isAdmin,
  asyncHandler(controller.getStakeBonus)
);
router.post("/", authenticate, isAdmin, asyncHandler(controller.upsertStakeBonus));

// List all unique pending stakes with their bonus settings (admin view)
router.get(
  "/admin/pending-stakes",
  authenticate,
  isAdmin,
  asyncHandler(bonusAdminViewController.getPendingStakesWithBonus)
);

// COMMISSION-ONLY ROUTES (Separate from bonus settings)
router.get(
  "/commission/all",
  authenticate,
  isAdmin,
  asyncHandler(controller.getAllCommissions)
);
router.get(
  "/commission/:stakeAmount",
  authenticate,
  isAdmin,
  asyncHandler(controller.getStakeCommission)
);
router.post(
  "/commission",
  authenticate,
  isAdmin,
  asyncHandler(controller.upsertStakeCommission)
);

module.exports = router;