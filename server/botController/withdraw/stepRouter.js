const { processWithdrawAmount, processAccountDetails } = require("./withdraw");

async function handleWithdrawText(bot, chatId, text, depositState, ctx = {}) {
  const state = depositState[chatId];
  if (!state || typeof text !== "string") return false;

  if (state.step === "select_method") {
    if (typeof ctx.t === "function" && ctx.lang) {
      await bot.sendMessage(chatId, ctx.t("select_withdrawal_method", ctx.lang));
    } else {
      await bot.sendMessage(chatId, "Please select a withdrawal method.");
    }
    return true;
  }

  if (state.step === "enter_withdraw_amount") {
    await processWithdrawAmount(bot, chatId, text, depositState);
    return true;
  }

  if (state.step === "enter_account") {
    await processAccountDetails(bot, chatId, text, depositState);
    return true;
  }

  return false;
}

module.exports = {
  handleWithdrawText,
};
