const { t, getLang } = require("./localization");
const CONFIG = require("../config/config");
const { sanitizeForMarkdownInline } = require("./utils/sanitizeTelegram");
const logger = require("../utils/winstonLogger");

async function handleSupport(bot, chatId) {
  const lang = await getLang(chatId);
  logger.info("Support requested", { chatId });
  bot.sendMessage(
    chatId,
    t("support_message", lang, {
      support_username: sanitizeForMarkdownInline(CONFIG.supportUsername || ""),
    }),
    { parse_mode: "Markdown" }
  );
}

module.exports = { handleSupport };
