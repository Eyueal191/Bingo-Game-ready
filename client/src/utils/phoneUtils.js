/**
 * Normalizes a phone number to the standard E.164-like format for Ethiopia (+251...).
 * @param {string} phone - The raw phone number input.
 * @returns {string} - The normalized phone number.
 */
export const normalizePhone = (phone) => {
  let normalized = phone.trim().replace(/[\s-]/g, "");
  if (normalized.startsWith("09") || normalized.startsWith("07")) {
    return `+251${normalized.slice(1)}`;
  } else if (normalized.startsWith("251")) {
    return `+${normalized}`;
  } else if (!normalized.startsWith("+251")) {
    return `+251${normalized}`;
  }
  return normalized;
};
