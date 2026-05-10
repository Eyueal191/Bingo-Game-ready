const { handlePlay } = require("../play");
const { handlePasswordInput } = require("../register");
const { handleDepositText } = require("../deposit/stepRouter");
const { handleWithdrawText } = require("../withdraw/stepRouter");
const { handleTransferText } = require("../transfer/stepRouter");
const { handleTextButton } = require("../botHandlers");
const { t, getLang } = require("../localization");
const { userStates } = require("../state/userState");
const CONFIG = require("../../config/config");
const logger = require("../../utils/winstonLogger");

const { getActionByButtonText } = require("../utils/menuManager");
const { getUserJwtToken } = require("../utils/getUserJwtToken");
const { handleCommandRoute } = require("./commandRouter");

async function handleMessageRoute(bot, msg, { chatId, logMeta, depositState }) {
  const text = msg.text;
  const lang = await getLang(chatId);

  if (CONFIG.isDevelopment) {
    logger.debug("[bot] message received", {
      ...logMeta,
      hasText: typeof text === "string",
      hasWebAppData: Boolean(msg.web_app_data),
      messageType:
        msg.photo
          ? "photo"
          : msg.contact
            ? "contact"
            : text
              ? "text"
              : "other",
    });
  }

  if (msg.web_app_data) {
    const data = msg.web_app_data.data;
    if (CONFIG.isDevelopment) logger.debug("[bot] web_app_data", { ...logMeta, data });

    if (data === "/play") {
      if (CONFIG.isDevelopment) {
        logger.debug("[bot] processing /play from web_app_data", { ...logMeta });
      }
      return handlePlay(bot, chatId);
    }
  }

  if (text && !text.startsWith("/")) {
    if (userStates[chatId]?.step === "enter_password") {
      return handlePasswordInput(bot, chatId, text, userStates);
    }

    if (await handleWithdrawText(bot, chatId, text, depositState, { lang, t })) {
      return;
    }

    if (await handleDepositText(bot, chatId, text, depositState)) {
      return;
    }

    if (await handleTransferText(bot, chatId, text, depositState, { lang, t })) {
      return;
    }

    // Support for 'reply_keyboard' text buttons
    const jwtToken = await getUserJwtToken(chatId);
    const isRegistered = !!jwtToken;
    const action = getActionByButtonText(text, lang, isRegistered);

    if (action && action.command) {
      // Re-route to command handler as if they typed /command
      const fakeMsg = { ...msg, text: action.command };
      return handleCommandRoute(bot, fakeMsg, { chatId, lang, logMeta, depositState });
    }

    if (CONFIG.isDevelopment) {
      logger.debug("[bot] treating as text button", { ...logMeta, text });
    }
    return handleTextButton(bot, chatId, text, handlePlay, depositState);
  } else if (!text) {
    if (CONFIG.isDevelopment) {
      logger.debug("[bot] non-text message received", {
        ...logMeta,
        keys: Object.keys(msg || {}).slice(0, 20),
      });
    }
  }
}

module.exports = { handleMessageRoute };
