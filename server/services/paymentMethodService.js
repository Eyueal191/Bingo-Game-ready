const PaymentMethod = require("../models/PaymentMethod");
const Country = require("../models/Country");

/**
 * Fetch validation settings (account number + name) for a provider.
 * Queries the PaymentMethod collection — throws if not configured.
 *
 * @param {string} provider  – e.g. "cbe", "telebirr", "abyssinia"
 * @param {string} [countryCode="ET"] – ISO country code
 * @returns {Promise<{accountNumber: string, accountName: string}>}
 */
async function getValidationSettings(provider, countryCode = "ET") {
  const method = await PaymentMethod.findOne({
    provider: new RegExp(`^${provider}$`, "i"),
    countryCodes: { $in: [countryCode.toUpperCase(), "*"] },
    isActive: true,
    depositChannels: { $in: ["automatic"] },
  });

  if (!method) {
    throw new Error(
      `Payment method "${provider}" is not properly configured in the Admin Dashboard.`
    );
  }

  return {
    accountNumber: method.accountNumber || "",
    accountName: (method.accountName || "").trim().toLowerCase(),
  };
}

/**
 * Return the enabled payment channels for a country code.
 * Falls back to ["manual"] if the country is not found.
 *
 * @param {string} countryCode – ISO country code (e.g. "ET", "US")
 * @returns {Promise<string[]>} – e.g. ["manual", "automatic", "online"]
 */
async function getChannelsForCountry(countryCode) {
  if (!countryCode) return ["manual"];
  const country = await Country.getByCode(countryCode);
  if (!country || !Array.isArray(country.supportedChannels) || country.supportedChannels.length === 0) {
    return ["manual"];
  }
  return country.supportedChannels;
}

async function getPaymentMethods(countryCode, channel, type) {
  return PaymentMethod.getForCountry(countryCode, channel, type);
}

async function getPaymentMethodById(methodId) {
  return PaymentMethod.findOne({ _id: methodId, isActive: true });
}

module.exports = {
  getValidationSettings,
  getChannelsForCountry,
  getPaymentMethods,
  getPaymentMethodById,
};
