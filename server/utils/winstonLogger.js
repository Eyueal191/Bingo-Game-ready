const winston = require("winston");
const os = require("os");
const crypto = require("crypto");
const { AsyncLocalStorage } = require("async_hooks");
const { inspect } = require("util");

const NODE_ENV = String(process.env.NODE_ENV || "development").toLowerCase();
const IS_DEV = NODE_ENV === "development";
const IS_TEST = NODE_ENV === "test";

// Per your requirement: do not auto-detect from package.json
const SERVICE = "bingo-server";

// Context (requestId/userId/etc.) without extra deps or env toggles.
const als = new AsyncLocalStorage();

function getContext() {
  return als.getStore() || null;
}

function withContext(context, fn) {
  const current = getContext();
  const merged = current ? { ...current, ...(context || {}) } : { ...(context || {}) };
  return als.run(merged, fn);
}

function expressContextMiddleware() {
  return (req, res, next) => {
    const incoming = req.headers["x-request-id"];
    const requestId = typeof incoming === "string" && incoming.trim() ? incoming.trim() : crypto.randomUUID();
    res.setHeader("x-request-id", requestId);
    return withContext({ requestId }, next);
  };
}

function levelForEnv() {
  if (IS_TEST) return "warn";
  return IS_DEV ? "debug" : "info";
}

const BASE = Object.freeze({
  service: SERVICE,
  env: NODE_ENV,
  hostname: os.hostname(),
  pid: process.pid,
});

const supportsColor = Boolean(process.stdout && process.stdout.isTTY);
const ANSI = Object.freeze({
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
});

function paint(code, text) {
  if (!supportsColor) return String(text);
  return `${code}${text}${ANSI.reset}`;
}

function levelColor(level) {
  switch (String(level).toLowerCase()) {
    case "error":
      return ANSI.red;
    case "warn":
      return ANSI.yellow;
    case "info":
      return ANSI.green;
    case "debug":
      return ANSI.magenta;
    case "http":
      return ANSI.cyan;
    default:
      return ANSI.cyan;
  }
}

function levelIcon(level) {
  // Keep this simple + universally recognizable in terminals.
  // Emoji rendering depends on font; if unsupported, terminals still show a readable glyph.
  switch (String(level).toLowerCase()) {
    case "error":
      return "✖";
    case "warn":
      return "⚠";
    case "info":
      return "✔";
    case "debug":
      return "…";
    case "http":
      return "→";
    default:
      return "·";
  }
}

const SECRET_KEY = /(pass(word)?|token|secret|api[-_]?key|authorization|cookie|session|jwt|otp|pin)/i;

function normalizeError(err) {
  if (!err) return err;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      cause: err.cause instanceof Error ? normalizeError(err.cause) : err.cause,
    };
  }
  return err;
}

function sanitize(value, depth = 0, seen = new WeakSet()) {
  if (value == null) return value;

  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") return value;
  if (type === "bigint") return value.toString();
  if (type === "function") return "[Function]";
  if (type === "symbol") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return normalizeError(value);
  if (Buffer.isBuffer(value)) return { type: "Buffer", length: value.length };

  if (type !== "object") return String(value);
  if (seen.has(value)) return "[Circular]";

  const maxDepth = 6;
  const maxKeys = 80;
  const maxArray = 80;

  if (depth >= maxDepth) return "[Truncated]";
  seen.add(value);

  if (Array.isArray(value)) {
    const out = new Array(Math.min(value.length, maxArray));
    for (let i = 0; i < out.length; i += 1) out[i] = sanitize(value[i], depth + 1, seen);
    if (value.length > maxArray) out.push(`[+${value.length - maxArray} more]`);
    return out;
  }

  const out = {};
  const keys = Object.keys(value);
  const limit = Math.min(keys.length, maxKeys);
  for (let i = 0; i < limit; i += 1) {
    const key = keys[i];
    if (SECRET_KEY.test(key)) {
      out[key] = "[REDACTED]";
      continue;
    }
    out[key] = sanitize(value[key], depth + 1, seen);
  }
  if (keys.length > maxKeys) out.__truncatedKeys = keys.length - maxKeys;
  return out;
}

const coerceErrorMessage = winston.format((info) => {
  if (info instanceof Error) {
    return {
      ...BASE,
      level: "error",
      message: info.message,
      err: normalizeError(info),
    };
  }
  if (info && info.message instanceof Error) {
    const err = info.message;
    info.message = err.message;
    info.err = info.err || err;
  }
  return info;
});

const attachContext = winston.format((info) => {
  const ctx = getContext();
  if (!ctx) return info;
  // Don’t stomp explicitly provided fields.
  for (const [k, v] of Object.entries(ctx)) {
    if (info[k] === undefined) info[k] = v;
  }
  return info;
});

const normalizeInfo = winston.format((info) => {
  const { level, message, timestamp, ...rest } = info;

  const safe = sanitize(rest);
  const out = {
    timestamp,
    level,
    message,
    ...BASE,
    ...safe,
  };

  if (out.err) out.err = normalizeError(out.err);
  if (out.error) out.error = normalizeError(out.error);
  if (out.reason) out.reason = normalizeError(out.reason);

  return out;
});

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.splat(),
  winston.format.errors({ stack: true }),
  coerceErrorMessage(),
  attachContext(),
  normalizeInfo()
);

const devFormat = winston.format.printf((info) => {
  const { timestamp, level, message, service, env, ...meta } = info;
  const lvl = String(level).toUpperCase();
  const badge = `${levelIcon(level)} ${lvl}`;
  const head = `${paint(ANSI.gray, timestamp)} ${paint(levelColor(level), badge)} ${paint(
    ANSI.cyan,
    `[${service}/${env}]`
  )}`;

  const metaStr = Object.keys(meta).length
    ? inspect(meta, { depth: 6, breakLength: 140, compact: true, sorted: true })
    : "";
  return `${head} ${message}${metaStr ? ` ${metaStr}` : ""}`;
});

const transport = new winston.transports.Console({
  silent: IS_TEST,
  handleExceptions: true,
  handleRejections: true,
  format: IS_DEV ? winston.format.combine(baseFormat, devFormat) : winston.format.combine(baseFormat, winston.format.json()),
});

const logger = winston.createLogger({
  level: levelForEnv(),
  levels: winston.config.npm.levels,
  exitOnError: false,
  transports: [transport],
});

// Preserve the existing API you already use across the backend.
logger.childWith = (meta) => logger.child(meta || {});

// High-value helpers (optional to use).
logger.withContext = withContext;
logger.getContext = getContext;
logger.expressContextMiddleware = expressContextMiddleware;

module.exports = logger;
