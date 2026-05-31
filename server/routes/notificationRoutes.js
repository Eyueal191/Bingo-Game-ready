const express = require("express");
const router = express.Router();
const multer = require("multer");
const { sendNotification } = require("../controllers/notificationController");
const { authenticate, isAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

// Configure multer for file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Route for sending notifications (admin-only)
router.post("/notify", authenticate, isAdmin, upload.single("image"), asyncHandler(sendNotification));

module.exports = router;
