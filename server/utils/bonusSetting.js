const StakeBonusSettings = require("../models/stakeBonusSettings");
// Helper: Attach bonus info to each room
const attachBonusToRooms = async (rooms) => {
  const stakeAmounts = [...new Set(rooms.map((r) => r.stakeAmount))];
  const allBonus = await StakeBonusSettings.find({
    stakeAmount: { $in: stakeAmounts },
  });
  return rooms.map((room) => {
    const bonus = allBonus.find(
      (b) => Number(b.stakeAmount) === Number(room.stakeAmount)
    );
    return {
      ...room.toObject(),
      bonusEnabled: bonus ? bonus.bonusEnabled : false,
      bonusAmount: bonus ? bonus.bonusAmount : 0,
      bonusDescription: bonus ? bonus.bonusDescription : "",
      systemCommission: bonus ? bonus.systemCommission : 0.2, // Include for admin use
    };
  });
};

module.exports = attachBonusToRooms;