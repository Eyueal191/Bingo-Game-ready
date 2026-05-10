/**
 * Robust numeric parser: handles numbers, numeric strings, commas, currency labels
 * @param {any} v 
 * @returns {number}
 */
export const toNumber = (v) => {
    if (v == null) return 0;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const str = String(v)
        .replace(/[^0-9.,-]/g, "") // keep digits, separators, minus
        .replace(/,(?=\d{3}(\D|$))/g, "") // drop thousands commas
        .replace(/\s+/g, "");
    // Prefer dot as decimal; if multiple separators, last dot/comma is decimal
    const normalized = str.replace(/,(?=\d{1,2}$)/, ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
};

/**
 * Checks if a date is within a given range
 * @param {string|Date} d 
 * @param {string} start 
 * @param {string} end 
 * @returns {boolean}
 */
export const inRange = (d, start, end) => {
    const t = d ? new Date(d).getTime() : 0;
    if (!t) return false;
    const s = start ? new Date(start).getTime() : null;
    const e = end ? new Date(end).getTime() : null;
    const e2 = e != null ? e + 24 * 60 * 60 * 1000 - 1 : null;
    if (s != null && t < s) return false;
    if (e2 != null && t > e2) return false;
    return true;
};
