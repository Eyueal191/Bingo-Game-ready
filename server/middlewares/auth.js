const CONFIG = require("../config/config");
const User = require("../models/userModels");
const jwt = require("jsonwebtoken");

const authenticate = async function (req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication required, you need to login and acquire token",
      });
    }

    const decoded = jwt.verify(token, CONFIG.jwtSecret);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Admin-only middleware
const isAdmin = function (req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

module.exports = { authenticate, isAdmin };
