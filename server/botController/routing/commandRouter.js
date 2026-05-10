const { handleStart, handleBasicCommand, handleTextButton  } = require("../botHandlers");
const { userStates } = require("../state/userState");
const { handlePlay } = require("../play");
const { handleRegister } = require("../register");
const { handleBalance } = require("../balance");
const { handleDeposit } = require("../deposit");
const { handleWithdraw } = require("../withdraw/withdraw");
const { handleInvite } = require("../invite");
const { handleCheckTransaction } = require("../checktransaction");
const { handleGameHistory } = require("../gamehistory");

const { t, getLang } = require("../localization");
const { getUserJwtToken } = require("../utils/getUserJwtToken");
const logger = require("../../utils/winstonLogger");
const { sendLanguageMenu } = require("../utils/menuManager");
const { handleSupport } = require("../support");
const { handleTransferCommand } = require("../transfer/transfer");

const commandList = [
  "start",
  "play",
  "register",
  "balance",
  "deposit",
  "withdraw",
  "invite",
  "support",
  "checktransaction",
  "gamehistory",
  "language",
  "transfer",
  "howtoplay",
];

const commandRegex = new RegExp(`^/(${commandList.join("|")})(?:\\s|$)`, "i");


async function handleCommandRoute(bot, msg, { chatId, lang, logMeta, depositState }) {
  const text = msg.text || "";
  const firstToken = text.split(" ")[0] || "";
  if (!firstToken.startsWith("/")) return;

  const command = firstToken.slice(1).toLowerCase();
  logger.info("Command received", { ...logMeta, command: `/${command}` });

  // Reset flow state for all commands to prevent processing legacy flow inputs as commands
  delete depositState[chatId];

  // Global Registration Guard for Protected Commands
  const protectedCommands = new Set([
    "play",
    "balance",
    "deposit",
    "withdraw",
    "invite",
    "checktransaction",
    "gamehistory",
    "transfer",
    "language",
  ]);

  if (protectedCommands.has(command)) {
    const jwtToken = await getUserJwtToken(chatId);
    if (!jwtToken) {
      return handleRegister(bot, chatId, userStates);
    }
  }

  if (command === "language") {
    return sendLanguageMenu(bot, chatId, lang);
  }

  if (command === "start") {
    const parts = msg.text.split(" ");
    const payload = parts.length > 1 ? parts[1].trim() : null;
    if (payload) {
      userStates[chatId] = {
        ...(userStates[chatId] || {}),
        referralCode: payload,
      };
    }
    return handleStart(bot, chatId, msg.text);
  }

  if (command === "play") return handlePlay(bot, chatId);
  if (command === "register") return handleRegister(bot, chatId, userStates);
  if (command === "balance") return handleBalance(bot, chatId);
  if (command === "deposit") return handleDeposit(bot, chatId);
  if (command === "withdraw") return handleWithdraw(bot, chatId);
  if (command === "howtoplay") return bot.sendMessage(chatId, t("how_to_play_bingo", lang));
  if (command === "invite") return handleInvite(bot, chatId);
  if (command === "support") return handleSupport(bot, chatId);
  if (command === "checktransaction") return handleCheckTransaction(bot, chatId);
  if (command === "gamehistory") return handleGameHistory(bot, chatId);
  if (command === "transfer") return handleTransferCommand(bot, chatId, depositState);
    
  return handleBasicCommand(bot, chatId, command);
}

module.exports = { handleCommandRoute, commandRegex };
