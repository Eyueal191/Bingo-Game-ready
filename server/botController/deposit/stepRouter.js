const { t, getLang } = require("../localization");
const { getAppSettings } = require("../../services/appSettingsService");
const { getUserJwtToken } = require("../utils/getUserJwtToken");
const {
  getOfflineDepositChannelKeyboard,
  getOnlineDepositMethodKeyboard,
} = require("./methodRegistry");
const { handleReceiptUpload } = require("./manualDeposit");
const { handleAutomaticDepositSubmit } = require("./automaticDeposit");

async function handleDepositText(bot, chatId, text, depositState) {
  const state = depositState[chatId];
  if (!state || typeof text !== "string") return false;

  const lang = await getLang(chatId);

  if (state.step === "enter_transaction_id") {
    state.transactionInput = text.trim();
    await handleAutomaticDepositSubmit(bot, chatId, depositState);
    return true;
  }

  if (state.step !== "enter_amount") return false;

  const { walletRules } = await getAppSettings();
  const minManualDeposit = Number(walletRules?.minDepositAmount) || 50;
  const minAutomaticDeposit =
    Number(walletRules?.minAutomaticDepositAmount ?? walletRules?.minDepositAmount) ||
    minManualDeposit;
  const minOnlineDeposit = Number(walletRules?.minDepositAmount) || minManualDeposit;

  const amount = parseFloat(text);
  if (Number.isNaN(amount)) {
    await bot.sendMessage(chatId, t("invalid_amount", lang));
    return true;
  }

  if (state.paymentFlow === "manual") {
    if (amount < minManualDeposit) {
      await bot.sendMessage(chatId, t("min_deposit_manual", lang, { minDeposit: minManualDeposit }));
      return true;
    }

    state.amount = amount;
    state.step = "select_channel";

    const instruction =
      t("payment_channels_instruction", lang) +
      "\n\n" +
      t("cbe_to_agent_cbe", lang) +
      "\n" +
      t("telebirr_to_agent_telebirr", lang) +
      "\n" +
      t("abyssinia_to_agent_abyssinia", lang) +
      "\n" +
      t("cbebirr_to_agent_cbebirr", lang) +
      "\n" +
      t("dashen_to_agent_dashen", lang);

    await bot.sendMessage(chatId, instruction, {
      reply_markup: { inline_keyboard: await getOfflineDepositChannelKeyboard(lang) },
    });
    return true;
  }

  if (state.paymentFlow === "automatic") {
    if (amount < minAutomaticDeposit) {
      await bot.sendMessage(chatId, t("min_deposit_manual", lang, { minDeposit: minAutomaticDeposit }));
      return true;
    }

    state.amount = amount;
    state.step = "select_channel";

    const instruction =
      t("payment_channels_instruction", lang) +
      "\n\n" +
      t("cbe_to_agent_cbe", lang) +
      "\n" +
      t("telebirr_to_agent_telebirr", lang) +
      "\n" +
      t("abyssinia_to_agent_abyssinia", lang) +
      "\n" +
      t("cbebirr_to_agent_cbebirr", lang) +
      "\n" +
      t("dashen_to_agent_dashen", lang);

    await bot.sendMessage(chatId, instruction, {
      reply_markup: { inline_keyboard: await getOfflineDepositChannelKeyboard(lang) },
    });
    return true;
  }

  if (state.paymentFlow === "online") {
    if (amount < minOnlineDeposit) {
      await bot.sendMessage(chatId, t("min_deposit_online", lang, { minDeposit: minOnlineDeposit }));
      return true;
    }

    state.amount = amount;
    state.step = "select_online_method";

    const instruction = t("online_payment_methods", lang);
    await bot.sendMessage(chatId, instruction, {
      reply_markup: { inline_keyboard: await getOnlineDepositMethodKeyboard(lang) },
    });
    return true;
  }

  return false;
}

async function handleDepositPhoto(bot, chatId, photos, depositState) {
  const state = depositState[chatId];
  if (!state || state.step !== "upload_receipt") return false;

  const lang = await getLang(chatId);

  const jwtToken = await getUserJwtToken(chatId);
  if (!jwtToken) {
    await bot.sendMessage(chatId, t("auth_failed", lang));
    return true;
  }

  state.jwtToken = jwtToken;
  await handleReceiptUpload(bot, chatId, photos, depositState);
  return true;
}

module.exports = {
  handleDepositText,
  handleDepositPhoto,
};
