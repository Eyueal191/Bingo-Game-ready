const { t } = require("./localization");
const { getUserContactInfoByTelegramId } = require("./utils/botUserService");

async function getUserDetails(telegramId) {
  return getUserContactInfoByTelegramId(telegramId, "en", t);
}

module.exports = {
  getUserDetails,
};
