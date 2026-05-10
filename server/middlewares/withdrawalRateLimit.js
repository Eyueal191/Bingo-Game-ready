const rateLimit = require("express-rate-limit");

const withdrawalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) =>
    req.user?._id?.toString() || rateLimit.ipKeyGenerator(req, res),
  message: {
    message:
      "Too many withdrawal attempts. Please wait a minute before trying again.",
  },
});

module.exports = withdrawalLimiter;
