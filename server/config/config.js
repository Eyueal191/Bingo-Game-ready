require("dotenv").config();
const { z } = require("zod");

// Define z schema for environment variables
const envSchema = z
  .object({
    PORT: z.string().default("5000"),
    MONGOURL: z.string(),
    JWT_SECRET: z.string(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    FRONTEND_URL: z.string(),
    BACKEND_URL: z.string(),
    TELEGRAM_BOT_TOKEN: z.string(),
    NOTIFICATION_TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_ADMIN_CHAT_IDS: z.string().optional(),
    // Callback URLs
    SUCCESS_URL: z.string(),
    REDIRECT_URL: z.string(),
    ERROR_URL: z.string(),
    CANCEL_URL: z.string(),
    // Withdrawal URLs
    WITHDRAWAL_SUCCESS_URL: z.string(),
    WITHDRAWAL_ERROR_URL: z.string(),
    WITHDRAWAL_NOTIFY_URL: z.string().optional(),
    // Addispay configuration
    ADDISPAY_API_KEY: z.string(),
    ADDISPAY_BASE_URL: z.string().default("https://api.addispay.et/checkout-api/v1"),
    SESSION_EXPIRED: z.string().default("50000"),
    ASSET_BASE_URL: z.string().optional(),


    // Automatic verification keys
    CBEBIRR_API_KEY: z.string().optional(),
    CBEBIRR_INSECURE_SSL: z.enum(["true", "false"]).optional().default("false"),

    // TeleBirr
    TELEBIRR_VERIFY_URL: z.string().optional().default("https://verify-telebirr.abyssiniasoftwaretechnology.com.et/receipt"),
    // Telegram + bot metadata
    TELEGRAM_RATE_PER_SEC: z.string().optional(),
    SUPPORT_GROUP_CHAT_ID: z.string().optional(),
    MINI_APP_URL: z.string().optional(),
    SUPPORT_USERNAME: z.string().optional(),
    BOT_USERNAME: z.string().optional(),


    // Runtime toggles
    BOT_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .default("true"),
    BOT_RUN_IN_API: z.enum(["true", "false"]).optional(),

    // Bot singleton polling lease (MongoDB)
    BOT_POLLING_LEASE_ENABLED: z
      .enum(["true", "false"])
      .optional(),
    BOT_POLLING_LEASE_TTL_MS: z.string().optional().default("60000"),
    BOT_INSTANCE_ID: z.string().optional(),
    BOT_MENU_TYPE: z.enum(["inline", "reply", "none"]).optional().default("inline"),
  })
  .superRefine((env, ctx) => {
    // Avoid silent fallbacks: if admin notifications are enabled, require both token + recipients.
    const hasNotifyToken = Boolean(env.NOTIFICATION_TELEGRAM_BOT_TOKEN);
    const hasAdminIds = Boolean(env.TELEGRAM_ADMIN_CHAT_IDS);

    if (hasNotifyToken && !hasAdminIds) {
      ctx.addIssue({
        code: "custom",
        path: ["TELEGRAM_ADMIN_CHAT_IDS"],
        message:
          "TELEGRAM_ADMIN_CHAT_IDS is required when NOTIFICATION_TELEGRAM_BOT_TOKEN is set",
      });
    }
    if (hasAdminIds && !hasNotifyToken) {
      ctx.addIssue({
        code: "custom",
        path: ["NOTIFICATION_TELEGRAM_BOT_TOKEN"],
        message:
          "NOTIFICATION_TELEGRAM_BOT_TOKEN is required when TELEGRAM_ADMIN_CHAT_IDS is set",
      });
    }
  });

// Validate the environment variables
const envVars = envSchema.safeParse(process.env);
if (!envVars.success) {
  const logger = require("../utils/winstonLogger");
  logger.error("Invalid environment variables", { issues: envVars.error.format() });
  process.exit(1);
}

// Export the validated configuration
const CONFIG = {
  port: parseInt(envVars.data.PORT, 10),
  mongoUri: envVars.data.MONGOURL,
  jwtSecret: envVars.data.JWT_SECRET,
  isDevelopment: envVars.data.NODE_ENV === "development",
  frontendUrl: envVars.data.FRONTEND_URL,
  backendUrl: envVars.data.BACKEND_URL,
  telegramBotToken: envVars.data.TELEGRAM_BOT_TOKEN,
  telegramNotificationBotToken: envVars.data.NOTIFICATION_TELEGRAM_BOT_TOKEN,
  telegramAdminChatIds: envVars.data.TELEGRAM_ADMIN_CHAT_IDS
    ? envVars.data.TELEGRAM_ADMIN_CHAT_IDS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    : [],
  withdrawalNotifyUrl: envVars.data.WITHDRAWAL_NOTIFY_URL,
  telegramRatePerSec: envVars.data.TELEGRAM_RATE_PER_SEC
    ? Number(envVars.data.TELEGRAM_RATE_PER_SEC)
    : undefined,
  supportGroupChatId: envVars.data.SUPPORT_GROUP_CHAT_ID,
  miniAppUrl: envVars.data.MINI_APP_URL,
  supportUsername: envVars.data.SUPPORT_USERNAME,
  botUsername: envVars.data.BOT_USERNAME,

  botEnabled: envVars.data.BOT_ENABLED === "true",
  botRunInApi:
    typeof envVars.data.BOT_RUN_IN_API === "string"
      ? envVars.data.BOT_RUN_IN_API === "true"
      : envVars.data.NODE_ENV === "development",
  botPollingLeaseEnabled:
    typeof envVars.data.BOT_POLLING_LEASE_ENABLED === "string"
      ? envVars.data.BOT_POLLING_LEASE_ENABLED === "true"
      : envVars.data.NODE_ENV === "production",
  botPollingLeaseTtlMs: Number(envVars.data.BOT_POLLING_LEASE_TTL_MS),
  botInstanceId: envVars.data.BOT_INSTANCE_ID,

  //callback urls
  redirectUrl: envVars.data.REDIRECT_URL,
  successUrl: envVars.data.SUCCESS_URL,
  errorUrl: envVars.data.ERROR_URL,
  cancelUrl: envVars.data.CANCEL_URL,
  //withdrawal urls
  withdrawalSuccessUrl: envVars.data.WITHDRAWAL_SUCCESS_URL,
  withdrawalErrorUrl: envVars.data.WITHDRAWAL_ERROR_URL,

  //addispay configuration
  addisPayBaseUrl: envVars.data.ADDISPAY_BASE_URL,
  addispayApiKey: envVars.data.ADDISPAY_API_KEY,
  sessionExpired: envVars.data.SESSION_EXPIRED,
  cbebirrApiKey: envVars.data.CBEBIRR_API_KEY,
  cbebirrInsecureSsl: envVars.data.CBEBIRR_INSECURE_SSL === "true",
  telebirrVerifyUrl: envVars.data.TELEBIRR_VERIFY_URL,
  assetBaseUrl: envVars.data.ASSET_BASE_URL,
  botMenuType: envVars.data.BOT_MENU_TYPE,
};

module.exports = CONFIG;
