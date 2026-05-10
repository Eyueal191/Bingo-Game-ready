const PaymentMethod = require("../models/PaymentMethod");
const logger = require("../utils/winstonLogger");

/**
 * GET /api/v1/payment-methods
 * Public (authenticated): Fetch active payment methods for the user's country.
 * Query params: countryCode, channel (manual|automatic|online), type (deposit|withdrawal)
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const { countryCode, channel, type } = req.query;
    const code = (countryCode || req.user?.country || "ET").toUpperCase();

    const methods = await PaymentMethod.getForCountry(code, channel, type);
    return res.status(200).json({ success: true, methods });
  } catch (error) {
    logger.error("paymentMethodController: fetch error", { err: error });
    return res.status(500).json({ message: "Failed to fetch payment methods" });
  }
};

/**
 * GET /api/v1/payment-methods/all
 * Admin: Fetch ALL payment methods (including inactive) for management UI.
 */
exports.getAllPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find().sort({ sortOrder: 1, provider: 1 });
    return res.status(200).json({ success: true, methods });
  } catch (error) {
    logger.error("paymentMethodController: admin fetch error", { err: error });
    return res.status(500).json({ message: "Failed to fetch payment methods" });
  }
};

/**
 * POST /api/v1/payment-methods
 * Admin: Create a new payment method.
 */
exports.createPaymentMethod = async (req, res) => {
  try {
    const {
      countryCodes, provider, depositChannels, withdrawalChannels,
      accountName, accountNumber, instructions, sortOrder, isActive,
    } = req.body;

    if (!countryCodes || countryCodes.length === 0 || !provider) {
      return res.status(400).json({ message: "countryCodes array and provider are required" });
    }

    // Duplicate detection: Ensure no other method with this exact exact name shares ANY mapped countries
    // Exception: If they are the same provider but for completely different regions, that's allowed.
    const existing = await PaymentMethod.findOne({
      provider: new RegExp(`^${provider.trim()}$`, "i"),
      countryCodes: { $in: countryCodes }
    });

    if (existing) {
      return res.status(409).json({ message: `Duplicate payment method: '${provider}' is already mapped to one or more of these countries.` });
    }

    const method = new PaymentMethod({
      countryCodes, provider, depositChannels, withdrawalChannels,
      accountName, accountNumber, instructions, sortOrder, isActive,
    });

    await method.save();
    return res.status(201).json({ success: true, method });
  } catch (error) {
    logger.error("paymentMethodController: create error", { err: error });
    return res.status(500).json({ message: "Failed to create payment method" });
  }
};

/**
 * PUT /api/v1/payment-methods/:id
 * Admin: Update a payment method.
 */
exports.updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check duplicate logic if updating provider or countries
    if (updates.provider || updates.countryCodes) {
      const targetProvider = updates.provider || undefined;
      const targetCountries = updates.countryCodes || [];
      
      const query = { _id: { $ne: id } };
      if (targetProvider) query.provider = new RegExp(`^${targetProvider.trim()}$`, "i");
      if (targetCountries.length > 0) query.countryCodes = { $in: targetCountries };

        if (Object.keys(query).length > 1) { // If _id is not the only key
          const existing = await PaymentMethod.findOne(query);
          if (existing) {
            // It's allowed to duplicate if one is purely for deposit and one is purely for withdrawal, etc.
            // But for simplicity, we keep the original logic which restricts the exact provider name + country combination.
            return res.status(409).json({ message: `Conflict: '${existing.provider}' already covers one or more of these countries.` });
          }
        }
    }

    const method = await PaymentMethod.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!method) {
      return res.status(404).json({ message: "Payment method not found" });
    }

    return res.status(200).json({ success: true, method });
  } catch (error) {
    logger.error("paymentMethodController: update error", { err: error });
    return res.status(500).json({ message: "Failed to update payment method" });
  }
};

/**
 * DELETE /api/v1/payment-methods/:id
 * Admin: Delete a payment method.
 */
exports.deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const method = await PaymentMethod.findByIdAndDelete(id);

    if (!method) {
      return res.status(404).json({ message: "Payment method not found" });
    }

    return res.status(200).json({ success: true, message: "Payment method deleted" });
  } catch (error) {
    logger.error("paymentMethodController: delete error", { err: error });
    return res.status(500).json({ message: "Failed to delete payment method" });
  }
};
