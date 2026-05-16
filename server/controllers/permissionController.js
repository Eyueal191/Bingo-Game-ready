const User = require("../models/userModels");
const { body, validationResult } = require("express-validator");
const logger = require("../utils/winstonLogger");
const { generateReferralCode, createTransaction } = require("./authController");
const { TransactionType, TransactionStatus } = require("../models/Transaction");

// Local phone normalizer to avoid relying on non-exported helpers
const normalizePhone = (phone) => {
  if (!phone || typeof phone !== "string") {
    throw new Error("Phone number is required");
  }
  let normalized = phone.trim().replace(/[\s-]/g, "");
  if (normalized.startsWith("09") || normalized.startsWith("07")) {
    normalized = `+251${normalized.slice(1)}`;
  } else if (normalized.startsWith("251")) {
    normalized = `+${normalized}`;
  } else if (!normalized.startsWith("+251")) {
    normalized = `+251${normalized}`;
  }
  if (!/^\+251[79]\d{8}$/.test(normalized)) {
    const err = new Error("Invalid Ethiopian phone format");
    err.status = 400;
    throw err;
  }
  return normalized;
};

const registerGameManager = [
  // Input validation
  body("telegramId").notEmpty().withMessage("Telegram ID is required"),
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\+251[79]\d{8}$/)
    .withMessage("Invalid Ethiopian phone format"),
  body("gamePermissions.bingo")
    .isBoolean()
    .withMessage("Bingo permission must be boolean"),
  body("gamePermissions.keshkesh")
    .isBoolean()
    .withMessage("Keshkesh permission must be boolean"),
  body("gamePermissions.material_lottery")
    .isBoolean()
    .withMessage("Material lottery permission must be boolean"),
  body("password")
    .optional()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ max: 100 })
    .withMessage("Full name must not exceed 100 characters"),

  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      // Only admins can register game managers
      if (req.user.role !== "admin") {
        return res.status(403).json({
          message: "Unauthorized: Only admins can register game managers",
        });
      }

      const { telegramId, phone, fullName, password, gamePermissions } =
        req.body;

      // Normalize phone
      const normalizedPhone = normalizePhone(phone);

      // Handle existing users & conflicts explicitly
      const existingByTelegram = await User.findOne({ telegramId });
      const existingByPhone = await User.findOne({ phone: normalizedPhone });

      if (
        existingByTelegram &&
        existingByPhone &&
        existingByTelegram._id.toString() !== existingByPhone._id.toString()
      ) {
        // Conflict: phone belongs to a different user than the provided telegramId
        return res.status(400).json({
          message:
            "Conflict: phone number belongs to a different user. Please resolve duplicate accounts first.",
        });
      }

      const existingUser = existingByTelegram || existingByPhone;

      if (existingUser) {
        const wasManager = existingUser.role === "game_manager";

        // Update core fields safely
        if (!existingUser.telegramId) existingUser.telegramId = telegramId;
        if (existingUser.phone !== normalizedPhone)
          existingUser.phone = normalizedPhone;
        if (fullName && fullName !== existingUser.fullName)
          existingUser.fullName = fullName;

        // Promote or update permissions
        existingUser.role = "game_manager";
        existingUser.gamePermissions = {
          bingo: gamePermissions?.bingo || false,
          keshkesh: gamePermissions?.keshkesh || false,
          material_lottery: gamePermissions?.material_lottery || false,
        };

        await existingUser.save();

        // If newly promoted, optionally create a registration bonus
        if (!wasManager) {
          const transaction = await createTransaction(
            existingUser._id,
            10,
            TransactionType.REGISTRATION_BONUS,
            "Registration bonus for game manager",
            `registration-bonus-${existingUser._id}-${Date.now()}`,
            TransactionStatus.COMPLETED
          );
          existingUser.transactions.push(transaction._id);
          await existingUser.save();
        }

        logger.info(
          wasManager ? "Game manager updated" : "User promoted to game manager",
          {
            telegramId,
            role: existingUser.role,
            gamePermissions: existingUser.gamePermissions,
          }
        );

        return res.status(200).json({
          message: wasManager
            ? "Existing game manager updated successfully"
            : "User promoted to game manager successfully",
          user: {
            id: existingUser._id,
            telegramId: existingUser.telegramId,
            phone: existingUser.phone,
            fullName: existingUser.fullName,
            role: existingUser.role,
            gamePermissions: existingUser.gamePermissions,
            wallet: existingUser.wallet,
            bonus: existingUser.bonus,
            referralCode: existingUser.referralCode,
          },
        });
      }

      // Create game manager
      const user = new User({
        telegramId,
        phone: normalizedPhone,
        fullName,
        password: password || undefined,
        role: "game_manager",
        gamePermissions: {
          bingo: gamePermissions.bingo || false,
          keshkesh: gamePermissions.keshkesh || false,
          material_lottery: gamePermissions.material_lottery || false,
        },
        referralCode: generateReferralCode(),
        wallet: 10,
        bonus: 10,
        is_active: true,
      });

      await user.save();

      // Create registration bonus transaction
      const transaction = await createTransaction(
        user._id,
        10,
        TransactionType.REGISTRATION_BONUS,
        "Registration bonus for game manager",
        `registration-bonus-${user._id}-${Date.now()}`,
        TransactionStatus.COMPLETED
      );
      user.transactions.push(transaction._id);
      await user.save();

      logger.info("Game manager registered", {
        telegramId,
        role: "game_manager",
        gamePermissions,
      });

      res.status(201).json({
        message: "Game manager registered successfully",
        user: {
          id: user._id,
          telegramId: user.telegramId,
          phone: user.phone,
          fullName: user.fullName,
          role: user.role,
          gamePermissions: user.gamePermissions,
          wallet: user.wallet,
          bonus: user.bonus,
          referralCode: user.referralCode,
        },
      });
    } catch (error) {
      logger.error("Game manager registration failed:", error);
      res.status(500).json({ message: "Failed to register game manager" });
    }
  },
];

const updateUserPermissions = [
  // Input validation
  body("role")
    .optional()
    .isIn(["user", "admin", "game_manager"])
    .withMessage("Invalid role"),
  body("gamePermissions.bingo")
    .optional()
    .isBoolean()
    .withMessage("Bingo permission must be boolean"),
  body("gamePermissions.keshkesh")
    .optional()
    .isBoolean()
    .withMessage("Keshkesh permission must be boolean"),
    body("gamePermissions.material_lottery")
    .optional()
    .isBoolean()
    .withMessage("Material lottery permission must be boolean"),

  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      // Only admins can update permissions
      if (req.user.role !== "admin") {
        return res.status(403).json({
          message: "Unauthorized: Only admins can update permissions",
        });
      }

      const { userId } = req.params;
      const { role, gamePermissions } = req.body;

      // Prevent updating self to non-admin
      if (userId === req.user._id.toString() && role && role !== "admin") {
        return res.status(403).json({
          message: "Admins cannot downgrade their own role",
        });
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update fields if provided
      if (role) {
        user.role = role;
        // Reset gamePermissions for non-game_manager roles
        if (role !== "game_manager") {
          user.gamePermissions = { bingo: false, keshkesh: false };
        }
      }
      if (gamePermissions && user.role === "game_manager") {
        user.gamePermissions = {
          bingo:
            gamePermissions.bingo !== undefined
              ? gamePermissions.bingo
              : user.gamePermissions.bingo,
          keshkesh:
            gamePermissions.keshkesh !== undefined
              ? gamePermissions.keshkesh
              : user.gamePermissions.keshkesh,
           material_lottery:
            gamePermissions.material_lottery !== undefined
              ? gamePermissions.material_lottery
              : user.gamePermissions.material_lottery,
        };
      }

      await user.save();
      logger.info("User permissions updated", {
        userId,
        role,
        gamePermissions,
      });

      res.status(200).json({
        message: "Permissions updated successfully",
        user: {
          id: user._id,
          telegramId: user.telegramId,
          role: user.role,
          gamePermissions: user.gamePermissions,
        },
      });
    } catch (error) {
      logger.error("Failed to update permissions:", error);
      res.status(500).json({ message: "Failed to update permissions" });
    }
  },
];

const getUserPermissions = async (req, res) => {
  try {
    logger.debug("getUserPermissions called", {
      user: req.user,
      params: req.params,
    });
    // Only admins can view permissions
    if (!req.user || req.user.role !== "admin") {
      logger.warn("Unauthorized access to getUserPermissions", {
        user: req.user,
      });
      return res.status(403).json({
        message: "Unauthorized: Only admins can view permissions",
      });
    }

    const { userId } = req.params;
    if (!userId) {
      logger.warn("No userId provided in params");
      return res.status(400).json({ message: "userId parameter is required" });
    }
    logger.debug("Looking up userId:", userId);
    const user = await User.findById(userId).select(
      "telegramId role gamePermissions fullName phone"
    );
    logger.debug("User found:", user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Permissions retrieved successfully",
      user: {
        id: user._id,
        telegramId: user.telegramId,
        role: user.role,
        gamePermissions: user.gamePermissions,
        fullName: user.fullName,
        phone: user.phone,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch permissions:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  }
};

const getGameManagers = async (req, res) => {
  logger.debug("getGameManagers called", { user: req.user, query: req.query });

  try {
    logger.debug("Entering getGameManagers endpoint");

    // Only admins can view game managers
    if (req.user.role !== "admin") {
      logger.warn("Unauthorized access attempt to getGameManagers");
      return res.status(403).json({
        message: "Unauthorized: Only admins can view game managers",
      });
    }

    const { page = 1, limit = 10, search = "" } = req.query;
    const query = { role: "game_manager" };

    if (search) {
      // Function to escape regex special characters
      const escapeRegex = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      };
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { fullName: { $regex: escapedSearch, $options: "i" } },
        { phone: { $regex: escapedSearch, $options: "i" } },
        { telegramId: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({ message: "Invalid limit value" });
    }

    const skip = (pageNum - 1) * limitNum;

    logger.debug("Querying game managers", { query, skip, limitNum });
    const totalUsers = await User.countDocuments(query);
    logger.debug("Total game managers count:", totalUsers);
    const users = await User.find(query)
      .select("telegramId role gamePermissions fullName phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    logger.debug("Fetched users:", users);

    const usersWithId = users.map((user) => ({
      ...user,
      id: user._id.toString(),
    }));

    const totalPages = Math.ceil(totalUsers / limitNum);
    return res.status(200).json({
      success: true,
      count: usersWithId.length,
      totalUsers,
      totalPages,
      currentPage: pageNum,
      users: usersWithId,
    });
  } catch (error) {
    logger.error("Failed to fetch game managers:", error);
    return res
      .status(500)
      .json({ message: error.message || "Failed to fetch game managers" });
  }
};

module.exports = {
  registerGameManager,
  updateUserPermissions,
  getUserPermissions,
  getGameManagers,
};
