const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    telegramId: { type: String, required: false, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },

    fullName: { type: String, required: false },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String, required: false },
    referralCode: { type: String, unique: false },
    tempCards: { type: [String], default: [] },
    wallet: {
      type: Number,
      default: 0,
      validate: {
        validator: function (v) {
          // Allow negative balance only for robot users or if explicitly flagged
          if (this.role === "robot" || this.isRobot) return true;
          return v >= 0;
        },
        message: "Wallet balance cannot be negative for regular users",
      },
    },
    language: { type: String, default: "en" },
    country: { type: String, uppercase: true, trim: true },
    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },
    invitedBy: { type: String },
    transactions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    ],
    role: {
      type: String,
      enum: [
        "user",
        "admin",
        "agent",
        "game_manager",
        "robot",
        "finance",
        "secretary",
        "manager",
        "guest",
      ],
      default: "user",
    },
    isRobot: { type: Boolean, default: false }, // Quick flag for robot identification
    isGuest: { type: Boolean, default: false }, // Quick flag for guest identification
    gamePermissions: {
      bingo: { type: Boolean, default: false },
      keshkesh: { type: Boolean, default: false },
      spin: { type: Boolean, default: false },
      material_lottery: { type: Boolean, default: false },
      ludo: { type: Boolean, default: false },
    },
    paidInvitedPlayers: [
      { type: Schema.Types.ObjectId, ref: "Users", default: [] },
    ],
    // Account status
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },
    bannedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Convert null or empty strings to undefined for sparse indexes
userSchema.pre("validate", function (next) {
  if (this.telegramId === null || this.telegramId === "") {
    this.telegramId = undefined;
  }
  if (this.email === null || this.email === "") {
    this.email = undefined;
  }
  next();
});

userSchema.methods.verifyPassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("Users", userSchema);
module.exports = User;
