const CONFIG = require("../../config/config");

const buildMiniAppUrl = (relativePath = "") => {
  const baseUrl = CONFIG.miniAppUrl || "";
  const base = baseUrl.replace(/\/$/, "");
  if (!relativePath) {
    return base;
  }
  if (/^https?:/i.test(relativePath)) {
    return relativePath;
  }
  const normalizedPath = relativePath.startsWith("/")
    ? relativePath
    : `/${relativePath}`;
  return `${base}${normalizedPath}`;
};
module.exports = { buildMiniAppUrl };