const User = require("../../models/userModels");
const { updateProfileSchema } = require("../../lib/schema");
const { sanitizeAndValidatePhone } = require("../../utils/phoneUtils");

async function getUserByTelegramId(telegramId) {
  const normalizedTelegramId = telegramId?.toString();
  if (!normalizedTelegramId) return null;
  return User.findOne({ telegramId: normalizedTelegramId });
}

async function getUserContactInfoByTelegramId(telegramId, lang, t) {
  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user || user.isBanned) {
      return {
        fullName: t ? t("unknown_user", lang) : "Unknown",
        phone: t ? t("phone_not_provided", lang) : "",
      };
    }

    return {
      fullName: user.fullName || (t ? t("unknown_user", lang) : "Unknown"),
      phone: user.phone || (t ? t("phone_not_provided", lang) : ""),
    };
  } catch {
    return {
      fullName: t ? t("unknown_user", lang) : "Unknown",
      phone: t ? t("phone_not_provided", lang) : "",
    };
  }
}

async function updateUserFullNameByTelegramId(telegramId, fullName) {
  const normalizedTelegramId = telegramId?.toString();
  if (!normalizedTelegramId) {
    return { ok: false, message: "Invalid telegramId" };
  }

  const { error } = updateProfileSchema.validate({ fullName });
  if (error) {
    return { ok: false, message: error.details?.[0]?.message || "Invalid name" };
  }

  const user = await User.findOne({ telegramId: normalizedTelegramId });
  if (!user) return { ok: false, message: "User not found" };
  if (user.isBanned) return { ok: false, message: "Account is banned" };

  user.fullName = fullName;
  await user.save();
  return { ok: true };
}

/**
 * Senior Optimized Dual-Lookup
 * Fetches both sender and receiver in a single trip to the database
 */
async function getTransferParticipants(senderTelegramId, receiverInput) {
  const senderId = senderTelegramId?.toString();
  const receiverText = receiverInput?.trim();
  if (!senderId || !receiverText) return { sender: null, receiver: null };

  const { phone: normalizedPhone } = sanitizeAndValidatePhone(receiverText);
  const receiverConditions = [];

  // 1. Identification logic for receiver
  if (normalizedPhone) receiverConditions.push({ phone: normalizedPhone });
  if (/^\d{5,13}$/.test(receiverText)) {
    receiverConditions.push({ telegramId: receiverText });
    if (receiverText !== normalizedPhone) receiverConditions.push({ phone: receiverText });
  } else if (receiverText.startsWith("+")) {
    receiverConditions.push({ phone: receiverText });
  }

  // 2. Optimized single-query find
  const users = await User.find({
    $or: [{ telegramId: senderId }, ...receiverConditions],
  });

  const sender = users.find((u) => u.telegramId === senderId);
  const receiver = users.find((u) => {
    // If it's a self-transfer, sender and receiver are the same user
    // We prioritize matching recipient conditions
    return (
      u.telegramId === receiverText ||
      u.phone === receiverText ||
      u.phone === normalizedPhone
    );
  });

  return { sender, receiver };
}

module.exports = {
  getUserByTelegramId,
  getUserContactInfoByTelegramId,
  updateUserFullNameByTelegramId,
  getTransferParticipants,
};
