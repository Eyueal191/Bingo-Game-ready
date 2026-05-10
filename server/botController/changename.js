const { t, getLang } = require("./localization");
const {
  updateUserFullNameByTelegramId,
} = require("./utils/botUserService");
const { waitForChatMessage } = require("./utils/waitForChatMessage");
const logger = require("../utils/winstonLogger");

async function handleChangeName(bot, chatId) {
  const lang = await getLang(chatId);
  logger.info("Change name requested", { userId: chatId });

  try {
    bot.sendMessage(chatId, t("enter_new_full_name", lang));

    let msg;
    try {
      msg = await waitForChatMessage(bot, chatId, {
        timeoutMs: 60_000,
        filter: (m) => typeof m.text === "string" && m.text.trim().length > 0,
      });
    } catch (err) {
      if (err && err.code === "BOT_WAIT_TIMEOUT") {
        bot.sendMessage(chatId, t("failed_to_process_name_change", lang));
        return;
      }
      throw err;
    }

    const fullName = msg.text.trim();
    if (!fullName || fullName.length < 2 || fullName.length > 20) {
      bot.sendMessage(chatId, t("enter_valid_full_name", lang));
      return handleChangeName(bot, chatId);
    }

    const result = await updateUserFullNameByTelegramId(chatId, fullName);
    if (!result.ok) {
      bot.sendMessage(
        chatId,
        t("failed_to_update_name", lang, {
          error: result.message || t("unknown_error", lang),
        })
      );
      return;
    }

    bot.sendMessage(chatId, t("name_updated_success", lang, { fullName }));
  } catch (error) {
    logger.error("Error initiating name change", {
      userId: chatId,
      error: error?.message || String(error),
    });
    bot.sendMessage(chatId, t("failed_to_process_name_change", lang));
  }
}

module.exports = { handleChangeName };
