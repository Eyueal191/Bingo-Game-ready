function normalizePhone(phone) {
  if (!phone) return "";

  let digits = phone.toString().replace(/\D/g, "");

  // Remove Ethiopia country code
  if (digits.startsWith("251")) {
    digits = digits.slice(3);
  }

  // Remove leading 0
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits;
}

function maskedAccountMatches(masked, known) {
  if (!masked || !known) return false;

  // Normalize known number
  const normalizedKnown = normalizePhone(known);

  // Match masked pattern like:
  // 2519****9529
  // 09****9529
  // 9****9529
  const match = masked.match(/^(\d+)\*+(\d+)$/);

  if (!match) {
    console.log("Masked format invalid:", masked);
    return false;
  }

  let prefix = match[1];
  let suffix = match[2];

  // Normalize prefix too
  prefix = normalizePhone(prefix);

  console.log({
    masked,
    known,
    normalizedKnown,
    prefix,
    suffix,
    starts: normalizedKnown.startsWith(prefix),
    ends: normalizedKnown.endsWith(suffix),
  });

  return (
    normalizedKnown.startsWith(prefix) &&
    normalizedKnown.endsWith(suffix)
  );
}

module.exports = {
  normalizePhone,
  maskedAccountMatches,
};