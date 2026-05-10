const cors = require("cors");
const CONFIG = require("../config/config");

const corsMiddleware = cors({
  origin: [
    "http://localhost:5173",
    CONFIG.frontendUrl,
    "https://bingo.smartbingogames.com",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200,
});

module.exports = corsMiddleware;
