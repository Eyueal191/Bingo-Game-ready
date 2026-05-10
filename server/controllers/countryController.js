const Country = require("../models/Country");
const logger = require("../utils/winstonLogger");

/**
 * GET /api/v1/countries/active — Public: list active countries for registration dropdown
 */
exports.getActiveCountries = async (req, res) => {
    try {
        const countries = await Country.find({ isActive: true })
            .select("name code dialCode currencyCode currencySymbol exchangeRate flag")
            .sort({ name: 1 });
        res.status(200).json(countries);
    } catch (error) {
        logger.error("countryController: getActiveCountries error", { err: error });
        res.status(500).json({ message: "Failed to fetch countries" });
    }
};

/**
 * GET /api/v1/countries — Admin: list all countries
 */
exports.getAllCountries = async (req, res) => {
    try {
        const countries = await Country.find().sort({ name: 1 });
        res.status(200).json(countries);
    } catch (error) {
        logger.error("countryController: getAllCountries error", { err: error });
        res.status(500).json({ message: "Failed to fetch countries" });
    }
};

/**
 * POST /api/v1/countries — Admin: create a country
 */
exports.createCountry = async (req, res) => {
    try {
        const { name, code, dialCode, currencyCode, currencySymbol, exchangeRate, isActive, flag, supportedChannels } = req.body;

        if (!name) return res.status(400).json({ message: "Country name is required" });
        if (!code) return res.status(400).json({ message: "Country code (e.g. ET) is required" });
        if (!dialCode) return res.status(400).json({ message: "Dial code (e.g. +251) is required" });
        if (!currencyCode) return res.status(400).json({ message: "Currency code (e.g. ETB) is required" });

        const existing = await Country.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ message: `Country with code ${code} already exists` });
        }

        const country = await Country.create({
            name,
            code: code.toUpperCase(),
            dialCode,
            currencyCode: currencyCode.toUpperCase(),
            currencySymbol: currencySymbol || "",
            exchangeRate: exchangeRate || 1,
            isActive: isActive !== undefined ? isActive : true,
            flag: flag || "",
            supportedChannels: supportedChannels || ["manual"],
        });

        res.status(201).json({ message: "Country created successfully", country });
    } catch (error) {
        logger.error("countryController: createCountry error", { err: error });
        if (error.code === 11000) {
            return res.status(400).json({ message: "Country code already exists" });
        }
        res.status(500).json({ message: "Failed to create country" });
    }
};

/**
 * PUT /api/v1/countries/:id — Admin: update a country
 */
exports.updateCountry = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Prevent changing the code to a duplicate
        if (updates.code) {
            updates.code = updates.code.toUpperCase();
            const existing = await Country.findOne({ code: updates.code, _id: { $ne: id } });
            if (existing) {
                return res.status(400).json({ message: `Country with code ${updates.code} already exists` });
            }
        }
        if (updates.currencyCode) {
            updates.currencyCode = updates.currencyCode.toUpperCase();
        }

        const country = await Country.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        if (!country) {
            return res.status(404).json({ message: "Country not found" });
        }

        res.status(200).json({ message: "Country updated successfully", country });
    } catch (error) {
        logger.error("countryController: updateCountry error", { err: error });
        res.status(500).json({ message: "Failed to update country" });
    }
};

/**
 * DELETE /api/v1/countries/:id — Admin: delete a country
 */
exports.deleteCountry = async (req, res) => {
    try {
        const { id } = req.params;
        const country = await Country.findByIdAndDelete(id);
        if (!country) {
            return res.status(404).json({ message: "Country not found" });
        }
        res.status(200).json({ message: "Country deleted successfully" });
    } catch (error) {
        logger.error("countryController: deleteCountry error", { err: error });
        res.status(500).json({ message: "Failed to delete country" });
    }
};

/**
 * POST /api/v1/countries/initialize — Admin: wipe and initialize with all supported countries
 */
exports.initializeCountries = async (req, res) => {
    try {
        const { COUNTRY_CONFIGS } = require("../utils/phoneUtils");

        const currencyMap = {
            ET: { currencyCode: "ETB", currencySymbol: "Br", flag: "🇪🇹", exchangeRate: 1 },
            KE: { currencyCode: "KES", currencySymbol: "KSh", flag: "🇰🇪", exchangeRate: 0.28 },
            NG: { currencyCode: "NGN", currencySymbol: "₦", flag: "🇳🇬", exchangeRate: 1.5 },
            UG: { currencyCode: "UGX", currencySymbol: "USh", flag: "🇺🇬", exchangeRate: 70 },
            SD: { currencyCode: "SDG", currencySymbol: "ج.س", flag: "🇸🇩", exchangeRate: 12 },
            TZ: { currencyCode: "TZS", currencySymbol: "TSh", flag: "🇹🇿", exchangeRate: 45 },
            ZA: { currencyCode: "ZAR", currencySymbol: "R", flag: "🇿🇦", exchangeRate: 0.32 },
            GH: { currencyCode: "GHS", currencySymbol: "₵", flag: "🇬🇭", exchangeRate: 0.23 },
            GB: { currencyCode: "GBP", currencySymbol: "£", flag: "🇬🇧", exchangeRate: 0.013 },
            DE: { currencyCode: "EUR", currencySymbol: "€", flag: "🇩🇪", exchangeRate: 0.016 },
            FR: { currencyCode: "EUR", currencySymbol: "€", flag: "🇫🇷", exchangeRate: 0.016 },
            IT: { currencyCode: "EUR", currencySymbol: "€", flag: "🇮🇹", exchangeRate: 0.016 },
            ES: { currencyCode: "EUR", currencySymbol: "€", flag: "🇪🇸", exchangeRate: 0.016 },
            SE: { currencyCode: "SEK", currencySymbol: "kr", flag: "🇸🇪", exchangeRate: 0.18 },
            PH: { currencyCode: "PHP", currencySymbol: "₱", flag: "🇵🇭", exchangeRate: 1.0 },
            IN: { currencyCode: "INR", currencySymbol: "₹", flag: "🇮🇳", exchangeRate: 1.45 },
            PK: { currencyCode: "PKR", currencySymbol: "₨", flag: "🇵🇰", exchangeRate: 5.0 },
            BD: { currencyCode: "BDT", currencySymbol: "৳", flag: "🇧🇩", exchangeRate: 2.0 },
            AE: { currencyCode: "AED", currencySymbol: "د.إ", flag: "🇦🇪", exchangeRate: 0.062 },
            SA: { currencyCode: "SAR", currencySymbol: "﷼", flag: "🇸🇦", exchangeRate: 0.064 },
            EG: { currencyCode: "EGP", currencySymbol: "E£", flag: "🇪🇬", exchangeRate: 0.8 },
            US: { currencyCode: "USD", currencySymbol: "$", flag: "🇺🇸", exchangeRate: 0.017 },
            CA: { currencyCode: "CAD", currencySymbol: "C$", flag: "🇨🇦", exchangeRate: 0.023 },
            MX: { currencyCode: "MXN", currencySymbol: "$", flag: "🇲🇽", exchangeRate: 0.3 },
            BR: { currencyCode: "BRL", currencySymbol: "R$", flag: "🇧🇷", exchangeRate: 0.085 },
            AR: { currencyCode: "ARS", currencySymbol: "$", flag: "🇦🇷", exchangeRate: 15 },
            AU: { currencyCode: "AUD", currencySymbol: "A$", flag: "🇦🇺", exchangeRate: 0.026 },
            NZ: { currencyCode: "NZD", currencySymbol: "NZ$", flag: "🇳🇿", exchangeRate: 0.028 },
        };

        // Wipe existing to ensure clean state with latest config
        await Country.deleteMany({});

        let count = 0;
        for (const [code, config] of Object.entries(COUNTRY_CONFIGS)) {
            const info = currencyMap[code] || { currencyCode: "USD", currencySymbol: "$", flag: "🏳️", exchangeRate: 1 };
            const channels = code === "ET" ? ["manual", "automatic", "online"] : ["manual"];

            await Country.create({
                name: config.name,
                code,
                dialCode: config.code,
                currencyCode: info.currencyCode,
                currencySymbol: info.currencySymbol,
                exchangeRate: info.exchangeRate,
                isActive: true,
                flag: info.flag,
                supportedChannels: channels,
            });
            count++;
        }

        res.status(200).json({ message: `Successfully initialized ${count} countries` });
    } catch (error) {
        logger.error("countryController: initializeCountries error", { err: error });
        res.status(500).json({ message: "Failed to initialize countries" });
    }
};
