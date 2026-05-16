const AppConfig = require("../models/appConfig");
const logger = require("../utils/winstonLogger");
const {
  invalidateAppSettingsCache,
} = require("../services/appSettingsService");
const { brandingUpload } = require("../middlewares/fileUpload");
const CONFIG = require("../config/config");
const path = require("path");

const normalizeDepositBonus = (value) => {
  const input = value && typeof value === "object" ? value : null;
  if (!input) return null;

  const enabled = Boolean(input.enabled);
  const rawPercent = input.percent;
  const percentNumber =
    rawPercent === "" || rawPercent === null || rawPercent === undefined
      ? 0
      : Number(rawPercent);
  if (!Number.isFinite(percentNumber)) return null;
  const percent = Math.min(100, Math.max(0, percentNumber));

  return { enabled, percent };
};

// Helper: shallow merge only allowed top-level keys to prevent arbitrary injection
const ALLOWED_TOP_LEVEL = new Set([
  "depositBonus",
  "promoBanner",
  "botPayments",
  "robotEnabledGlobal",
  "identity",
  "branding",
  "bot",
  "walletRules",
  "leaderboard",
  "paymentAccounts",
]);

exports.getAppConfig = async (req, res) => {
  try {
    const cfg = await AppConfig.getConfig();
    res.json(cfg);
  } catch (e) {
    logger.error("getAppConfig failed", { error: e.message });
    res.status(500).json({ error: "Failed to fetch config" });
  }
};

exports.updateAppConfig = async (req, res) => {
  try {
    const cfg = await AppConfig.getConfig();
    const payload = req.body || {};
    let changed = false;

    for (const key of Object.keys(payload)) {
      if (!ALLOWED_TOP_LEVEL.has(key)) continue;
      const value = payload[key];

      if (key === "depositBonus") {
        const normalized = normalizeDepositBonus(value);
        if (!normalized) {
          return res.status(400).json({
            error: "Invalid depositBonus (expected { enabled: boolean, percent: number 0-100 })",
          });
        }
        cfg.depositBonus = normalized;
        changed = true;
        continue;
      }

      if (value && typeof value === "object") {
        // Deep merge (shallow per nested object) to avoid wiping unspecified fields
        cfg[key] = { ...(cfg[key]?.toObject?.() || cfg[key] || {}), ...value };
      } else {
        cfg[key] = value;
      }
      changed = true;
    }

    if (!changed) {
      return res.status(400).json({ error: "No valid config keys supplied" });
    }
    cfg.audit = cfg.audit || {};
    cfg.audit.updatedAt = new Date();
    cfg.audit.updatedBy = req.user?._id || null;
    cfg.audit.version = (cfg.audit.version || 0) + 1;
    await cfg.save();
    invalidateAppSettingsCache();
    res.json(cfg);
  } catch (e) {
    logger.error("updateAppConfig failed", { error: e.message });
    res.status(500).json({ error: "Failed to update config" });
  }
};

const buildFileResponse = (req, filePath) => {
  if (!filePath) return null;
  const baseUrl =
    CONFIG.assetBaseUrl || CONFIG.backendUrl || `${req.protocol}://${req.get("host")}`;
  const cleaned = filePath.replace(/\\/g, "/");
  if (/^https?:/i.test(cleaned)) {
    return cleaned;
  }
  if (cleaned.startsWith("/")) {
    return `${baseUrl}${cleaned}`;
  }
  return `${baseUrl}/${cleaned}`;
};

const mapBrandingFiles = (req, files) => {
  const output = {};
  if (!files) return output;

  const mapField = (fieldName, configKey) => {
    const fileArr = files[fieldName];
    if (Array.isArray(fileArr) && fileArr[0]) {
      const file = fileArr[0];
      const relative = `/uploads/branding/${path.basename(file.path)}`;
      output[configKey] = buildFileResponse(req, relative);
    }
  };

  mapField("logo", "logoUrl");
  mapField("squareLogo", "squareLogoUrl");
  mapField("favicon", "faviconUrl");

  return output;
};

exports.uploadBrandingAssets = (req, res) =>
  brandingUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }

    try {
      const files = req.files;
      const updates = mapBrandingFiles(req, files);

      if (!Object.keys(updates).length) {
        return res.status(400).json({ error: "No files provided" });
      }

      const cfg = await AppConfig.getConfig();
      cfg.branding = { ...(cfg.branding?.toObject?.() || cfg.branding || {}), ...updates };
      if (CONFIG.assetBaseUrl) {
        cfg.branding.assetBaseUrl = CONFIG.assetBaseUrl;
      }
      cfg.audit = cfg.audit || {};
      cfg.audit.updatedAt = new Date();
      cfg.audit.updatedBy = req.user?._id || cfg.audit.updatedBy;
      cfg.audit.version = (cfg.audit.version || 0) + 1;
        await cfg.save();
        invalidateAppSettingsCache();

        const brandingPayload = cfg.branding?.toObject?.() || cfg.branding;

        res.json({ branding: brandingPayload, files: updates });
    } catch (uploadErr) {
      logger.error("uploadBrandingAssets failed", { error: uploadErr.message });
      res.status(500).json({ error: "Failed to save branding assets" });
    }
  });