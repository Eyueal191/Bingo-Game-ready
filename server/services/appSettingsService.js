const AppConfig = require("../models/appConfig");
const CONFIG = require("../config/config");

const normalizeHandle = (handle) =>
  typeof handle === "string" ? handle.trim().replace(/^@/, "") : "";

const slugify = (input) =>
  typeof input === "string"
    ? input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
    : "";

const startCase = (input) =>
  typeof input === "string"
    ? input
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase())
    : "";

const sanitizeManualAccount = (account = {}) => {
  const provider = slugify(account.provider || account.id || account.key || "");
  const derivedProvider = provider || slugify(account.label) || slugify(account.accountName);
  const label =
    account.label ||
    startCase(provider || account.provider || account.accountName || "Account");
  const accountNumber =
    typeof account.accountNumber === "string"
      ? account.accountNumber.trim()
      : typeof account.number === "string"
        ? account.number.trim()
        : account.accountNumber;

  return {
    provider: derivedProvider || "",
    label,
    accountName: account.accountName || account.name || "",
    accountNumber: accountNumber || "",
    instructions: account.instructions || account.note || "",
    isActive:
      typeof account.isActive === "boolean" ? account.isActive : account.disabled ? false : true,
    metadata: account.metadata,
  };
};

const normalizePaymentAccounts = (raw) => {
  if (!raw) return { manual: [], instructions: "", supportNote: "" };

  if (Array.isArray(raw.manual)) {
    return {
      manual: raw.manual.map(sanitizeManualAccount).filter(Boolean),
      instructions: raw.instructions || raw.note || "",
      supportNote: raw.supportNote || raw.support || "",
    };
  }

  if (Array.isArray(raw)) {
    return {
      manual: raw.map(sanitizeManualAccount).filter(Boolean),
      instructions: "",
      supportNote: "",
    };
  }

  if (typeof raw === "object") {
    if (raw.manual || raw.instructions || raw.supportNote) {
      return normalizePaymentAccounts({
        manual: raw.manual,
        instructions: raw.instructions,
        supportNote: raw.supportNote,
      });
    }

    const manual = [];

    const addLegacy = (provider, label, accountNumber, accountName, instructions) => {
      if (!accountNumber) return;
      manual.push(
        sanitizeManualAccount({
          provider,
          label,
          accountNumber,
          accountName,
          instructions,
        })
      );
    };

    addLegacy(
      "telebirr",
      raw.telebirrLabel || "Telebirr",
      raw.telebirr,
      raw.telebirrAccountName || raw.receiverName,
      raw.telebirrInstructions
    );

    addLegacy(
      "cbe",
      raw.cbeLabel || "CBE",
      raw.cbe,
      raw.cbeAccountName || raw.receiverName,
      raw.cbeInstructions
    );

    addLegacy(
      "abyssinia",
      raw.abyssiniaLabel || "Bank of Abyssinia",
      raw.abyssinia,
      raw.abyssiniaAccountName || raw.receiverName2,
      raw.abyssiniaInstructions
    );

    return {
      manual,
      instructions: raw.instructions || raw.note || "",
      supportNote: raw.supportNote || raw.support || "",
    };
  }

  return { manual: [], instructions: "", supportNote: "" };
};

const getBasePaymentAccounts = () => ({
  manual: [
    { provider: "telebirr", label: "Telebirr", accountName: "", accountNumber: "", isActive: true },
    { provider: "cbe", label: "CBE", accountName: "", accountNumber: "", isActive: true },
    { provider: "abyssinia", label: "Bank of Abyssinia", accountName: "", accountNumber: "", isActive: true },
    { provider: "cbebirr", label: "CBE Birr", accountName: "", accountNumber: "", isActive: true },
    { provider: "dashen", label: "Dashen Bank", accountName: "", accountNumber: "", isActive: true }
  ],
  instructions: "",
  supportNote: ""
});

const mergePaymentAccounts = (defaults, overrides) => {
  const map = new Map();
  const upsert = (acc) => {
    if (!acc) return;
    const providerStr = String(acc.provider || "").trim().toLowerCase();
    const key = providerStr || slugify(acc.label);
    if (!key) return;
    const existing = map.get(key) || {};
    map.set(key, { ...existing, ...acc });
  };
  
  (defaults?.manual || []).forEach(upsert);
  (overrides?.manual || []).forEach(upsert);

  return {
    manual: Array.from(map.values()),
    instructions: overrides?.instructions !== undefined
      ? overrides.instructions
      : defaults?.instructions || "",
    supportNote: overrides?.supportNote !== undefined
      ? overrides.supportNote
      : defaults?.supportNote || ""
  };
};

const DEFAULT_SETTINGS = {
  identity: {
    appName: "",
    appNameLocalized: "",
    shortName: "",
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
    botUserName:
      normalizeHandle(CONFIG.botUsername) || "",
    supportUserName:
      normalizeHandle(CONFIG.supportUsername) || "",
    supportChannelUrl: CONFIG.miniAppUrl || "",
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
  botPayments: {
    deposit: {
      flows: {
        manual: true,
        automatic: true,
        online: false,
      },
      methods: {
        // Offline/manual/automatic deposit channels
        cbe: true,
        telebirr: true,
        abyssinia: true,
        cbebirr: true,
        dashen: true,

        // Online deposit methods
        telebirr_online: true,
        cbe_online: true,
        mpesa_online: false,
      },
    },
    withdraw: {
      flows: {
        manual: true,
        automatic: false,
      },
      channels: {
        cbe: true,
        telebirr: true,
        abyssinia: true,
        cbebirr: true,
        dashen: true,
      },
    },
  },
  robotEnabledGlobal: true,
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

  const paymentAccounts = mergePaymentAccounts(
    getBasePaymentAccounts(),
    normalizePaymentAccounts(toPlain(doc.paymentAccounts))
  );
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
  const botPayments = mergeSection(DEFAULT_SETTINGS.botPayments, doc.botPayments);
  const robotEnabledGlobal =
    typeof doc.robotEnabledGlobal === "boolean"
      ? doc.robotEnabledGlobal
      : DEFAULT_SETTINGS.robotEnabledGlobal;

  return {
    identity,
    branding,
    bot,
    paymentAccounts,
    walletRules,
    depositBonus,
    promoBanner,
    botPayments,
    leaderboard,
    robotEnabledGlobal,
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
