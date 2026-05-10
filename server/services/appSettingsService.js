const AppConfig = require("../models/appConfig");
const CONFIG = require("../config/config");

const normalizeHandle = (handle) =>
  typeof handle === "string" ? handle.trim().replace(/^@/, "") : "";



const startCase = (input) =>
  typeof input === "string"
    ? input
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase())
    : "";



const DEFAULT_SETTINGS = {
  identity: {
    appName: "Big Bingo",
    appNameLocalized: "Big Bingo",
    shortName: "Big Bingo",
    tagline: "Play. Win. Celebrate.",
  },
  branding: {
    logoUrl: "",
    squareLogoUrl: "",
    faviconUrl: "",
    primaryColor: "#1e88e5",
    secondaryColor: "#f5b301",
    assetBaseUrl: "",
  },
  bot: {
    botName: CONFIG.botUsername
      ? `${startCase(normalizeHandle(CONFIG.botUsername))} Bot`
      : "",
    botUserName: normalizeHandle(CONFIG.botUsername) || "",
    supportUserName: normalizeHandle(CONFIG.supportUsername) || "",
    supportChannelUrl: CONFIG.miniAppUrl || "",
  },
  botPayments: {
    deposit: {
      methods: {
        cbe: true,
        telebirr: true,
        abyssinia: true,
        cbebirr: true,
        dashen: true,
        telebirr_online: true,
        cbe_online: true,
      },
    },
  },
  paymentAccounts: {
    manual: [
      {
        provider: "cbe",
        accountNumber: process.env.AGENT_CBE || "comming soon",
        accountName: process.env.AGENT_NAME_CBE || process.env.AGENT_NAME || "comming soon",
      },
      {
        provider: "telebirr",
        accountNumber: process.env.AGENT_PHONE || "comming soon",
        accountName: process.env.AGENT_NAME || "comming soon",
      },
      {
        provider: "abyssinia",
        accountNumber: process.env.AGENT_ABYSSINIA_ACCOUNT || "comming soon",
        accountName: process.env.AGENT_NAME_ABYSSINIA || process.env.AGENT_NAME || "comming soon",
      },
      {
        provider: "cbebirr",
        accountNumber: process.env.AGENT_CBEBIRR_ACCOUNT || "comming soon",
        accountName: process.env.AGENT_NAME_CBEBIRR || process.env.AGENT_NAME || "comming soon",
      },
      {
        provider: "dashen",
        accountNumber: process.env.AGENT_DASHEN_ACCOUNT || "comming soon",
        accountName: process.env.AGENT_NAME_DASHEN || process.env.AGENT_NAME || "comming soon",
      },
    ],
  },
  leaderboard: {
    enabled: true,
    includeRobots: false,
  },
  walletRules: {
    minDepositAmount: 50,
    minAutomaticDepositAmount: 50,
    minWithdrawalAmount: 100,
    minBalanceAfterWithdrawal: 10,
    minWinsForWithdrawal: 3,
    minDepositsForWithdrawal: 1,
    minTransferAmount: 10,
    maxTransferAmount: 500,
  },
  depositBonus: {
    enabled: false,
    percent: 0,
  },
  promoBanner: {
    enabled: false,
  },
  robotEnabledGlobal: true,
  bingo: {
    callInterval: 4,
  },
};

const CACHE_TTL_MS = 60 * 1000;
let cachedSettings = null;
let cacheTimestamp = 0;

const toPlain = (value) => {
  if (!value) return undefined;
  if (typeof value.toObject === "function") {
    return value.toObject();
  }
  if (typeof value.toJSON === "function") {
    return value.toJSON();
  }
  return value;
};

const mergeSection = (defaults, override) => ({
  ...defaults,
  ...(toPlain(override) || {}),
});

const buildSettingsFromDoc = (doc) => {
  const identity = mergeSection(DEFAULT_SETTINGS.identity, doc.identity);
  const branding = mergeSection(DEFAULT_SETTINGS.branding, doc.branding);
  if (CONFIG.assetBaseUrl && !branding.assetBaseUrl) {
    branding.assetBaseUrl = CONFIG.assetBaseUrl;
  }
  const bot = mergeSection(DEFAULT_SETTINGS.bot, doc.bot);
  const leaderboard = mergeSection(DEFAULT_SETTINGS.leaderboard, doc.leaderboard);


  const walletRules = mergeSection(
    DEFAULT_SETTINGS.walletRules,
    doc.walletRules
  );
  const depositBonus = mergeSection(
    DEFAULT_SETTINGS.depositBonus,
    doc.depositBonus
  );
  const promoBanner = mergeSection(
    DEFAULT_SETTINGS.promoBanner,
    doc.promoBanner
  );
  const robotEnabledGlobal =
    typeof doc.robotEnabledGlobal === "boolean"
      ? doc.robotEnabledGlobal
      : DEFAULT_SETTINGS.robotEnabledGlobal;
  const bingo = mergeSection(DEFAULT_SETTINGS.bingo, doc.bingo);
  const botPayments = mergeSection(DEFAULT_SETTINGS.botPayments, doc.botPayments);
  const paymentAccounts = mergeSection(DEFAULT_SETTINGS.paymentAccounts, doc.paymentAccounts);

  return {
    identity,
    branding,
    bot,
    botPayments,
    paymentAccounts,
    walletRules,
    depositBonus,
    promoBanner,
    leaderboard,
    robotEnabledGlobal,
    bingo,
  };
};

const getAppSettings = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const doc = await AppConfig.getConfig();
  const settings = buildSettingsFromDoc(doc);
  cachedSettings = settings;
  cacheTimestamp = now;
  return settings;
};

const invalidateAppSettingsCache = () => {
  cachedSettings = null;
  cacheTimestamp = 0;
};

module.exports = {
  DEFAULT_SETTINGS,
  getAppSettings,
  invalidateAppSettingsCache,

};
