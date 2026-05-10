const TelegramBot = require("node-telegram-bot-api");
const CONFIG = require("../config/config");
const { userStates, userStatesStore } = require("./state/userState");
const { t, getLang } = require("./localization");
const { handleCallbackQuery } = require("./routing/callbackRouter");
const { withChatLock } = require("./utils/withChatLock");
const logger = require("../utils/winstonLogger");
const { createTraceId, metaFromMessage, metaFromCallbackQuery } = require("./utils/logContext");
const { createInMemoryChatStateStore } = require("./state/chatStateStore");
const { handleCommandRoute, commandRegex } = require("./routing/commandRouter");
const { handleMessageRoute } = require("./routing/messageRouter");
const { handlePhotoRoute } = require("./routing/photoRouter");
const { handleContactRoute } = require("./routing/contactRouter");

// Validate environment variables before instantiating the bot client.
if (!CONFIG.telegramBotToken || !CONFIG.backendUrl) {
  logger.error("telegramBotToken or backendUrl is not configured");
  process.exit(1);
}

const bot = new TelegramBot(CONFIG.telegramBotToken, { polling: false });

let stateGcInterval = null;

// Shared per-chat state for bot flows (deposit/withdraw/etc.)
const depositStateStore = createInMemoryChatStateStore({ name: "depositState" });
const depositState = depositStateStore.state;

function touchStateStore(store, chatId) {
  const entry = store?.[chatId];
  if (entry && typeof entry === "object") {
    entry._lastActiveAt = Date.now();
  }
}

// Attach depositState to bot instance for access in other modules
bot.depositState = depositState;

let pollingStarted = false;

async function startBot() {
  // In-memory bot state TTL cleanup (safety net).
  const STATE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
  const STATE_GC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  if (!stateGcInterval) {
    stateGcInterval = setInterval(() => {
      depositStateStore.ttlMs = STATE_TTL_MS;
      userStatesStore.ttlMs = STATE_TTL_MS;
      const deletedDeposit = depositStateStore.cleanup();
      const deletedUser = userStatesStore.cleanup();
      if (CONFIG.isDevelopment && (deletedDeposit || deletedUser)) {
        logger.debug("[bot] state GC", { deletedDeposit, deletedUser });
      }
    }, STATE_GC_INTERVAL_MS);
    stateGcInterval.unref?.();
  }

  // Event handlers
  bot.onText(commandRegex, async (msg) => {
    const chatId = msg.chat.id;
    return withChatLock(chatId, async () => {
      const startedAt = Date.now();
      const traceId = createTraceId();
      const logMeta = metaFromMessage(msg, { traceId });
      try {
        touchStateStore(userStates, chatId);
        const lang = await getLang(chatId);
        await handleCommandRoute(bot, msg, { chatId, lang, logMeta, depositState });
      } finally {
        logger.debug("[bot] command update handled", {
          ...logMeta,
          durationMs: Date.now() - startedAt,
        });
      }
    });
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    // Skip if it's a command (already handled by onText)
    if (msg.text && commandRegex.test(msg.text)) return;

    return withChatLock(chatId, async () => {
      const startedAt = Date.now();
      const traceId = createTraceId();
      const logMeta = metaFromMessage(msg, { traceId });
      try {
        touchStateStore(depositState, chatId);
        touchStateStore(userStates, chatId);
        await handleMessageRoute(bot, msg, { chatId, logMeta, depositState });
      } finally {
        logger.debug("[bot] message update handled", {
          ...logMeta,
          durationMs: Date.now() - startedAt,
        });
      }
    });
  });

  bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;
    return withChatLock(chatId, async () => {
      const startedAt = Date.now();
      const traceId = createTraceId();
      const logMeta = metaFromMessage(msg, { traceId });
      try {
        touchStateStore(depositState, chatId);
        await handlePhotoRoute(bot, msg, { chatId, logMeta, depositState });
      } finally {
        logger.debug("[bot] photo update handled", {
          ...logMeta,
          durationMs: Date.now() - startedAt,
        });
      }
    });
  });

  bot.on("contact", async (msg) => {
    const chatId = msg.chat.id;
    return withChatLock(chatId, async () => {
      const startedAt = Date.now();
      const traceId = createTraceId();
      const logMeta = metaFromMessage(msg, { traceId });
      try {
        await handleContactRoute(bot, msg, { logMeta });
      } finally {
        logger.debug("[bot] contact update handled", {
          ...logMeta,
          durationMs: Date.now() - startedAt,
        });
      }
    });
  });

  bot.on("callback_query", async (query) => {
    const traceId = createTraceId();
    const action = String(query?.data || "");
    const chatId = query?.message?.chat?.id;
    const logMeta = metaFromCallbackQuery(query, { traceId });

    try {
      await bot.answerCallbackQuery(query.id);
    } catch (err) {
      // ignore
    }

    if (!chatId) {
      logger.warn("[bot] callback_query without message chat", { ...logMeta, action });
      return;
    }

    const lang = await getLang(chatId);

    return withChatLock(chatId, async () => {
      const startedAt = Date.now();
      touchStateStore(depositState, chatId);
      touchStateStore(userStates, chatId);

      try {
        const handled = await handleCallbackQuery(bot, query, {
          chatId,
          lang,
          depositState,
          userStates,
        });
        if (!handled) {
          return bot.sendMessage(chatId, t("unknown_action", lang));
        }
      } catch (error) {
        logger.error("[bot] callback handler failed", {
          ...logMeta,
          action,
          error: error?.message || String(error),
        });
        return bot.sendMessage(chatId, t("unknown_error", lang));
      } finally {
        logger.debug("[bot] callback_query update handled", {
          ...logMeta,
          durationMs: Date.now() - startedAt,
        });
      }
    });
  });

  bot.on("polling_error", (error) => {
    logger.error("Polling error", { component: "telegram-bot", error: error?.message || String(error) });
  });

  if (!pollingStarted) {
    await bot.startPolling();
    pollingStarted = true;
  }

  logger.info("Bot started", { component: "telegram-bot", transport: "polling" });
}

async function stopBot() {
  if (stateGcInterval) {
    clearInterval(stateGcInterval);
    stateGcInterval = null;
  }

  try {
    if (pollingStarted) {
      await bot.stopPolling();
      pollingStarted = false;
    }
  } catch (error) {
    logger.warn("Failed to stop bot polling", {
      component: "telegram-bot",
      error: error?.message || String(error),
    });
  }
}

module.exports = { startBot, stopBot, bot };
