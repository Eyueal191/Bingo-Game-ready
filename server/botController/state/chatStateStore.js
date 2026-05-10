function toKey(prop) {
  if (typeof prop === "string") return prop;
  if (typeof prop === "number") return String(prop);
  return null;
}

function nowMs() {
  return Date.now();
}

/**
 * In-memory per-chat state store with TTL cleanup.
 *
 * Design goal: be a drop-in replacement for legacy `{}` usage:
 *   state[chatId] = { step: "..." }
 *   delete state[chatId]
 *   const s = state[chatId]
 *
 * It uses a Proxy so that reads/writes automatically refresh `_lastActiveAt`.
 */
function createInMemoryChatStateStore({
  name = "chatState",
  ttlMs = 2 * 60 * 60 * 1000, // 2h default
  now = nowMs,
} = {}) {
  const backing = Object.create(null);

  const store = {
    name,
    ttlMs,
    state: null,
    cleanup: null,
  };

  function touchKey(key) {
    const entry = backing[key];
    if (entry && typeof entry === "object") {
      entry._lastActiveAt = now();
    }
  }

  function cleanup() {
    const cutoff = now() - store.ttlMs;
    let deleted = 0;

    for (const [key, entry] of Object.entries(backing)) {
      const lastActiveAt = entry?._lastActiveAt;
      if (typeof lastActiveAt === "number" && lastActiveAt < cutoff) {
        delete backing[key];
        deleted += 1;
      }
    }

    return deleted;
  }

  const state = new Proxy(backing, {
    get(target, prop, receiver) {
      const key = toKey(prop);
      if (key) touchKey(key);
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      const key = toKey(prop);
      if (key && value && typeof value === "object") {
        value._lastActiveAt = now();
      }
      return Reflect.set(target, prop, value, receiver);
    },
    deleteProperty(target, prop) {
      return Reflect.deleteProperty(target, prop);
    },
  });

  store.state = state;
  store.cleanup = cleanup;
  return store;
}

module.exports = {
  createInMemoryChatStateStore,
};
