const { getSupportedCountries } = require("../utils/phoneUtils");

/**
 * Get supported countries for phone validation
 * This endpoint can be used by frontend to display country options
 */
const getSupportedCountriesController = async (req, res) => {
  try {
    const countries = getSupportedCountries();
    
    res.json({
      success: true,
      data: {
        countries,
        totalCountries: countries.length,
        defaultCountry: 'ET', // Ethiopia as default for AddisPay compatibility
        addisPayOnlyCountry: 'ET', // AddisPay only works with Ethiopian numbers
        supportedForRegistration: countries.map(c => c.code), // All countries supported for registration
        supportedForPayments: ['ET'], // Only Ethiopia supported for AddisPay payments
      }
    });
  } catch (error) {
    console.error('Error fetching supported countries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supported countries'
    });
  }
};

/**
 * Validate phone number endpoint
 * Useful for client-side validation without importing utils
 */
const validatePhoneController = async (req, res) => {
  try {
    const { phone, allowedCountries } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    
    const { normalizePhone, detectCountry, formatPhoneDisplay } = require("../utils/phoneUtils");
    
    // Basic validation
    const result = normalizePhone(phone);
    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    // Check allowed countries if specified
    if (allowedCountries && allowedCountries.length > 0) {
      if (!allowedCountries.includes(result.country)) {
        return res.status(400).json({
          success: false,
          message: `Country ${result.country} not allowed. Allowed countries: ${allowedCountries.join(', ')}`
        });
      }
    }
    
    // Return validation result with additional info
    res.json({
      success: true,
      data: {
        phone: result.phone,
        country: result.country,
        countryName: getSupportedCountries().find(c => c.code === result.country)?.name,
        internationalFormat: result.phone,
        nationalFormat: formatPhoneDisplay(result.phone, 'national'),
        isEthiopian: result.country === 'ET',
        addisPayFormat: result.country === 'ET' ? result.phone.replace('+', '') : null,
        supportedForAddisPay: result.country === 'ET'
      }
    });
  } catch (error) {
    console.error('Error validating phone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate phone number'
    });
  }
};

module.exports = {
  getSupportedCountriesController,
  validatePhoneController
};
