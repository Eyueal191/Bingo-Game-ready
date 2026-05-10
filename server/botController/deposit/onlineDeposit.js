const { t, getLang } = require("../localization");
const { getAppSettings } = require("../../services/appSettingsService");
const CONFIG = require("../../config/config");
const { backendApiClient, withAuth } = require("../utils/backendApiClient");
const logger = require("../../utils/winstonLogger");

async function handleOnlineDeposit(bot, chatId, state) {
  const lang = await getLang(chatId);
  state[chatId] = { step: "enter_amount", paymentFlow: "online" };
  const { walletRules } = await getAppSettings();
  const minDeposit = Number(walletRules?.minDepositAmount) || 50;
  bot.sendMessage(
    chatId,
    t("enter_deposit_amount_online", lang, { minDeposit })
  );
}

async function handleOnlineDepositSubmit(bot, chatId, state) {
  const lang = await getLang(chatId);
  const { amount, paymentMethod, jwtToken } = state[chatId] || {};
  const waitingMsg = await bot.sendMessage(chatId, t("processing_deposit", lang));

  try {
    if (!amount || !paymentMethod) {
      await bot.editMessageText(t("missing_deposit_details", lang), {
        chat_id: chatId,
        message_id: waitingMsg.message_id,
      });
      return;
    }
    if (!jwtToken) {
      await bot.editMessageText(t("authentication_failed", lang), {
        chat_id: chatId,
        message_id: waitingMsg.message_id,
      });
      return;
    }

    const response = await backendApiClient.post(
      "/api/v1/addis-pay/deposit",
      { amount, paymentMethod },
      withAuth(jwtToken)
    );

    if (response.data.success) {
      await bot.editMessageText(t("deposit_initiated_success", lang), {
        chat_id: chatId,
        message_id: waitingMsg.message_id,
      });
    } else {
      throw new Error(response.data.error || t("failed_to_process_deposit", lang));
    }

    delete state[chatId];
  } catch (error) {
    logger.error("Error processing online deposit", {
      chatId,
      error: error?.response?.data || error?.message,
    });

    const errorMessage =
      [
        error?.response?.data?.error,
        error?.response?.data?.message,
        error?.message,
      ]
        .filter(Boolean)
        .join(" , ") || t("online_deposit_failed", lang, { error: error.message });

    await bot.editMessageText(errorMessage, {
      chat_id: chatId,
      message_id: waitingMsg.message_id,
    });
  }
}

module.exports = {
  handleOnlineDeposit,
  handleOnlineDepositSubmit,
};
