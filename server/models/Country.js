const mongoose = require("mongoose");

const countrySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Country name is required"],
            trim: true,
        },
        code: {
            type: String,
            required: [true, "Country code is required"],
            unique: true,
            uppercase: true,
            trim: true,
            minlength: 2,
            maxlength: 3,
        },
        dialCode: {
            type: String,
            required: [true, "Dial code is required"],
            trim: true,
        },
        currencyCode: {
            type: String,
            required: [true, "Currency code is required"],
            uppercase: true,
            trim: true,
        },
        currencySymbol: {
            type: String,
            default: "",
            trim: true,
        },
        exchangeRate: {
            type: Number,
            required: [true, "Exchange rate is required"],
            default: 1,
            min: [0.0001, "Exchange rate must be positive"],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        supportedChannels: {
            type: [String],
            enum: ["manual", "automatic", "online"],
            default: ["manual"],
        },
        flag: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

// Singleton-safe: get a country by code
countrySchema.statics.getByCode = async function (code) {
    return this.findOne({ code: code.toUpperCase(), isActive: true });
};

// Get all active countries
countrySchema.statics.getActiveCountries = async function () {
    return this.find({ isActive: true }).sort({ name: 1 });
};

// Get exchange rate for a country code
countrySchema.statics.getExchangeRate = async function (countryCode) {
    const country = await this.findOne({
        code: countryCode.toUpperCase(),
        isActive: true,
    });
    return country ? country.exchangeRate : 1;
};

const Country = mongoose.model("Country", countrySchema);
module.exports = Country;
