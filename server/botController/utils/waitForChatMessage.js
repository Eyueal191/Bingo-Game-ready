function waitForChatMessage(bot, chatId, { timeoutMs = 60_000, filter } = {}) {
  return new Promise((resolve, reject) => {
    let timeoutHandle;

    const cleanup = () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      bot.removeListener("message", onMessage);
    };

    const onMessage = (msg) => {
      try {
        if (!msg || !msg.chat || msg.chat.id !== chatId) return;
        if (typeof filter === "function" && !filter(msg)) return;
        cleanup();
        resolve(msg);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    bot.on("message", onMessage);

    timeoutHandle = setTimeout(() => {
      cleanup();
      const err = new Error("Timed out waiting for chat message");
      err.code = "BOT_WAIT_TIMEOUT";
      reject(err);
    }, timeoutMs);
  });
}

module.exports = { waitForChatMessage };
