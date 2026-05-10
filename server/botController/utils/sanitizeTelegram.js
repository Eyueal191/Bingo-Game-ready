function escapeHtml(text) {
  if (typeof text !== "string") return String(text ?? "");
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Markdown (legacy) is hard to fully escape safely; for our purposes we only need
// to keep user-controlled values from breaking formatting or code fences.
function sanitizeForMarkdownInline(text) {
  if (typeof text !== "string") return String(text ?? "");
  return text.replace(/[\r\n]/g, " ").replace(/`/g, "'");
}

function sanitizeForMarkdownCodeBlock(text) {
  if (typeof text !== "string") return String(text ?? "");
  // Prevent breaking out of fenced code blocks.
  return text.replace(/```/g, "'''").replace(/[\u0000-\u001F\u007F]/g, " ");
}

module.exports = {
  escapeHtml,
  sanitizeForMarkdownInline,
  sanitizeForMarkdownCodeBlock,
};
