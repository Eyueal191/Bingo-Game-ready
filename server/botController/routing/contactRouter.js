const { handleContact } = require("../register");
const { userStates } = require("../state/userState");

async function handleContactRoute(bot, msg, { logMeta } = {}) {
  const chatId = msg.chat.id;
  const referralCode = userStates[chatId]?.referralCode || null;
  return handleContact(bot, msg, referralCode, userStates);
}

module.exports = { handleContactRoute };
