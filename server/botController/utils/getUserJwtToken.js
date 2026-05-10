const jwt = require("jsonwebtoken");
const CONFIG = require("../../config/config");
const User = require("../../models/userModels");

async function getUserJwtToken(telegramId) {
  try {
    const normalizedTelegramId = telegramId?.toString();
    if (!normalizedTelegramId) return null;

    const user = await User.findOne({ telegramId: normalizedTelegramId });
    if (!user) return null;
    if (user.isBanned) return null;
    
    return jwt.sign({ id: user._id, role: user.role }, CONFIG.jwtSecret, {
      expiresIn: "7d",
    });
  } catch (error) {
    return null;
  }
}

module.exports = { getUserJwtToken };