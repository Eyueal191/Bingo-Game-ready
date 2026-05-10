const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
  cardAmount: {
    type: Number,
    required: true,
    default: 10,
    min: [1, "System reservation limit must be at least 1"],
  },
  maxUserReservedCards: {
    type: Number,
    required: true,
    default: 1000,
    min: [1, "Max user reserved cards must be at least 1"],
  },
  maxTotalCards: {
    type: Number,
    required: true,
    default: 1000,
    min: [2, "Max total cards must be at least 2"],
  },
  countdownDuration: {
    type: Number,
    default: 30,
    min: [10, "Countdown must be at least 10 seconds"],
  },
  defaultPlayMode: {
    type: String,
    enum: ["manual", "auto"],
    default: "manual",
  },
  // Card Reservation Settings
  cardReservation: {
    mode: {
      type: String,
      enum: ["single", "multiple"],
      default: "single",
    },
    maxCardsPerUser: {
      type: Number,
      default: 1000,
      min: [1, "Min cards per user must be at least 1"],
    },
    maxCardsPerRoom: {
      type: Number,
      default: 1000,
      min: [1, "Min cards per room must be at least 1"],
    },
    allowCrossRoomReservations: {
      type: Boolean,
      default: false, // If false, user can only have cards in one room at a time
    },
    isClickToReserve: {
      type: Boolean,
      default: false,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Setting = mongoose.model("Setting", settingSchema);
module.exports = Setting;