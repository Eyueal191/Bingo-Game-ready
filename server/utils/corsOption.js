const CONFIG = require("../config/config");

const corsOptions = {
  origin: [
    CONFIG.frontendUrl,
    "http://localhost:5173",
    "https://bingo.smartbingogames.com",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
};

module.exports = corsOptions;
