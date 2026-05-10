const fs = require("fs");
const path = require("path");
const logger = require("../../utils/winstonLogger");
const CONFIG = require("../../config/config");
const { getAppSettings } = require("../../services/appSettingsService");

const resolveAssetUrl = (url, branding = {}) => {
  if (!url) return null;
  const trimmed = url.trim();

  // Absolute URL → use directly
  if (/^https?:/i.test(trimmed)) {
    return trimmed;
  }

  const bases = [
    branding.assetBaseUrl,
    CONFIG.assetBaseUrl,
    CONFIG.backendUrl,
  ].filter(Boolean);

  if (!bases.length) return trimmed;

  const base = bases[0].replace(/\/$/, "");
  const relativePath = trimmed.replace(/^\/+/, "");
  return `${base}/${relativePath}`;
};

const CACHE_TTL_MS = 60 * 1000;
let cachedBranding = null;
let cacheTimestamp = 0;

const getBrandingAssets = async () => {
  const now = Date.now();
  if (cachedBranding && now - cacheTimestamp < CACHE_TTL_MS) return cachedBranding;

  const settings = await getAppSettings();
  const branding = settings?.branding || {};

  const resolved = {
    ...branding,
    logoUrl: resolveAssetUrl(branding.logoUrl, branding),
    squareLogoUrl: resolveAssetUrl(branding.squareLogoUrl, branding),
    faviconUrl: resolveAssetUrl(branding.faviconUrl, branding),
  };

  cachedBranding = resolved;
  cacheTimestamp = now;
  return resolved;
};

const sendBrandingPhoto = async (bot, chatId, { caption, photoKey = "squareLogoUrl", extra = {} } = {}) => {
  try {
    const branding = await getBrandingAssets();
    let photoUrl = branding[photoKey] || branding.logoUrl;

    if (!photoUrl) {
      logger.warn("No photo URL found for branding", { chatId });
      return false;
    }

    logger.info("Sending branding photo", { chatId, photoUrl });

    // Case 1: HTTPS URL → send as remote
    if (/^https:\/\/+/i.test(photoUrl)) {
      await bot.sendPhoto(chatId, photoUrl, { caption, ...extra });
      return true;
    }

    // Case 2: Localhost URL or relative uploads path → send local file
    let localPath;

    if (/^http:\/\/localhost/i.test(photoUrl)) {
      // Extract everything after /uploads/
      const match = photoUrl.match(/\/uploads\/.*/i);
      if (match) {
        localPath = path.join(__dirname, "../../..", match[0]);
      }
    } else if (photoUrl.startsWith("/uploads/") || photoUrl.startsWith("uploads/")) {
      localPath = path.join(__dirname, "../../..", photoUrl.replace(/^\/+/, ""));
    }

    if (!localPath || !fs.existsSync(localPath)) {
      logger.error("Local branding photo not found", { chatId, localPath });
      return false;
    }

    logger.info("Sending local branding photo", { chatId, localPath });

    await bot.sendPhoto(chatId, { source: fs.createReadStream(localPath) }, { caption, ...extra });

    return true;
  } catch (error) {
    logger.error("Failed to send branding photo", {
      chatId,
      error: error.message,
    });
    return false;
  }
};

module.exports = {
  resolveAssetUrl,
  getBrandingAssets,
  sendBrandingPhoto,
};
