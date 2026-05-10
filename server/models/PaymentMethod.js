const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    // Target countries this payment method applies to (e.g., ["ET", "US", "KE"]).
    // Use ["*"] for globally available methods.
    countryCodes: {
      type: [String],
      required: [true, "At least one Country code is required"],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one country code is required",
      },
      set: (v) => v.map(code => code.toUpperCase().trim()),
    },

    // Human-readable provider name (e.g., "Telebirr", "CashApp", "M-Pesa", "CBE")
    provider: {
      type: String,
      required: [true, "Provider name is required"],
      trim: true,
    },
    // Channels mapped to specific transaction types
    depositChannels: {
      type: [String],
      enum: ["manual", "automatic", "online"],
      default: ["manual"],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one deposit channel is required if this method supports deposits.",
      },
    },
    withdrawalChannels: {
      type: [String],
      enum: ["manual", "automatic", "online"],
      default: ["manual"],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one withdrawal channel is required if this method supports withdrawals.",
      },
    },

    // Account details for manual flows (admin-configured)
    accountName: { type: String, trim: true, default: "" },
    accountNumber: { type: String, trim: true, default: "" },
    instructions: { type: String, trim: true, default: "" },

    // Display order for UI rendering (lower = first)
    sortOrder: { type: Number, default: 0 },

    // Admin toggle
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound index for efficient querying
paymentMethodSchema.index({ countryCodes: 1, isActive: 1 });

/**
 * Fetch active payment methods for a given country, channel, and type.
 * @param {string} countryCode - e.g., "ET", "US"
 * @param {string} channel - e.g., "manual", "automatic", "online"
 * @param {string} type - e.g., "deposit", "withdrawal"
 */
paymentMethodSchema.statics.getForCountry = async function (countryCode, channel, type) {
  const query = {
    countryCodes: { $in: [countryCode.toUpperCase(), "*"] },
    isActive: true,
  };
  if (channel && type === "deposit") {
    query.depositChannels = { $in: Array.isArray(channel) ? channel : [channel] };
  } else if (channel && type === "withdrawal") {
    query.withdrawalChannels = { $in: Array.isArray(channel) ? channel : [channel] };
  } else if (channel) {
    // If no explicit type requested, but a channel is, check both
    const channelsArr = Array.isArray(channel) ? channel : [channel];
    query.$or = [
      { depositChannels: { $in: channelsArr } },
      { withdrawalChannels: { $in: channelsArr } }
    ];
  } else if (type === "deposit") {
    // Has at least one channel for deposit
    query.depositChannels = { $exists: true, $ne: [] };
  } else if (type === "withdrawal") {
    // Has at least one channel for withdrawal
    query.withdrawalChannels = { $exists: true, $ne: [] };
  }

  return this.find(query).sort({ sortOrder: 1, provider: 1 });
};

const PaymentMethod = mongoose.model("PaymentMethod", paymentMethodSchema);
module.exports = PaymentMethod;
