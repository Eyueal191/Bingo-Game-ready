const axios = require("axios");
const CONFIG = require("../../config/config");
const logger = require("../../utils/winstonLogger");

/**
 * Fetch and parse TeleBirr transaction from your proxy API.
 * @param {string} telebirrId
 * @returns {Promise<Object>}
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function getTeleBirrTransactionDetail(telebirrId, retries = 3) {
  if (!telebirrId || typeof telebirrId !== "string") {
    return { error: "Invalid TeleBirr Transaction ID provided." };
  }

  const url = `${CONFIG.telebirrVerifyUrl}?id=${encodeURIComponent(
    telebirrId
  )}`;

  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 60000,// ⏳ wait up to 60 seconds
      validateStatus: (status) => status < 500,
    });

    if (data.status === "failed") {
      return { error: data.error || `No receipt found for ${telebirrId}` };
    }

    if (data.status !== "success" || !data.data) {
      return { error: `Unexpected response for ${telebirrId}` };
    }

    const receipt = data.data;
    if (CONFIG.isDevelopment) {
      logger.debug("[telebirr] receipt fetched", {
        hasReceipt: Boolean(receipt),
      });
    }
    return {
      payerName: receipt["Payer Name"] || "",
      payerTelebirrNo: receipt["Payer Telebirr No"] || "",
      payerAccountType: receipt["Payer Account Type"] || "",
      creditedPartyName: receipt["Credited Party Name"] || "",
      creditedPartyAccountNo: receipt["Credited Party Account No"] || "",
      transactionStatus: receipt["Transaction Status"] || "",
      settledAmount: receipt["Settled Amount"] || "",
    };

  } catch (err) {
        // ⏳ Retry on timeout or no response
        if ((err.code === "ECONNABORTED" || err.request) && retries > 0) {
          console.warn(`⏳ TeleBirr slow, retrying... (${retries} left)`);
          await sleep(3000); // wait 3 seconds
          return getTeleBirrTransactionDetail(telebirrId, retries - 1);
        }
    if (err.response) {
      return {
        error: `TeleBirr request failed with status ${err.response.status}`,
        status: err.response.status,
      };
    }
    if (err.request) return { error: err.message||"TeleBirr server did not respond after multiple attempts" };
    return { error: err.message };
  }
}

module.exports = { getTeleBirrTransactionDetail };
