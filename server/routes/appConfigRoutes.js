const express = require("express");
const router = express.Router();
const {
  getAppConfig,
  updateAppConfig,
  uploadBrandingAssets,
} = require("../controllers/appConfigController");
const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const {
  getPublicConfig,
  uploadPromoImage,
} = require("../controllers/appPublicConfigController");

// GET /config - fetch full application configuration
router.get(
  "/",
  authenticate,
  isAdmin,
  asyncHandler(getAppConfig)
);

// PUT /config - update selected configuration sections
router.put(
  "/",
  authenticate,
  isAdmin,
  asyncHandler(updateAppConfig)
);


// Public (authenticated user) read-only config bits e.g. promo banner
router.get("/public", asyncHandler(getPublicConfig));

// Admin-only: upload promo banner image and update config.imageUrl
router.post(
    "/promo-image",
    authenticate,
    isAdmin,
  asyncHandler(uploadPromoImage)
);

router.post(
  "/branding/upload",
  authenticate,
  isAdmin,
  asyncHandler(uploadBrandingAssets)
);
module.exports = router;