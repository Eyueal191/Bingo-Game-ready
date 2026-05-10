const { t, getLang } = require("./localization");
const { getUserJwtToken } = require("./utils/getUserJwtToken");
const { backendApiClient, withAuth } = require("./utils/backendApiClient");
const logger = require("../utils/winstonLogger");

/**
 * Get rank display with medal for top 3
 */
const getRankDisplay = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
};

async function handleLeaderboard(bot, chatId) {
    const lang = await getLang(chatId);
    logger.info("Leaderboard requested", { userId: chatId });

    // Send loading message first
    let loadingMsg;
    try {
        loadingMsg = await bot.sendMessage(chatId, `⏳ ${t("loading", lang) || "Loading..."}`, {
            parse_mode: "HTML",
        });
    } catch (err) {
        logger.warn("Failed to send loading message", { error: err?.message });
    }

    try {
        const jwtToken = await getUserJwtToken(chatId);
        if (!jwtToken) {
            if (loadingMsg) {
                await bot.editMessageText(t("authentication_failed", lang), {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                });
            } else {
                await bot.sendMessage(chatId, t("authentication_failed", lang));
            }
            return;
        }

        const response = await backendApiClient.get(
            "/api/v1/games-history/leaderboard?period=today&limit=10",
            withAuth(jwtToken)
        );

        const data = response.data || {};
        const leaderboard = Array.isArray(data.leaderboard) ? data.leaderboard : [];
        const currentUser = data.currentUser;

        if (leaderboard.length === 0) {
            if (loadingMsg) {
                await bot.editMessageText(t("leaderboard_empty", lang), {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                });
            } else {
                await bot.sendMessage(chatId, t("leaderboard_empty", lang));
            }
            return;
        }

        // Build gaming-style header
        let message = `🏆 <b>${t("leaderboard_title", lang)}</b> 🏆\n`;
        message += `╔═══════════════════════╗\n`;

        // Build player rows
        const topPlayers = leaderboard.slice(0, 10);
        topPlayers.forEach((player, index) => {
            const rank = player.rank || index + 1;
            const rankDisplay = getRankDisplay(rank);

            // Get display name (truncate if needed)
            let name = player.displayName || player.fullName || "Player";
            if (name.length > 12) {
                name = name.slice(0, 10) + "..";
            }

            const points = Number(player.points || 0);
            const games = Number(player.gamesPlayed || 0);

            // Format row with padding for alignment
            if (rank <= 3) {
                message += `║ ${rankDisplay} <b>${name}</b>\n`;
                message += `║    💎 ${points} pts  •  🎮 ${games} games\n`;
            } else {
                message += `║ ${rankDisplay.padEnd(3)} ${name}\n`;
                message += `║    💎 ${points} pts  •  🎮 ${games} games\n`;
            }

            // Add separator between players (except last)
            if (index < topPlayers.length - 1) {
                message += `║ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─\n`;
            }
        });

        message += `╚═══════════════════════╝\n`;

        // Show current user's position
        const currentUserInTopTen = currentUser && topPlayers.some(p => p.isCurrentUser);
        if (currentUser && currentUser.rank && !currentUserInTopTen) {
            message += `\n⭐ <b>${t("leaderboard_your_position", lang)}</b>\n`;
            message += `┌───────────────────────┐\n`;
            message += `│ #${currentUser.rank}  💎 ${currentUser.points || 0} pts  🎮 ${currentUser.gamesPlayed || 0}\n`;
            message += `└───────────────────────┘\n`;
        } else if (currentUser && currentUserInTopTen) {
            message += `\n🔥 ${t("leaderboard_you_in_top", lang).replace("{rank}", currentUser.rank || "-")}\n`;
        }

        message += `\n🎯 ${t("leaderboard_footer", lang)}`;

        // Edit the loading message with the result
        if (loadingMsg) {
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true,
            });
        } else {
            await bot.sendMessage(chatId, message, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
            });
        }
    } catch (error) {
        logger.error("Leaderboard fetch error", {
            error: error?.response?.data || error?.message,
        });
        if (loadingMsg) {
            await bot.editMessageText(t("leaderboard_fetch_failed", lang), {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
            });
        } else {
            await bot.sendMessage(chatId, t("leaderboard_fetch_failed", lang));
        }
    }
}

module.exports = { handleLeaderboard };