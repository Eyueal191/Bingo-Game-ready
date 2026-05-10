const axios = require("axios");
const { t, getLang } = require("../localization");
const { sendTelegramPhoto } = require("../notification");
const { getUserDetails } = require("../getUserDetail");
const { getAppSettings } = require("../../services/appSettingsService");
const CONFIG = require("../../config/config");
const { backendApiClient, withAuth } = require("../utils/backendApiClient");
const { escapeHtml } = require("../utils/sanitizeTelegram");
const logger = require("../../utils/winstonLogger");

async function handleManualDeposit(bot, chatId, state) {
  const lang = await getLang(chatId);
  state[chatId] = { step: "enter_amount", paymentFlow: "manual" };
  const { walletRules } = await getAppSettings();
  const minDeposit = Number(walletRules?.minDepositAmount) || 50;
  bot.sendMessage(
    chatId,
    t("enter_deposit_amount_manual", lang, { minDeposit })
  );
}

async function handleReceiptUpload(bot, chatId, photo, state) {
  const lang = await getLang(chatId);
  const waitingMsg = await bot.sendMessage(
    chatId,
    t("uploading_receipt", lang)
  );
  try {
    const { amount, paymentMethod, jwtToken } = state[chatId] || {};
    if (!amount || !paymentMethod) {
      await bot.editMessageText(t("missing_deposit_details_receipt", lang), {
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

    const fileId = photo[photo.length - 1].file_id;
    const file = await bot.getFile(fileId);
    const token = CONFIG.telegramBotToken;
    if (!token) {
      throw new Error("telegramBotToken is not configured");
    }
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    const { fullName, phone } = await getUserDetails(chatId);

    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("receipt", buffer, {
      filename: `deposit-${chatId}-${Date.now()}.jpg`,
    });
    formData.append("telegramId", chatId.toString());
    formData.append("amount", amount);
    formData.append("type", "deposit");
    formData.append("paymentMethod", paymentMethod);

    const uploadResponse = await backendApiClient.post(
      "/api/v1/manual-payment/receipt",
      formData,
      withAuth(jwtToken, {
        headers: {
          ...formData.getHeaders(),
        },
      })
    );

    const receipt = uploadResponse.data.receipt;
    const filePath = receipt.fileUrl;

    const caption = t("admin_receipt_notification", lang, {
      fullName: escapeHtml(fullName),
      phone: escapeHtml(phone),
      amount: escapeHtml(String(amount)),
      paymentMethod: escapeHtml(String(paymentMethod)),
    });
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: t("process_now_button", lang),
            web_app: {
              url: `${CONFIG.miniAppUrl}/bingo-dashboard`,
            },
          },
        ],
      ],
    };
    await sendTelegramPhoto(filePath, caption, replyMarkup);

    await bot.editMessageText(t("receipt_uploaded_success", lang), {
      chat_id: chatId,
      message_id: waitingMsg.message_id,
      parse_mode: "Markdown",
    });

    delete state[chatId];
  } catch (error) {
    logger.error("Error uploading receipt", {
      error: error?.response?.data || error?.message,
      chatId,
    });
    let errorMessage = t("receipt_upload_failed", lang, {
      error: error.response?.data?.message || error.message,
    });
    await bot.editMessageText(errorMessage, {
      chat_id: chatId,
      message_id: waitingMsg.message_id,
    });
  }
}

module.exports = {
  handleManualDeposit,
  handleReceiptUpload,
};
