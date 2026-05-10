export function extractCBETransactionId(input) {
  if (!input) return "";
  const s = String(input).trim();
  const urlMatch = s.match(/[?&]id=(FT[0-9A-Z]+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();
  const ftMatch = s.match(/\b(FT[0-9A-Z]+)\b/i);
  if (ftMatch) return ftMatch[1].toUpperCase();
  return "";
}

export function extractTelebirrTransactionId(input) {
  if (!input) return "";
  const s = String(input).trim();
  const match = s.match(/transaction number is (\w+)/i);
  if (match) return match[1];
  // fallback: any alpha-numeric token length >=6
  const token = s.match(/\b([A-Za-z0-9]{6,})\b/);
  return token ? token[1] : "";
}

export function extractAbyssiniaTransactionId(input) {
  if (!input) return "";
  const s = String(input).trim();
  // Prefer explicit slip URL param if available
  const urlMatch = s.match(/bankofabyssinia.com\/slip\/?[?&]trx=([A-Z0-9]+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();
  // Otherwise fall back to any FTxxxx sequence
  const ftMatch = s.match(/\b(FT[0-9A-Z]+)\b/i);
  if (ftMatch) return ftMatch[1].toUpperCase();
  return "";
}

export function toAmountNumber(str) {
  if (!str && str !== 0) return NaN;
  return parseFloat(String(str).replace(/[^\d.]/g, ""));
}

export function isAmountAllowed(amount, minimum = 50) {
  const n = toAmountNumber(amount);
  return !isNaN(n) && n >= minimum;
}

export function deriveTransactionFields({ input, paymentMethod }) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return { transactionId: null, smsText: null };

  if (paymentMethod && paymentMethod.toLowerCase() === "cbe") {
    const id = extractCBETransactionId(trimmed);
    if (id)
      return {
        transactionId: id,
        smsText: trimmed.length >= 50 ? trimmed : null,
      };
    return {
      transactionId: null,
      smsText: trimmed.length >= 50 ? trimmed : null,
    };
  }

  if (paymentMethod && paymentMethod.toLowerCase() === "telebirr") {
    const id = extractTelebirrTransactionId(trimmed);
    if (id)
      return {
        transactionId: id,
        smsText: trimmed.length >= 50 ? trimmed : null,
      };
    return {
      transactionId: null,
      smsText: trimmed.length >= 50 ? trimmed : null,
    };
  }

  if (paymentMethod && paymentMethod.toLowerCase() === "abyssinia") {
    const id = extractAbyssiniaTransactionId(trimmed);
    if (id)
      return {
        transactionId: id,
        smsText: trimmed.length >= 50 ? trimmed : null,
      };
    return {
      transactionId: null,
      smsText: trimmed.length >= 50 ? trimmed : null,
    };
  }

  // generic fallback
  return trimmed.length < 50
    ? { transactionId: trimmed, smsText: null }
    : { transactionId: null, smsText: trimmed };
}