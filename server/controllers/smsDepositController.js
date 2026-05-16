const Transaction = require("../models/ManualTransaction");
const TransactionStatus = { PENDING: "pending", COMPLETED: "approved" };
const User = require("../models/userModels");
const logger = require("../utils/winstonLogger");
const {
  NotifyUserTelegram,
  sendTelegramMessage,
} = require("../botController/notification");
// Parsers used by bot; reuse here for UI server-side validation
const {
  getCBE_TransactionDetail,
  getTeleBirrTransactionDetail,
  getAbyssiniaTransactionDetail,
  maskedAccountMatches: maskedTelebirrMatches,
} = require("../botController/utils");
const { getCBEBirrReceiptDetail, normalizeEthiopianPhone } = require("../botController/utils/cbebirrParser");
const { getDashenReceiptDetail } = require("../botController/utils/dashenParser");
const CONFIG = require("../config/config");
const {
  findProcessedDepositTransaction,
  DuplicateSources,
} = require("../services/depositTransactionGuard");
const { getAppSettings } = require("../services/appSettingsService");
const { computeDepositBonus } = require("../utils/depositBonus");
const {
  awardReferralBonusForFirstDeposit,
  hasCompletedDepositBefore,
} = require("../services/referralBonusService");

const DUPLICATE_SMS_MESSAGE =
  "*የተጠናቀቀ ግብይት*\n\nይህ ክፍያ አስቀድሞ ተጠናቅቋል።\n🔹 እባክዎ እንደገና ለመጀመር /start ይጫኑ ወይም ከmenu ይምረጡ።";



// Validate receipt & inputs without mutating state; returns parsed details
const validateAutomaticDeposit = async (req, res) => {
  const { amount, transactionId, smsText, paymentMethod } = req.body;

  let extractedTransactionId = null;
  try {
    const allowedMethods = ["CBE", "Telebirr", "Abyssinia", "CBEBirr", "Dashen"];
    const methodMap = {
      abyssinia: "Abyssinia",
      cbe: "CBE",
      telebirr: "Telebirr",
      cbebirr: "CBEBirr",
      dashen: "Dashen",
    };
    const normalizedPaymentMethod = paymentMethod
      ? methodMap[paymentMethod.toLowerCase()] ||
      (allowedMethods.includes(paymentMethod)
        ? paymentMethod
        : allowedMethods.includes(
          paymentMethod.charAt(0).toUpperCase() +
          paymentMethod.slice(1).toLowerCase()
        )
          ? paymentMethod.charAt(0).toUpperCase() +
          paymentMethod.slice(1).toLowerCase()
          : null)
      : null;
    if (!normalizedPaymentMethod)
      return res.status(400).json({ message: "Invalid payment method" });

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    if (!transactionId && !smsText) {
      return res
        .status(400)
        .json({ message: "Provide transactionId or smsText" });
    }

    const digitsOnly = (s) => String(s || "").replace(/\D/g, "");
    const lastN = (s, n) => s.slice(-n);
    const toAmount = (v) => parseFloat(String(v).replace(/[^\d.]/g, ""));

    const inputStr = String(smsText || transactionId || "");
    if (normalizedPaymentMethod === "CBE") {
      const urlMatch = inputStr.match(/[?&]id=(FT[0-9A-Z]+)/i);
      extractedTransactionId =
        transactionId || (urlMatch ? urlMatch[1].toUpperCase() : null);
      if (!extractedTransactionId) {
        const ftMatch = inputStr.match(/\b(FT[0-9A-Z]+)\b/i);
        extractedTransactionId = ftMatch ? ftMatch[1].toUpperCase() : null;
      }
    } else if (normalizedPaymentMethod === "Telebirr") {
      const match = inputStr.match(/receipt\/(\w+)/i);
      extractedTransactionId = transactionId || (match ? match[1] : null);
      if (!extractedTransactionId) {
        const m2 = inputStr.match(/transaction number is (\w+)/i);
        extractedTransactionId = m2 ? m2[1] : null;
      }
    } else if (normalizedPaymentMethod === "Abyssinia") {
      const urlMatch = inputStr.match(
        /bankofabyssinia.com\/slip\/?[?&]trx=([A-Z0-9]+)/i
      );
      extractedTransactionId =
        transactionId || (urlMatch ? urlMatch[1].toUpperCase() : null);
      if (!extractedTransactionId) {
        const ftMatch = inputStr.match(/\b(FT[0-9A-Z]+)\b/i);
        extractedTransactionId = ftMatch ? ftMatch[1].toUpperCase() : null;
      }
    }
    else if (normalizedPaymentMethod === "CBEBirr") {
      // For CBE Birr, the transactionId is the receipt number; phone is taken from smsText.
      extractedTransactionId = transactionId || null;
      if (!extractedTransactionId) {
        // Try to extract TID from pasted URL
        const tidMatch = inputStr.match(/[?&]TID=([^&\s]+)/i);
        extractedTransactionId = tidMatch ? decodeURIComponent(tidMatch[1]).trim() : null;
      }
    } else if (normalizedPaymentMethod === "Dashen") {
      // Dashen uses a receipt reference (or pasted URL)
      const urlMatch = inputStr.match(/receipt\.dashensuperapp\.com\/receipt\/([A-Z0-9\-]+)/i);
      extractedTransactionId = transactionId || (urlMatch ? urlMatch[1].trim() : null);
    }
    if (!extractedTransactionId) {
      return res
        .status(400)
        .json({ message: "Could not extract a valid transaction ID" });
    }
    const duplicateTransaction = await findProcessedDepositTransaction(
      extractedTransactionId
    );
    if (duplicateTransaction) {
      return res.status(400).json({
        message:
          duplicateTransaction.source === DuplicateSources.MANUAL
            ? "This transaction was already approved manually."
            : "This transaction was already processed automatically.",
        duplicateSource: duplicateTransaction.source,
      });
    }
    let parsed;
    const settings = await getAppSettings();
    const manualAccounts = settings?.paymentAccounts?.manual || [];

    const getProviderConfig = (providerCode) =>
      manualAccounts.find((a) => a.provider === providerCode) || {};
    if (normalizedPaymentMethod === "CBE") {
      parsed = await getCBE_TransactionDetail(extractedTransactionId);
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      const cbeConfig = getProviderConfig("cbe");
      const expectedLast4 = lastN(digitsOnly(cbeConfig.accountNumber || ""), 4);
      const actualLast4 = lastN(digitsOnly(parsed.receiverAccount || ""), 4);
      const expectedName = (cbeConfig.accountName || "").trim().toLowerCase();
      const actualName = (parsed.receiver || "").trim().toLowerCase();
      const receiptId = String(parsed.referenceNo || "").toUpperCase();
      const fetchedAmount = toAmount(parsed.transferredAmount);
      return res.json({
        ok:
          !!expectedLast4 &&
          expectedLast4 === actualLast4 &&
          (!expectedName || expectedName === actualName) &&
          !!receiptId &&
          (extractedTransactionId.includes(receiptId) ||
            receiptId.includes(extractedTransactionId)) &&
          Number.isFinite(fetchedAmount) &&
          Math.abs(fetchedAmount - parsedAmount) <= 0.01,
        parsed,
        extractedTransactionId,
        normalizedPaymentMethod,
      });
    }
    if (normalizedPaymentMethod === "Telebirr") {
      parsed = await getTeleBirrTransactionDetail(extractedTransactionId);
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      const telebirrConfig = getProviderConfig("telebirr");
      const expectedPhone = telebirrConfig.accountNumber || "";
      const actualMasked = parsed.creditedPartyAccountNo || "";
      const expectedName = (telebirrConfig.accountName || "").trim().toLowerCase();
      const actualName = (parsed.creditedPartyName || "").trim().toLowerCase();
      const fetchedAmount = toAmount(parsed.settledAmount);
      const endsMatch = maskedTelebirrMatches(actualMasked, expectedPhone);

      return res.json({
        ok:
          endsMatch &&
          (!expectedName || expectedName === actualName) &&
          Number.isFinite(fetchedAmount) &&
          Math.abs(fetchedAmount - parsedAmount) <= 0.01,
        parsed,
        extractedTransactionId,
        normalizedPaymentMethod,
      });
    }
    if (normalizedPaymentMethod === "Abyssinia") {
      parsed = await getAbyssiniaTransactionDetail(extractedTransactionId);
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      const abyssiniaConfig = getProviderConfig("abyssinia");
      const expectedDigits = digitsOnly(abyssiniaConfig.accountNumber || "");
      const actualDigits = digitsOnly(
        parsed.receiverAccountDigits ||
        parsed.receiverAccount ||
        parsed.receiver ||
        ""
      );
      const expectedName = (abyssiniaConfig.accountName || "").trim().toLowerCase();
      const actualName = (parsed.receiver || "").trim().toLowerCase();
      const fetchedAmount = toAmount(parsed.transferredAmount);
      const endsMatch =
        !!expectedDigits &&
        !!actualDigits &&
        (expectedDigits === actualDigits ||
          expectedDigits.endsWith(actualDigits) ||
          actualDigits.endsWith(expectedDigits));
      return res.json({
        ok:
          endsMatch &&
          (!expectedName || expectedName === actualName) &&
          Number.isFinite(fetchedAmount) &&
          Math.abs(fetchedAmount - parsedAmount) <= 0.01,
        parsed,
        extractedTransactionId,
        normalizedPaymentMethod,
      });
    }
    if (normalizedPaymentMethod === "CBEBirr") {
      const token = CONFIG.cbebirrApiKey;
      if (!token) {
        return res.status(400).json({ message: "CBE Birr verification is not configured" });
      }

      // Extract phone number from smsText / inputStr
      const phoneMatch = inputStr.match(/\b(\+?251\d{9})\b/) || inputStr.match(/\b(0\d{9})\b/);
      const phoneNumber = normalizeEthiopianPhone(phoneMatch ? phoneMatch[1] : "");
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required for CBE Birr verification" });
      }

      const parsed = await getCBEBirrReceiptDetail(extractedTransactionId, phoneNumber, token);
      if (parsed.error) return res.status(400).json({ message: parsed.error });

      const cbebirrConfig = getProviderConfig("cbebirr");
      const expectedName = (cbebirrConfig.accountName || "").trim().toLowerCase();
      const actualName = (parsed.receiverName || "").trim().toLowerCase();
      const fetchedAmount = Number(parsed.amount);

      return res.json({
        ok:
          (!expectedName || (actualName && expectedName === actualName)) &&
          Number.isFinite(fetchedAmount) &&
          Math.abs(fetchedAmount - parsedAmount) <= 0.01,
        parsed,
        extractedTransactionId,
        normalizedPaymentMethod,
      });
    }
    if (normalizedPaymentMethod === "Dashen") {
      const parsed = await getDashenReceiptDetail(extractedTransactionId);
      if (parsed.error) return res.status(400).json({ message: parsed.error });

      const fetchedAmount = Number(parsed.amount);
      return res.json({
        ok:
          Number.isFinite(fetchedAmount) &&
          Math.abs(fetchedAmount - parsedAmount) <= 0.01,
        parsed,
        extractedTransactionId,
        normalizedPaymentMethod,
      });
    }
    return res.status(400).json({ message: "Unsupported method" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const automaticDeposit = async (req, res) => {
  const { telegramId, amount, transactionId, smsText, paymentMethod } =
    req.body;
  logger.info("smsDeposit: automatic deposit request received", {
    telegramId,
    amount,
    paymentMethod,
    hasSmsText: Boolean(smsText),
    hasTransactionId: Boolean(transactionId),
  });

  // Make available for error reporting
  let extractedTransactionId = null;

  try {
    // Normalize method
    const allowedMethods = ["CBE", "Telebirr", "Abyssinia", "CBEBirr", "Dashen"];
    const methodMap = {
      abyssinia: "Abyssinia",
      cbe: "CBE",
      telebirr: "Telebirr",
      cbebirr: "CBEBirr",
      dashen: "Dashen",
    };
    const normalizedPaymentMethod = paymentMethod
      ? methodMap[paymentMethod.toLowerCase()] ||
      (allowedMethods.includes(paymentMethod)
        ? paymentMethod
        : allowedMethods.includes(
          paymentMethod.charAt(0).toUpperCase() +
          paymentMethod.slice(1).toLowerCase()
        )
          ? paymentMethod.charAt(0).toUpperCase() +
          paymentMethod.slice(1).toLowerCase()
          : null)
      : null;
    if (!normalizedPaymentMethod) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    // Validate input
    const parsedAmount = Number(amount);
    if (!telegramId || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Invalid request data" });
    }
    if (!transactionId && !smsText) {
      return res.status(400).json({
        message:
          "Missing required fields: either transactionId or smsText must be provided",
      });
    }

    // Lookup user
    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Needed for referral bonus: determine if this is the user's first completed deposit
    const alreadyDepositedBefore = await hasCompletedDepositBefore(user._id);

    // Helpers
    const digitsOnly = (s) => String(s || "").replace(/\D/g, "");
    const lastN = (s, n) => s.slice(-n);
    const toAmount = (v) => parseFloat(String(v).replace(/[^\d.]/g, ""));

    // Extract transactionId per method if necessary
    const inputStr = String(smsText || transactionId || "");
    if (normalizedPaymentMethod === "CBE") {
      const urlMatch = inputStr.match(/[?&]id=(FT[0-9A-Z]+)/i);
      extractedTransactionId =
        transactionId || (urlMatch ? urlMatch[1].toUpperCase() : null);
      if (!extractedTransactionId) {
        const ftMatch = inputStr.match(/\b(FT[0-9A-Z]+)\b/i);
        extractedTransactionId = ftMatch ? ftMatch[1].toUpperCase() : null;
      }
    } else if (normalizedPaymentMethod === "Telebirr") {
      const match = inputStr.match(/receipt\/(\w+)/i);
      extractedTransactionId = transactionId || (match ? match[1] : null);
      if (!extractedTransactionId) {
        const m2 = inputStr.match(/transaction number is (\w+)/i);
        extractedTransactionId = m2 ? m2[1] : null;
      }
    } else if (normalizedPaymentMethod === "Abyssinia") {
      const urlMatch = inputStr.match(
        /bankofabyssinia.com\/slip\/?[?&]trx=([A-Z0-9]+)/i
      );
      extractedTransactionId =
        transactionId || (urlMatch ? urlMatch[1].toUpperCase() : null);
      if (!extractedTransactionId) {
        const ftMatch = inputStr.match(/\b(FT[0-9A-Z]+)\b/i);
        extractedTransactionId = ftMatch ? ftMatch[1].toUpperCase() : null;
      }
    }
    else if (normalizedPaymentMethod === "CBEBirr") {
      extractedTransactionId = transactionId || null;
      if (!extractedTransactionId) {
        const tidMatch = inputStr.match(/[?&]TID=([^&\s]+)/i);
        extractedTransactionId = tidMatch ? decodeURIComponent(tidMatch[1]).trim() : null;
      }
    } else if (normalizedPaymentMethod === "Dashen") {
      const urlMatch = inputStr.match(/receipt\.dashensuperapp\.com\/receipt\/([A-Z0-9\-]+)/i);
      extractedTransactionId = transactionId || (urlMatch ? urlMatch[1].trim() : null);
    }
    if (!extractedTransactionId) {
      return res
        .status(400)
        .json({ message: "Could not extract a valid transaction ID" });
    }
    const duplicateTransaction = await findProcessedDepositTransaction(
      extractedTransactionId
    );
    if (duplicateTransaction) {
      return res.status(400).json({ message: DUPLICATE_SMS_MESSAGE });
    }
    
    const settings = await getAppSettings();
    const manualAccounts = settings?.paymentAccounts?.manual || [];

    const getProviderConfig = (providerCode) =>
      manualAccounts.find((a) => a.provider === providerCode) || {};

    // Provider validations
    if (normalizedPaymentMethod === "CBE") {
      const parsed = await getCBE_TransactionDetail(extractedTransactionId);
      if (parsed.error) return res.status(400).json({ message: parsed.error });

      const cbeConfig = getProviderConfig("cbe");
      const expectedLast4 = lastN(digitsOnly(cbeConfig.accountNumber || ""), 4);
      const actualLast4 = lastN(digitsOnly(parsed.receiverAccount || ""), 4);
      if (!expectedLast4 || expectedLast4 !== actualLast4) {
        return res.status(400).json({
          message:
            "The deposit was made to the wrong CBE account. Please use the correct agent account.",
        });
      }

      const expectedName = (cbeConfig.accountName || "").trim().toLowerCase();
      const actualName = (parsed.receiver || "").trim().toLowerCase();
      if (expectedName && expectedName !== actualName) {
        return res.status(400).json({
          message: `Receiver name mismatch on receipt (${parsed.receiver})`,
        });
      }

      const receiptId = String(parsed.referenceNo || "").toUpperCase();
      if (
        !receiptId ||
        !(
          extractedTransactionId.includes(receiptId) ||
          receiptId.includes(extractedTransactionId)
        )
      ) {
        return res.status(400).json({
          message: "Receipt and transaction ID do not match",
        });
      }

      const fetchedAmount = toAmount(parsed.transferredAmount);
      if (
        !Number.isFinite(fetchedAmount) ||
        Math.abs(fetchedAmount - parsedAmount) > 0.01
      ) {
        return res.status(400).json({
          message: `Amount mismatch. Intended ${parsedAmount.toFixed(
            2
          )} ETB, receipt shows ${Number.isFinite(fetchedAmount) ? fetchedAmount.toFixed(2) : "N/A"
            } ETB`,
        });
      }
    } else if (normalizedPaymentMethod === "Telebirr") {
      const parsed = await getTeleBirrTransactionDetail(extractedTransactionId);
      if (parsed.error) return res.status(400).json({ message: parsed.error });

      const telebirrConfig = getProviderConfig("telebirr");
      const expectedPhone = telebirrConfig.accountNumber || "";
      const actualMasked = parsed.creditedPartyAccountNo || ""
      if (!maskedTelebirrMatches(actualMasked, expectedPhone)) {
        return res.status(400).json({
          message:
            "The deposit was made to the wrong TeleBirr account. Please use the correct agent account.",
        });
      }

      const expectedName = (telebirrConfig.accountName || "").trim().toLowerCase();
      const actualName = (parsed.creditedPartyName || "").trim().toLowerCase();
      if (expectedName && expectedName !== actualName) {
        return res.status(400).json({
          message: `Credited party name mismatch (${parsed.creditedPartyName})`,
        });
      }

      const fetchedAmount = toAmount(parsed.settledAmount);
      if (
        !Number.isFinite(fetchedAmount) ||
        Math.abs(fetchedAmount - parsedAmount) > 0.01
      ) {
        return res.status(400).json({
          message: `Amount mismatch. Intended ${parsedAmount.toFixed(
            2
          )} ETB, receipt shows ${Number.isFinite(fetchedAmount) ? fetchedAmount.toFixed(2) : "N/A"
            } ETB`,
        });
      }
    } else if (normalizedPaymentMethod === "Abyssinia") {
      const parsed = await getAbyssiniaTransactionDetail(
        extractedTransactionId
      );
      if (parsed.error) return res.status(400).json({ message: parsed.error });

      const abyssiniaConfig = getProviderConfig("abyssinia");
      const expectedDigits = digitsOnly(abyssiniaConfig.accountNumber || "");
      const actualDigits = digitsOnly(
        parsed.receiverAccountDigits ||
        parsed.receiverAccount ||
        parsed.receiver ||
        ""
      );
      // Flexible match: exact, endsWith, last2/last3
      const isMatch = () => {
        if (!expectedDigits || !actualDigits) return false;
        if (expectedDigits === actualDigits) return true;
        if (
          expectedDigits.endsWith(actualDigits) ||
          actualDigits.endsWith(expectedDigits)
        )
          return true;
        const e2 = lastN(expectedDigits, 2);
        const a2 = lastN(actualDigits, 2);
        const e3 = lastN(expectedDigits, 3);
        const a3 = lastN(actualDigits, 3);
        return e2 === a2 || e3 === a3;
      };
      if (!isMatch()) {
        return res.status(400).json({
          message:
            "The deposit was made to the wrong Abyssinia account. Please use the correct agent account.",
        });
      }

      const expectedName = (abyssiniaConfig.accountName || "").trim().toLowerCase();
      const actualName = (parsed.receiver || "").trim().toLowerCase();
      if (expectedName && expectedName !== actualName) {
        return res.status(400).json({
          message: `Receiver name mismatch on receipt (${parsed.receiver})`,
        });
      }

      const receiptId = String(parsed.referenceNo || "").toUpperCase();
      if (
        !receiptId ||
        !(
          extractedTransactionId.includes(receiptId) ||
          receiptId.includes(extractedTransactionId)
        )
      ) {
        return res.status(400).json({
          message: "Receipt and transaction ID do not match",
        });
      }

      const fetchedAmount = toAmount(parsed.transferredAmount);
      if (
        !Number.isFinite(fetchedAmount) ||
        Math.abs(fetchedAmount - parsedAmount) > 0.01
      ) {
        return res.status(400).json({
          message: `Amount mismatch. Intended ${parsedAmount.toFixed(
            2
          )} ETB, receipt shows ${Number.isFinite(fetchedAmount) ? fetchedAmount.toFixed(2) : "N/A"
            } ETB`,
        });
      }
    } else if (normalizedPaymentMethod === "CBEBirr") {
      const token = CONFIG.cbebirrApiKey;
      if (!token) {
        return res.status(400).json({ message: "CBE Birr verification is not configured" });
      }

      const phoneMatch = inputStr.match(/\b(\+?251\d{9})\b/) || inputStr.match(/\b(0\d{9})\b/);
      const phoneNumber = normalizeEthiopianPhone(phoneMatch ? phoneMatch[1] : "");
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required for CBE Birr verification" });
      }

      const parsed = await getCBEBirrReceiptDetail(extractedTransactionId, phoneNumber, token);
      if (parsed.error) return res.status(400).json({ message: parsed.error });

      const fetchedAmount = Number(parsed.amount);
      if (!Number.isFinite(fetchedAmount) || Math.abs(fetchedAmount - parsedAmount) > 0.01) {
        return res.status(400).json({
          message: `Amount mismatch. Intended ${parsedAmount.toFixed(2)} ETB, receipt shows ${Number.isFinite(fetchedAmount) ? fetchedAmount.toFixed(2) : "N/A"
            } ETB`,
        });
      }
    } else if (normalizedPaymentMethod === "Dashen") {
      const parsed = await getDashenReceiptDetail(extractedTransactionId);
      if (parsed.error) return res.status(400).json({ message: parsed.error });

      const fetchedAmount = Number(parsed.amount);
      if (!Number.isFinite(fetchedAmount) || Math.abs(fetchedAmount - parsedAmount) > 0.01) {
        return res.status(400).json({
          message: `Amount mismatch. Intended ${parsedAmount.toFixed(2)} ETB, receipt shows ${Number.isFinite(fetchedAmount) ? fetchedAmount.toFixed(2) : "N/A"
            } ETB`,
        });
      }
    }

    // Upsert transaction after validation
    let transaction = await Transaction.findOne({
      transactionId: extractedTransactionId,
    });
    if (!transaction) {
      transaction = await Transaction.create({
        userId: user._id,
        transactionId: extractedTransactionId,
        amount: parsedAmount,
        paymentMethod: normalizedPaymentMethod,
        status: TransactionStatus.PENDING,
        date: new Date(),
        timestamp: new Date(),
        sender: user.fullName || "Unknown",
        source: "sms",
        type: "deposit",
      });
    }
    if (transaction.status === TransactionStatus.COMPLETED) {
      return res.status(400).json({
        message:
          "*የተጠናቀቀ ግብይት*\n\nይህ ክፍያ አስቀድሞ ተጠናቅቋል።\n🔹 እባክዎ እንደገና ለመጀመር /start ይጫኑ ወይም ከmenu ይምረጡ።",
      });
    }
    if (Number(transaction.amount) !== parsedAmount) {
      return res.status(400).json({
        message: `Amount mismatch: transaction amount is ${transaction.amount}, you entered ${amount}`,
      });
    }

    // Credit wallet
    transaction.userId = user._id;
    transaction.status = TransactionStatus.COMPLETED;

    const { depositBonus } = await getAppSettings();
    const { bonusAmount, creditedAmount, percentApplied } = computeDepositBonus(
      parsedAmount,
      depositBonus
    );
    transaction.creditedAmount = creditedAmount;
    transaction.bonusAmount = bonusAmount;
    transaction.bonusPercent = percentApplied;
    // Base deposit amount goes to wallet (real money)
    user.wallet = (Number(user.wallet) || 0) + parsedAmount;
    // Deposit bonus goes to bonus (play-only balance)
    if (bonusAmount > 0) {
      user.bonus = (Number(user.bonus) || 0) + bonusAmount;
    }
    await Promise.all([transaction.save(), user.save()]);

    // Award referral bonus (first-deposit based, settings-driven)
    const referralResult = await awardReferralBonusForFirstDeposit(user, {
      hasCompletedDepositBefore: alreadyDepositedBefore,
      depositAmount: creditedAmount,
    });

    // Notify user and admins
    if (telegramId && user.role !== "robot" && !telegramId.startsWith("web_")) {
      const bonusText = bonusAmount > 0 ? ` (+${bonusAmount} ETB bonus)` : "";
      const userMessage = `Your automatic deposit of ${parsedAmount} ETB${bonusText} has been approved! New wallet balance: ${user.wallet} ETB`;
      await NotifyUserTelegram(telegramId, userMessage);
    }
    const adminMessage =
      `📥 <b>Automatic Deposit Processed</b>\n` +
      `👤 Telegram ID: ${telegramId}\n` +
      `🧑 Full Name: ${user.fullName || "Unknown"}\n` +
      `📞 Phone: ${user.phone || "Not provided"}\n` +
      `💸 Amount: ${parsedAmount} ETB${bonusText}\n` +
      `🏦 Method: ${transaction.paymentMethod}\n` +
      `🔢 Transaction ID: ${extractedTransactionId}\n` +
      `📊 Status: ${transaction.status}`;
    await sendTelegramMessage(adminMessage);

    // Socket wallet update
    req.io
      .to(user._id.toString())
      .emit("walletUpdate", { wallet: user.wallet, bonus: user.bonus });

    if (referralResult?.inviter?._id) {
      req.io
        .to(referralResult.inviter._id.toString())
        .emit("walletUpdate", { wallet: referralResult.inviter.wallet, bonus: referralResult.inviter.bonus });
    }

    return res
      .status(200)
      .json({ message: "Automatic deposit successful", wallet: user.wallet });
  } catch (error) {
    logger.error("smsDeposit: error processing automatic deposit", {
      err: error,
      telegramId,
      amount,
      paymentMethod,
    });
    if (error.code === 11000) {
      return res.status(409).json({ message: "Duplicate transaction ID" });
    }
    try {
      // await NotifyUserTelegram(
      //   req.body.telegramId,
      //   `❌ Failed to process your automatic deposit of ${amount} ETB. Please try again or contact support.`
      // );
    } catch (_) { }
    const adminErrorMessage =
      `❌ <b>Automatic Deposit Failed</b>\n` +
      `👤 Telegram ID: ${req.body.telegramId}\n` +
      `💸 Amount: ${amount} ETB\n` +
      `🔢 Transaction ID: ${extractedTransactionId || "N/A"}\n` +
      `📜 Error: ${error.message}`;
    try {
      await sendTelegramMessage(adminErrorMessage);
    } catch (_) { }
    return res
      .status(500)
      .json({ message: "" });
  }
};

module.exports = {
  validateAutomaticDeposit,
  automaticDeposit,
};