const fs = require("fs");
const path = require("path");
const User = require("../models/userModels");
const logger = require("../utils/winstonLogger");

const { DEFAULT_SETTINGS, getAppSettings } = require("../services/appSettingsService");

const locales = {};
const userLanguages = {};
const SETTINGS_REFRESH_INTERVAL_MS = 60 * 1000;
let lastSettingsRefresh = 0;
let refreshInFlight = null;

const buildDefaultReplacements = (settings = DEFAULT_SETTINGS) => {
  const identity = settings.identity || DEFAULT_SETTINGS.identity;
  const bot = settings.bot || DEFAULT_SETTINGS.bot;
  return {
    appName: identity?.appName || DEFAULT_SETTINGS.identity.appName,
    appNameLocalized:
      identity?.appNameLocalized ||
      identity?.appName ||
      DEFAULT_SETTINGS.identity.appName,
    shortName: identity?.shortName || identity?.appName,
    tagline: identity?.tagline || DEFAULT_SETTINGS.identity.tagline,
    botName: bot?.botName || DEFAULT_SETTINGS.bot.botName,
    supportUserName:
      bot?.supportUserName || DEFAULT_SETTINGS.bot.supportUserName || "",
  };
};

let defaultReplacements = buildDefaultReplacements(DEFAULT_SETTINGS);

const refreshDefaultReplacements = async () => {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const settings = await getAppSettings();
      defaultReplacements = buildDefaultReplacements(settings);
      lastSettingsRefresh = Date.now();
    } catch (error) {
      logger.error("Failed to refresh localization defaults", {
        error: error?.message || String(error),
      });
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
};

const loadLocales = () => {
  const localesDir = path.join(__dirname, "../locales");
  const files = fs.readdirSync(localesDir);
  files.forEach((file) => {
    if (file.endsWith(".json")) {
      const lang = file.split(".")[0];
      const data = fs.readFileSync(path.join(localesDir, file), "utf8");
      locales[lang] = JSON.parse(data);
    }
  });
};

loadLocales();

const getLang = async (chatId) => {
  if (userLanguages[chatId]) {
    return userLanguages[chatId];
  }

  try {
    const user = await User.findOne({ telegramId: chatId.toString() });
    if (user && user.language) {
      userLanguages[chatId] = user.language;
      return user.language;
    }
  } catch (error) {
    logger.error("Error fetching user language from DB", { error: error?.message || String(error) });
  }

  return "en"; // Default language
};

const t = (key, lang, replacements = {}) => {
  if (Date.now() - lastSettingsRefresh > SETTINGS_REFRESH_INTERVAL_MS) {
    refreshDefaultReplacements();
  }

  let translation = locales[lang]?.[key] || locales["en"]?.[key] || key;
  const mergedReplacements = { ...defaultReplacements, ...replacements };

  translation = translation.replace(/\{([^}]+)\}/g, (match, placeholder) => {
    if (Object.prototype.hasOwnProperty.call(mergedReplacements, placeholder)) {
      return mergedReplacements[placeholder];
    }
    return match;
  });

  return translation;
};

const setUserLanguage = async (chatId, lang) => {
  if (locales[lang]) {
    userLanguages[chatId] = lang;
    try {
      await User.findOneAndUpdate(
        { telegramId: chatId.toString() },
        { language: lang },
        { upsert: true }
      );
      return true;
    } catch (error) {
      logger.error("Error saving user language to DB", { error: error?.message || String(error) });
      return false;
    }
  }
  return false;
};

module.exports = { t, setUserLanguage, getLang };
