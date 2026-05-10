const axios = require("axios");
const pdf = require("pdf-parse");
const https = require("https");
const os = require("os");
const tls = require("tls");
const logger = require("../../utils/winstonLogger");

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}
function extractReceiverPersonName(receiverRaw) {
  if (!receiverRaw) return "";

  // Match: digits + dash + NAME
  const match = receiverRaw.match(/^\s*\d+\s*[-–]\s*(.+)$/);

  if (match && match[1]) {
    return match[1].trim();
  }

  // Fallback: if no number prefix, assume entire value is name
  return receiverRaw.trim();
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

function normalizeEthiopianPhone(phone) {
  if (!phone) return "";
  let p = String(phone).trim();
  p = p.replace(/\s+/g, "").replace(/-/g, "").replace(/^\+/, "");
  if (p.startsWith("0") && p.length === 10) {
    p = `251${p.slice(1)}`;
  }
  if (p.startsWith("251") && p.length === 12) return p;
  return p;
}

function isCompletedStatus(status) {
  const s = String(status || "").toLowerCase();
  return s.includes("completed") || s.includes("success");
}

const DIGICERT_GLOBAL_G2_TLS_RSA_SHA256_2020_CA1_INTERMEDIATE_URL =
  "https://cacerts.digicert.com/DigiCertGlobalG2TLSRSASHA2562020CA1-1.crt";

let cachedIntermediatePem = "";
async function getDigicertIntermediatePem() {
  if (cachedIntermediatePem) return cachedIntermediatePem;

  const res = await axios.get(
    DIGICERT_GLOBAL_G2_TLS_RSA_SHA256_2020_CA1_INTERMEDIATE_URL,
    {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    }
  );

  const der = Buffer.from(res.data);
  const b64 = der.toString("base64");
  const lines = b64.match(/.{1,64}/g) || [];
  cachedIntermediatePem = `-----BEGIN CERTIFICATE-----\n${lines.join(
    "\n"
  )}\n-----END CERTIFICATE-----\n`;
  return cachedIntermediatePem;
}

function parseCbebirrReceiptText(text, tid, ph) {
  // Many receipts include a "Transaction Details" table:
  // Receipt Number | Transaction Date | Amount
  // <value>        | <value>          | <value>
  const tableRowMatch = text.match(
    /Receipt\s*Number\s+Transaction\s*Date\s+Amount\s+([A-Z0-9-]{4,}?)(?=[0-9]{4}-[0-9]{2}-[0-9]{2})\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2})\s*([\d,]+(?:\.[0-9]{1,2})?)\s+([\d,]+(?:\.[0-9]{1,2})?)/i
  );

  const customerName = extractFirst(text, [
    /Customer\s*Name\s*:?\s*(.*?)\s+(?:Region|Debit|Credit|Receiver)/i,
  ]);

  const creditAccount = extractFirst(text, [
    /Credit\s*Account\s*:?\s*(.*?)\s+(?:Receiver\s*Name|Order\s*ID|Transaction)/i,
  ]);

  const receiverName = extractFirst(text, [
    /Receiver\s*Name\s*:?\s*(.*?)\s+(?:Order\s*ID|Transaction\s*Status|Reference)/i,
  ]);

  const orderId = extractFirst(text, [/Order\s*ID\s*:?\s*([A-Z0-9]+)/i]);
  const transactionStatus = extractFirst(text, [
    /Transaction\s*Status\s*:?\s*(.*?)\s+(?:Reference|Receipt\s*Number)/i,
    /(Completed|Success|Successful|Failed|Pending)/i,
  ]);

  const reference = extractFirst(text, [
    /Reference\s*:?\s*(.*?)\s+(?:Receipt\s*Number|Transaction\s*Details|Transaction\s*Date)/i,
  ]);

  // Some PDFs collapse labels so "Receipt Number" may be followed by "Transaction" (next label).
  let receiptNo = extractFirst(text, [
    /Receipt\s*Number\s+Transaction\s*Date\s+Amount\s+([A-Z0-9-]{4,}?)(?=[0-9]{4}-[0-9]{2}-[0-9]{2})/i,
    /Receipt\s*Number\s*:?\s*([A-Z0-9-]{4,})(?=[0-9]{4}-[0-9]{2}-[0-9]{2})/i,
    /Receipt\s*Number\s*:?\s*([A-Z0-9-]{4,})/i,
    /Receipt\s*No\s*:?\s*([A-Z0-9-]{4,})/i,
    /(CGU[A-Z0-9]+)/i,
  ]);
  if (/^(transaction|status|details)$/i.test(receiptNo)) receiptNo = "";
  if (!receiptNo && tableRowMatch?.[1]) receiptNo = tableRowMatch[1];

  const transactionDate = extractFirst(text, [
    /Transaction\s*Date\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2})/i,
    /([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2})/i,
  ]);
  const finalTransactionDate = transactionDate || tableRowMatch?.[2] || "";

  // IMPORTANT: Use "Paid amount" (user request). Do NOT use "Total Paid Amount" because it may include extra charges.
  const paidAmountRaw = extractFirst(text, [
    /Paid\s*amount\s*:?\s*([\d,]+(?:\.[0-9]{1,2})?)/i,
    /([\d,]+(?:\.[0-9]{1,2})?)\s+Paid\s*amount\b/i,
    /Paid\s*Amount\s*:?\s*([\d,]+(?:\.[0-9]{1,2})?)\s*Br\b/i,
    /([\d,]+(?:\.[0-9]{1,2})?)\s+Paid\s*Amount\b/i,
  ]);
  const paidAmountFromTable = tableRowMatch?.[4] || "";

  const fallbackAmountRaw = extractFirst(text, [
    // Amount column in Transaction Details table
    /Receipt\s*Number\s+Transaction\s*Date\s+Amount\s+[A-Z0-9-]{4,}\s+[0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}\s+([\d,]+(?:\.[0-9]{1,2})?)/i,
    // If available, Transaction Amount is equivalent to paid amount for most transfers.
    /Transaction\s*Amount(?:\s*\([^)]*\))?\s*:?\s*([\d,]+(?:\.[0-9]{1,2})?)/i,
    /([\d,]+(?:\.[0-9]{1,2})?)\s+Transaction\s*Amount\b/i,
    /Transaction\s*Amount(?:\s*\([^)]*\))?\s*:?\s*([\d,]+(?:\.[0-9]{1,2})?)\s*Br\b/i,
  ]);

  const amount = toAmountNumber(paidAmountRaw || paidAmountFromTable || fallbackAmountRaw);

  const result = {
    receiptNumber: receiptNo || orderId || tid,
    tid,
    phoneNumber: ph,
    customerName,
    creditAccount,
    receiverName: extractReceiverPersonName(receiverName),
    orderId,
    transactionStatus,
    reference,
    transactionDate: finalTransactionDate,
    amount,
    rawTextPreview: text.slice(0, 800),
  };

  if (!result.receiptNumber && !result.orderId && !Number.isFinite(result.amount)) {
    return { error: "Failed to parse CBE Birr receipt PDF." };
  }

  if (!isCompletedStatus(result.transactionStatus)) {
    return {
      error: `Transaction is not completed. Status: ${result.transactionStatus || "Unknown"}`,
    };
  }

  return result;
}

/**
 * Fetches and parses a CBE Birr receipt PDF.
 *
 * @param {string} receiptNumber - TID / Receipt Number
 * @param {string} phoneNumber - Ethiopian phone number (251xxxxxxxxx)
 * @param {string} apiKey - Bearer token
 */
async function getCBEBirrReceiptDetail(receiptNumber, phoneNumber, apiKey) {
  const tid = String(receiptNumber || "").trim();
  const ph = normalizeEthiopianPhone(phoneNumber);

  if (!tid) return { error: "Missing CBE Birr receipt number." };
  if (!ph) return { error: "Missing CBE Birr phone number." };
  if (!apiKey) return { error: "CBE Birr API key is not configured." };

  const url = `https://cbepay1.cbe.com.et/aureceipt?TID=${encodeURIComponent(
    tid
  )}&PH=${encodeURIComponent(ph)}`;  

  logger.info("[cbebirr] fetching receipt", {
    tid,
    phoneLast4: ph ? String(ph).slice(-4) : "",
    apiKey: "[REDACTED]",
    node: process.version,
    openssl: process.versions?.openssl,
    platform: `${os.platform()} ${os.release()}`,
    nodeOptions: process.env.NODE_OPTIONS || "",
    nodeExtraCaCerts: Boolean(process.env.NODE_EXTRA_CA_CERTS),
  });

  const isTlsChainError = (err) => {
    const msg = String(err?.message || "").toLowerCase();
    const code = String(err?.code || "").toUpperCase();
    return (
      code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
      code === "UNABLE_TO_GET_ISSUER_CERT" ||
      msg.includes("unable to verify the first certificate")
    );
  };
  

  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 60000,
    });

    if (response.status !== 200) {
      return { error: `Failed to fetch receipt: HTTP ${response.status}` };
    }
    const pdfBuffer = Buffer.from(response.data);

    const parsed = await pdf(pdfBuffer);
    const text = cleanText(parsed.text);
    return parseCbebirrReceiptText(text, tid, ph);
  } catch (error) {
    // TLS chain errors are often caused by missing intermediates in the server-provided chain.
    if (isTlsChainError(error)) {
      logger.warn("[cbebirr] TLS verification failed; will retry with intermediate chain completion", {
        tid,
        errorCode: error?.code,
        error: error?.message || String(error),
      });

      // If user explicitly opts into insecure SSL, allow it (last resort).
      const insecureSsl = String(process.env.CBEBIRR_INSECURE_SSL || "").toLowerCase() === "true";

      try {
        let httpsAgent;
        if (insecureSsl) {
          httpsAgent = new https.Agent({ rejectUnauthorized: false });
        } else {
          const intermediatePem = await getDigicertIntermediatePem();
          // Supplying 'ca' overrides default roots, so include Node's root set.
          httpsAgent = new https.Agent({
            ca: [...tls.rootCertificates, intermediatePem],
          });
        }

        const response = await axios.get(url, {
          responseType: "arraybuffer",
          httpsAgent,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 60000,
        });

        if (response.status !== 200) {
          return { error: `Failed to fetch receipt: HTTP ${response.status}` };
        }

        const pdfBuffer = Buffer.from(response.data);
        const parsed = await pdf(pdfBuffer);
        const text = cleanText(parsed.text);
        return parseCbebirrReceiptText(text, tid, ph);
      } catch (retryError) {
        const msg = retryError?.message || String(retryError);
        logger.error("[cbebirr] receipt fetch/parse retry failed", {
          tid,
          errorCode: retryError?.code,
          error: msg,
        });
        return {
          error: msg ? `Failed to verify receipt: ${msg}` : "Failed to verify receipt.",
        };
      }
    }

    const rawMessage = error?.message || String(error);
    logger.error("[cbebirr] receipt fetch/parse failed", {
      error: rawMessage,
      tid,
      errorCode: error?.code,
    });

    // Common in some Linux servers when upstream certificate chain can't be verified.
    if (rawMessage.toLowerCase().includes("unable to verify the first certificate")) {
      return {
        error:
          "Failed to verify receipt: unable to verify the first certificate. " +
          "If this server cannot validate cbepay1.cbe.com.et TLS chain, set CBEBIRR_INSECURE_SSL=true (at your own risk) or fix CA certificates.",
      };
    }

    return {
      error: rawMessage ? `Failed to verify receipt: ${rawMessage}` : "Failed to verify receipt.",
    };
  }
}

module.exports = {
  getCBEBirrReceiptDetail,
  normalizeEthiopianPhone,
  toAmountNumber,
};
