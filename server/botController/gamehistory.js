const { t, getLang } = require("./localization");
const CONFIG = require("../config/config");
const { getUserJwtToken } = require("./utils/getUserJwtToken");
const { getUserContactInfoByTelegramId } = require("./utils/botUserService");
const { backendApiClient, withAuth } = require("./utils/backendApiClient");
const { sanitizeForMarkdownCodeBlock } = require("./utils/sanitizeTelegram");
const logger = require("../utils/winstonLogger");

async function handleGameHistory(bot, chatId) {
  const lang = await getLang(chatId);
  logger.info("Game history requested", { userId: chatId });

  try {
    const jwtToken = await getUserJwtToken(chatId);
    if (!jwtToken) {
      bot.sendMessage(chatId, t("authentication_failed", lang));
      return;
    }

    const { fullName } = await getUserContactInfoByTelegramId(chatId, lang, t);

    const response = await backendApiClient.get(
      "/api/v1/games-history/mine?limit=10",
      withAuth(jwtToken)
    );

    const raw = response.data;
    const gameHistory = Array.isArray(raw?.gameHistory) ? raw.gameHistory : [];

    const games = gameHistory.map((g) => {
      const stake = Number(g.stake);
      const winAmount = Number(g.gameWinning);
      const id = typeof g.id === "string" ? g.id : "";

      return {
        name: fullName,
        game: id ? id.slice(-6) : "-",
        amount: Number.isFinite(stake) ? stake : 0,
        status:
          typeof g.result === "string" && g.result.toLowerCase() === "won"
            ? "won"
            : "lost",
        winAmount: Number.isFinite(winAmount) ? winAmount : 0,
      };
    });

    if (games.length === 0) {
      bot.sendMessage(chatId, t("no_game_history", lang));
      return;
    }

    const copyableMessage = `
\`\`\`text
${t("game_history_title", lang)}
${games
  .map((game) => {
    const status = game.status.charAt(0).toUpperCase() + game.status.slice(1);
    const statusIcon = game.status === "won" ? "🏆" : "🔴";
    const amount = game.amount.toFixed(2);
    const safeName = sanitizeForMarkdownCodeBlock(game.name);
    const safeGame = sanitizeForMarkdownCodeBlock(game.game);
    return `
👤 ${t("history_name", lang)}:   ${pad(safeName, 12)}
🎲 ${t("history_game", lang)}:   ${pad(safeGame, 12)}
💸 ${t("history_amount", lang)}: ${pad(`${amount} ETB`, 12)}
${statusIcon} ${t("history_status", lang)}: ${pad(status, 12)}${
      game.status === "won"
        ? `\n🎁 ${t("history_prize", lang)}:  ${pad(
            `${game.winAmount} ETB`,
            12
          )}`
        : ""
    }
──────────────────`;
  })
  .join("")}
${t("game_history_footer", lang)}
\`\`\`
`;
    const followUpMessage = t("explore_more", lang);

    bot.sendMessage(chatId, copyableMessage + followUpMessage, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Game history fetch error", {
      error: error?.response?.data || error?.message,
    });
    bot.sendMessage(chatId, t("failed_to_fetch_history", lang));
  }
}

// Helper function to pad strings for alignment
function pad(str, length) {
  return str.toString().padEnd(length, " ");
}

module.exports = { handleGameHistory };
