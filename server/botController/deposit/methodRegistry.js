const CONFIG = require("../../config/config");
const { t } = require("../localization");
const escapeMarkdownV2 = require("../utils/escapeMarkdownV2");
const { getUserJwtToken } = require("../utils/getUserJwtToken");
const { handleOnlineDepositSubmit } = require("./onlineDeposit");
const { getAppSettings } = require("../../services/appSettingsService");

const OFFLINE_CHANNELS = [
  {
    action: "pay_cbe",
    textKey: "pay_with_cbe",
    methodValue: "CBE",
    providerEnum: "cbe",
    renderCopy: (accountNumber) => ({
      text: "📋 Copy CBE Account",
      copy_text: { text: accountNumber },
    }),
    renderInstructions: (lang, amount, isAutomatic, accountNumber, accountName) =>
      t(isAutomatic ? "cbe_instructions_automatic" : "cbe_instructions", lang, {
        account: accountNumber,
        name: accountName,
        amount,
      }),
  },
  {
    action: "pay_telebirr",
    textKey: "pay_with_telebirr",
    methodValue: "telebirr",
    providerEnum: "telebirr",
    renderCopy: (accountNumber) => ({
      text: "📋 Copy TeleBirr Account",
      copy_text: { text: accountNumber },
    }),
    renderInstructions: (lang, amount, isAutomatic, accountNumber, accountName) =>
      t(
        isAutomatic
          ? "telebirr_instructions_automatic"
          : "telebirr_instructions",
        lang,
        {
          phone: accountNumber,
          name: accountName,
          amount,
        }
      ),
  },
  {
    action: "pay_abyssinia",
    textKey: "pay_with_abyssinia",
    methodValue: "Abyssinia",
    providerEnum: "abyssinia",
    renderCopy: (accountNumber) => ({
      text: "📋 Copy Abyssinia Account",
      copy_text: { text: accountNumber },
    }),
    renderInstructions: (lang, amount, isAutomatic, accountNumber, accountName) =>
      t(
        isAutomatic
          ? "abyssinia_instructions_automatic"
          : "abyssinia_instructions",
        lang,
        {
          account: accountNumber,
          name: accountName,
          amount,
        }
      ),
  },
  {
    action: "pay_cbebirr",
    textKey: "pay_with_cbebirr",
    methodValue: "CBEBirr",
    providerEnum: "cbebirr",
    renderCopy: (accountNumber) => ({
      text: "📋 Copy CBE Birr Account",
      copy_text: { text: accountNumber },
    }),
    renderInstructions: (lang, amount, isAutomatic, accountNumber, accountName) =>
      t(isAutomatic ? "cbebirr_instructions_automatic" : "cbebirr_instructions", lang, {
        account: accountNumber,
        name: accountName,
        amount,
      }),
  },
  {
    action: "pay_dashen",
    textKey: "pay_with_dashen",
    methodValue: "Dashen",
    providerEnum: "dashen",
    renderCopy: (accountNumber) => ({
      text: "📋 Copy Dashen Account",
      copy_text: { text: accountNumber },
    }),
    renderInstructions: (lang, amount, isAutomatic, accountNumber, accountName) =>
      t(isAutomatic ? "dashen_instructions_automatic" : "dashen_instructions", lang, {
        account: accountNumber,
        name: accountName,
        amount,
      }),
  },
];

const ONLINE_METHODS = [
  {
    action: "pay_telebirr_online",
    label: "Telebirr",
    enabled: true,
    methodValue: "telebirr",
  },
  {
    action: "pay_cbe_online",
    label: "CBE Birr",
    enabled: true,
    methodValue: "cbe",
  },
  {
    action: "pay_mpesa_online",
    label: "M-Pesa",
    enabled: false,
    methodValue: "mpesa",
  },
];

async function getOfflineDepositChannelKeyboard(lang) {
  const settings = await getAppSettings();
  const methods = settings?.botPayments?.deposit?.methods || {};

  const enabledByAction = {
    pay_cbe: methods.cbe !== false,
    pay_telebirr: methods.telebirr !== false,
    pay_abyssinia: methods.abyssinia !== false,
    pay_cbebirr: methods.cbebirr !== false,
    pay_dashen: methods.dashen !== false,
  };

  return OFFLINE_CHANNELS.filter((c) => enabledByAction[c.action]).map(
    (c) => [{ text: t(c.textKey, lang), callback_data: c.action }]
  );
}

async function getOnlineDepositMethodKeyboard(lang) {
  const settings = await getAppSettings();
  const methods = settings?.botPayments?.deposit?.methods || {};
  const enabledByAction = {
    pay_telebirr_online: methods.telebirr_online !== false,
    pay_cbe_online: methods.cbe_online !== false,
    pay_mpesa_online: methods.mpesa_online === true,
  };
  return ONLINE_METHODS.filter((m) => m.enabled && enabledByAction[m.action]).map(
    (m) => [{ text: m.label, callback_data: m.action }]
  );
}

async function handleOfflineChannelSelection(bot, chatId, state, lang, channel) {
  const settings = await getAppSettings();
  console.log(settings);
  const methods = settings?.botPayments?.deposit?.methods || {};
  console.log(methods);
  const enabledByAction = {
    pay_cbe: methods.cbe !== false,
    pay_telebirr: methods.telebirr !== false,
    pay_abyssinia: methods.abyssinia !== false,
    pay_cbebirr: methods.cbebirr !== false,
    pay_dashen: methods.dashen !== false,
  };

  if (!enabledByAction[channel.action]) {
    await bot.sendMessage(chatId, t("payment_method_disabled", lang));
    await bot.sendMessage(chatId, t("payment_channels_instruction", lang), {
      reply_markup: { inline_keyboard: await getOfflineDepositChannelKeyboard(lang) },
    });
    return;
  }

  const isAutomatic = state[chatId].paymentFlow === "automatic";

  if (!state[chatId]?.amount && !isAutomatic) {
    bot.sendMessage(chatId, t("enter_amount_first", lang));
    return;
  }

  state[chatId].paymentMethod = channel.methodValue;
  state[chatId].step = isAutomatic ? "enter_transaction_id" : "upload_receipt";

  if (state[chatId].step === "enter_transaction_id") {
    const jwtToken = await getUserJwtToken(chatId);
    if (!jwtToken) {
      bot.sendMessage(chatId, t("auth_failed", lang));
      return;
    }
    state[chatId].jwtToken = jwtToken;
  }

  const manualAccounts = settings?.paymentAccounts?.manual || [];
  const accountMeta = manualAccounts.find(a => a.provider === channel.providerEnum) || {};
  const accountNumber = accountMeta.accountNumber || "comming soon";
  const accountName = accountMeta.accountName || "comming soon";

  const instructions = channel.renderInstructions(
    lang,
    state[chatId].amount,
    state[chatId].step === "enter_transaction_id",
    accountNumber,
    accountName
  );

  return bot.sendMessage(chatId, escapeMarkdownV2(instructions), {
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [[channel.renderCopy(accountNumber)]],
    },
  });
}

const depositChannelHandlers = Object.fromEntries(
  OFFLINE_CHANNELS.map((c) => [
    c.action,
    async (bot, chatId, state, lang) =>
      handleOfflineChannelSelection(bot, chatId, state, lang, c),
  ])
);

const onlineDepositMethodHandlers = Object.fromEntries(
  ONLINE_METHODS.map((m) => [
    m.action,
    async (bot, chatId, state, lang) => {
      const settings = await getAppSettings();
      const methods = settings?.botPayments?.deposit?.methods || {};
      const enabledByAction = {
        pay_telebirr_online: methods.telebirr_online !== false,
        pay_cbe_online: methods.cbe_online !== false,
        pay_mpesa_online: methods.mpesa_online === true,
      };

      if (!enabledByAction[m.action]) {
        await bot.sendMessage(chatId, t("payment_method_disabled", lang));
        await bot.sendMessage(chatId, t("online_payment_methods", lang), {
          reply_markup: { inline_keyboard: await getOnlineDepositMethodKeyboard(lang) },
        });
        return;
      }

      if (!state[chatId]?.amount) {
        bot.sendMessage(chatId, t("enter_amount_first", lang));
        return;
      }

      state[chatId].paymentMethod = m.methodValue;
      state[chatId].step = "submit_online_deposit";

      const jwtToken = await getUserJwtToken(chatId);
      if (!jwtToken) {
        bot.sendMessage(chatId, t("auth_failed", lang));
        return;
      }
      state[chatId].jwtToken = jwtToken;
      return handleOnlineDepositSubmit(bot, chatId, state);
    },
  ])
);

module.exports = {
  OFFLINE_CHANNELS,
  ONLINE_METHODS,
  getOfflineDepositChannelKeyboard,
  getOnlineDepositMethodKeyboard,
  depositChannelHandlers,
  onlineDepositMethodHandlers,
};
