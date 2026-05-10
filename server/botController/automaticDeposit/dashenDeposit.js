const CONFIG = require("../../config/config");
const { t, getLang } = require("../localization");
const { backendApiClient, withAuth } = require("../utils/backendApiClient");
const logger = require("../../utils/winstonLogger");
const { getDashenReceiptDetail, toAmountNumber } = require("../utils/dashenParser");

function extractDashenReference(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  // Allow passing the URL directly
  const urlMatch = s.match(/receipt\.dashensuperapp\.com\/receipt\/([A-Z0-9\-]+)/i);
  if (urlMatch) return urlMatch[1];
  return s;
}

async function handleDashenDepositSubmit(bot, chatId, state) {
  const lang = await getLang(chatId);
  const waitingMsg = await bot.sendMessage(chatId, t("verifying_transaction", lang));

  try {
    const { jwtToken, transactionInput } = state[chatId] || {};
    if (!jwtToken || !transactionInput) {
      throw new Error("Missing deposit details for processing.");
    }

    const reference = extractDashenReference(transactionInput);
    if (!reference) {
      throw new Error("Please enter your Dashen receipt reference.");
    }

    const parsed = await getDashenReceiptDetail(reference);
    if (parsed.error) throw new Error(parsed.error);

    const fetchedAmount = Number(parsed.amount);
    if (!Number.isFinite(fetchedAmount) || fetchedAmount <= 0) {
      throw new Error("Could not determine a valid amount from the receipt.");
    }
    const finalAmount = fetchedAmount;

    const { getAppSettings } = require("../../services/appSettingsService");
    const settings = await getAppSettings();
    const manualAccounts = settings?.paymentAccounts?.manual || [];
    const dashenConfig = manualAccounts.find(a => a.provider === "dashen") || {};

    const expectedName = String(dashenConfig.accountName || "").trim().toLowerCase();
    const actualReceiver = String(parsed.receiverName || parsed.institutionName || "").trim().toLowerCase();
    if (expectedName && actualReceiver && expectedName !== actualReceiver) {
      // Best-effort: Dashen PDFs vary; only enforce if both sides are present.
      throw new Error(
        `The receiver/institution on the receipt (${parsed.receiverName || parsed.institutionName}) does not match the agent name (${dashenConfig.accountName}).`
      );
    }

    const payload = {
      telegramId: chatId.toString(),
      amount: finalAmount,
      transactionId: String(parsed.transactionReference || reference),
      smsText: transactionInput.length >= 50 ? transactionInput : null,
      paymentMethod: "dashen",
    };

    const response = await backendApiClient.post(
      "/api/v1/sms-deposit/automatic-deposit",
      payload,
      withAuth(jwtToken)
    );

    await bot.editMessageText(
      `✅ ${response.data.message}\nNew wallet balance: ${response.data.wallet} ETB`,
      { chat_id: chatId, message_id: waitingMsg.message_id }
    );

    delete state[chatId];
  } catch (err) {
    logger.error("Error processing Dashen automatic deposit", {
      chatId,
      error: err?.response?.data || err?.message,
    });

    const errorMessage =
      err?.response?.data?.message || `❌ Dashen deposit failed: ${err.message}`;

    await bot.editMessageText(errorMessage, {
      chat_id: chatId,
      message_id: waitingMsg.message_id,
    });
  }
}

module.exports = {
  handleDashenDepositSubmit,
};
