const queues = new Map();

function withChatLock(chatId, fn) {
  const key = chatId?.toString?.() ?? String(chatId);
  const prev = queues.get(key) || Promise.resolve();

  const run = prev
    .catch(() => {
      // Prevent a rejected task from breaking the queue chain.
    })
    .then(() => fn());

  queues.set(
    key,
    run.finally(() => {
      if (queues.get(key) === run) {
        queues.delete(key);
      }
    })
  );

  return run;
}

module.exports = { withChatLock };
