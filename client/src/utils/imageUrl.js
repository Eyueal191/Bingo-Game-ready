// src/utils/imageUrl.js

const baseUrl = import.meta.env.VITE_APP_API_URL || ""; // fallback to empty string if missing

export function getImageUrl(imageUrl) {
  if (!imageUrl) return ""; // safety check
  if (imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  // Remove trailing slash from baseUrl and leading slash from imageUrl to avoid "//"
  return baseUrl.replace(/\/$/, "") + "/" + imageUrl.replace(/^\//, "");
}