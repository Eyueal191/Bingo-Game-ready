const { getTeleBirrTransactionDetail, maskedAccountMatches } = require("../utils");
const CONFIG = require("../../config/config");
const { backendApiClient, withAuth } = require("../utils/backendApiClient");
const logger = require("../../utils/winstonLogger");

function extractTelebirrTransactionId(input) {
if (!input) return "";
  const s = String(input).trim();
  // TeleBirr receipts are direct URLs ending with /<id>
  const match = s.match(/receipt\/([A-Z0-9]+)/i);
  return match ? match[1] : s; // fallback to raw string

}

function toAmountNumber(str) {
  if (!str) return NaN;
  return parseFloat(String(str).replace(/[^\d.]/g, ""));
}

async function handleTelebirrDepositSubmit(bot, chatId, state) {
  if (CONFIG.isDevelopment) {
    logger.debug("[telebirr] submit invoked", { chatId });
  }
  
  const waitingMsg = await bot.sendMessage(
    chatId,
    "⏳ Verifying your TeleBirr transaction... please wait."
  );

  try {
    const { jwtToken, transactionInput } = state[chatId] || {};
  
    if (!jwtToken || !transactionInput) {
      throw new Error("Missing deposit details for processing.");
    }

    const transactionId = extractTelebirrTransactionId(transactionInput);
    if (!transactionId) {
      throw new Error("Could not extract a valid TeleBirr transaction ID.");
    }

    if (CONFIG.isDevelopment) {
      logger.debug("[telebirr] extracted transactionId", { chatId, transactionId });
    }

    const parsed = await getTeleBirrTransactionDetail(transactionId);
    if (parsed.error) throw new Error(parsed.error);

    // ✅ Validate transaction status
    if (parsed.transactionStatus.toLowerCase() !== "completed") {
      throw new Error(`Transaction is not completed. Current status: ${parsed.transactionStatus}`);
    }

    const { getAppSettings } = require("../../services/appSettingsService");
    const settings = await getAppSettings();
    const manualAccounts = settings?.paymentAccounts?.manual || [];
    const telebirrConfig = manualAccounts.find(a => a.provider === "telebirr") || {};

 // ✅ Validate credited account (only one agent phone)
    const expectedAccount = telebirrConfig.accountNumber || "";
    const creditedAccount = parsed.creditedPartyAccountNo || "";
    if (!maskedAccountMatches(creditedAccount, expectedAccount)) {
      console.log("Account mismatch:", { creditedAccount, expectedAccount });
      throw new Error(
        `The deposit was made to the wrong TeleBirr account (${creditedAccount}).`
      );
    }
    // ✅ Validate receiver name
    const expectedName = (telebirrConfig.accountName || "").trim().toLowerCase();
    const actualName = (parsed.creditedPartyName || "").trim().toLowerCase();
    if (expectedName && expectedName !== actualName) {
      throw new Error(
        `The credited party name on the receipt (${parsed.creditedPartyName}) does not match the expected agent name (${telebirrConfig.accountName}).`
      );
    }

    // ✅ Extract amount from receipt directly
    const fetchedAmount = toAmountNumber(parsed.settledAmount);
    if (isNaN(fetchedAmount) || fetchedAmount <= 0) {
      throw new Error("Could not determine a valid amount from the receipt.");
    }
    const finalAmount = fetchedAmount; // Use the SMS amount

    // ✅ Post to your backend
    const payload = {
      telegramId: chatId.toString(),
      amount: finalAmount,
      transactionId,
      smsText: transactionInput.length >= 50 ? transactionInput : null,
      paymentMethod: "telebirr",
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
    const errorMessage =
      err.response?.data?.message ||
      ``;
    await bot.editMessageText(errorMessage, {
      chat_id: chatId,
      message_id: waitingMsg.message_id,
    });
  }
}

module.exports = { handleTelebirrDepositSubmit };
