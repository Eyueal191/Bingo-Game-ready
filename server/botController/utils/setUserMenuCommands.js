const { t } = require("../localization");
const logger = require("../../utils/winstonLogger");

async function setUserMenuCommands(bot, chatId, lang, isRegistered) {
    try {
        const commands = [
            { command: "start", description: t("start_command", lang) },
            ...(isRegistered ? [] : [{ command: "register", description: t("register_command", lang) }]),
            ...(isRegistered ? [{ command: "play", description: t("play_command", lang) }] : []),
            ...(isRegistered ? [{ command: "balance", description: t("balance_command", lang) }] : []),
            ...(isRegistered ? [{ command: "deposit", description: t("deposit_command", lang) }] : []),
            ...(isRegistered ? [{ command: "withdraw", description: t("withdraw_command", lang) }] : []),
            ...(isRegistered ? [{ command: "transfer", description: t("transfer_command", lang) }] : []),
            ...(isRegistered ? [{ command: "invite", description: t("invite_command", lang) }] : []),
            ...(isRegistered ? [{ command: "checktransaction", description: t("check_transaction_command", lang) }] : []),
            ...(isRegistered ? [{ command: "gamehistory", description: t("game_history_command", lang) }] : []),
            { command: "howtoplay", description: t("how_to_play_command", lang) },
            { command: "support", description: t("support_command", lang) },
            { command: "language", description: t("language_button", lang) },
        ];

        await bot.setMyCommands(commands, {
            scope: { type: "chat", chat_id: chatId },
        });
    } catch (error) {
        logger.warn("Failed to set user menu commands", { chatId, error: error?.message });
    }
}

module.exports = { setUserMenuCommands };