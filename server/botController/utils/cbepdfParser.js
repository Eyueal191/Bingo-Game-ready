const axios = require("axios");
const https = require("https");
const pdf = require("pdf-parse");
const logger = require("../../utils/winstonLogger");

// Create HTTPS agent to bypass SSL verification, which is often needed for CBE's server
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  // This option might be necessary for older server configurations
  secureOptions: require("constants").SSL_OP_LEGACY_SERVER_CONNECT,
});

/**
 * Extracts a value from text using a regular expression.
 * @param {string} text - The full text to search within.
 * @param {RegExp} regex - The regular expression to find the value.
 * @param {string|null} contextLabel - An optional label to search within a specific part of the text.
 * @returns {string} The extracted value or "Not found".
 */
function extractValue(text, regex, contextLabel = null) {
  let searchText = text;
  if (contextLabel) {
    const contextIndex = text.indexOf(contextLabel);
    if (contextIndex !== -1) {
      searchText = text.substring(contextIndex);
    } else {
      return "Not found"; // Context not found, so we can't find the value
    }
  }

  const match = searchText.match(regex);
  return match ? match[1].trim() : "Not found";
}

/**
 * Fetches transaction details from a CBE PDF URL using a transaction ID.
 * @param {string} transactionId - The CBE transaction ID (e.g., "FT252390BLWC18095907").
 * @returns {Promise<object>} A promise that resolves to an object with the parsed details or an error.
 */
async function getCBE_TransactionDetail(transactionId) {
  if (!transactionId || !transactionId.startsWith("FT")) {
    return { error: "Invalid CBE Transaction ID provided." };
  }

  const pdfUrl = `https://apps.cbe.com.et:100/?id=${transactionId}`;

  try {
    const response = await axios.get(pdfUrl, {
      httpsAgent,
      responseType: "arraybuffer",
      timeout: 10000, // 10-second timeout for the request
    });

    const data = await pdf(response.data);
    // Clean up the extracted text for easier parsing
    const cleanedText = data.text.replace(/\s+/g, " ").trim();

    // --- Define Regular Expressions for Data Extraction ---

    // Extracts the receiver's name. Looks for "Receiver" followed by the name on the same or next line.
    const receiverRegex =
      /Receiver\s*[:：]?\s*([A-Za-z\s]+?)\s*(?=Account|Payment)/i;

    // In the context of "Receiver", finds the first masked account number.
    const accountRegex = /Account\s*[:：]?\s*(\d+\*{3,}\d+)/i;

    // Extracts the reference number.
    const referenceRegex = /Reference No\. \(VAT Invoice No\)\s*([A-Z0-9]+)/i;

    // Extracts the transferred amount, ignoring currency symbols.
    const amountRegex = /Transferred Amount\s*[:：]?\s*([\d,.]+)/i;

    // --- Extract Data ---
    const receiver = extractValue(cleanedText, receiverRegex);
    const receiverAccount = extractValue(cleanedText, accountRegex, "Receiver");
    const referenceNo = extractValue(cleanedText, referenceRegex);
    const transferredAmount = extractValue(cleanedText, amountRegex);

    return {
      receiver,
      receiverAccount,
      referenceNo,
      transferredAmount,
    };
  } catch (error) {
    logger.error("Failed to parse CBE PDF", {
      transactionId,
      error: error?.message || String(error),
    });
    // Return a structured error that the main logic can handle
    return {
      error: `Could not fetch or parse the transaction receipt. The server may be down or the ID is invalid.`,
    };
  }
}



module.exports = {
  getCBE_TransactionDetail,
};
