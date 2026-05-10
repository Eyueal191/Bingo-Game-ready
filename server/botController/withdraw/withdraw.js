const { sendTelegramMessage } = require("../notification");
const { t, getLang } = require("../localization");
const { getAppSettings } = require("../../services/appSettingsService");
const { getUserJwtToken } = require("../utils/getUserJwtToken");
const { getUserContactInfoByTelegramId } = require("../utils/botUserService");
const { backendApiClient, withAuth } = require("../utils/backendApiClient");
const { escapeHtml } = require("../utils/sanitizeTelegram");
const logger = require("../../utils/winstonLogger");
const { handleRegister } = require("../register");
const { userStates } = require("../state/userState");

// Single source of truth for withdrawal methods.
// Adding a new method is: add entry here + implement handler.
const WITHDRAWAL_METHODS = [
  {
    action: "manual_withdrawal",
    textKey: "manual_withdrawal_button",
    enabled: true,
    init: async (bot, chatId, state) => {
      state[chatId] = { jwtToken: await getUserJwtToken(chatId) };
      return handleManualWithdrawal(bot, chatId, state);
    },
  },
  {
    action: "automatic_withdrawal",
    textKey: "automatic_withdrawal_button",
    enabled: true,
    init: async (bot, chatId, state) => {
      state[chatId] = { jwtToken: await getUserJwtToken(chatId) };
      return handleAutomaticWithdrawal(bot, chatId, state);
    },
  },
];

async function getWithdrawalMethodKeyboard(lang) {
  const settings = await getAppSettings();
  const flows = settings?.botPayments?.withdraw?.flows || {};
  const enabledByAction = {
    manual_withdrawal: flows.manual !== false,
    automatic_withdrawal: flows.automatic !== false,
  };

  return WITHDRAWAL_METHODS.filter((m) => m.enabled && enabledByAction[m.action]).map(
    (m) => [{ text: t(m.textKey, lang), callback_data: m.action }]
  );
}

const withdrawalMethodHandlers = Object.fromEntries(
  WITHDRAWAL_METHODS.map((m) => [
    m.action,
    async (bot, chatId, state, lang) => {
      const language = lang || (await getLang(chatId));
      const settings = await getAppSettings();
      const flows = settings?.botPayments?.withdraw?.flows || {};
      const enabledByAction = {
        manual_withdrawal: flows.manual !== false,
        automatic_withdrawal: flows.automatic !== false,
      };

      if (!enabledByAction[m.action]) {
        await bot.sendMessage(chatId, t("payment_method_disabled", language));
        await bot.sendMessage(chatId, t("select_withdrawal_method", language), {
          reply_markup: {
            inline_keyboard: await getWithdrawalMethodKeyboard(language),
          },
        });
        return;
      }

      return m.init(bot, chatId, state);
    },
  ])
);

// Withdrawal channels (account destinations). Adding a new channel is: add entry + translations.
const WITHDRAW_CHANNELS = [
  {
    key: "cbe",
    textKey: "cbe_button",
    enabled: true,
    paymentMethod: "CBE",
    flows: ["manual", "automatic"],
  },
  {
    key: "telebirr",
    textKey: "telebirr_button",
    enabled: true,
    paymentMethod: "TeleBirr",
    flows: ["manual", "automatic"],
  },
  {
    key: "abyssinia",
    textKey: "abyssinia_button",
    enabled: true,
    paymentMethod: "Abyssinia",
    flows: ["manual"],
  },
  {
    key: "cbebirr",
    textKey: "cbebirr_button",
    enabled: true,
    paymentMethod: "CBEBirr",
    flows: ["manual"],
  },
  {
    key: "dashen",
    textKey: "dashen_button",
    enabled: true,
    paymentMethod: "Dashen",
    flows: ["manual"],
  },
];

async function getWithdrawChannelKeyboard(lang, paymentFlow) {
  const settings = await getAppSettings();
  const channels = settings?.botPayments?.withdraw?.channels || {};

  const buttons = WITHDRAW_CHANNELS.filter((c) => {
    const allowedByFlow = Array.isArray(c.flows) ? c.flows.includes(paymentFlow) : true;
    const enabledByKey = channels[c.key] !== false;
    return c.enabled && allowedByFlow && enabledByKey;
  }).map((c) => ({
    text: t(c.textKey, lang),
    callback_data: `withdraw_${c.key}_${paymentFlow}`,
  }));

  // Preserve existing UX: one row with two buttons when possible.
  if (buttons.length <= 2) return [buttons];
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return rows;
}

const withdrawChannelHandlers = (() => {
  const handlers = {};
  for (const channel of WITHDRAW_CHANNELS) {
    const flows = Array.isArray(channel.flows)
      ? channel.flows
      : ["manual", "automatic"];
    for (const flow of flows) {
      const action = `withdraw_${channel.key}_${flow}`;
      handlers[action] = async (bot, chatId, state, lang) => {
        const language = lang || (await getLang(chatId));
        const settings = await getAppSettings();
        const flowToggles = settings?.botPayments?.withdraw?.flows || {};
        const channelToggles = settings?.botPayments?.withdraw?.channels || {};

        const flowEnabled = flowToggles[flow] !== false;
        const channelEnabled = channelToggles[channel.key] !== false;

        if (!flowEnabled || !channelEnabled) {
          await bot.sendMessage(chatId, t("payment_method_disabled", language));
          return;
        }

        return handleAccountDetails(bot, chatId, state, channel.paymentMethod, flow);
      };
    }
  }
  return handlers;
})();

async function getUserDetailsByTelegramId(telegramId, lang = "en") {
  return getUserContactInfoByTelegramId(telegramId, lang, t);
}

async function handleWithdraw(bot, chatId) {
  const lang = await getLang(chatId);
  logger.info("Withdraw requested", { userId: chatId });

  try {
    const jwtToken = await getUserJwtToken(chatId);
    if (!jwtToken) {
      return handleRegister(bot, chatId, userStates);
    }

    if (!bot.depositState) {
      bot.depositState = {};
    }
    const depositState = bot.depositState;
    depositState[chatId] = { jwtToken };

    // Bypass flow selection and directly start manual withdrawal
    return handleManualWithdrawal(bot, chatId, depositState);
  } catch (error) {
    logger.error("Error initiating withdrawal", {
      error: error?.response?.data || error?.message,
      userId: chatId,
    });
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      t("withdrawal_failed_default", lang);
    bot.sendMessage(chatId, `❌ ${errorMessage}`);
  }
}

async function handleManualWithdrawal(bot, chatId, depositState) {
  const lang = await getLang(chatId);
  depositState[chatId].step = "enter_withdraw_amount";
  depositState[chatId].paymentFlow = "manual";
  const { walletRules } = await getAppSettings();
  const minWithdrawal = Number(walletRules?.minWithdrawalAmount) || 100;
  bot.sendMessage(
    chatId,
    t("enter_withdraw_amount_manual", lang, { minWithdrawal })
  );
}

async function handleAutomaticWithdrawal(bot, chatId, depositState) {
  const lang = await getLang(chatId);
  depositState[chatId].step = "enter_withdraw_amount";
  depositState[chatId].paymentFlow = "automatic";
  const { walletRules } = await getAppSettings();
  const minWithdrawal = Number(walletRules?.minWithdrawalAmount) || 100;
  bot.sendMessage(
    chatId,
    t("enter_withdraw_amount_automatic", lang, { minWithdrawal })
  );
}

async function processWithdrawAmount(bot, chatId, amountText, depositState) {
  const lang = await getLang(chatId);
  try {
    const amount = parseFloat(amountText);
    const paymentFlow = depositState[chatId].paymentFlow;
    const { walletRules } = await getAppSettings();
    const minWithdrawal = Number(walletRules?.minWithdrawalAmount) || 100;

    if (isNaN(amount)) {
      bot.sendMessage(chatId, t("invalid_amount", lang));
      depositState[chatId].step = "enter_withdraw_amount";
      return;
    }

    if (paymentFlow === "manual" && amount < minWithdrawal) {
      bot.sendMessage(
        chatId,
        t("invalid_amount_manual_withdrawal", lang, { minWithdrawal })
      );
      depositState[chatId].step = "enter_withdraw_amount";
      return;
    }

    if (paymentFlow === "automatic" && amount < minWithdrawal) {
      bot.sendMessage(
        chatId,
        t("invalid_amount_automatic_withdrawal", lang, { minWithdrawal })
      );
      depositState[chatId].step = "enter_withdraw_amount";
      return;
    }

    depositState[chatId].amount = amount;
    depositState[chatId].step = "select_method";

    bot.sendMessage(chatId, t("select_payment_method_withdraw", lang), {
      reply_markup: {
        inline_keyboard: await getWithdrawChannelKeyboard(lang, paymentFlow),
      },
    });
  } catch (error) {
    logger.error("Error processing withdrawal amount", {
      error: error?.response?.data || error?.message,
      userId: chatId,
    });
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      t("error_processing_amount", lang);
    bot.sendMessage(chatId, `❌ ${errorMessage}`);
  }
}

async function handleAccountDetails(
  bot,
  chatId,
  state,
  paymentMethod,
  paymentFlow
) {
  const lang = await getLang(chatId);
  try {
    if (!state[chatId]) {
      bot.sendMessage(chatId, t("no_active_deposit", lang));
      return;
    }

    state[chatId].paymentMethod = paymentMethod;
    state[chatId].paymentFlow = paymentFlow;
    state[chatId].step = "enter_account";
    const methodKey = String(paymentMethod || "").toLowerCase();
    const prompt =
      methodKey === "telebirr" || methodKey === "cbebirr"
        ? t("enter_telebirr_phone", lang)
        : methodKey === "cbe"
          ? t("enter_cbe_account", lang)
          : t("enter_account_number", lang);
    bot.sendMessage(chatId, prompt);
  } catch (error) {
    logger.error("Error initiating account details", {
      error: error?.response?.data || error?.message,
      userId: chatId,
    });
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      t("error_processing_amount", lang);
    bot.sendMessage(chatId, `❌ ${errorMessage}`);
  }
}

async function processAccountDetails(bot, chatId, accountNumber, state) {
  const lang = await getLang(chatId);
  const waitingMsg = await bot.sendMessage(
    chatId,
    t("processing_deposit", lang)
  );

  try {
    if (!state[chatId]) {
      bot.sendMessage(chatId, t("no_active_deposit", lang));
      return;
    }

    if (!accountNumber.trim()) {
      bot.sendMessage(chatId, t("invalid_account_number", lang));
      state[chatId].step = "enter_account";
      return;
    }

    const { amount, paymentMethod, paymentFlow, jwtToken } = state[chatId];

    if (paymentFlow === "manual") {
      const { fullName, phone } = await getUserDetailsByTelegramId(chatId, lang);

      const response = await backendApiClient.post(
        "/api/v1/withdrawal/request",
        {
          amount,
          method: paymentMethod,
          accountNumber,
        },
        withAuth(jwtToken)
      );

      const caption = t("manual_withdrawal_request_admin", lang, {
        fullName: escapeHtml(fullName),
        phone: escapeHtml(phone),
        amount: escapeHtml(String(amount)),
        method: escapeHtml(String(paymentMethod)),
      });

      await sendTelegramMessage(caption);

      await bot.editMessageText(
        t("withdrawal_request_submitted_success", lang),
        {
          chat_id: chatId,
          message_id: waitingMsg.message_id,
          parse_mode: "Markdown",
        }
      );

      delete state[chatId];
    } else if (paymentFlow === "automatic") {
      const response = await backendApiClient.post(
        "/api/v1/addis-pay/withdraw",
        {
          amount,
          paymentMethod: paymentMethod.toLowerCase(),
        },
        withAuth(jwtToken)
      );

      await bot.editMessageText(t("withdrawal_initiated_success", lang), {
        chat_id: chatId,
        message_id: waitingMsg.message_id,
      });

      delete state[chatId];
    }
  } catch (error) {
    logger.error("Error submitting withdrawal request", {
      error: error?.response?.data || error?.message,
      userId: chatId,
    });
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      t("withdrawal_request_failed_default", lang);

    await bot.editMessageText(`❌ ${errorMessage}`, {
      chat_id: chatId,
      message_id: waitingMsg.message_id,
    });
  }
}

module.exports = {
  handleWithdraw,
  handleAccountDetails,
  processWithdrawAmount,
  processAccountDetails,
  handleManualWithdrawal,
  handleAutomaticWithdrawal,
  withdrawalMethodHandlers,
  withdrawChannelHandlers,
};
