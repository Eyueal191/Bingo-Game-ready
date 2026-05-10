const { t, getLang } = require("./localization");
const CONFIG = require("../config/config");
const { getUserJwtToken } = require("./utils/getUserJwtToken");
const { backendApiClient, withAuth } = require("./utils/backendApiClient");
const logger = require("../utils/winstonLogger");

const BOT_USERNAME = CONFIG.botUsername || "Timebingobot";

async function handleInvite(bot, chatId) {
  const lang = await getLang(chatId);
  logger.info("Invite requested", { userId: chatId });

  try {
    const jwtToken = await getUserJwtToken(chatId);
    if (!jwtToken) {
      bot.sendMessage(chatId, t("authentication_failed", lang));
      return;
    }

    const response = await backendApiClient.get(
      `/api/v1/users/by-telegram-id/${chatId}`,
      withAuth(jwtToken)
    );
    const referralCode = response.data.referralCode;

    if (!referralCode) {
      throw new Error("No referral code found for user");
    }

    const inviteLink = `https://t.me/${BOT_USERNAME}?start=${referralCode}`;
    bot.sendMessage(
      chatId,
      t("invite_link_message", lang, { inviteLink }) +
        "\n\n" +
        t("invite_rule_1", lang) +
        "\n" +
        t("invite_rule_2", lang) +
        "\n" +
        t("invite_rule_3", lang)
    );
  } catch (error) {
    logger.error("Invite error", {
      userId: chatId,
      error: error?.response?.data || error?.message,
    });
    bot.sendMessage(chatId, t("failed_to_generate_invite_link", lang));
  }
}

module.exports = { handleInvite };
