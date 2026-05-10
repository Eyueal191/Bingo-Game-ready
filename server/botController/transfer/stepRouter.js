const { processTransferReceiver, processTransferAmount } = require("./transfer");

/**
 * Routes text input to the correct transfer flow step handler.
 * Returns true if the message was handled by this router.
 */
async function handleTransferText(bot, chatId, text, state, ctx) {
    const currentState = state[chatId];
    if (!currentState) {
        return false;
    }

    if (currentState.step === "transfer_receiver") {
        await processTransferReceiver(bot, chatId, text, state, ctx);
        return true;
    }

    if (currentState.step === "transfer_amount") {
        await processTransferAmount(bot, chatId, text, state, ctx);
        return true;
    }

    return false;
}

module.exports = {
    handleTransferText,
};