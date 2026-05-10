function maskedAccountMatches(masked, known) {
  if (!masked || !known) return false;

  const knownDigits = known.replace(/\D/g, "");
  const maskedDigits = masked.replace(/\D/g, "");

  const knownLocal = knownDigits.startsWith("2519")
    ? knownDigits.slice(3) // remove 251
    : knownDigits;

  // Case 1: Starts with 2519****XXXX
  if (maskedDigits.startsWith("2519")) {
    const prefix = knownDigits.slice(0, 4); // 2519
    const suffix = knownDigits.slice(-4);  // 9398
    return maskedDigits.startsWith(prefix) && maskedDigits.endsWith(suffix);
  }

  // Case 2: Local format like 9149****8
  if (maskedDigits.startsWith("9")) {
    const prefix = knownLocal.slice(0, 4); // 9149
    const suffix = knownLocal.slice(-1);   // 8 (last digit)
    return maskedDigits.startsWith(prefix) && maskedDigits.endsWith(suffix);
  }

  return false;
}

module.exports = { maskedAccountMatches };