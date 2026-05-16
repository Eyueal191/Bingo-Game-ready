const {
  Transaction,
  TransactionType,
  TransactionStatus,
} = require("../models/Transaction");
const logger = require("../utils/winstonLogger");
const {
  NotifyUserTelegram,
  sendTelegramMessage,
} = require("../botController/notification");
const User = require("../models/userModels");
const { getAppSettings } = require("../services/appSettingsService");
const { computeDepositBonus } = require("../utils/depositBonus");
const {
  awardReferralBonusForFirstDeposit,
  hasCompletedDepositBefore,
} = require("../services/referralBonusService");

const cloneForMetadata = (data) => {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    return {
      serializationError: error.message,
    };
  }
};

const appendCallbackMetadata = (transaction, entry) => {
  const baseMetadata =
    transaction.metadata && typeof transaction.metadata === "object"
      ? { ...transaction.metadata }
      : {};

  const callbacks = Array.isArray(baseMetadata.callbacks)
    ? [...baseMetadata.callbacks]
    : [];

  callbacks.push(entry);
  baseMetadata.callbacks = callbacks;
  transaction.metadata = baseMetadata;

  if (typeof transaction.markModified === "function") {
    transaction.markModified("metadata");
  }
};

const handleDepositSuccessCallback = async (callbackData) => {
  const {
    nonce,
    payment_status,
    order,
    addispay_transaction_id,
    paymnet_reason,
  } = callbackData;

  if (!nonce || !payment_status || !order || payment_status !== "success") {
    logger.error("Invalid deposit success callback data", {
      nonce,
      payment_status,
      addispay_transaction_id,
    });
    throw new Error(
      "Invalid callback data: missing required fields or incorrect status"
    );
  }

  logger.info("Processing deposit success callback", {
    nonce,
    payment_status,
    addispay_transaction_id,
  });

  let transaction = await Transaction.findOne({
    addispayNonce: nonce,
    status: TransactionStatus.PENDING,
  });

  if (!transaction) {
    logger.error("Transaction not found or already processed", { nonce });
    throw new Error("Transaction not found or already processed");
  }

  const userId = transaction.userId;
  const user = await User.findById(userId);

  if (!user) {
    logger.error("User not found for deposit callback", { userId, nonce });
    throw new Error("User not found");
  }

  appendCallbackMetadata(transaction, {
    type: "deposit_success",
    status: payment_status,
    receivedAt: new Date().toISOString(),
    payload: cloneForMetadata(callbackData),
  });

  transaction.status = TransactionStatus.COMPLETED;
  transaction.addispayTransactionId = addispay_transaction_id;

  // Needed for referral bonus: determine if this is the user's first completed deposit
  const alreadyDepositedBefore = await hasCompletedDepositBefore(user._id);

  const { depositBonus } = await getAppSettings();
  const { bonusAmount, creditedAmount, percentApplied } = computeDepositBonus(
    order.amount,
    depositBonus
  );

  // Base deposit amount goes to wallet (real money)
  user.wallet = (user.wallet || 0) + Number(order.amount);
  // Deposit bonus goes to bonus (play-only balance)
  if (bonusAmount > 0) {
    user.bonus = (user.bonus || 0) + bonusAmount;
  }
  transaction.creditedAmount = creditedAmount;
  transaction.bonusAmount = bonusAmount;
  transaction.bonusPercent = percentApplied;

  appendCallbackMetadata(transaction, {
    type: "deposit_bonus",
    receivedAt: new Date().toISOString(),
    payload: {
      enabled: Boolean(depositBonus?.enabled),
      percent: percentApplied,
      bonusAmount,
      creditedAmount,
      baseAmount: order.amount,
    },
  });

  await Promise.all([
    user.save({ validateBeforeSave: false }),
    transaction.save(),
  ]);

  // Award referral bonus (first-deposit based, settings-driven)
  const referralResult = await awardReferralBonusForFirstDeposit(user, {
    hasCompletedDepositBefore: alreadyDepositedBefore,
    depositAmount: creditedAmount,
  });

  logger.info("Wallet updated for deposit", {
    userId: user._id,
    updatedWallet: user.wallet,
    depositAmount: order.amount,
    creditedAmount,
    bonusAmount,
    bonusPercent: percentApplied,
  });

  if (user.telegramId && !user.telegramId.startsWith("web_")) {
    const bonusText = bonusAmount > 0 ? ` (+${bonusAmount} ETB bonus)` : "";
    const message = `Your deposit of ${order.amount} ETB${bonusText} has been successfully processed! New wallet balance: ${user.wallet} ETB`;
    const adminMessage = `A deposit of ${order.amount} ETB${bonusText} has been successfully processed for user ${user.fullName}. New wallet balance: ${user.wallet} ETB`;
    try {
      await NotifyUserTelegram(user.telegramId, message);
      await sendTelegramMessage(adminMessage);
      logger.info("Deposit notification sent via Telegram", {
        userId: user._id,
        telegramId: user.telegramId,
      });
    } catch (notificationError) {
      logger.error("Failed to send deposit notification", {
        userId: user._id,
        telegramId: user.telegramId,
        error: notificationError.message,
      });
    }
  }

  logger.info("Deposit transaction processed", {
    nonce,
    status: transaction.status,
    userId: user._id,
  });

  return { transaction, referralResult, user };
};

const handleDepositFailureCallback = async (callbackData) => {
  const {
    nonce,
    payment_status,
    order,
    addispay_transaction_id,
    paymnet_reason,
  } = callbackData;

  if (!nonce || !payment_status || !order || payment_status !== "failure") {
    logger.error("Invalid deposit failure callback data", {
      nonce,
      payment_status,
      addispay_transaction_id,
    });
    throw new Error(
      "Invalid callback data: missing required fields or incorrect status"
    );
  }

  logger.info("Processing deposit failure callback", {
    nonce,
    payment_status,
    addispay_transaction_id,
  });

  let transaction = await Transaction.findOne({
    addispayNonce: nonce,
    status: TransactionStatus.PENDING,
  });

  if (!transaction) {
    logger.error("Transaction not found or already processed", { nonce });
    throw new Error("Transaction not found or already processed");
  }

  const userId = transaction.userId;
  const user = await User.findById(userId);

  if (!user) {
    logger.error("User not found for deposit callback", { userId, nonce });
    throw new Error("User not found");
  }

  appendCallbackMetadata(transaction, {
    type: "deposit_failure",
    status: payment_status,
    receivedAt: new Date().toISOString(),
    payload: cloneForMetadata(callbackData),
  });

  transaction.status = TransactionStatus.FAILED;
  transaction.addispayTransactionId = addispay_transaction_id;

  await transaction.save();

  logger.info("Deposit failed", {
    userId: user._id,
    username: user.fullName,
    depositAmount: order.amount,
    reason: paymnet_reason,
  });

  if (user.telegramId) {
    const message = `Your deposit of ${order.amount} ETB has failed. Reason: ${
      paymnet_reason || "Unknown"
    }`;
    const adminMessage = `A deposit of ${
      order.amount
    } ETB has failed for user ${user.fullName}. Reason: ${
      paymnet_reason || "Unknown"
    }`;
    try {
      await NotifyUserTelegram(user.telegramId, message);
      await sendTelegramMessage(adminMessage);
      logger.info("Deposit failure notification sent via Telegram", {
        userId: user._id,
        telegramId: user.telegramId,
      });
    } catch (notificationError) {
      logger.error("Failed to send deposit failure notification", {
        userId: user._id,
        telegramId: user.telegramId,
        error: notificationError.message,
      });
    }
  }

  logger.info("Deposit transaction processed", {
    nonce,
    status: transaction.status,
    userId: user._id,
  });

  return transaction;
};

const handleWithdrawalCallback = async (callbackData) => {
  const { resource_id, data, event_type, signature } = callbackData;
  const { id: transaction_id, status, amount } = data || {};

  if (!resource_id || !status || !transaction_id || !event_type) {
    logger.error("Invalid withdrawal callback data", {
      resource_id,
      status,
      transaction_id,
      event_type,
    });
    throw new Error(
      "Invalid callback data: missing resource_id, status, transaction_id, or event_type"
    );
  }

  // Optional: Add signature validation if Addispay provides a signature
  // if (signature) {
  //   const expectedSignature = calculateSignature(callbackData, CONFIG.addispayWebhookSecret);
  //   if (signature !== expectedSignature) {
  //     logger.error("Invalid webhook signature", { resource_id, signature });
  //     throw new Error("Invalid webhook signature");
  //   }
  // }

  logger.info("Processing withdrawal callback", {
    resource_id,
    status,
    transaction_id,
    event_type,
  });

  let transaction = await Transaction.findOne({
    addispayNonce: resource_id,
    status: TransactionStatus.PENDING,
  });

  if (!transaction) {
    logger.error("Transaction not found or already processed", { resource_id });
    throw new Error("Transaction not found or already processed");
  }

  const userId = transaction.userId;
  const user = await User.findById(userId);

  if (!user) {
    logger.error("User not found for withdrawal callback", {
      userId,
      resource_id,
    });
    throw new Error("User not found");
  }

  appendCallbackMetadata(transaction, {
    type: "withdrawal_callback",
    status,
    event: event_type,
    receivedAt: new Date().toISOString(),
    payload: cloneForMetadata(callbackData),
  });

  if (status === "refund" && event_type === "refund_success") {
    transaction.status = TransactionStatus.COMPLETED;
    transaction.addispayTransactionId = transaction_id;

    // Wallet already deducted in withdraw function, no further deduction needed
    if (user.wallet < 0) {
      logger.error("Negative wallet balance after withdrawal", {
        userId,
        wallet: user.wallet,
        withdrawalAmount: amount,
      });
      throw new Error("Negative wallet balance");
    }

    await Promise.all([
      user.save({ validateBeforeSave: false }),
      transaction.save(),
    ]);

    logger.info("Withdrawal processed successfully", {
      userId: user._id,
      updatedWallet: user.wallet,
      withdrawalAmount: amount,
    });

    if (user.telegramId) {
      const message = `✅ Your withdrawal of ${amount} ETB has been successfully processed! New wallet balance: ${user.wallet} ETB`;
      const adminMessage = `✅ A withdrawal of ${amount} ETB has been successfully processed for user ${user.fullName}. New wallet balance: ${user.wallet} ETB`;
      try {
        await NotifyUserTelegram(user.telegramId, message);
        await sendTelegramMessage(adminMessage);
        logger.info("Withdrawal notification sent via Telegram", {
          userId: user._id,
          telegramId: user.telegramId,
        });
      } catch (notificationError) {
        logger.error("Failed to send withdrawal notification", {
          userId: user._id,
          telegramId: user.telegramId,
          error: notificationError.message,
        });
      }
    }
  } else {
    transaction.status = TransactionStatus.FAILED;
    transaction.addispayTransactionId = transaction_id;

    // Rollback wallet balance if not already deducted
    user.wallet = (user.wallet || 0) + amount;

    await Promise.all([
      user.save({ validateBeforeSave: false }),
      transaction.save(),
    ]);

    logger.info("Withdrawal failed, wallet rolled back", {
      userId: user._id,
      username: user.fullName,
      withdrawalAmount: amount,
      newWalletBalance: user.wallet,
      status,
      event_type,
    });

    if (user.telegramId) {
      const message = `❌ Your withdrawal of ${amount} ETB has failed. Reason: ${
        status || "Unknown"
      }. Amount has been refunded to your wallet: ${user.wallet} ETB`;
      const adminMessage = `❌ A withdrawal of ${amount} ETB has failed for user ${
        user.fullName
      }. Reason: ${status || "Unknown"}. Wallet balance restored: ${
        user.wallet
      } ETB`;
      try {
        await NotifyUserTelegram(user.telegramId, message);
        await sendTelegramMessage(adminMessage);
        logger.info("Withdrawal failure notification sent via Telegram", {
          userId: user._id,
          telegramId: user.telegramId,
        });
      } catch (notificationError) {
        logger.error("Failed to send withdrawal failure notification", {
          userId: user._id,
          telegramId: user.telegramId,
          error: notificationError.message,
        });
      }
    }
  }

  logger.info("Withdrawal transaction processed", {
    resource_id,
    status: transaction.status,
    userId: user._id,
  });

  return transaction;
};

module.exports = {
  handleDepositSuccessCallback,
  handleDepositFailureCallback,
  handleWithdrawalCallback,
};