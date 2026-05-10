function escapeMarkdownV2(text) {
  const reserved = ['\\', '_', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  reserved.forEach(char => {
    if (char === '`') return; // allow inline code
    text = text.split(char).join(`\\${char}`);
  });
  return text;
}


module.exports = escapeMarkdownV2;