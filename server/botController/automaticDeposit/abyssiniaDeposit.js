const { getAbyssiniaTransactionDetail } = require("../utils/abyssiniaParser");
const CONFIG = require("../../config/config");
const { backendApiClient, withAuth } = require("../utils/backendApiClient");
const logger = require("../../utils/winstonLogger");

function extractAbyssiniaTransactionId(input) {
  if (!input) return "";
  const s = String(input).trim();
  // Prefer explicit URL param if available
  const urlMatch = s.match(/bankofabyssinia.com\/slip\/?[?&]trx=([A-Z0-9]+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();
  // Otherwise fall back to any FTxxxx sequence
  const ftMatch = s.match(/\b(FT[0-9A-Z]+)\b/i);
  if (ftMatch) return ftMatch[1].toUpperCase();
  return "";
}

function toAmountNumber(str) {
  if (!str) return NaN;
  return parseFloat(String(str).replace(/[^\d.]/g, ""));
}

async function handleAbyssiniaDeposit(bot, chatId, state) {
  state[chatId] = { step: "enter_amount", paymentFlow: "abyssinia" };
  bot.sendMessage(
    chatId,
    "\uD83D\uDCCB Enter the amount you want to deposit via Abyssinia Bank:"
  );
}

async function handleAbyssiniaDepositSubmit(bot, chatId, state) {
  const waitingMsg = await bot.sendMessage(
    chatId,
    "\u23F3 Verifying your Abyssinia transaction... please wait."
  );
  try {
    const { jwtToken, transactionInput } = state[chatId] || {};
    if (CONFIG.isDevelopment) {
      logger.debug("[abyssinia] submit invoked", { chatId });
    }
    if (!jwtToken || !transactionInput) {
      throw new Error("Missing deposit details for processing.");
    }
    const transactionId = extractAbyssiniaTransactionId(transactionInput);
    if (CONFIG.isDevelopment) {
      logger.debug("[abyssinia] extracted transactionId", { chatId, transactionId });
    }
    if (!transactionId) {
      throw new Error(
        "Could not find a valid Abyssinia transaction ID (e.g., FT...). Please provide the full SMS or just the ID."
      );
    }
    const parsed = await getAbyssiniaTransactionDetail(transactionId);
    if (CONFIG.isDevelopment) {
      logger.debug("[abyssinia] parsed receipt", { transactionId, hasError: Boolean(parsed?.error) });
    }
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    // If parser returned an empty result (likely the bank page is a JS SPA),
    // attempt to recover masked account and amount from the original transactionInput text.
    if (
      !parsed.receiverAccountDigits &&
      (!parsed.receiver || !parsed.transferredAmount)
    ) {
      logger.debug("[abyssinia] parser returned empty fields, attempting SMS fallback");
      const s = String(transactionInput || "");
      // Look for masked account patterns like 2*98, 2******98, 2* *98, or sequences of digit+non-digit+digits
      const maskedMatch = s.match(/(\d[\d*\s]{1,20}\d{1,4})/);
      if (maskedMatch) {
        const masked = maskedMatch[1];
        logger.debug("[abyssinia] found masked account in SMS text", {
          masked,
        });
        parsed.receiverAccount = masked;
        parsed.receiverAccountDigits = masked.replace(/\D/g, "");
      }
      // fallback amount parse (ETB 100.00 or 100.00 ብር)
      const amtMatch = s.match(/(?:ETB|ብር)?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
      if (amtMatch) {
        parsed.transferredAmount = parsed.transferredAmount || amtMatch[1];
        logger.debug("[abyssinia] extracted amount from SMS text", {
          amount: parsed.transferredAmount,
        });
      }
    }
    const { getAppSettings } = require("../../services/appSettingsService");
    const settings = await getAppSettings();
    const manualAccounts = settings?.paymentAccounts?.manual || [];
    const abyssiniaConfig = manualAccounts.find(a => a.provider === "abyssinia") || {};
    
    // Validate agent account by comparing numeric account substrings
    const digitsOnly = (s) => String(s || "").replace(/\D/g, "");
    const expectedDigits = digitsOnly(abyssiniaConfig.accountNumber || "");
    const actualDigits = digitsOnly(
      parsed.receiverAccountDigits ||
        parsed.receiverAccount ||
        parsed.receiver ||
        ""
    );

    // helper for flexible matching: try last2, last3, endsWith, includes, exact
    function isAccountMatch(expected, actual) {
      if (!expected || !actual) return false;
      if (expected === actual) return true;
      if (expected.endsWith(actual) || actual.endsWith(expected)) return true;
      const eLen = expected.length;
      const aLen = actual.length;
      const last2Match =
        eLen >= 2 && aLen >= 2 && expected.slice(-2) === actual.slice(-2);
      const last3Match =
        eLen >= 3 && aLen >= 3 && expected.slice(-3) === actual.slice(-3);
      if (last2Match || last3Match) return true;
      return false;
    }

    const accountMatch = isAccountMatch(expectedDigits, actualDigits);
    if (!accountMatch) {
      if (CONFIG.isDevelopment) {
        logger.debug("[abyssinia] account mismatch", {
          expectedDigitsLast2: expectedDigits.slice(-2),
          actualDigitsLast2: actualDigits.slice(-2),
        });
      }
      throw new Error(
        `The deposit was made to the wrong account. Ensure you use the correct Abyssinia agent account. If this is incorrect, contact support and include the transaction ID: ${transactionId}`
      );
    }
    // Validate agent name (case-insensitive)
    const expectedName = (abyssiniaConfig.accountName || "").trim().toLowerCase();
    const actualName = (parsed.receiver || "").trim().toLowerCase();
    if (expectedName && expectedName !== actualName) {
      throw new Error(
        `The receiver's name on the receipt (${parsed.receiver}) does not match the agent's name (${abyssiniaConfig.accountName}).`
      );
    }
    // Validate transaction reference (should match transactionId)
    const receiptId = (parsed.referenceNo || "").toUpperCase();
    if (
      !receiptId ||
      !(transactionId.includes(receiptId) || receiptId.includes(transactionId))
    ) {
      throw new Error(
        `Receipt details do not match the transaction ID you provided. Please double-check the ID.`
      );
    }
    // Validate amount extracted directly from receipt
    const fetchedAmount = toAmountNumber(parsed.transferredAmount);
    if (isNaN(fetchedAmount) || fetchedAmount <= 0) {
      throw new Error("Could not determine a valid amount from the receipt.");
    }
    const finalAmount = fetchedAmount;
    // Send to backend
    const payload = {
      telegramId: chatId.toString(),
      amount: finalAmount,
      transactionId: transactionId,
      smsText: transactionInput.length >= 50 ? transactionInput : null,
      paymentMethod: "abyssinia",
    };
    const response = await backendApiClient.post(
      "/api/v1/sms-deposit/automatic-deposit",
      payload,
      withAuth(jwtToken)
    );
    await bot.editMessageText(
      `\u2705 ${response.data.message}\nNew wallet balance: ${response.data.wallet} ETB`,
      {
        chat_id: chatId,
        message_id: waitingMsg.message_id,
      }
    );
    delete state[chatId];
  } catch (err) {
    if (CONFIG.isDevelopment) {
      logger.error("[abyssinia] submit error", err && err.stack ? err.stack : err);
    } else {
      logger.error("[abyssinia] submit error", err?.message || String(err));
    }
    const errorMessage =
      err.response?.data?.message ||
      `\u274c Abyssinia deposit failed: ${err.message}`;
    try {
      await bot.editMessageText(errorMessage, {
        chat_id: chatId,
        message_id: waitingMsg.message_id,
      });
    } catch (editErr) {
      logger.error(
        "[abyssinia] failed to edit message",
        editErr && editErr.stack ? editErr.stack : editErr
      );
    }
  }
}

module.exports = {
  handleAbyssiniaDeposit,
  handleAbyssiniaDepositSubmit,
};
