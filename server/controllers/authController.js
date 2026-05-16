require("dotenv").config();
const   AdminSetting  =require("../models/adminSetting");
const { sanitizeAndValidatePhone } = require("../utils/phoneUtils");


const User = require("../models/userModels");
const jwt = require("jsonwebtoken");
const CONFIG = require("../config/config");
const logger = require("../utils/winstonLogger");
const crypto = require("crypto");
const { NotifyUserTelegram } = require("../botController/notification");
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  tokenParamsSchema,
  passwordSchema,
  paramsSchema,
} = require("../lib/schema");

const {
  Transaction,
  TransactionType,
  TransactionStatus,
} = require("../models/Transaction");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, CONFIG.jwtSecret, { expiresIn: "7d" });
};

const TELEGRAM_BOT_TOKENS = [
  CONFIG.telegramBotToken,
  CONFIG.telegramNotificationBotToken,
].filter(Boolean);

const createTransaction = async (
  userId,
  amount,
  type,
  description,
  reference,
  status = TransactionStatus.PENDING
) => {
  const transaction = new Transaction({
    userId,
    amount,
    type,
    description,
    reference:
      reference ||
      `${type}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    status: status,
    metadata: { createdAt: new Date() },
  });
  await transaction.save();
  logger.info("Transaction created", {
    userId,
    type,
    reference: transaction.reference,
  });
  return transaction;
};
// const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const generateReferralCode = () => crypto.randomBytes(4).toString("hex");

const validateTelegramInitData = (initData) => {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Try each token
  for (const token of TELEGRAM_BOT_TOKENS) {
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(token)
      .digest();

    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (calculatedHash === hash) {
      return true;
    }
  }

  return false;
};
/**
 * telegram user login
 */
const telegramAuth = async (req, res) => {
  try {
    const { initData } = req.body;

    // 1. Validate Telegram initData (security check)
    if (!initData || !validateTelegramInitData(initData)) {
      return res
        .status(401)
        .json({ message: "Invalid Telegram authentication data" });
    }

    // 2. Parse user data safely
    const params = new URLSearchParams(initData);
    const userData = JSON.parse(params.get("user") || "{}");
    const telegramId = userData.id?.toString();

    if (!telegramId) {
      return res.status(400).json({ message: "Telegram user ID is missing" });
    }

    // 3. Check if user exists
    let user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(400).json({
        message:
          "Phone number is required. Please share your phone number in Telegram to register.",
        requiresPhone: true,
      });
    }

    // Block banned users
    if (user.isBanned) {
      return res.status(403).json({
        message: "Account is banned",
        banned: true,
        reason: user.banReason,
      });
    }

    // 4. Generate JWT token (avoid sensitive data in payload)
    const token = generateToken(user._id, user.role);

    // 5. Return success response (exclude sensitive fields)
    return res.status(200).json({
      message: "Telegram login successful",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        wallet: user.wallet,
        bonus: user.bonus,
        referralCode: user.referralCode,
        invitedBy: user.invitedBy,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error("Telegram auth failed", { err: error });
    return res
      .status(500)
      .json({ message: "Internal server error during authentication" });
  }
};


/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    // 🔹 1. Load Admin bonus settings
    const settings = await AdminSetting.getSettings();
    const isBonusEnabled = settings.isBonusEnabled;
    const bonusAmount = settings.bonusAmount;

    // 🔹 2. Validate phone
    let { phone, telegramId } = req.body;
    
    // Auto-generate a robust mock telegramId for web users if none provided
    const resolvedTelegramId = telegramId || `web_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const { phone: normalizedPhone, error: phoneError } = sanitizeAndValidatePhone(phone);
    if (phoneError) return res.status(400).json({ message: phoneError });

    // 🔹 3. Validate other registration fields
    const validatedData = { ...req.body, phone: normalizedPhone, telegramId: resolvedTelegramId }; // Use normalized phone & resolved telegramId
    const { error } = registerSchema.validate(validatedData);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // 🔹 4. Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { phone: normalizedPhone },
        { telegramId: resolvedTelegramId },
      ],
    });
    
    if (existingUser) {
      // Check if we can link a real Telegram ID to a web-registered account
      const isWebUser = existingUser.telegramId.startsWith("web_");
      const isNewTelegramUser = !resolvedTelegramId.startsWith("web_");

      if (existingUser.phone === normalizedPhone && isWebUser && isNewTelegramUser) {
        // Double check that the new telegramId isn't already taken by someone else
        const otherUserWithTelegramId = await User.findOne({ telegramId: resolvedTelegramId });
        if (otherUserWithTelegramId && otherUserWithTelegramId._id.toString() !== existingUser._id.toString()) {
           return res.status(400).json({ message: "User already exists with this Telegram account" });
        }

        // Link the real Telegram ID to the existing web account
        existingUser.telegramId = resolvedTelegramId;
        // Optionally update fullName if it's missing or generic
        if (validatedData.fullName && (!existingUser.fullName || existingUser.fullName.toLowerCase().includes("web"))) {
           existingUser.fullName = validatedData.fullName;
        }
        await existingUser.save();
        
        const token = generateToken(existingUser._id, existingUser.role);
        return res.status(200).json({
          message: "Telegram account linked successfully",
          linked: true,
          token,
          user: {
            _id: existingUser._id,
            fullName: existingUser.fullName,
            phone: existingUser.phone,
            wallet: existingUser.wallet,
            bonus: existingUser.bonus,
            referralCode: existingUser.referralCode,
            invitedBy: existingUser.invitedBy,
            role: existingUser.role,
          },
        });
      }

      if (existingUser.phone === normalizedPhone && existingUser.telegramId === resolvedTelegramId) {
        return res.status(400).json({ message: "User already exists with this phone number and Telegram ID" });
      }
      if (existingUser.telegramId === resolvedTelegramId) {
        return res.status(400).json({ message: "User already exists with this Telegram account" });
      }
      return res.status(400).json({ message: "User already exists with this phone number or Telegram ID" });
    }


    // 🔹 5. Prepare new user data
   const userData = {
      telegramId: resolvedTelegramId,
      fullName: validatedData.fullName,
      phone: normalizedPhone,
      referralCode: generateReferralCode(),
      wallet: 0,
      bonus: 0,
      role: "user",
    };

    if (validatedData.password) userData.password = validatedData.password;
    if (validatedData.invitedBy) userData.invitedBy = validatedData.invitedBy;
// 🔹 6. Bonus calculation logic
    let agentThatFunded = null;
    let inviter = null;
    let shouldRecordUserBonusTx = false;
    let userBonus = 0;

    if (isBonusEnabled) {
      if (validatedData.invitedBy) {
        inviter = await User.findOne({ referralCode: validatedData.invitedBy });

        if (inviter && inviter.role === "agent") {
          // Agent pays bonus if they have enough balance
          const updatedAgent = await User.findOneAndUpdate(
            {
              _id: inviter._id,
              role: "agent",
              wallet: { $gte: bonusAmount },
            },
            { $inc: { wallet: -bonusAmount } },
            { new: true }
          );

          if (updatedAgent) {
            userBonus = bonusAmount;
            agentThatFunded = updatedAgent;
            shouldRecordUserBonusTx = true;
          }
        } else {
          // System-funded bonus
          userBonus = bonusAmount;
          shouldRecordUserBonusTx = true;
        }
      } else {
        // No inviter → system-funded bonus
        userBonus = bonusAmount;
        shouldRecordUserBonusTx = true;
      }
    }

    // Registration bonus goes to bonus only (play-only balance, not withdrawable)
    userData.wallet = 0;
    userData.bonus = userBonus;

    // 🔹 7. Create user
    const user = await User.create(userData);
    const token = generateToken(user._id, user.role);

    // 🔹 8. Record transactions if applicable
    if (shouldRecordUserBonusTx && userBonus > 0) {
      await createTransaction(
        user._id,
        userBonus,
        TransactionType.REGISTRATION_BONUS,
        "Registration bonus for new user",
        `registration-bonus-${user._id}-${Date.now()}`,
        TransactionStatus.COMPLETED
      );
    }

    if (agentThatFunded) {
      await createTransaction(
        agentThatFunded._id,
        bonusAmount,
        TransactionType.TRANSFER,
        `Funded ${bonusAmount} ETB registration bonus for invited user ${user.fullName || user.phone}`,
        `agent-funded-registration-bonus-${user._id}-${Date.now()}`,
        TransactionStatus.COMPLETED
      );
    }

    // 🔹 9. Emit socket updates and send telegram notifications
    if (req.io) {
      // New user update
      req.io.to(user._id.toString()).emit("walletUpdate", { wallet: user.wallet, bonus: user.bonus });
      
      // Inviter update
      if (inviter && userBonus > 0) {
        req.io.to(inviter._id.toString()).emit("walletUpdate", { wallet: inviter.wallet, bonus: inviter.bonus });
      }
    }

    try {
      if (userBonus > 0 && user.telegramId && !user.telegramId.startsWith("web_")) {
        await NotifyUserTelegram(user.telegramId, `🎁 Welcome Bonus Received!\nYou have been awarded ${userBonus} ETB registration bonus to your play-only balance. Enjoy!`);
      }
      if (inviter && inviter.telegramId && userBonus > 0 && !inviter.telegramId.startsWith("web_") && inviter.role !== "robot") {
        const inviterMsg = inviter.role === "agent"
          ? `👥 <b>New User Funded</b>\n` + 
            `You just funded a registration bonus for ${user.fullName || "a new user"} who registered with your link. -${userBonus} ETB has been deducted from your wallet.`
          : `👥 <b>Referral Bonus Awarded!</b>\n` +
            `You earned a referral bonus because ${user.fullName || "a new user"} registered using your link. Check your bonus balance!`;
        await NotifyUserTelegram(inviter.telegramId, inviterMsg);
      }
    } catch (e) {
      logger.error("Failed to send telegram notifications during registration", { error: e.message });
    }

    // 🔹 10. Return successful response
    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        wallet: user.wallet,
        bonus: user.bonus,
        referralCode: user.referralCode,
        invitedBy: user.invitedBy,
        role: user.role,
      },
    });

  } catch (error) {
    logger.error("Registration failed", { err: error });
    return res.status(500).json({ message: "Failed to register user" });
  }
};

/**
 * User login
 */
const login = async (req, res) => {
  try {
    const { phone: rawPhone, password } = req.body;

    // 🔹 Normalize phone number to +251 format
    let normalizedPhone = rawPhone.trim();

    // Remove any spaces or dashes
    normalizedPhone = normalizedPhone.replace(/[\s-]/g, "");

    // Handle different phone number formats
    if (normalizedPhone.startsWith("09") || normalizedPhone.startsWith("07")) {
      // Convert 09... or 07... to +2519... or +2517...
      normalizedPhone = `+251${normalizedPhone.slice(1)}`;
    } else if (normalizedPhone.startsWith("251")) {
      // Convert 2519... to +2519...
      normalizedPhone = `+${normalizedPhone}`;
    } else if (!normalizedPhone.startsWith("+251")) {
      // If it doesn't match expected formats, assume it's a 9-digit number and prepend +251
      normalizedPhone = `+251${normalizedPhone}`;
    }

    // Ensure the final phone number is in +2519... or +2517... format (10 digits after +251)
    if (!/^\+251[79]\d{8}$/.test(normalizedPhone)) {
      return res.status(400).json({
        message:
          "Invalid phone number format. Use 09..., 07..., 251..., or +251...",
      });
    }

    // 🔹 Validate input for login
    const { error } = loginSchema.validate({
      phone: normalizedPhone,
      password,
    });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // 🔹 Authenticate using normalized phone & password
    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isBanned) {
      return res.status(403).json({
        message: "Account is banned",
        banned: true,
        reason: user.banReason,
      });
    }

    const isMatch = await user.verifyPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🔹 Generate JWT token
    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        wallet: user.wallet,
        bonus: user.bonus,
        referralCode: user.referralCode,
        invitedBy: user.invitedBy,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error("Login failed:", error);
    return res.status(500).json({ message: "Failed to login" });
  }
};
/**
 * Get user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    logger.error("Failed to fetch profile:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  const { error } = updateProfileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  try {
    const { fullName, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields if provided
    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        balance: user.wallet,
        referralCode: user.referralCode,
        invitedBy: user.invitedBy,
      },
    });
  } catch (error) {
    logger.error("Profile update failed:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/**
 * update full name using telegram id
 */

/**
 * Delete user account
 */
const deleteAccount = async (req, res) => {
  const { error } = paramsSchema.validate(req.user._id);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await User.findByIdAndDelete(req.user.id);
    logger.info("Account deleted successfully");
    return res.status(204).json({ message: "Account deleted successfully" });
  } catch (error) {
    logger.error("Failed to delete account:", error);
    return res.status(500).json({ message: "Failed to delete account" });
  }
};

/**
 * Get users invited by the current user
 */
const getInvitedUsers = async (req, res) => {
  const { error } = paramsSchema.validate(req.user._id);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const usersInvited = await User.find({
      invitedBy: user.referralCode,
    }).select("-password");

    if (usersInvited.length === 0) {
      return res.status(404).json({ message: "You have no invited users" });
    }

    res.status(200).json(usersInvited);
  } catch (error) {
    logger.error("Failed to fetch invited users", { err: error });
    res.status(500).json({ message: "Failed to fetch invited users" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isMatch = await user.verifyPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    user.password = newPassword;
    user.markModified("password");
    await user.save();
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    logger.error("Failed to change password:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const token = generateToken(user._id, user.role);
    res
      .status(200)
      .json({ message: "Password reset link sent to your telegram", token });
  } catch (error) {
    logger.error("Failed to reset password:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { error } = tokenParamsSchema.validate(req.params);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const { token } = req.params;
    const { password } = req.body;
    const decoded = jwt.verify(token, CONFIG.jwtSecret);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.password = password;
    user.markModified("password");
    await user.save();
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    logger.error("Failed to reset password:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
};

/**
 * Admin: Register a new agent
 * POST /admin/register-agent
 * Body: { telegramId, fullName, phone, password, initialWallet? }
 */
const registerAgent = async (req, res) => {
  try {
    const { telegramId, fullName, phone, password, initialWallet } = req.body;
    if (!telegramId || !phone) {
      return res
        .status(400)
        .json({ message: "telegramId and phone are required" });
    }
    // Normalize phone number
    let normalizedPhone = phone.trim().replace(/\s|-/g, "");
    if (normalizedPhone.startsWith("09") || normalizedPhone.startsWith("07")) {
      normalizedPhone = `+251${normalizedPhone.slice(1)}`;
    } else if (normalizedPhone.startsWith("251")) {
      normalizedPhone = `+${normalizedPhone}`;
    } else if (!normalizedPhone.startsWith("+251")) {
      normalizedPhone = `+251${normalizedPhone}`;
    }
    if (!/^\+251[79]\d{8}$/.test(normalizedPhone)) {
      return res
        .status(400)
        .json({ message: "Invalid Ethiopian phone format." });
    }
    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ phone: normalizedPhone }, { telegramId }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this phone or telegramId" });
    }
    // Create agent user
    const userData = {
      telegramId,
      fullName,
      phone: normalizedPhone,
      referralCode: crypto.randomBytes(4).toString("hex"),
      role: "agent",
    };
    if (password) userData.password = password;
    if (initialWallet != null && !isNaN(Number(initialWallet))) {
      userData.wallet = Math.max(0, Number(initialWallet));
    }
    const agent = await User.create(userData);
    return res
      .status(201)
      .json({ message: "Agent registered successfully", agent });
  } catch (error) {
    logger.error("Admin register agent failed", { err: error });
    res.status(500).json({ message: "Failed to register agent" });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  getInvitedUsers,
  changePassword,
  resetPassword,
  forgotPassword,
  telegramAuth,
  registerAgent,
  // Helpers used by other controllers
  generateReferralCode,
  createTransaction,
};
