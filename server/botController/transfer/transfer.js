const { getLang, t } = require("../localization");
const { getUserJwtToken } = require("../utils/getUserJwtToken");
const { getAppSettings } = require("../../services/appSettingsService");
const { backendApiClient, withAuth } = require("../utils/backendApiClient");
const { getTransferParticipants } = require("../utils/botUserService");
const { NotifyUserTelegram } = require("../notification");
const logger = require("../../utils/winstonLogger");

const formatUserLabel = (user) => {
    if (user.fullName && user.fullName !== "Unknown User") return user.fullName;
    if (user.phone) {
        const p = user.phone;
        // Mask the middle part of the phone for privacy
        return p.length > 7 ? `${p.slice(0, 3)}****${p.slice(-3)}` : p;
    }
    return `ID: ${user.telegramId}`;
};

const handleTransferCommand = async (bot, chatId, depositState) => {
    const lang = await getLang(chatId);
    const jwtToken = await getUserJwtToken(chatId);

    if (!jwtToken) {
        return bot.sendMessage(chatId, t("unauthorized", lang));
    }

    // Clear any existing active state for the user
    delete depositState[chatId];

    depositState[chatId] = {
        step: "transfer_receiver",
    };

    bot.sendMessage(chatId, t("enter_receiver_id", lang), {
        reply_markup: {
            force_reply: true,
        },
    });
};

const processTransferReceiver = async (bot, chatId, text, state, { lang, t }) => {
    const input = text?.trim();
    if (!input || input.length < 3) {
        bot.sendMessage(chatId, t("invalid_receiver_id", lang));
        return;
    }

    // Single-Trip Triple-X Efficiency Dual Lookup (Senior Tier)
    const { sender, receiver } = await getTransferParticipants(chatId, input);

    if (!receiver) {
        bot.sendMessage(chatId, t("recipient_not_found", lang).replace("{{id}}", input));
        return;
    }

    if (!sender) {
        return bot.sendMessage(chatId, t("unauthorized", lang));
    }

    // Self-transfer validation
    if (sender._id.toString() === receiver._id.toString()) {
        bot.sendMessage(chatId, t("transfer_to_self", lang));
        return;
    }

    const { walletRules } = await getAppSettings();
    const min = walletRules?.minTransferAmount || 10;
    const max = walletRules?.maxTransferAmount || 500;

    state[chatId] = {
        step: "transfer_amount",
        receiverId: receiver._id,
        receiverTelegramId: receiver.telegramId,
        receiverName: formatUserLabel(receiver),
        senderName: formatUserLabel(sender),
    };

    // Replace placeholders since we're composing the response manually here with dynamic values
    let amountPrompt = t("enter_transfer_amount", lang);
    amountPrompt = amountPrompt.replace("{{minTransfer}}", min).replace("{{maxTransfer}}", max);

    bot.sendMessage(chatId, amountPrompt, {
        reply_markup: {
            force_reply: true,
        },
    });
};

const processTransferAmount = async (bot, chatId, text, state, { lang, t }) => {
    const amount = parseFloat(text);
    const { walletRules } = await getAppSettings();
    const min = walletRules?.minTransferAmount || 10;
    const max = walletRules?.maxTransferAmount || 500;

    if (isNaN(amount) || amount < min || amount > max) {
        let invalidMsg = t("invalid_transfer_amount", lang);
        invalidMsg = invalidMsg.replace("{{minTransfer}}", min).replace("{{maxTransfer}}", max);
        return bot.sendMessage(chatId, invalidMsg, {
            reply_markup: { force_reply: true },
        });
    }

    const { receiverId, receiverTelegramId, receiverName, senderName } = state[chatId];
    const jwtToken = await getUserJwtToken(chatId);

    try {
        const response = await backendApiClient.post('/api/v1/transfer', {
            receiverId,
            amount,
            isBotFlow: true
        }, withAuth(jwtToken));

        let successMsg = t("transfer_successful", lang);
        successMsg = successMsg.replace("{{amount}}", amount).replace("{{receiver}}", receiverName);
        bot.sendMessage(chatId, successMsg);

        // Notify receiver
        if (receiverTelegramId && !receiverTelegramId.startsWith("web_")) {
            const receiverLang = await getLang(receiverTelegramId);
            let receiveMsg = t("transfer_received", receiverLang);
            receiveMsg = receiveMsg.replace("{{amount}}", amount).replace("{{sender}}", senderName);
            await NotifyUserTelegram(receiverTelegramId, receiveMsg);
        }

    } catch (error) {
        logger.error("Error processing transfer API call", { error: error?.response?.data || error?.message, senderTelegramId: chatId, receiverId });
        const errorMessage = error?.response?.data?.message || t("error_processing_amount", lang);
        bot.sendMessage(chatId, `❌ ${errorMessage}`);
    } finally {
        delete state[chatId]; // Cleanup
    }
};

module.exports = {
    handleTransferCommand,
    processTransferReceiver,
    processTransferAmount,
};