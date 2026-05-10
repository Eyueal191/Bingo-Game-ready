const { handleDepositPhoto } = require("../deposit/stepRouter");
const { t, getLang } = require("../localization");
const CONFIG = require("../../config/config");
const logger = require("../../utils/winstonLogger");

async function handlePhotoRoute(bot, msg, { chatId, logMeta, depositState }) {
  if (CONFIG.isDevelopment) {
    logger.debug("[bot] photo received", {
      ...logMeta,
      hasActiveState: Boolean(depositState[chatId]),
      activeStep: depositState[chatId]?.step,
    });
  }

  const handled = await handleDepositPhoto(
    bot,
    chatId,
    msg.photo,
    depositState
  );
  if (!handled) {
    const lang = await getLang(chatId);
    if (CONFIG.isDevelopment) {
      logger.debug("[bot] photo received but no active upload state", {
        ...logMeta,
      });
    }
    await bot.sendMessage(chatId, t("no_active_deposit", lang));
  }
}

module.exports = { handlePhotoRoute };
