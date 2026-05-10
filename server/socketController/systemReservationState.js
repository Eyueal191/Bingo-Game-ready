const getRandomCardCount = require("../utils/randomCard");

const systemReservationTargets = new Map();
/** ensures the target is within the range of minCards and maxCards 
 * clamp the target to the range of minCards and maxCards
 * ensure target is a function that returns a number between minCards and maxCards
 * clear target when the room is no longer active
 * 
*/
const clamp = (value, min, max) => {
  if (Number.isNaN(value)) return min;
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
};

const ensureTarget = async (roomId, stakeAmount, minCards = 1, maxCards = minCards) => {
  let min = Number.isFinite(minCards) && minCards > 0 ? Math.floor(minCards) : 1;
  let max = Number.isFinite(maxCards) && maxCards >= min ? Math.floor(maxCards) : min;

  let target = systemReservationTargets.get(roomId);
  if (!target || target < min || target > max) {
    let randomTarget = await getRandomCardCount(stakeAmount);
    if (!Number.isFinite(randomTarget)) {
      randomTarget = min;
    }
    target = clamp(Math.floor(randomTarget), min, max);
    systemReservationTargets.set(roomId, target);
  }
  return target;
};

const clearTarget = (roomId) => {
  systemReservationTargets.delete(roomId);
};

module.exports = {
  ensureTarget,
  clearTarget,
};