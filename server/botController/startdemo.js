const { t, getLang } = require("./localization");
const { sendBrandingPhoto } = require("./utils/branding");
const logger = require("../utils/winstonLogger");

async function handleStartDemo(bot, chatId) {
  const lang = await getLang(chatId);
  logger.info("Start demo requested", { userId: chatId });

  try {
    bot.sendMessage(chatId, t("welcome_to_demo", lang));
    const photoSent = await sendBrandingPhoto(bot, chatId, {
      caption: t("test_your_luck", lang),
    });
    if (!photoSent) {
      await bot.sendMessage(chatId, t("test_your_luck", lang));
    }

    const demoOptions = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t("play_10_credits", lang), callback_data: "demo_10" },
            { text: t("play_20_credits", lang), callback_data: "demo_20" },
          ],
          [{ text: t("play_50_credits", lang), callback_data: "demo_50" }],
        ],
      },
    };

    await bot.sendMessage(chatId, t("select_demo_amount", lang), demoOptions);
  } catch (error) {
    logger.error("Error starting demo", { error: error?.message || String(error), userId: chatId });
    await bot.sendMessage(chatId, t("failed_to_start_demo", lang));
  }
}

module.exports = { handleStartDemo };
