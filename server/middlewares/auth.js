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

// Role hierarchy (higher index = more access)
const ROLE_HIERARCHY = {
  guest: 0,
  user: 1,
  agent: 2,
  game_manager: 3,
  secretary: 4,
  finance: 5,
  manager: 6,
  admin: 7,
};

// Generic role-level check helper
const requireRoleLevel = (minRole, label) => {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const userLevel = ROLE_HIERARCHY[req.user.role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 999;
    if (userLevel < requiredLevel) {
      return res.status(403).json({ message: `${label} access required` });
    }
    next();
  };
};

// Admin-only middleware
const isAdmin = function (req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Manager access (Admin or Manager)
const isManager = requireRoleLevel("manager", "Manager");

// Finance access (Admin, Manager, or Finance)
const isFinance = requireRoleLevel("finance", "Finance");

// Secretary access (Admin, Manager, Finance, or Secretary)
const isSecretary = requireRoleLevel("secretary", "Secretary");

// Game Manager access (Admin, Manager, or Game Manager)
const isGameManager = function (req, res, next) {
  if (
    !req.user ||
    !["admin", "manager", "game_manager"].includes(req.user.role)
  ) {
    return res.status(403).json({ message: "Game Manager access required" });
  }
  next();
};

// Block guests from transactional endpoints
const isNotGuest = function (req, res, next) {
  if (!req.user || req.user.role === "guest") {
    return res
      .status(403)
      .json({ message: "Guest accounts cannot perform this action" });
  }
  next();
};

module.exports = {
  authenticate,
  isAdmin,
  isManager,
  isFinance,
  isSecretary,
  isGameManager,
  isNotGuest,
  ROLE_HIERARCHY,
};
