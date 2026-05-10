const { t, getLang } = require("./localization");
const { getUserJwtToken } = require("./utils/getUserJwtToken");
const { backendApiClient, withAuth } = require("./utils/backendApiClient");
const logger = require("../utils/winstonLogger");

async function handleCheckTransaction(bot, chatId) {
  const lang = await getLang(chatId);
  logger.info("Check transaction requested", { userId: chatId });

  try {
    const jwtToken = await getUserJwtToken(chatId);
    if (!jwtToken) {
      bot.sendMessage(chatId, t("authentication_failed", lang));
      return;
    }

    const response = await backendApiClient.get(
      "/api/v1/transactions/mine",
      withAuth(jwtToken)
    );

    const transactions = Array.isArray(response.data) ? response.data : [];

    if (transactions.length === 0) {
      bot.sendMessage(chatId, t("no_recent_transactions", lang));
      return;
    }

    const message = transactions
      .slice(0, 5)
      .map((tx, index) => {
        return t("transaction_item", lang, {
          index: index + 1,
          type: tx.type,
          amount: tx.amount,
          status: tx.status,
          date: new Date(tx.createdAt).toLocaleString(),
          reference: tx.reference,
        });
      })
      .join("\n\n");

    bot.sendMessage(
      chatId,
      `${t("recent_transactions_title", lang)}\n\n${message}`
    );
  } catch (error) {
    logger.error("Transaction fetch error", {
      userId: chatId,
      error: error?.response?.data || error?.message,
    });
    bot.sendMessage(chatId, t("failed_to_fetch_transactions", lang));
  }
}

module.exports = { handleCheckTransaction };
