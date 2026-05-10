const { setUserLanguage, getLang, t } = require("./localization");
const { sendMainMenu } = require("./utils/menuManager");

const languages = [
  { code: "en", key: "lang_name_en" },
  { code: "am", key: "lang_name_am" },
  { code: "om", key: "lang_name_om" },
  { code: "ti", key: "lang_name_ti" },
];

const handleLanguageCommand = async (bot, msg) => {
  const chatId = msg.chat.id;
  const lang = await getLang(chatId);
  return sendLanguageMenu(bot, chatId, lang);
};

async function handleLanguageCallback(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const langCode = data.split("_")[2];
  const lang = await getLang(chatId);

  if (await setUserLanguage(chatId, langCode)) {
    const newLang = await getLang(chatId);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: t("language_changed", newLang),
    });

    // Use centralized menu manager to send the appropriate menu in the new language
    return sendMainMenu(bot, chatId, newLang);
  } else {
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: t("language_change_failed", lang),
    });
  }
}

module.exports = { handleLanguageCommand, handleLanguageCallback };
