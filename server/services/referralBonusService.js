const AdminSetting = require("../models/adminSetting");
const User = require("../models/userModels");
const ManualTransaction = require("../models/DepositRequest");
const {
  Transaction: WalletTransaction,
  TransactionType,
  TransactionStatus,
} = require("../models/Transaction");

const logger = require("../utils/winstonLogger");
const {
  NotifyUserTelegram,
  sendTelegramMessage,
} = require("../botController/notification");

// Normalize comparisons when working with ObjectId values
const sameObjectId = (a, b) => {
  if (!a || !b) return false;
  return a.toString() === b.toString();
};

/**
 * Checks whether the user has any completed deposits recorded across
 * supported data sources (AddisPay, manual, SMS/automatic).
 */
const hasCompletedDepositBefore = async (userId) => {
  if (!userId) return false;

  const [walletDeposit, manualDeposit, smsDeposit] = await Promise.all([
    WalletTransaction.exists({
      userId,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
    }),
    ManualTransaction.exists({ userId, type: "deposit", source: { $ne: "sms" } }), // Manual (check receipt logic usually separate, but exists is basic check)
    ManualTransaction.exists({
      userId,
      source: "sms",
      status: "approved",
    }),
  ]);

  return Boolean(walletDeposit || manualDeposit || smsDeposit);
};

/**
 * Awards a referral bonus to the inviter when an invited user completes
 * their first deposit. Only applies to inviters with the "user" role.
 *
 * @param {object} user - The depositing user mongoose document
 * @param {object} [options]
 * @param {boolean} [options.hasCompletedDepositBefore] - Precomputed flag to skip redundant lookups
 * @param {number} [options.depositAmount] - Amount credited to the invitee for this deposit
 * @returns {Promise<{inviter: object, amount: number, transaction: object} | null>}
 */
const awardReferralBonusForFirstDeposit = async (
  user,
  options = {}
) => {
  if (!user || !user.invitedBy) {
    return null;
  }

  const isInviteeRegular = !user.role || user.role === "user";
  if (!isInviteeRegular) {
    return null;
  }

  const precomputed = options.hasCompletedDepositBefore;
  const alreadyDeposited =
    typeof precomputed === "boolean"
      ? precomputed
      : await hasCompletedDepositBefore(user._id);

  if (alreadyDeposited) {
    return null;
  }

  const settings = await AdminSetting.getSettings();
  if (!settings?.isReferralBonusEnabled) {
    return null;
  }

  const referralBonusPercent = Number(settings.referralBonus) || 0;
  if (referralBonusPercent <= 0) {
    return null;
  }

  const depositAmount = Number(options.depositAmount);
  if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
    return null;
  }

  const inviter = await User.findOne({ referralCode: user.invitedBy });
  if (!inviter) {
    return null;
  }

  const isInviterRegular = !inviter.role || inviter.role === "user";
  if (!isInviterRegular) {
    return null;
  }

  const alreadyRewarded = Array.isArray(inviter.paidInvitedPlayers)
    ? inviter.paidInvitedPlayers.some((id) => sameObjectId(id, user._id))
    : false;

  if (alreadyRewarded) {
    return null;
  }

  const referralBonusAmount = Number(
    ((depositAmount * referralBonusPercent) / 100).toFixed(2)
  );

  if (referralBonusAmount <= 0) {
    return null;
  }

  inviter.bonus = (inviter.bonus || 0) + referralBonusAmount;
  inviter.paidInvitedPlayers = inviter.paidInvitedPlayers || [];
  inviter.paidInvitedPlayers.push(user._id);

  const reference = `referral-bonus-${inviter._id}-${Date.now()}`;
  const description = `Referral bonus for first deposit by ${user.fullName || user.phone || user.telegramId || "referred user"
    }`;

  const referralTransaction = new WalletTransaction({
    userId: inviter._id,
    type: TransactionType.REFERRAL_BONUS,
    amount: referralBonusAmount,
    status: TransactionStatus.COMPLETED,
    reference,
    description,
    metadata: {
      invitedUserId: user._id,
      invitedUserTelegramId: user.telegramId || null,
      triggeredBy: "first_deposit",
      depositAmount,
      referralPercent: referralBonusPercent,
    },
  });

  await Promise.all([
    inviter.save({ validateBeforeSave: false }),
    referralTransaction.save(),
  ]);

  logger.info("Referral bonus awarded", {
    inviterId: inviter._id,
    invitedUserId: user._id,
    amount: referralBonusAmount,
  });

  if (inviter.telegramId) {
    const message =
      `🎉 Referral Bonus Received\n` +
      `You just earned ${referralBonusAmount.toFixed(2)} coins (` +
      `${referralBonusPercent}% of ${depositAmount.toFixed(2)} coins) ` +
      `from ${user.fullName || user.phone || "your referral"}.\n` +
      `New bonus balance: ${inviter.bonus.toFixed(2)} coins.`;

    try {
      await NotifyUserTelegram(inviter.telegramId, message);
    } catch (error) {
      logger.error("Failed to send referral bonus Telegram notification", {
        inviterId: inviter._id,
        invitedUserId: user._id,
        error: error.message,
      });
    }
  }

  const adminMessage =
    `👥 <b>Referral Bonus Awarded</b>\n` +
    `👤 Inviter: ${inviter.fullName || inviter.phone || inviter.telegramId} ` +
    `(${inviter.telegramId || "No Telegram"})\n` +
    `🙋 Referred User: ${user.fullName || user.phone || user.telegramId}\n` +
    `💰 Deposit: ${depositAmount.toFixed(2)} coins\n` +
    `🎁 Bonus: ${referralBonusAmount.toFixed(2)} coins (${referralBonusPercent}%).`;

  try {
    await sendTelegramMessage(adminMessage);
  } catch (error) {
    logger.error("Failed to send admin referral bonus notification", {
      inviterId: inviter._id,
      invitedUserId: user._id,
      error: error.message,
    });
  }

  return {
    inviter,
    amount: referralBonusAmount,
    transaction: referralTransaction,
  };
};

module.exports = {
  awardReferralBonusForFirstDeposit,
  hasCompletedDepositBefore,
};