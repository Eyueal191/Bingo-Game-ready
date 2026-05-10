const axios = require("axios");
const CONFIG = require("../../config/config");


const backendApiClient = axios.create({
  baseURL: CONFIG.backendUrl,
  timeout: 20000,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

function withAuth(jwtToken, config = {}) {
  if (!jwtToken) return config;
  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      Authorization: `Bearer ${jwtToken}`,
    },
  };
}

module.exports = {
  backendApiClient,
  withAuth,
};
