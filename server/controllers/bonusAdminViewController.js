const GameRoom = require("../models/gameRoom");
const StakeBonusSettings = require("../models/stakeBonusSettings");

// Returns all unique stake amounts from waiting/starting rooms, with merged bonus settings
exports.getPendingStakesWithBonus = async (req, res) => {
  try {
    // Fetch all pending rooms except "completed"
    const pendingRooms = await GameRoom.find({ status: { $ne: "completed" } });

    // Extract unique stake amounts
    const uniqueStakes = [...new Set(pendingRooms.map((r) => r.stakeAmount))];

    if (uniqueStakes.length === 0) {
      return res.status(200).json([]); // Early return if nothing to process
    }

    // Fetch all bonus settings for these stakes
    const allBonus = await StakeBonusSettings.find({
      stakeAmount: { $in: uniqueStakes },
    });

    // Create a lookup map for quick access
    const bonusMap = new Map();
    allBonus.forEach((b) => bonusMap.set(b.stakeAmount, b));

    // Merge stake amounts with bonus settings
    const result = uniqueStakes.map((stake) => {
      const bonus = bonusMap.get(stake) || {};
      return {
        _id: bonus._id || null,
        stakeAmount: stake,
        bonusEnabled: bonus.bonusEnabled || false,
        bonusAmount: bonus.bonusAmount || 0,
        bonusDescription: bonus.bonusDescription || "",
        systemCommission: bonus.systemCommission ?? 0.2,
        robotEnabled: bonus ? bonus.robotEnabled : true,
        robotMinCards: bonus ? bonus.robotMinCards : 1,
        robotMaxCards: bonus ? bonus.robotMaxCards : 5,
        robotWinningPercent: bonus ? bonus.robotWinningPercent ?? 0 : 0,

      };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch stake bonus list",
      error: error.message || error,
    });
  }
};