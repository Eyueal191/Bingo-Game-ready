const express = require('express');
const router = express.Router();
const { getSupportedCountriesController, validatePhoneController } = require('../controllers/phoneController');

/**
 * @route   GET /api/v1/phone/countries
 * @desc    Get list of supported countries for phone validation
 * @access  Public
 */
router.get('/countries', getSupportedCountriesController);

/**
 * @route   POST /api/v1/phone/validate
 * @desc    Validate phone number and return formatted results
 * @access  Public
 * @body    { phone: string, allowedCountries?: string[] }
 */
router.post('/validate', validatePhoneController);

module.exports = router;
