const CONFIG = require("../../config/config");
const { t, getLang } = require("../localization");
const { backendApiClient, withAuth } = require("../utils/backendApiClient");
const logger = require("../../utils/winstonLogger");
const { getCBEBirrReceiptDetail, normalizeEthiopianPhone, toAmountNumber } = require("../utils/cbebirrParser");

function extractCbebirrTidAndPhone(input) {
  const s = String(input || "").trim();

  // Allow passing the URL directly
  const tidMatch = s.match(/[?&]TID=([^&\s]+)/i);
  const phMatch = s.match(/[?&]PH=([^&\s]+)/i);
  if (tidMatch && phMatch) {
    return {
      receiptNumber: decodeURIComponent(tidMatch[1]),
      phoneNumber: normalizeEthiopianPhone(decodeURIComponent(phMatch[1])),
    };
  }

  // Allow: "TID PH" or "TID,PH"
  const parts = s
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      receiptNumber: parts[0],
      phoneNumber: normalizeEthiopianPhone(parts[1]),
    };
  }

  return { receiptNumber: parts[0] || "", phoneNumber: "" };
}

function lastDigits(value, n) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.slice(-n);
}

function looselyMatchesAccount(actual, expected) {
  if (!actual || !expected) return true; // skip strict validation if not configured
  const a = String(actual);
  const e = String(expected);
  const aDigits = a.replace(/\D/g, "");
  const eDigits = e.replace(/\D/g, "");
  if (aDigits && eDigits) {
    if (aDigits === eDigits) return true;
    if (aDigits.endsWith(eDigits) || eDigits.endsWith(aDigits)) return true;
    if (lastDigits(aDigits, 4) && lastDigits(aDigits, 4) === lastDigits(eDigits, 4)) return true;
  }
  return a.toLowerCase().includes(e.toLowerCase());
}

async function handleCBEBirrDepositSubmit(bot, chatId, state) {
  const lang = await getLang(chatId);
  const waitingMsg = await bot.sendMessage(chatId, t("verifying_transaction", lang));

  try {
    const { jwtToken, transactionInput } = state[chatId] || {};
    if (!jwtToken || !transactionInput) {
      throw new Error("Missing deposit details for processing.");
    }

    const { receiptNumber, phoneNumber } = extractCbebirrTidAndPhone(transactionInput);
    if (!receiptNumber) {
      throw new Error("Please enter your CBE Birr receipt number (TID). Example: CGU9REIHHB");
    }
    if (!phoneNumber) {
      throw new Error(
        "Please enter both ReceiptNumber and PhoneNumber. Example: CGU9REIHHB 2519XXXXXXX"
      );
    }

    const apiKey = CONFIG.cbebirrApiKey;
    const parsed = await getCBEBirrReceiptDetail(receiptNumber, phoneNumber, apiKey);
    if (parsed.error) throw new Error(parsed.error);

    const { getAppSettings } = require("../../services/appSettingsService");
    const settings = await getAppSettings();
    const manualAccounts = settings?.paymentAccounts?.manual || [];
    const cbebirrConfig = manualAccounts.find(a => a.provider === "cbebirr") || {};

    // Validate credited account / receiver (best-effort based on what PDF contains)
    if (cbebirrConfig.accountNumber && !looselyMatchesAccount(parsed.creditAccount, cbebirrConfig.accountNumber)) {
      throw new Error("The deposit was made to the wrong CBE Birr account. Please use the correct agent account.");
    }

    const expectedName = String(cbebirrConfig.accountName || "").trim().toLowerCase();
    const actualReceiver = String(parsed.receiverName || "").trim().toLowerCase();
    if (expectedName && actualReceiver && expectedName !== actualReceiver) {
      throw new Error(
        `The receiver name on the receipt (${parsed.receiverName}) does not match the agent name (${cbebirrConfig.accountName}).`
      );
    }

    const fetchedAmount = Number(parsed.amount);
    if (!Number.isFinite(fetchedAmount) || fetchedAmount <= 0) {
      throw new Error("Could not determine a valid amount from the receipt.");
    }
    const finalAmount = fetchedAmount;

    const payload = {
      telegramId: chatId.toString(),
      amount: finalAmount,
      transactionId: String(parsed.receiptNumber || receiptNumber),
      // For CBE Birr we need the phone number too; keep the raw input even if short.
      smsText: transactionInput || null,
      paymentMethod: "cbebirr",
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
    logger.error("Error processing CBE Birr automatic deposit", {
      chatId,
      error: err?.response?.data || err?.message,
    });

    const errorMessage =
      err?.response?.data?.message || `❌ CBE Birr deposit failed: ${err.message}`;

    await bot.editMessageText(errorMessage, {
      chat_id: chatId,
      message_id: waitingMsg.message_id,
    });
  }
}

module.exports = {
  handleCBEBirrDepositSubmit,
};
