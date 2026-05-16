function sanitizeAndValidatePhone(phone) {
  if (!phone) return { error: "Phone number is required" };

  let normalized = phone.trim().replace(/[\s-]/g, "");

  if (normalized.startsWith("09") || normalized.startsWith("07")) {
    normalized = `+251${normalized.slice(1)}`;
  } else if (normalized.startsWith("251")) {
    normalized = `+${normalized}`;
  } else if (!normalized.startsWith("+251")) {
    normalized = `+251${normalized}`;
  }

  const valid = /^\+251[79]\d{8}$/.test(normalized);

  if (!valid) {
    return {
      error:
        "Invalid Ethiopian phone format. Use 09..., 07..., 251..., or +251... followed by 9 digits",
    };
  }

  return { phone: normalized };
}
function isValidEthiopianPhone(phone) {
  const regex = /^\+251[79]\d{8}$/;
  return regex.test(phone);
}
module.exports = { sanitizeAndValidatePhone, isValidEthiopianPhone };
