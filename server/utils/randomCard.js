const StakeBonusSettings = require("../models/stakeBonusSettings");
const logger = require("./winstonLogger");

// Get random card count for robot based on stake settings
const getRandomCardCount = async (stakeAmount) => {
  try {
    const settings = await StakeBonusSettings.findOne({ stakeAmount });
    if (settings && settings.robotEnabled !== false) {
      const minCards = settings.robotMinCards || 1;
      const maxCards = settings.robotMaxCards || 5;
      // Return random number between minCards and maxCards inclusive
      return Math.floor(Math.random() * (maxCards - minCards + 1)) + minCards;
    }
  } catch (error) {
    logger.error("Error fetching robot settings", error);
  }
  // Fallback based on stake amount (original logic)
  switch (stakeAmount) {
    case 10:
      return Math.floor(Math.random() * (10 - 5 + 1)) + 5; // 5-10
    case 20:
      return Math.floor(Math.random() * (6 - 3 + 1)) + 3; // 3-6
    case 50:
      return Math.floor(Math.random() * (5 - 2 + 1)) + 2; // 2-5
    default:
      return 1;
  }
};

module.exports = getRandomCardCount;