const {
  handleCBEDepositSubmit,
  handleTelebirrDepositSubmit,
  handleAbyssiniaDepositSubmit,
  handleCBEBirrDepositSubmit,
  handleDashenDepositSubmit,
} = require("../automaticDeposit");

const { t, getLang } = require("../localization");
const { getAppSettings } = require("../../services/appSettingsService");
const logger = require("../../utils/winstonLogger");
const { getOfflineDepositChannelKeyboard } = require("./methodRegistry");

async function handleAutomaticDeposit(bot, chatId, state) {
  const lang = await getLang(chatId);

  // Skip "enter_amount" and go straight to "select_channel"
  state[chatId] = { step: "select_channel", paymentFlow: "automatic" };

  const inline_keyboard = await getOfflineDepositChannelKeyboard(lang);

  const settings = await getAppSettings();
  const methods = settings?.botPayments?.deposit?.methods || {};
  let instruction = t("payment_channels_instruction", lang) + "\n\n";

  if (methods.cbe !== false) instruction += t("cbe_to_agent_cbe", lang) + "\n";
  if (methods.telebirr !== false) instruction += t("telebirr_to_agent_telebirr", lang) + "\n";
  if (methods.abyssinia !== false) instruction += t("abyssinia_to_agent_abyssinia", lang) + "\n";
  if (methods.cbebirr !== false) instruction += t("cbebirr_to_agent_cbebirr", lang) + "\n";
  if (methods.dashen !== false) instruction += t("dashen_to_agent_dashen", lang) + "\n";

  bot.sendMessage(chatId, instruction, {
    reply_markup: { inline_keyboard },
  });
}

async function handleAutomaticDepositSubmit(bot, chatId, state) {
  console.log(state);

  try {
    const { paymentMethod } = state[chatId] || {};
    if (!paymentMethod) {
      return bot.sendMessage(
        chatId,
        "❌ Payment method not set for automatic deposit. Please start again."
      );
    }

    const method = String(paymentMethod).toLowerCase();
    if (method === "cbe") {
      return handleCBEDepositSubmit(bot, chatId, state);
    }
    if (method === "abyssinia") {
      return handleAbyssiniaDepositSubmit(bot, chatId, state);
    }
    if (method === "telebirr")
      return handleTelebirrDepositSubmit(bot, chatId, state);
    if (method === "cbebirr") {
      return handleCBEBirrDepositSubmit(bot, chatId, state);
    }
    if (method === "dashen") {
      return handleDashenDepositSubmit(bot, chatId, state);
    }
    return bot.sendMessage(
      chatId,
      "❌ Unsupported payment method for automatic verification."
    );
  } catch (err) {
    logger.error("Error routing automatic deposit", { error: err?.message || String(err), chatId });
    return bot.sendMessage(
      chatId,
      `❌ Automatic deposit failed: ${err.message}`
    );
  }
}

module.exports = {
  handleAutomaticDeposit,
  handleAutomaticDepositSubmit,
};
