const { t } = require("../localization");
const CONFIG = require("../../config/config");
const { buildInlineKeyboard } = require("./buildInlineKeyboard");
const { buildMiniAppUrl } = require("./buildMiniAppUrl");
const { getUserJwtToken } = require("./getUserJwtToken");
const { setUserMenuCommands } = require("./setUserMenuCommands");
const logger = require("../../utils/winstonLogger");

/**
 * Centralized configuration for main menu buttons.
 */
const GET_MENU_STRUCTURE = (lang, isRegistered) => {
  if (!isRegistered) {
    return [
      [{ text: t("register_button", lang), callback_data: "register", command: "/register" }],
    ];
  }

  return [
    [
      {
        text: t("play_bingo_button", lang),
        web_app: { url: buildMiniAppUrl("/games") },
        command: "/play",
      },
    ],
    [
      { text: t("deposit_button", lang), callback_data: "deposit", command: "/deposit" },
      { text: t("check_balance_button", lang), callback_data: "check_balance", command: "/balance" },
    ],
    [
      { text: t("withdraw_button", lang), callback_data: "withdraw", command: "/withdraw" },
      { text: t("transfer_button", lang), callback_data: "transfer", command: "/transfer" },
    ],
    [
      { text: t("invite_button", lang), callback_data: "invite", command: "/invite" },
      { text: t("support_button", lang), callback_data: "support", command: "/support" },
    ],
    [
      { text: t("check_transaction_button", lang), callback_data: "checktransaction", command: "/checktransaction" },
      { text: t("history_button", lang), callback_data: "history", command: "/gamehistory" },
    ],
    [
      { text: t("help_button", lang), callback_data: "help", command: "/howtoplay" },
      { text: t("language_button", lang), callback_data: "language", command: "/language" },
    ],
  ];
};

/**
 * Builds the reply_markup based on CONFIG.BOT_MENU_TYPE
 */
const buildMenuMarkup = (lang, isRegistered) => {
  const menuType = CONFIG.botMenuType || "inline"; // 'inline' | 'reply' | 'none'
  const structure = GET_MENU_STRUCTURE(lang, isRegistered);

  if (menuType === "none") {
    return { remove_keyboard: true };
  }

  if (menuType === "reply") {
    return {
      keyboard: structure.map((row) =>
        row.map((btn) => ({ text: btn.text }))
      ),
      resize_keyboard: true,
      one_time_keyboard: false,
    };
  }

  // Default: inline_keyboard
  return buildInlineKeyboard(structure);
};

/**
 * Unified entry point to send the main menu to a user.
 */
async function sendMainMenu(bot, chatId, lang, welcomeMessage = null) {
  try {
    const jwtToken = await getUserJwtToken(chatId);
    const isRegistered = !!jwtToken;

    // 1. Update Menu Commands (Top-left button in Telegram)
    await setUserMenuCommands(bot, chatId, lang, isRegistered);

    // 2. Determine Message Content
    let text = welcomeMessage;
    if (!text) {
      text = isRegistered ? t("welcome_regular", lang) : t("welcome_register_now", lang);
    }

    // 3. Build Markup
    const reply_markup = buildMenuMarkup(lang, isRegistered);

    // 4. Send Message
    await bot.sendMessage(chatId, text, { reply_markup });

    logger.info("Main menu sent", { chatId, isRegistered, menuType: CONFIG.botMenuType });
  } catch (error) {
    logger.error("Failed to send main menu", { chatId, error: error?.message });
  }
}

/**
 * Helper to map a reply keyboard text back to an internal action/command.
 */
function getActionByButtonText(text, lang, isRegistered) {
  const structure = GET_MENU_STRUCTURE(lang, isRegistered);
  for (const row of structure) {
    for (const btn of row) {
      if (btn.text === text) return btn;
    }
  }
  return null;
}

/**
 * Builds the language selection menu.
 */
const getLanguageMenuMarkup = (lang) => {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t("lang_name_en", lang), callback_data: "set_lang_en" },
          { text: t("lang_name_am", lang), callback_data: "set_lang_am" },
        ],
        [
          { text: t("lang_name_om", lang), callback_data: "set_lang_om" },
          { text: t("lang_name_ti", lang), callback_data: "set_lang_ti" },
        ],
      ],
    },
  };
};

/**
 * Unified entry point to send the language selection menu.
 */
async function sendLanguageMenu(bot, chatId, lang) {
  const markup = getLanguageMenuMarkup(lang);
  await bot.sendMessage(chatId, t("select_language", lang), markup);
}

module.exports = {
  sendMainMenu,
  buildMenuMarkup,
  getActionByButtonText,
  sendLanguageMenu,
  getLanguageMenuMarkup,
};
