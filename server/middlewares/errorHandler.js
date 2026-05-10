const logger = require("../utils/winstonLogger");

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const candidateStatusCode =
    Number(err?.statusCode) || Number(err?.status) || undefined;

  // Best-effort classification for common errors
  let inferredStatus = undefined;
  if (err?.name === "ValidationError") inferredStatus = 400; // mongoose
  if (err?.name === "CastError") inferredStatus = 400; // mongoose bad ObjectId
  if (err?.code === 11000) inferredStatus = 409; // mongo duplicate key
  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    inferredStatus = 401;
  }
  if (err?.name === "MulterError") inferredStatus = 400;

  const statusCode =
    Number.isFinite(candidateStatusCode) && candidateStatusCode > 0
      ? candidateStatusCode
      : Number.isFinite(inferredStatus)
      ? inferredStatus
      : err?.code === 400
      ? 400
      : 500;

  const expose =
    typeof err?.expose === "boolean" ? err.expose : statusCode < 500;

  const message = expose && err?.message ? err.message : "Something went wrong!";

  logger.error("Request failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err?.message,
    stack: err?.stack,
  });

  res.status(statusCode).json({ message });
};

module.exports = errorHandler;
