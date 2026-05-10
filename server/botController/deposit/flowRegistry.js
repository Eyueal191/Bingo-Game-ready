const { t, getLang } = require("../localization");
const { getAppSettings } = require("../../services/appSettingsService");
const { handleManualDeposit } = require("./manualDeposit");
const { handleAutomaticDeposit } = require("./automaticDeposit");
const { handleOnlineDeposit } = require("./onlineDeposit");

// Single source of truth for deposit flow entry points.
// Adding a new deposit flow is: add a new entry here + implement its handler.
const DEPOSIT_FLOWS = [
  {
    action: "manual_payment",
    textKey: "manual_payment_button",
    init: async (bot, chatId, state) => {
      state[chatId] = { step: "enter_amount", paymentFlow: "manual" };
      return handleManualDeposit(bot, chatId, state);
    },
  },
  {
    action: "automatic_payment",
    textKey: "automatic_payment_button",
    init: async (bot, chatId, state) => {
      state[chatId] = { step: "enter_amount", paymentFlow: "automatic" };
      return handleAutomaticDeposit(bot, chatId, state);
    },
  },
  {
    action: "online_payment",
    textKey: "online_payment_button",
    init: async (bot, chatId, state) => {
      state[chatId] = { step: "enter_amount", paymentFlow: "online" };
      return handleOnlineDeposit(bot, chatId, state);
    },
  },
];

async function getDepositFlowKeyboard(lang) {
  const settings = await getAppSettings();
  const flows = settings?.botPayments?.deposit?.flows || {};
  const enabledByAction = {
    manual_payment: flows.manual !== false,
    automatic_payment: flows.automatic !== false,
    online_payment: flows.online === true,
  };

  return DEPOSIT_FLOWS.filter((f) => enabledByAction[f.action]).map((f) => [
    { text: t(f.textKey, lang), callback_data: f.action },
  ]);
}

const depositFlowHandlers = Object.fromEntries(
  DEPOSIT_FLOWS.map((f) => [
    f.action,
    async (bot, chatId, state) => {
      const lang = state?.[chatId]?.lang || (await getLang(chatId));
      const settings = await getAppSettings();
      const flows = settings?.botPayments?.deposit?.flows || {};
      const enabledByAction = {
        manual_payment: flows.manual !== false,
        automatic_payment: flows.automatic !== false,
        online_payment: flows.online === true,
      };

      if (!enabledByAction[f.action]) {
        const keyboard = await getDepositFlowKeyboard(lang);
        await bot.sendMessage(
          chatId,
          t("failed_to_show_payment_methods", lang || "en"),
          { reply_markup: { inline_keyboard: keyboard } }
        );
        return;
      }

      return f.init(bot, chatId, state);
    },
  ])
);

module.exports = {
  getDepositFlowKeyboard,
  depositFlowHandlers,
  DEPOSIT_FLOWS,
};
