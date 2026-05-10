import { useApi } from '../contexts/ApiContext';

/**
 * Phone validation service for client-side phone operations
 */
export const usePhoneService = () => {
  const api = useApi();

  /**
   * Get list of supported countries
   */
  const getSupportedCountries = async () => {
    try {
      const response = await api.get('/api/v1/phone/countries');
      return response.data;
    } catch (error) {
      console.error('Error fetching supported countries:', error);
      throw error;
    }
  };

  /**
   * Validate phone number via API
   */
  const validatePhone = async (phone, allowedCountries = null) => {
    try {
      const payload = { phone };
      if (allowedCountries && allowedCountries.length > 0) {
        payload.allowedCountries = allowedCountries;
      }
      
      const response = await api.post('/api/v1/phone/validate', payload);
      return response.data;
    } catch (error) {
      console.error('Error validating phone:', error);
      throw error;
    }
  };

  /**
   * Check if phone is supported for AddisPay payments
   */
  const checkAddisPaySupport = async (phone) => {
    try {
      const result = await validatePhone(phone);
      return {
        supported: result.data?.supportedForAddisPay || false,
        addisPayFormat: result.data?.addisPayFormat || null,
        isEthiopian: result.data?.isEthiopian || false,
        error: !result.data?.supportedForAddisPay ? 
          'AddisPay only supports Ethiopian phone numbers' : null
      };
    } catch (error) {
      return {
        supported: false,
        addisPayFormat: null,
        isEthiopian: false,
        error: error.response?.data?.message || 'Phone validation failed'
      };
    }
  };

  return {
    getSupportedCountries,
    validatePhone,
    checkAddisPaySupport
  };
};

export default usePhoneService;
