const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Constants for directory paths and file size limits
const UPLOAD_DIR_RECEIPTS = "./uploads/receipts";
const UPLOAD_DIR_USERS = "./uploads/users";
const UPLOAD_DIR_PROMO = "./uploads/promo";
const UPLOAD_DIR_LOTTERY = "./uploads/lottery";
const UPLOAD_DIR_BRANDING = "./uploads/branding";

const MAX_FILE_SIZE_RECEIPT = 15 * 1024 * 1024; // 15MB file size limit for receipts
const MAX_FILE_SIZE_USER = 10 * 1024 * 1024; // 10MB file size limit for user images
// Promo banner uploads
const MAX_FILE_SIZE_PROMO = 10 * 1024 * 1024; // 10MB file size limit for promo images
const MAX_FILE_SIZE_LOTTERY = 20 * 1024 * 1024; // 20MB file size limit for lottery images

// Ensure the directory exists, create if not
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// File filter function for validating file types based on fieldname
const fileFilter = (req, file, cb) => {
  let allowedTypes;
  let allowedText;

  if (file.fieldname === "receipt") {
    allowedTypes = /jpeg|png|jpg|gif|pdf/;
    allowedText = "jpeg, jpg, png, pdf, and gif";
  } else if (file.fieldname === "profile") {
    allowedTypes = /jpeg|png|jpg|gif/;
    allowedText = "jpeg, jpg, png, and gif";
  } else if (file.fieldname === "promo") {
    // Promo banner image upload
    allowedTypes = /jpeg|png|jpg|gif|webp/;
    allowedText = "jpeg, jpg, png, gif, and webp";
  } else if (["logo", "squareLogo", "favicon"].includes(file.fieldname)) {
    allowedTypes = /jpeg|png|jpg|gif|webp|svg|ico/;
    allowedText = "jpeg, jpg, png, gif, webp, svg, or ico";
  }
  else if (/^reward_photos_rank_\d+$/.test(file.fieldname)) {
    allowedTypes = /jpeg|png|jpg|gif/;
    allowedText = "jpeg, jpg, png, and gif";
  } else {
    return cb(new Error("Invalid field name"), false);
  }

  const mimeType = allowedTypes.test(file.mimetype);
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimeType && extName) {
    return cb(null, true);
  } else {
    return cb(new Error(`Only ${allowedText} files are allowed!`), false);
  }
};

// Storage configuration function to avoid duplication
const sanitizeFilename = (name) =>
  name
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const createStorageConfig = (uploadDir) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDirectoryExists(uploadDir); // Ensure the upload directory exists
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const nameWithoutExt = path.basename(
        file.originalname,
        path.extname(file.originalname)
      );
      const timestamp = Date.now();
      const extension = path.extname(file.originalname).toLowerCase();

      const safeBase = sanitizeFilename(nameWithoutExt) || "upload";

      cb(null, `${safeBase}-${file.fieldname}-${timestamp}${extension}`);
    }
  });
};

// Receipt and user storage configurations
const receiptStorage = createStorageConfig(UPLOAD_DIR_RECEIPTS);
const userStorage = createStorageConfig(UPLOAD_DIR_USERS);
const promoStorage = createStorageConfig(UPLOAD_DIR_PROMO);
// Lottery storage configuration
const lotteryStorage = createStorageConfig(UPLOAD_DIR_LOTTERY);
const brandingStorage = createStorageConfig(UPLOAD_DIR_BRANDING);

// Initialize multer with limits and file filter
const receiptUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: MAX_FILE_SIZE_RECEIPT },
  fileFilter: fileFilter
});

const userUpload = multer({
  storage: userStorage,
  limits: { fileSize: MAX_FILE_SIZE_USER },
  fileFilter: fileFilter
});
const promoUpload = multer({
  storage: promoStorage,
  limits: { fileSize: MAX_FILE_SIZE_PROMO },
  fileFilter: fileFilter,
}).single("promo");

const brandingUpload = multer({
  storage: brandingStorage,
  limits: { fileSize: MAX_FILE_SIZE_PROMO },
  fileFilter,
}).fields([
  { name: "logo", maxCount: 1 },
  { name: "squareLogo", maxCount: 1 },
  { name: "favicon", maxCount: 1 },
]);

// Dynamic fields for lottery uploads (allow reward_photos_rank_X for any rank)
const lotteryUpload = multer({
  storage: lotteryStorage,
  limits: { fileSize: MAX_FILE_SIZE_LOTTERY },
  fileFilter: fileFilter,
}).fields(
  Array.from({ length: 100 }, (_, i) => ({
    name: `reward_photos_rank_${i + 1}`,
    maxCount: 1, // One photo per reward
  }))
);

module.exports = {
  userUpload,
  receiptUpload,
  promoUpload,
  brandingUpload,
  lotteryUpload,
};
