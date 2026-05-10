const { getCBE_TransactionDetail } = require("../utils/cbepdfParser");
const CONFIG = require("../../config/config");
const { t, getLang } = require("../localization");
const { backendApiClient, withAuth } = require("../utils/backendApiClient");
const logger = require("../../utils/winstonLogger");


function extractCBETransactionId(input) {
  if (!input) return "";
  const s = String(input).trim();
  // Prefer explicit URL id parameter if available
  const urlMatch = s.match(/[?&]id=(FT[0-9A-Z]+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();
  // Otherwise fall back to any FTxxxx sequence
  const ftMatch = s.match(/\b(FT[0-9A-Z]+)\b/i);
  if (ftMatch) return ftMatch[1].toUpperCase();
  return "";
}

function last4DigitsFromMasked(masked) {
  if (!masked) return "";
  const digits = String(masked).replace(/\D/g, "");
  return digits.slice(-4);
}

function toAmountNumber(str) {
  if (!str) return NaN;
  return parseFloat(String(str).replace(/[^\d.]/g, ""));
}

async function handleCBEDepositSubmit(bot, chatId, state) {
  const lang = await getLang(chatId);

  const waitingMsg = await bot.sendMessage(
    chatId,
    t("verifying_transaction", lang)
  );

  try {
    const { paymentMethod, jwtToken, transactionInput } =
      state[chatId] || {};
    if (!paymentMethod || !jwtToken || !transactionInput) {
      throw new Error("Missing deposit details for processing.");
    }

    const transactionId = extractCBETransactionId(transactionInput);
    if (!transactionId) {
      throw new Error(
        "Could not find a valid CBE transaction ID (e.g., FT...). Please provide the full SMS or just the ID."
      );
    }

    const parsed = await getCBE_TransactionDetail(transactionId);
    if (parsed.error) {
      throw new Error(parsed.error);
    }

    const { getAppSettings } = require("../../services/appSettingsService");
    const settings = await getAppSettings();
    const manualAccounts = settings?.paymentAccounts?.manual || [];
    const cbeConfig = manualAccounts.find(a => a.provider === "cbe") || {};

    const expectedLast4 = last4DigitsFromMasked(cbeConfig.accountNumber || "");
    const actualLast4 = last4DigitsFromMasked(parsed.receiverAccount);
    if (expectedLast4 !== actualLast4) {
      throw new Error(
        `The deposit was made to the wrong account. Please ensure you use the correct agent CBE account.`
      );
    }

    const expectedName = (cbeConfig.accountName || "").trim().toLowerCase();
    const actualName = (parsed.receiver || "").trim().toLowerCase();
    if (expectedName !== actualName) {
      throw new Error(
        `The receiver's name on the receipt (${parsed.receiver}) does not match the agent's name (${cbeConfig.accountName}).`
      );
    }

    const receiptId = (parsed.referenceNo || "").toUpperCase();
    if (
      !receiptId ||
      !(transactionId.includes(receiptId) || receiptId.includes(transactionId))
    ) {
      throw new Error(
        `Receipt details do not match the transaction ID you provided. Please double-check the ID.`
      );
    }

    const fetchedAmount = toAmountNumber(parsed.transferredAmount);
    if (isNaN(fetchedAmount) || fetchedAmount <= 0) {
      throw new Error("Could not determine a valid amount from the receipt.");
    }
    const finalAmount = fetchedAmount;

    const payload = {
      telegramId: chatId.toString(),
      amount: finalAmount,
      transactionId: transactionId,
      smsText: transactionInput.length >= 50 ? transactionInput : null,
      paymentMethod: paymentMethod.toLowerCase(),
    };

    const response = await backendApiClient.post(
      "/api/v1/sms-deposit/automatic-deposit",
      payload,
      withAuth(jwtToken)
    );

    await bot.editMessageText(
      `✅ ${response.data.message}\nNew wallet balance: ${response.data.wallet} ETB`,
      {
        chat_id: chatId,
        message_id: waitingMsg.message_id,
      }
    );

    delete state[chatId];
  } catch (err) {
    logger.error("Error processing CBE automatic deposit", {
      chatId,
      error: err?.response?.data || err?.message,
    });
    const errorMessage =
      err.response?.data?.message ||
      `❌ Automatic deposit failed: ${err.message}`;

    await bot.editMessageText(errorMessage, {
      chat_id: chatId,
      message_id: waitingMsg.message_id,
    });
  }
}

module.exports = {
  handleCBEDepositSubmit,
};
