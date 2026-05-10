const { handleBalance } = require("./balance");
const { handleDeposit } = require("./deposit");
const { handleWithdraw } = require("./withdraw/withdraw");
const { handleRegister } = require("./register");
const { userStates, userStatesStore } = require("./state/userState");
const { t, getLang } = require("./localization");
const logger = require("../utils/winstonLogger");
const { getUserJwtToken } = require("./utils/getUserJwtToken");
const { sendMainMenu } = require("./utils/menuManager");


async function handleStart(bot, chatId, text = "/start") {
  const lang = await getLang(chatId);

  // Parse referral code from /start command
  const args = text.split(" ");
  let referralCode = null;
  if (args.length > 1 && args[1]) {
    referralCode = args[1];
    userStates[chatId] = { referralCode, _lastActiveAt: Date.now() };
    logger.info("Referral code detected", { chatId, hasReferralCode: true });
  }

  let welcomeMessage = null;
  const jwtToken = await getUserJwtToken(chatId);
  const isRegistered = !!jwtToken;

  if (!isRegistered) {
    welcomeMessage = t("welcome_register_now", lang);
  } else if (referralCode) {
    welcomeMessage = t("welcome_with_referral", lang);
  }

  // Use centralized menu manager to send the appropriate menu
  return sendMainMenu(bot, chatId, lang, welcomeMessage);
}

async function handleBasicCommand(bot, chatId, commandName) {
  try {
    bot.sendMessage(chatId, `✅ ትዕዛዙን ተግባራዊ አድርገዋል: /${commandName}.`);
  } catch (error) {
    logger.error("Error handling command", { chatId, commandName, error: error?.message || String(error) });
  }
}

async function handleTextButton(bot, chatId, text, handlePlay, state) {
  const lang = await getLang(chatId);
  switch (text) {
    case t("play_bingo_button", lang):
      return handlePlay(bot, chatId, "bingo");
    case t("register_button", lang):
      return handleRegister(bot, chatId, userStates);
    case t("deposit_button", lang):
      return handleDeposit(bot, chatId);
    case t("check_balance_button", lang):
      return handleBalance(bot, chatId);
    case t("withdraw_button", lang):
      return handleWithdraw(bot, chatId);
    case t("language_button", lang):
      return bot.sendMessage(chatId, t("select_language", lang), {
        reply_markup: {
          inline_keyboard: [
            [
              { text: t("lang_name_en", lang), callback_data: "set_lang_en" },
              { text: t("lang_name_am", lang), callback_data: "set_lang_am" },
            ],
            [
              { text: t("lang_name_om", lang), callback_data: "set_lang_om" },
              { text: t("lang_name_ti", lang), callback_data: "set_lang_ti" },
            ],
          ],
        },
      });
    default:
      return;
  }
}

module.exports = {
  handleStart,
  userStatesStore,
  handleBasicCommand,
  handleTextButton,
  userStates,
};
