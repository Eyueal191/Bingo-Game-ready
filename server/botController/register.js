const crypto = require("crypto");
const { t, getLang } = require("./localization");
const { backendApiClient } = require("./utils/backendApiClient");
const logger = require("../utils/winstonLogger");

async function handleRegister(bot, chatId, userStates) {
  const lang = await getLang(chatId);
  logger.info("Register started", { chatId });

  // Preserve any existing referralCode and add step
  userStates[chatId] = {
    ...(userStates[chatId] || {}),
    step: "enter_password",
    _lastActiveAt: Date.now(),
  };
  bot.sendMessage(chatId, t("enter_password_prompt", lang), {
    reply_markup: {
      keyboard: [[{ text: t("skip_button", lang) }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

async function handleContact(bot, msg, referralCode = null, userStates) {
  const lang = await getLang(msg.chat.id);
  try {
    const contact = msg.contact;

    if (!contact || !contact.phone_number) {
      bot.sendMessage(msg.chat.id, t("invalid_contact", lang));
      return;
    }

    const password = userStates[msg.chat.id]?.password || crypto.randomBytes(16).toString("hex");

    const userData = {
      telegramId: String(msg.from.id),
      fullName:
        contact.first_name || msg.from.first_name || t("unknown_user", lang),
      phone: contact.phone_number,
      password,
    };

    // Always use stored referralCode from userStates if not passed directly
    const code = referralCode || userStates[msg.chat.id]?.referralCode;
    if (code) {
      userData.invitedBy = code;
    }

    logger.debug("Submitting registration to API", {
      chatId: msg.chat.id,
      telegramId: userData.telegramId,
      hasInviteCode: Boolean(userData.invitedBy),
    });

    const response = await backendApiClient.post("/api/v1/auth/register", userData);
    const isLinked = response.data?.linked;

    bot.sendMessage(
      msg.chat.id,
      t(isLinked ? "registration_linked_success" : "registration_success", lang, {
        fullName: response.data?.user?.fullName || userData.fullName,
        phone: response.data?.user?.phone || userData.phone,
      })
    );

    // Reset bot keyboard to registered state
    const { handleStart } = require("./botHandlers");
    await handleStart(bot, msg.chat.id);

    delete userStates[msg.chat.id];
  } catch (error) {
    logger.error("Registration error", {
      chatId: msg.chat.id,
      error: error?.response?.data || error?.message,
    });
    bot.sendMessage(
      msg.chat.id,
      t("registration_failed", lang, {
        error: error.response?.data?.message || t("unknown_error", lang),
      })
    );
  }
}

async function handlePasswordInput(bot, chatId, text, userStates) {
  const lang = await getLang(chatId);
  if (userStates[chatId] && typeof userStates[chatId] === "object") {
    userStates[chatId]._lastActiveAt = Date.now();
  }
  if (text.toLowerCase() === "skip") {
    userStates[chatId].password = crypto.randomBytes(16).toString("hex");
  } else if (text.length < 6) {
    bot.sendMessage(chatId, t("password_too_short", lang));
    return;
  } else {
    userStates[chatId].password = text;
  }

  userStates[chatId].step = "share_contact";
  bot.sendMessage(chatId, t("share_contact_prompt", lang), {
    reply_markup: {
      keyboard: [
        [{ text: t("share_contact_button", lang), request_contact: true }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

module.exports = { handleRegister, handleContact, handlePasswordInput };
