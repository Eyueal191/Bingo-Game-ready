require("dotenv").config();
const { t, getLang } = require("./localization");
const CONFIG = require("../config/config");
const { getUserJwtToken } = require("./utils/getUserJwtToken");
const { backendApiClient, withAuth } = require("./utils/backendApiClient");
const { escapeHtml } = require("./utils/sanitizeTelegram");
const logger = require("../utils/winstonLogger");

async function handleBalance(bot, chatId) {
  const lang = await getLang(chatId);
  logger.info("Balance check requested", { userId: chatId });

  try {
    const jwtToken = await getUserJwtToken(chatId);
    if (!jwtToken) {
      await bot.sendMessage(chatId, t("authentication_failed", lang));
      return;
    }

    const response = await backendApiClient.get(
      `/api/v1/users/balance/${chatId}`,
      withAuth(jwtToken)
    );
    const { wallet, fullName, bonus, phone } = response.data;

    // Sanitize dynamic data
    const safeFullName = escapeHtml(fullName);
    const safePhone = escapeHtml(phone);
    const safeWallet = escapeHtml(wallet.toString());
    const safeBonus = escapeHtml(bonus.toString());

    const balanceMessage = `
<b>${t("your_bingo_wallet", lang)}</b>
<pre>
👤 ${t("user_name", lang)}   : ${safeFullName}
📞 ${t("user_phone", lang)}  : ${safePhone}
💰 ${t("user_balance", lang)} : ${safeWallet} ETB
🎁 ${t("user_bonus", lang)}   : ${safeBonus} ETB
</pre>
<b>🎯 ${t("balance_tip", lang)}</b>
`;
    const followUpMessage = t("explore_more", lang);

    const fullMessage = balanceMessage + followUpMessage;
    if (CONFIG.isDevelopment) {
      logger.debug("[balance] sending balance message", { chatId });
    }

    await bot.sendMessage(chatId, fullMessage, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    logger.error("Failed to fetch balance", {
      error: error?.message || String(error),
      userId: chatId,
    });
    await bot.sendMessage(chatId, t("failed_to_fetch_balance", lang));
  }
}

module.exports = { handleBalance };
