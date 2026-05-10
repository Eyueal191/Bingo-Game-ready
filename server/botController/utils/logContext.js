const crypto = require("crypto");

function safeString(value) {
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}

function createTraceId() {
  // Node 14+ supports randomUUID in recent versions; keep a safe fallback.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

function baseMeta({ traceId } = {}) {
  return {
    component: "telegram-bot",
    traceId: traceId || createTraceId(),
  };
}

function metaFromMessage(msg, { traceId } = {}) {
  const chatId = msg?.chat?.id;
  return {
    ...baseMeta({ traceId }),
    chatId,
    updateId: msg?.update_id,
    messageId: msg?.message_id,
    fromId: msg?.from?.id,
  };
}

function metaFromCallbackQuery(query, { traceId } = {}) {
  const chatId = query?.message?.chat?.id;
  const action = safeString(query?.data);
  return {
    ...baseMeta({ traceId }),
    chatId,
    updateId: query?.update_id,
    callbackQueryId: query?.id,
    messageId: query?.message?.message_id,
    action: action ? action.slice(0, 128) : "",
    fromId: query?.from?.id,
  };
}

module.exports = {
  createTraceId,
  metaFromMessage,
  metaFromCallbackQuery,
};
