const crypto = require("crypto");

function clampTtlMs(ttlMs) {
  const n = Number(ttlMs);
  if (!Number.isFinite(n)) return 60_000;
  // keep sane bounds (10s..10m)
  return Math.min(Math.max(n, 10_000), 10 * 60_000);
}

function getDefaultInstanceId() {
  return (
    process.env.BOT_INSTANCE_ID ||
    process.env.HOSTNAME ||
    crypto.randomBytes(8).toString("hex")
  );
}

async function ensureIndexes(collection) {
  try {
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  } catch {
    // ignore
  }
}

async function tryAcquireLease({
  mongoose,
  leaseKey,
  instanceId,
  ttlMs,
  logger,
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  const collection = mongoose.connection.collection("bot_leases");
  await ensureIndexes(collection);

  const res = await collection.findOneAndUpdate(
    {
      _id: leaseKey,
      $or: [{ expiresAt: { $lte: now } }, { owner: instanceId }, { expiresAt: { $exists: false } }],
    },
    {
      $set: {
        owner: instanceId,
        expiresAt,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    {
      upsert: true,
      returnDocument: "after",
      returnOriginal: false,
    }
  );

  // Some driver versions (or mongoose bundling) may not populate `value`.
  // Fall back to an explicit read so lease mode still works.
  let doc = res?.value;
  if (!doc) {
    try {
      doc = await collection.findOne({ _id: leaseKey });
    } catch {
      doc = null;
    }
  }
  const acquired = doc?.owner === instanceId;

  if (!acquired && logger) {
    logger.debug?.("Bot lease not acquired", {
      component: "bot-lease",
      leaseKey,
      instanceId,
      currentOwner: doc?.owner,
      currentExpiresAt: doc?.expiresAt,
    });
  }

  return { acquired, doc };
}

function startBotPollingLease({
  mongoose,
  logger,
  leaseKey = "telegram-polling",
  instanceId = getDefaultInstanceId(),
  ttlMs = 60_000,
  renewEveryMs,
}) {
  const ttl = clampTtlMs(ttlMs);
  const renewEvery = clampTtlMs(renewEveryMs ?? Math.floor(ttl / 3));

  let stopped = false;
  let isLeader = false;
  let timer = null;

  async function tick() {
    if (stopped) return;
    try {
      const { acquired } = await tryAcquireLease({
        mongoose,
        leaseKey,
        instanceId,
        ttlMs: ttl,
        logger,
      });

      if (acquired && !isLeader) {
        isLeader = true;
        logger?.info?.("Bot lease acquired", {
          component: "bot-lease",
          leaseKey,
          instanceId,
          ttlMs: ttl,
        });
      }

      if (!acquired && isLeader) {
        isLeader = false;
        logger?.warn?.("Bot lease lost", {
          component: "bot-lease",
          leaseKey,
          instanceId,
        });
      }
    } catch (error) {
      logger?.error?.("Bot lease tick failed", {
        component: "bot-lease",
        leaseKey,
        instanceId,
        error: error?.message || String(error),
      });
      // keep prior leader state; next ticks may recover
    }
  }

  async function start() {
    await tick();
    timer = setInterval(tick, renewEvery);
    timer.unref?.();
  }

  async function stop() {
    stopped = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    // best-effort release
    try {
      const collection = mongoose.connection.collection("bot_leases");
      await collection.updateOne(
        { _id: leaseKey, owner: instanceId },
        { $set: { expiresAt: new Date(0), updatedAt: new Date() } }
      );
    } catch {
      // ignore
    }
  }

  function isLeaderNow() {
    return isLeader;
  }

  return { start, stop, isLeaderNow, instanceId, leaseKey, ttlMs: ttl };
}

module.exports = {
  startBotPollingLease,
  getDefaultInstanceId,
};
