/**
 * Multi-Country Phone Validation & Normalization System
 * Powered by libphonenumber-js/max — strict digit-pattern validation for all countries.
 * All function signatures preserved for backward compatibility.
 */

const {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  getCountryCallingCode,
  getCountries,
  AsYouType,
} = require("libphonenumber-js/max");

/**
 * Attempt to parse a raw phone string into E.164.
 * Handles local formats like "0912345678" when a defaultCountry is given.
 */
function _tryParse(phone, defaultCountry) {
  if (!phone || typeof phone !== "string") return null;

  let cleaned = phone.trim().replace(/[\s\-()]/g, "");

  // Already has +, parse directly
  if (cleaned.startsWith("+")) {
    return parsePhoneNumberFromString(cleaned);
  }

  // If default country given, try parsing as national number
  if (defaultCountry) {
    const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
    if (parsed && parsed.isValid()) return parsed;
  }

  // Bare digits without +. Try prepending + in case it's full international without the plus.
  const withPlus = parsePhoneNumberFromString(`+${cleaned}`);
  if (withPlus && withPlus.isValid()) return withPlus;

  return null;
}

// ──────────────────────────────────────────────
// Core Public API — signatures preserved exactly
// ──────────────────────────────────────────────

/**
 * Extract ISO-2 country code from a phone number.
 * @param {string} phone
 * @returns {string|null} e.g. "ET", "US"
 */
function extractCountryCode(phone) {
  if (!phone || typeof phone !== "string") return null;
  const parsed = _tryParse(phone);
  return parsed?.country || null;
}

/**
 * Detect country from phone number — tries international then local patterns.
 * @param {string} phone
 * @returns {string|null}
 */
function detectCountry(phone) {
  if (!phone) return null;

  // First try without a default country (international format)
  const parsed = _tryParse(phone);
  if (parsed?.country) return parsed.country;

  // For bare local digits, try common countries in priority order
  const priorityCountries = [
    "ET", "KE", "NG", "UG", "SD", "TZ", "ZA", "GH",
    "GB", "DE", "FR", "IT", "ES", "SE",
    "PH", "IN", "PK", "BD",
    "AE", "SA", "EG",
    "US", "CA", "MX", "BR", "AR",
    "AU", "NZ",
  ];

  for (const cc of priorityCountries) {
    const result = _tryParse(phone, cc);
    if (result && result.isValid()) return result.country;
  }

  return null;
}

/**
 * Universal phone normalizer.
 * @param {string} phone
 * @param {string|null} preferredCountry  e.g. "ET"
 * @returns {{ phone: string, country: string } | { error: string }}
 */
function normalizePhone(phone, preferredCountry = null) {
  if (!phone) return { error: "Phone number is required" };

  // Try with preferred country first
  if (preferredCountry) {
    const parsed = _tryParse(phone, preferredCountry);
    if (parsed && parsed.isValid()) {
      return { phone: parsed.number, country: parsed.country };
    }
  }

  // Auto-detect
  const parsed = _tryParse(phone);
  if (parsed && parsed.isValid()) {
    return { phone: parsed.number, country: parsed.country };
  }

  // Last resort: try all priority countries
  const detected = detectCountry(phone);
  if (detected) {
    const result = _tryParse(phone, detected);
    if (result && result.isValid()) {
      return { phone: result.number, country: result.country };
    }
  }

  return { error: "Invalid phone format or unsupported country" };
}

// ──────────────────────────────────────────────
// Ethiopian-specific helpers (AddisPay compat)
// ──────────────────────────────────────────────

function normalizeEthiopianPhone(phone) {
  const result = normalizePhone(phone, "ET");
  if (result.error) return null;
  if (result.country !== "ET") return null;
  return result.phone;
}

function isValidEthiopianPhone(phone) {
  const parsed = _tryParse(phone, "ET");
  return parsed ? parsed.isValid() && parsed.country === "ET" : false;
}

function isEthiopianPhone(phone) {
  const country = detectCountry(phone);
  return country === "ET";
}

function getAddisPayPhoneFormat(phone) {
  if (!isEthiopianPhone(phone)) return null;
  const normalized = normalizeEthiopianPhone(phone);
  if (!normalized) return null;
  return normalized.replace("+", ""); // Remove + for AddisPay API
}

// ──────────────────────────────────────────────
// Universal validator & formatter
// ──────────────────────────────────────────────

function validatePhone(phone, allowedCountries = null) {
  const result = normalizePhone(phone);
  if (result.error) return result;

  if (allowedCountries && !allowedCountries.includes(result.country)) {
    return {
      error: `Country ${result.country} not allowed.`,
    };
  }

  return result;
}

function formatPhoneDisplay(phone, format = "international") {
  const result = normalizePhone(phone);
  if (result.error) return phone;

  const parsed = parsePhoneNumberFromString(result.phone);
  if (!parsed) return phone;

  switch (format) {
    case "international":
      return parsed.formatInternational();
    case "national":
      return parsed.formatNational();
    case "country":
      return result.country;
    default:
      return result.phone;
  }
}

// ──────────────────────────────────────────────
// Country metadata
// ──────────────────────────────────────────────

// Human-readable country names for getCountries() codes
const COUNTRY_NAMES = {
  ET: "Ethiopia", KE: "Kenya", NG: "Nigeria", UG: "Uganda", SD: "Sudan",
  TZ: "Tanzania", ZA: "South Africa", GH: "Ghana",
  GB: "United Kingdom", DE: "Germany", FR: "France", IT: "Italy", ES: "Spain", SE: "Sweden",
  PH: "Philippines", IN: "India", PK: "Pakistan", BD: "Bangladesh",
  AE: "United Arab Emirates", SA: "Saudi Arabia", EG: "Egypt",
  US: "United States", CA: "Canada", MX: "Mexico", BR: "Brazil", AR: "Argentina",
  AU: "Australia", NZ: "New Zealand",
};

function getSupportedCountries() {
  return Object.entries(COUNTRY_NAMES).map(([code, name]) => {
    let dialingCode;
    try {
      dialingCode = `+${getCountryCallingCode(code)}`;
    } catch {
      dialingCode = "";
    }
    return { code, name, dialingCode };
  });
}

/**
 * Backward-compatible COUNTRY_CONFIGS export.
 * Consumer code that iterates this (e.g. countryController.initializeCountries)
 * gets { code, name } pairs.
 */
const COUNTRY_CONFIGS = {};
for (const [code, name] of Object.entries(COUNTRY_NAMES)) {
  let dialCode;
  try {
    dialCode = `+${getCountryCallingCode(code)}`;
  } catch {
    dialCode = "";
  }
  COUNTRY_CONFIGS[code] = { name, code: dialCode };
}

module.exports = {
  normalizePhone,
  validatePhone,
  normalizeEthiopianPhone,
  isValidEthiopianPhone,
  isEthiopianPhone,
  getAddisPayPhoneFormat,
  detectCountry,
  extractCountryCode,
  formatPhoneDisplay,
  getSupportedCountries,
  COUNTRY_CONFIGS,
};
