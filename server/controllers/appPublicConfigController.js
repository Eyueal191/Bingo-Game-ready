const AppConfig = require("../models/appConfig");
const { promoUpload } = require("../middlewares/fileUpload");
const {
  getAppSettings,
  invalidateAppSettingsCache,
} = require("../services/appSettingsService");
const CONFIG = require("../config/config");

exports.getPublicConfig = async (req, res) => {
  try {
    const [settings, cfg] = await Promise.all([
      getAppSettings(),
      AppConfig.getConfig(),
    ]);
    const baseUrl =
      cfg.branding?.assetBaseUrl ||
      settings.branding?.assetBaseUrl ||
      CONFIG.assetBaseUrl ||
      CONFIG.backendUrl;
    const mergeFullUrl = (relative) => {
      if (!relative) return relative;
      if (/^https?:/i.test(relative)) return relative;
      if (baseUrl) {
        return `${baseUrl.replace(/\/$/, "")}/${relative.replace(/^\//, "")}`;
      }
      return relative;
    };

    const branding = {
      ...settings.branding,
      assetBaseUrl: baseUrl || settings.branding?.assetBaseUrl || "",
      logoUrl: mergeFullUrl(settings.branding?.logoUrl || cfg.branding?.logoUrl),
      squareLogoUrl: mergeFullUrl(
        settings.branding?.squareLogoUrl || cfg.branding?.squareLogoUrl
      ),
      faviconUrl: mergeFullUrl(settings.branding?.faviconUrl || cfg.branding?.faviconUrl),
    };

    const out = {
      identity: settings.identity,
      branding,
      bot: settings.bot,
      leaderboard: settings.leaderboard,
      walletRules: settings.walletRules,
      depositBonus: settings.depositBonus,
      promoBanner: settings.promoBanner || { enabled: false },
      robotEnabledGlobal: settings.robotEnabledGlobal,
      bingoCallBonus: cfg.bingoCallBonus || { perStake: {} },
      ludo: cfg.ludo || {},
    };
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch public config" });
  }
};

exports.uploadPromoImage = async (req, res) => {
  // Use multer to handle the file
  promoUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const cfg = await AppConfig.getConfig();
      // Save relative path served via /uploads
      const relativePath = `/uploads/promo/${req.file.filename}`;
      cfg.promoBanner = cfg.promoBanner || {};
      cfg.promoBanner.imageUrl = relativePath;
      cfg.promoBanner.updatedAt = new Date();
      cfg.promoBanner.updatedBy = req.user?._id || cfg.promoBanner.updatedBy;
      cfg.audit = cfg.audit || {};
      cfg.audit.updatedAt = new Date();
      cfg.audit.updatedBy = req.user?._id || cfg.audit.updatedBy;
      cfg.audit.version = (cfg.audit.version || 0) + 1;
      await cfg.save();
      invalidateAppSettingsCache();
      return res.json({ imageUrl: relativePath, promoBanner: cfg.promoBanner });
    } catch (e) {
      return res.status(500).json({ error: "Failed to save promo image" });
    }
  });
};