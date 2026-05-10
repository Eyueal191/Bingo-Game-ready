const axios = require("axios");

async function getAbyssiniaTransactionDetail(abyssiniaId) {
  if (!abyssiniaId || typeof abyssiniaId !== "string") {
    return { error: "Invalid Abyssinia Transaction ID provided." };
  }

  const url = `https://cs.bankofabyssinia.com/api/onlineSlip/getDetails/?id=${encodeURIComponent(
    abyssiniaId
  )}`;

  try {
    const resp = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      timeout: 10000,
    });

    if (!resp.data?.body?.length) {
      return { error: "No receipt details found for this ID." };
    }

    const d = resp.data.body[0];
    const digitsOnly = (s) => String(s || "").replace(/\D/g, "");

    return {
      sourceAccount: d["Source Account"] || "",
      sourceAccountName: d["Source Account Name"] || "",
      receiverAccount: d["Receiver's Account"] || "",
      receiverAccountDigits: digitsOnly(d["Receiver's Account"]),
      receiver: d["Receiver's Name"] || "",
      transferredAmount: d["Transferred Amount"] || "",
      transferredAmountWords: d["Transferred Amount in word"] || "",
      transactionType: d["Transaction Type"] || "",
      transactionDate: d["Transaction Date"] || "",
      referenceNo: d["Transaction Reference"] || "",
      narrative: d["Narrative"] || "",
      payerName: d["Payer's Name"] || "",
      tel: d["Tel."] || "",
      vat: d["VAT (15%)"] || "",
      serviceCharge: d["Service Charge"] || "",
      totalAmountIncludingVat: d["Total Amount including VAT"] || "",
      raw: d, // keep full object in case new fields appear
    };
  } catch (err) {
    logger.error("Error fetching BoA API", { error: err?.message || String(err) });
    return { error: "Failed to fetch Abyssinia receipt from API." };
  }
}

module.exports = { getAbyssiniaTransactionDetail };
