const { t } = require("../localization");
const { handleLanguageCallback } = require("../language");
const { handleDeposit } = require("../deposit");
const { handleBalance } = require("../balance");
const { handleWithdraw } = require("../withdraw/withdraw");
const { handleInvite } = require("../invite");
const { handleGameHistory } = require("../gamehistory");
const { handleSupport } = require("../support");
const { handleRegister } = require("../register");
const {
  depositChannelHandlers,
  onlineDepositMethodHandlers,
} = require("../deposit/methodRegistry");
const { depositFlowHandlers } = require("../deposit/flowRegistry");
const {
  withdrawalMethodHandlers,
  withdrawChannelHandlers,
} = require("../withdraw/withdraw");
const { sendLanguageMenu } = require("../utils/menuManager");
const { handleTransferCommand } = require("../transfer/transfer");
const { handleCheckTransaction } = require("../checktransaction");

async function handleCallbackQuery(bot, query, { chatId, lang, depositState, userStates: statesProps } = {}) {
  const action = String(query?.data || "");
  if (!action) return false;

  const states = statesProps || {};

  if (action.startsWith("set_lang_")) {
    await handleLanguageCallback(bot, query);
    return true;
  }

  // New inline menu actions
  if (action === "register") {
    await handleRegister(bot, chatId, states);
    return true;
  }
  if (action === "deposit") {
    await handleDeposit(bot, chatId);
    return true;
  }
  if (action === "check_balance") {
    await handleBalance(bot, chatId);
    return true;
  }
  if (action === "withdraw") {
    await handleWithdraw(bot, chatId);
    return true;
  }
  if (action === "invite") {
    await handleInvite(bot, chatId);
    return true;
  }
  if (action === "history") {
    await handleGameHistory(bot, chatId);
    return true;
  }
  if (action === "support") {
    await handleSupport(bot, chatId);
    return true;
  }
  if (action === "language") {
    await sendLanguageMenu(bot, chatId, lang);
    return true;
  }
  if (action === "help") {
    await bot.sendMessage(chatId, t("how_to_play_bingo", lang));
    return true;
  }
  if (action === "transfer") {
    await handleTransferCommand(bot, chatId, depositState);
    return true;
  }
  if (action === "checktransaction") {
    await handleCheckTransaction(bot, chatId);
    return true;
  }

  // Deposit provider dispatch (registry-based)
  if (depositChannelHandlers?.[action]) {
    await depositChannelHandlers[action](bot, chatId, depositState, lang);
    return true;
  }
  if (onlineDepositMethodHandlers?.[action]) {
    await onlineDepositMethodHandlers[action](bot, chatId, depositState, lang);
    return true;
  }
  if (depositFlowHandlers?.[action]) {
    await depositFlowHandlers[action](bot, chatId, depositState);
    return true;
  }

  // Withdraw dispatch (registry-based)
  if (withdrawalMethodHandlers?.[action]) {
    await withdrawalMethodHandlers[action](bot, chatId, depositState);
    return true;
  }
  if (withdrawChannelHandlers?.[action]) {
    await withdrawChannelHandlers[action](bot, chatId, depositState);
    return true;
  }

  // Small built-in actions
  if (action === "demo_10" || action === "demo_20" || action === "demo_50") {
    await bot.sendMessage(
      chatId,
      t("playing_demo", lang, { credits: action.split("_")[1] })
    );
    return true;
  }

  return false;
}

module.exports = { handleCallbackQuery };
