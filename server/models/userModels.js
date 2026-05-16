const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    telegramId: {
      type: String,
      unique: true,
      sparse: true,
      required: false,
    },

    fullName: { type: String, required: false },
    phone: { type: String, required: true, unique: true },
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
      enum: ["user", "admin", "agent", "game_manager", "robot"],
      default: "user",
    },
    isRobot: { type: Boolean, default: false }, // Quick flag for robot identification
    gamePermissions: {
      bingo: { type: Boolean, default: false },
      keshkesh: { type: Boolean, default: false },
      material_lottery: { type: Boolean, default: false },
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

userSchema.methods.verifyPassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("Users", userSchema);
module.exports = User;
