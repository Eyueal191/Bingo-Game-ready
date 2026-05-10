const { t, getLang } = require("../localization");
const logger = require("../../utils/winstonLogger");
const { getUserJwtToken } = require("../utils/getUserJwtToken");
const { handleRegister } = require("../register");
const { userStates } = require("../state/userState");
const { handleAutomaticDeposit } = require("./automaticDeposit");

async function handleDeposit(bot, chatId) {
  const lang = await getLang(chatId);
  logger.info("Deposit requested", { userId: chatId });

  try {
    const jwtToken = await getUserJwtToken(chatId);
    if (!jwtToken) {
      return handleRegister(bot, chatId, userStates);
    }
console.log('deposit state: ',bot.depositState);
    // Bypass flow selection and directly show banks using automatic flow
    return handleAutomaticDeposit(bot, chatId, bot.depositState);
  } catch (error) {
    logger.error("Error handling deposit", { userId: chatId, error: error?.message || String(error) });
    bot.sendMessage(chatId, t("failed_to_show_payment_methods", lang));
  }
}

module.exports = {
  handleDeposit,
};
