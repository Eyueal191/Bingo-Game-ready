const { handleRegister } = require("./register");
const { userStates } = require("./state/userState");
const { t, getLang } = require("./localization");
const logger = require("../utils/winstonLogger");
const { sendBrandingPhoto } = require("./utils/branding");
const { getUserJwtToken } = require("./utils/getUserJwtToken");
const { backendApiClient, withAuth } = require("./utils/backendApiClient");
const { buildMiniAppUrl } = require("./utils/buildMiniAppUrl");

const GAME_CONFIG = {
  bingo: {
    buttonTextKey: "play_bingo_button",
    welcomeKey: "welcome_to_bingo",
    promptKey: "ready_to_play_prompt",
    path: "/games?game=bingo",
  },
};

async function handlePlay(bot, chatId, game = "bingo") {
  const lang = await getLang(chatId);
  const telegramId = chatId.toString();
  const gameKey = GAME_CONFIG[game] ? game : "bingo";
  const gameConfig = GAME_CONFIG[gameKey];

  async function CheckRegistration() {
    try {
      const jwtToken = await getUserJwtToken(telegramId);
      if (!jwtToken) {
        logger.error(
          `No JWT token for user ${telegramId}, prompting registration`
        );
        return handleRegister(bot, chatId, userStates);
      }

      const response = await backendApiClient.get(
        `/api/v1/users/by-telegram-id/${telegramId}`,
        withAuth(jwtToken)
      );

      if (response.data && response.data.telegramId === telegramId) {
        const caption = t(gameConfig.welcomeKey, lang);
        const photoSent = await sendBrandingPhoto(bot, chatId, { caption });
        if (!photoSent) {
          await bot.sendMessage(chatId, caption);
        }

        if (gameKey === "bingo") {
          let stakes = [];

          try {
            const roomsRes = await backendApiClient.get(
              "/api/v1/gamerooms",
              withAuth(jwtToken)
            );
            const rooms = Array.isArray(roomsRes.data) ? roomsRes.data : [];
            const validRooms = rooms.filter((room) =>
              ["waiting", "starting", "playing"].includes(room.status)
            );
            const uniqueStakeAmounts = new Set();
            for (const room of validRooms) {
              const amount = Number(room.stakeAmount);
              if (!Number.isNaN(amount) && amount > 0) {
                uniqueStakeAmounts.add(amount);
              }
            }
            stakes = Array.from(uniqueStakeAmounts).sort((a, b) => a - b);
          } catch (roomsError) {
            logger.error("Failed to fetch rooms for bot menu", {
              error: roomsError.message,
            });
          }

          // Filter to ONLY show stake amount 10
          // const filteredStakes = stakes.filter(amount => amount === 10);

          // if (!filteredStakes.length) {
          //   return bot.sendMessage(
          //     chatId,
          //     "No rooms available right now. Please try again shortly."
          //   );
          // }

          // const inline_keyboard = [];
          // for (let i = 0; i < filteredStakes.length; i += 2) {
          //   const row = filteredStakes.slice(i, i + 2).map((amount) => ({
          //     text: `🎮 Play Game`,
          //     web_app: {
          //       url: buildMiniAppUrl(`/cards-list/${amount}`),
          //     },
          //   }));
          //   inline_keyboard.push(row);
          // }

          // const playOptions = {
          //   reply_markup: { inline_keyboard },
          // };

          // no room filter
           if (!stakes.length) {
            return bot.sendMessage(
              chatId,
              "No rooms available right now. Please try again later."
            );
          }

          const playOptions = {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: t("play_bingo_button", lang),
                    // "🎮 Play Game",
                    web_app: {
                      url: buildMiniAppUrl("/games"),
                    },
                  },
                ],
              ],
            },
          };

          logger.info(`Sent bingo stake options (amount 10 only) to user ${chatId}`);
          return bot.sendMessage(
            chatId,
            t(gameConfig.promptKey, lang),
            playOptions
          );
        }

        const gameUrl = buildMiniAppUrl(gameConfig.path);

        const playOptions = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: t(gameConfig.buttonTextKey, lang),
                  web_app: {
                    url: gameUrl,
                  },
                },
              ],
            ],
          },
        };

        logger.info(`Sent ${game} play button to user ${chatId}`);
        return bot.sendMessage(
          chatId,
          t(gameConfig.promptKey, lang),
          playOptions
        );
      } else {
        logger.info(`User ${chatId} not registered, prompting registration`);
        return handleRegister(bot, chatId, userStates);
      }
    } catch (error) {
      if (
        error.response &&
        (error.response.status === 404 || error.response.status === 401)
      ) {
        logger.info(
          `User ${chatId} not found or unauthorized, prompting registration`
        );
        return handleRegister(bot, chatId, userStates);
      }

      logger.error(`Play check error for user ${chatId}:`, {
        error: error.message,
        status: error.response?.status,
      });
      return bot.sendMessage(chatId, t("something_went_wrong", lang));
    }
  }

  return CheckRegistration();
}

module.exports = { handlePlay };