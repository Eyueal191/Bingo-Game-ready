const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const CONFIG = require("../config/config");
const logger = require("../utils/winstonLogger");

const telegramHttp = axios.create({
  timeout: 10_000,
  validateStatus: (status) => status >= 200 && status < 500,
});

const TELEGRAM_BOT_TOKEN = CONFIG.telegramNotificationBotToken;
const TELEGRAM_CHAT_IDS =
  Array.isArray(CONFIG.telegramAdminChatIds) && CONFIG.telegramAdminChatIds.length
    ? CONFIG.telegramAdminChatIds
    : [];
exports.sendTelegramPhoto = async (
  photoPath,
  caption,
  replyMarkup,
  lang = "en"
) => {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.error(
      "NOTIFICATION_TELEGRAM_BOT_TOKEN is not configured; skipping admin photo notification."
    );
    return;
  }
  if (!TELEGRAM_CHAT_IDS.length) {
    logger.error(
      "TELEGRAM_ADMIN_CHAT_IDS is not configured; skipping admin photo notification."
    );
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;

    for (const chatId of TELEGRAM_CHAT_IDS) {
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("photo", fs.createReadStream(photoPath));
      formData.append("caption", caption);
      formData.append("parse_mode", "HTML");
      if (replyMarkup) {
        formData.append("reply_markup", JSON.stringify(replyMarkup));
      }

      if (CONFIG.isDevelopment) {
        logger.debug("[notify] sending photo", { chatId });
      }

      try {
        const response = await telegramHttp.post(url, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        });
        if (response?.data?.ok !== true) {
          const errorCode = response?.data?.error_code;
          if (errorCode === 401 || errorCode === 403) {
            if (CONFIG.isDevelopment) {
              logger.debug("[notify] chat unauthorized/forbidden; skipping", {
                chatId,
                errorCode,
                description: response?.data?.description,
              });
            }
            continue;
          }
          logger.error("[notify] telegram sendPhoto not ok", {
            chatId,
            status: response.status,
            data: response.data,
          });
          continue;
        }
        if (CONFIG.isDevelopment) {
          logger.debug("[notify] telegram sendPhoto ok", { chatId });
        }
      } catch (err) {
        logger.error(`Error sending photo to chat ${chatId}`, {
          error: err?.response?.data || err?.message,
        });
      }
    }

    if (CONFIG.isDevelopment) {
      logger.debug("[notify] payment screenshot sent");
    }
  } catch (error) {
    logger.error("Error sending photo to Telegram", {
      error: error?.response?.data || error?.message,
    });
  }
};

exports.sendTelegramMessage = async (message, lang = "en") => {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.error(
      "NOTIFICATION_TELEGRAM_BOT_TOKEN is not configured; skipping admin message notification."
    );
    return;
  }
  if (!TELEGRAM_CHAT_IDS.length) {
    logger.error(
      "TELEGRAM_ADMIN_CHAT_IDS is not configured; skipping admin message notification."
    );
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    for (const chatId of TELEGRAM_CHAT_IDS) {
      const response = await telegramHttp.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      });

      if (response?.data?.ok !== true) {
        const errorCode = response?.data?.error_code;
        if (errorCode === 401 || errorCode === 403) {
          if (CONFIG.isDevelopment) {
            logger.debug("[notify] chat unauthorized/forbidden; skipping", {
              chatId,
              errorCode,
              description: response?.data?.description,
            });
          }
          continue;
        }
        logger.error("[notify] telegram sendMessage not ok", {
          chatId,
          status: response.status,
          data: response.data,
        });
        continue;
      }

      if (CONFIG.isDevelopment) {
        logger.debug("[notify] telegram sendMessage ok", { chatId });
      }
    }

    if (CONFIG.isDevelopment) {
      logger.debug("[notify] message sent to all admin chat IDs");
    }
  } catch (error) {
    logger.error("Error sending message to Telegram", {
      error: error?.response?.data || error?.message,
    });
  }
};

exports.NotifyUserTelegram = async (telegramId, message, lang = "en") => {
  try {
    // 🛡️ Web users mock ID guard
    if (typeof telegramId === "string" && telegramId.startsWith("web_")) {
      if (CONFIG.isDevelopment) {
        logger.debug("[notify] skipped telegram notification for web user", { telegramId });
      }
      return;
    }

    const token = CONFIG.telegramBotToken;
    if (!token) {
      throw new Error("telegramBotToken is not configured");
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const response = await telegramHttp.post(url, {
      chat_id: telegramId,
      text: message,
      parse_mode: "HTML",
    });

    if (response?.data?.ok !== true) {
      logger.error("[notify] telegram NotifyUser not ok", {
        telegramId,
        status: response.status,
        data: response.data,
      });
      return;
    }

    if (CONFIG.isDevelopment) {
      logger.debug("[notify] user telegram message sent", { telegramId });
    }
  } catch (error) {
    logger.error("Error sending user message to Telegram", {
      telegramId,
      error: error?.response?.data || error?.message,
    });
  }
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callTelegramApiJson(token, method, payload, attempt = 1) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const response = await telegramHttp.post(url, payload);
  if (response?.data?.ok === true) return { ok: true, result: response.data.result };

  const errorCode = response?.data?.error_code;
  const retryAfter = response?.data?.parameters?.retry_after;
  if (errorCode === 429 && retryAfter && attempt <= 5) {
    const delayMs = (Number(retryAfter) || 1) * 1000 + 100;
    await sleep(delayMs);
    return callTelegramApiJson(token, method, payload, attempt + 1);
  }

  if (errorCode === 401 || errorCode === 403 || errorCode === 400) {
    // blocked / user didn't start / bad chat id etc.
    return { ok: false, skip: true, error: response.data };
  }
  return { ok: false, error: response.data, status: response.status };
}

async function callTelegramApiForm(token, method, formData, attempt = 1) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const response = await telegramHttp.post(url, formData, {
    headers: { ...formData.getHeaders() },
  });
  if (response?.data?.ok === true) return { ok: true, result: response.data.result };

  const errorCode = response?.data?.error_code;
  const retryAfter = response?.data?.parameters?.retry_after;
  if (errorCode === 429 && retryAfter && attempt <= 5) {
    const delayMs = (Number(retryAfter) || 1) * 1000 + 100;
    await sleep(delayMs);
    return callTelegramApiForm(token, method, formData, attempt + 1);
  }

  if (errorCode === 401 || errorCode === 403 || errorCode === 400) {
    return { ok: false, skip: true, error: response.data };
  }
  return { ok: false, error: response.data, status: response.status };
}

exports.sendBotMessageToChat = async (chatId, text, { replyMarkup, parseMode = "HTML" } = {}) => {
  if (typeof chatId === "string" && chatId.startsWith("web_")) return { ok: false, skip: true };
  const token = CONFIG.telegramBotToken;
  if (!token) {
    logger.error("TELEGRAM_BOT_TOKEN is not configured; cannot send user message");
    return { ok: false };
  }
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return callTelegramApiJson(token, "sendMessage", payload);
};

exports.sendBotPhotoToChat = async (
  chatId,
  photoBuffer,
  {
    caption,
    replyMarkup,
    filename = "image.jpg",
    contentType = "image/jpeg",
    parseMode = "HTML",
  } = {}
) => {
  if (typeof chatId === "string" && chatId.startsWith("web_")) return { ok: false, skip: true };
  const token = CONFIG.telegramBotToken;
  if (!token) {
    logger.error("TELEGRAM_BOT_TOKEN is not configured; cannot send user photo");
    return { ok: false };
  }
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("photo", photoBuffer, { filename, contentType });
  if (caption) formData.append("caption", caption);
  formData.append("parse_mode", parseMode);
  if (replyMarkup) formData.append("reply_markup", JSON.stringify(replyMarkup));
  return callTelegramApiForm(token, "sendPhoto", formData);
};

exports.sendBotDocumentToChat = async (
  chatId,
  fileBuffer,
  {
    caption,
    replyMarkup,
    filename = "file.bin",
    contentType = "application/octet-stream",
    parseMode = "HTML",
  } = {}
) => {
  if (typeof chatId === "string" && chatId.startsWith("web_")) return { ok: false, skip: true };
  const token = CONFIG.telegramBotToken;
  if (!token) {
    logger.error("TELEGRAM_BOT_TOKEN is not configured; cannot send user document");
    return { ok: false };
  }
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("document", fileBuffer, { filename, contentType });
  if (caption) formData.append("caption", caption);
  formData.append("parse_mode", parseMode);
  if (replyMarkup) formData.append("reply_markup", JSON.stringify(replyMarkup));
  return callTelegramApiForm(token, "sendDocument", formData);
};
