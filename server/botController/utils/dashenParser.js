const axios = require("axios");
const https = require("https");
const pdf = require("pdf-parse");
const logger = require("../../utils/winstonLogger");

const httpsAgent = new https.Agent({ rejectUnauthorized: process.env.NODE_ENV !== "production" });

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function extractFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return String(match[1]).trim();
  }
  return "";
}

function toAmountNumber(value) {
  if (!value) return NaN;
  return parseFloat(String(value).replace(/,/g, "").replace(/[^\d.]/g, ""));
}

async function getDashenReceiptDetail(transactionReference) {
  const reference = String(transactionReference || "").trim();
  if (!reference) return { error: "Missing Dashen transaction reference." };

  const url = `https://receipt.dashensuperapp.com/receipt/${encodeURIComponent(reference)}`;

  try {
    const response = await axios.get(url, {
      httpsAgent,
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/pdf",
      },
      timeout: 30000,
    });

    if (response.status !== 200) {
      return { error: `Failed to fetch receipt: HTTP ${response.status}` };
    }

    const parsed = await pdf(Buffer.from(response.data));
    const text = cleanText(parsed.text);

    const senderName = extractFirst(text, [
      /Sender\s*Name\s*:??\s*(.*?)\s+(?:Sender\s*Account|Account)/i,
    ]);
    const senderAccountNumber = extractFirst(text, [
      /Sender\s*Account\s*(?:Number)?\s*:??\s*([A-Z0-9\*\-]+)/i,
    ]);

    const receiverName = extractFirst(text, [
      /Receiver\s*Name\s*:??\s*(.*?)\s+(?:Phone|Institution|Transaction)/i,
    ]);

    const institutionName = extractFirst(text, [
      /Institution\s*Name\s*:??\s*(.*?)\s+(?:Transaction|Reference)/i,
    ]);

    const transferReference = extractFirst(text, [
      /Transfer\s*Reference\s*:??\s*([A-Z0-9\-]+)/i,
    ]);

    const trxRef = extractFirst(text, [
      /Transaction\s*Reference\s*:??\s*([A-Z0-9\-]+)/i,
    ]);

    const amountRaw = extractFirst(text, [
      /Transaction\s*Amount\s*(?:ETB|Birr)?\s*:?\s*([\d,]+\.?\d{0,2})/i,
      /Total\s*(?:ETB|Birr)?\s*:?\s*([\d,]+\.?\d{0,2})/i,
    ]);

    const amount = toAmountNumber(amountRaw);

    const result = {
      reference,
      transactionReference: trxRef || reference,
      transferReference,
      senderName,
      senderAccountNumber,
      receiverName,
      institutionName,
      amount,
      rawTextPreview: text.slice(0, 800),
    };

    if (!Number.isFinite(result.amount)) {
      return { error: "Failed to parse Dashen receipt amount." };
    }

    return result;
  } catch (error) {
    logger.error("[dashen] receipt fetch/parse failed", {
      reference,
      error: error?.message || String(error),
    });
    return { error: error?.message ? `Failed to verify receipt: ${error.message}` : "Failed to verify receipt." };
  }
}

module.exports = {
  getDashenReceiptDetail,
  toAmountNumber,
};
