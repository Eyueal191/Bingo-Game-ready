require("dotenv").config();
const AdminSetting = require("../models/adminSetting");
const { normalizePhone } = require("../utils/phoneUtils");


const User = require("../models/userModels");
const jwt = require("jsonwebtoken");
const CONFIG = require("../config/config");
const ManualTransaction = require("../models/DepositRequest");
const Reservation = require("../models/reservationModel");
const WalletLog = require("../models/walletLog");
const logger = require("../utils/winstonLogger");
const crypto = require("crypto");
const { createHmac } = crypto;
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  tokenParamsSchema,
  passwordSchema,
  paramsSchema,
  guestRegisterSchema,
  staffRegisterSchema,
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
        country: user.country,
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

    // 🔹 2. Validate phone using multi-country system
    let { phone } = req.body;
    const phoneResult = normalizePhone(phone);
    if (phoneResult.error) return res.status(400).json({ message: phoneResult.error });
    const normalizedPhone = phoneResult.phone;

    // 🔹 3. Validate other registration fields
    const validatedData = { ...req.body, phone: normalizedPhone }; // Use normalized phone for validation
    const { error } = registerSchema.validate(validatedData);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const query = { $or: [{ phone: normalizedPhone }] };
    if (validatedData.telegramId) {
      query.$or.push({ telegramId: validatedData.telegramId });
    }
    if (validatedData.email) {
      query.$or.push({ email: validatedData.email });
    }

    const existingUser = await User.findOne(query);

    if (existingUser) {
      if (existingUser.phone === normalizedPhone) {
        return res
          .status(400)
          .json({ message: "User already exists with this phone number" });
      }
      if (
        validatedData.telegramId &&
        existingUser.telegramId === validatedData.telegramId
      ) {
        return res
          .status(400)
          .json({ message: "User already exists with this Telegram account" });
      }
      if (validatedData.email && existingUser.email === validatedData.email) {
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
      }
      return res.status(400).json({ message: "User already exists" });
    }

    // 🔹 5. Prepare new user data
    const country = validatedData.country || phoneResult.country;
    if (!country) {
      return res.status(400).json({ message: "Unable to detect country from phone number" });
    }

    const userData = {
      telegramId: validatedData.telegramId || undefined,
      email: validatedData.email || undefined,
      fullName: validatedData.fullName,
      phone: normalizedPhone,
      referralCode: generateReferralCode(),
      wallet: 0,
      bonus: 0,
      role: "user",
      country: country,
    };

    if (validatedData.password) userData.password = validatedData.password;
    if (validatedData.invitedBy) userData.invitedBy = validatedData.invitedBy;
    // 🔹 6. Bonus calculation logic
    let agentThatFunded = null;
    let shouldRecordUserBonusTx = false;
    let userBonus = 0;

    if (isBonusEnabled) {
      if (validatedData.invitedBy) {
        const inviter = await User.findOne({ referralCode: validatedData.invitedBy });

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
        `Funded ${bonusAmount} coins registration bonus for invited user ${user.fullName || user.phone}`,
        `agent-funded-registration-bonus-${user._id}-${Date.now()}`,
        TransactionStatus.COMPLETED
      );
    }

    // 🔹 9. If user registered with email, trigger verification
    let emailVerificationPending = false;
    if (user.email && !user.isEmailVerified) {
      emailVerificationPending = true;
      try {
        await _sendVerificationEmail(user);
      } catch (emailError) {
        logger.warn("Auto email verification failed on register", { err: emailError });
      }
    }

    // 🔹 10. Return successful response
    return res.status(201).json({
      message: emailVerificationPending
        ? "User registered. Please check your email to verify your account."
        : "User registered successfully",
      token,
      emailVerificationPending,
      user: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email || undefined,
        isEmailVerified: user.isEmailVerified,
        wallet: user.wallet,
        bonus: user.bonus,
        referralCode: user.referralCode,
        invitedBy: user.invitedBy,
        role: user.role,
        country: user.country,
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

    // 🔹 Normalize phone number using multi-country system
    const phoneResult = normalizePhone(rawPhone);
    if (phoneResult.error) {
      return res.status(400).json({
        message: phoneResult.error,
      });
    }

    const normalizedPhone = phoneResult.phone;

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
        country: user.country,
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

    // Validate phone using multi-country system
    const phoneResult = normalizePhone(phone);
    if (phoneResult.error) {
      return res.status(400).json({ message: phoneResult.error });
    }
    const normalizedPhone = phoneResult.phone;
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

/**
 * Internal helper: Send verification email to a user.
 * Generates token, saves it on the user doc, and sends email if SMTP is configured.
 */
const _sendVerificationEmail = async (user) => {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  try {
    const nodemailer = require("nodemailer");
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?token=${verificationToken}`;
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: "Verify your email address",
        html: `
          <h2>Email Verification</h2>
          <p>Click the link below to verify your email:</p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#3f51b5;color:white;text-decoration:none;border-radius:6px;">Verify Email</a>
          <p>Or copy this link: ${verifyUrl}</p>
          <p>This link expires in 24 hours.</p>
        `,
      });
      return { success: true, emailSent: true };
    }
    return { success: true, emailSent: false, verificationToken };
  } catch (emailError) {
    logger.warn("Email sending not configured or failed", { err: emailError });
    return { success: false, error: emailError.message };
  }
};

/**
 * Guest Registration
 * Creates a temporary guest user with restricted access (view-only)
 */
const registerGuest = async (req, res) => {
  try {
    const body = req.body || {};
    const { error } = guestRegisterSchema.validate(body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { fullName } = body;
    const guestId = `guest_${crypto.randomBytes(6).toString("hex")}`;

    const userData = {
      fullName: fullName || "Guest Player",
      role: "guest",
      isGuest: true,
      wallet: 0,
      bonus: 0,
      referralCode: `GUEST-${guestId}`,
    };

    const user = await User.create(userData);
    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      message: "Guest session started",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        role: user.role,
        wallet: user.wallet,
        isGuest: true,
      },
    });
  } catch (error) {
    logger.error("Guest registration failed", { err: error });
    return res.status(500).json({ message: "Failed to create guest session" });
  }
};

/**
 * Admin: Register a staff member (finance, secretary, manager)
 * POST /admin/register-staff
 * Body: { fullName, phone, password, email?, role }
 */
const registerStaff = async (req, res) => {
  try {
    const body = req.body || {};
    const { error } = staffRegisterSchema.validate(body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { fullName, phone, password, email, role } = body;

    // Normalize phone number
    const phoneResult = normalizePhone(phone);
    if (phoneResult.error) return res.status(400).json({ message: phoneResult.error });
    const normalizedPhone = phoneResult.phone;

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [
        { phone: normalizedPhone },
        ...(email ? [{ email }] : [])
      ]
    });

    if (existingUser) {
      const field = existingUser.phone === normalizedPhone ? "phone number" : "email";
      return res.status(400).json({
        message: `A user with this ${field} already exists`,
      });
    }

    const userData = {
      fullName,
      phone: normalizedPhone,
      password,
      role,
      email: email || undefined,
      referralCode: generateReferralCode(),
      wallet: 0,
      bonus: 0,
    };

    const user = await User.create(userData);

    return res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully`,
      user: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error) {
    logger.error("Staff registration failed", { err: error });

    // Detailed Duplicate Key Error Handling (MongoDB 11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      return res.status(400).json({
        message: `A user with this ${field} (${value}) already exists`
      });
    }

    return res.status(error.status || 500).json({
      message: error.message || "Failed to register staff member"
    });
  }
};

/**
 * Send email verification
 * POST /send-verification-email (authenticated)
 */
const sendEmailVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.email) {
      return res.status(400).json({ message: "No email address on this account" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const result = await _sendVerificationEmail(user);

    if (result.success) {
      return res.status(200).json({
        message: result.emailSent
          ? "Verification email sent. Please check your inbox."
          : "Email verification token generated. Email sending is not configured.",
        emailSent: result.emailSent,
        verificationToken: process.env.NODE_ENV === "development" ? result.verificationToken : undefined,
      });
    } else {
      return res.status(500).json({ message: "Failed to send verification email", error: result.error });
    }
  } catch (error) {
    logger.error("Email verification failed", { err: error });
    return res.status(500).json({ message: "Failed to send verification email" });
  }
};

/**
 * Verify email with token
 * GET /verify-email/:token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.status(200).json({
      message: "Email verified successfully",
      verified: true,
    });
  } catch (error) {
    logger.error("Email verification failed", { err: error });
    return res.status(500).json({ message: "Failed to verify email" });
  }
};
const getMySummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId)
      .select("_id fullName phone telegramId wallet bonus createdAt")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    const [
      smsDeposits,
      manualDeposits,
      addisDeposits,
      manualWithdrawals,
      addisWithdrawals,
      gameHistory,
      walletLogs,
    ] = await Promise.all([
      ManualTransaction.find({ userId: user._id, source: "sms" })
        .sort({ createdAt: -1 })
        .lean(),
      ManualTransaction.find({ userId: user._id, type: "deposit", source: { $ne: "sms" } })
        .sort({ createdAt: -1 })
        .lean(),
      Transaction.find({ userId: user._id, type: TransactionType.DEPOSIT })
        .sort({ createdAt: -1 })
        .lean(),
      ManualTransaction.find({ userId: user._id, type: "Withdrawal" })
        .sort({ createdAt: -1 })
        .lean(),
      Transaction.find({ userId: user._id, type: TransactionType.WITHDRAWAL })
        .sort({ createdAt: -1 })
        .lean(),
      Reservation.find({ userId: user._id })
        .populate("roomId", "stakeAmount winAmount status createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      WalletLog.find({ targetUser: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const toAmountSum = (arr) =>
      (arr || []).reduce((sum, x) => sum + Number(x?.amount || 0), 0);

    const totalAdjustments = (walletLogs || []).reduce((sum, log) => sum + (log.amount || 0), 0);

    const wins = (gameHistory || []).filter((g) => g.gameStatus === "won").length;
    const losses = (gameHistory || []).filter((g) => g.gameStatus === "lost").length;

    res.json({
      success: true,
      stats: {
        totalDeposit:
          toAmountSum(smsDeposits) +
          toAmountSum(manualDeposits) +
          toAmountSum(addisDeposits),
        totalWithdraw: toAmountSum(manualWithdrawals) + toAmountSum(addisWithdrawals),
        totalAdjustments,
        totalGames: (gameHistory || []).length,
        wins,
        losses,
      },
    });
  } catch (error) {
    logger.error("Error building my summary", { error: error?.message });
    res.status(500).json({ message: "Server error" });
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
  registerGuest,
  registerStaff,
  sendEmailVerification,
  verifyEmail,
  // Helpers used by other controllers
  generateReferralCode,
  createTransaction,
  getMySummary,
};