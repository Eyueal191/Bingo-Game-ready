const CONFIG = require("../config/config");
const logger = require("../utils/winstonLogger");
const { ProviderError } = require("../utils/providerError");

const createOrder = async (paymentData) => {
  const url = `${CONFIG.addisPayBaseUrl}/create-order`;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Auth: CONFIG.addispayApiKey,
    },
    body: JSON.stringify(paymentData),
  };

  try {
    const response = await fetch(url, options);
    const status = response.status;
    if (!response.ok) {
      let raw;
      try {
        raw = await response.json();
      } catch (e) {
        raw = { message: await response.text() };
      }
      const message =
        raw?.message || raw?.error || raw?.detail || "Order creation failed";
      throw new ProviderError("AddisPay", message, {
        code: raw?.status_code,
        httpStatus: status,
        details: raw,
        raw,
        endpoint: "/create-order",
      });
    }
    return await response.json();
  } catch (error) {
    if (error.isProviderError) throw error;
    throw new ProviderError("AddisPay", "Error creating order", {
      cause: error,
    });
  }
};

const initiatePayment = async (paymentPayload) => {
  const url = `${CONFIG.addisPayBaseUrl}/payment/initiate-payment`;
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paymentPayload),
  };
  logger.debug("Initiating AddisPay payment", {
    endpoint: "/payment/initiate-payment",
    baseUrl: CONFIG.addisPayBaseUrl,
  });
  try {
    const response = await fetch(url, options);
    const status = response.status;
    if (!response.ok) {
      let raw;
      try {
        raw = await response.json();
      } catch (e) {
        raw = { message: await response.text() };
      }
      const message =
        raw?.message ||
        raw?.error ||
        raw?.detail ||
        "Payment initiation failed";
      throw new ProviderError("AddisPay", message, {
        code: raw?.status_code,
        httpStatus: status,
        details: raw,
        raw,
        endpoint: "/payment/initiate-payment",
      });
    }
    return await response.json();
  } catch (error) {
    if (error.isProviderError) throw error;
    throw new ProviderError("AddisPay", "Error initiating payment", {
      cause: error,
    });
  }
};

const checkOrder = async (uuid) => {
  const url = `${CONFIG.addisPayBaseUrl}/get-order?uuid=${uuid}`;
  try {
    const response = await fetch(url, { method: "GET" });
    const status = response.status;
    if (!response.ok) {
      let raw;
      try {
        raw = await response.json();
      } catch (e) {
        raw = { message: await response.text() };
      }
      const message =
        raw?.message ||
        raw?.error ||
        raw?.detail ||
        `Failed to fetch order for uuid: ${uuid}`;
      throw new ProviderError("AddisPay", message, {
        code: raw?.status_code,
        httpStatus: status,
        details: raw,
        raw,
        endpoint: "/get-order",
      });
    }
    const data = await response.json();
    return { data, uuid };
  } catch (error) {
    if (error.isProviderError) throw error;
    throw new ProviderError("AddisPay", "Error checking order", {
      cause: error,
    });
  }
};

const checkStatus = async (uuid) => {
  const url = `${CONFIG.addisPayBaseUrl}/get-status?uuid=${uuid}`;
  try {
    const response = await fetch(url, { method: "GET" });
    const status = response.status;
    if (!response.ok) {
      let raw;
      try {
        raw = await response.json();
      } catch (e) {
        raw = { message: await response.text() };
      }
      const message =
        raw?.message ||
        raw?.error ||
        raw?.detail ||
        `Failed to fetch status for uuid: ${uuid}`;
      throw new ProviderError("AddisPay", message, {
        code: raw?.status_code,
        httpStatus: status,
        details: raw,
        raw,
        endpoint: "/get-status",
      });
    }
    const data = await response.json();
    return { data, uuid };
  } catch (error) {
    if (error.isProviderError) throw error;
    throw new ProviderError("AddisPay", "Error checking status", {
      cause: error,
    });
  }
};

const directPayout = async (payoutData) => {
  const url = `${CONFIG.addisPayBaseUrl}/payment/direct-b2c`;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Auth: CONFIG.addispayApiKey,
    },
    body: JSON.stringify(payoutData),
  };

  try {
    const response = await fetch(url, options);
    const payoutResponse = await response.json();
    logger.info("Direct payout response", { payoutResponse });

    if (!response.ok) {
      let message =
        payoutResponse?.message ||
        payoutResponse?.error ||
        payoutResponse?.detail ||
        "Payout creation failed";
      // Map some known codes to clearer messages but still use provider wording where available
      if (payoutResponse?.status_code === 106 && !payoutResponse?.message) {
        message = "Duplicate request";
      }
      if (payoutResponse?.status_code === 203 && !payoutResponse?.message) {
        message = "Insufficient funds";
      }
      throw new ProviderError("AddisPay", message, {
        code: payoutResponse?.status_code,
        httpStatus: response.status,
        details: payoutResponse,
        raw: payoutResponse,
        endpoint: "/payment/direct-b2c",
      });
    }

    return payoutResponse;
  } catch (error) {
    logger.error("Error creating payout", { error: error.message });
    if (error.isProviderError) throw error;
    throw new ProviderError("AddisPay", "Error creating payout", {
      cause: error,
    });
  }
};

module.exports = {
  createOrder,
  initiatePayment,
  checkOrder,
  checkStatus,
  directPayout,
};
