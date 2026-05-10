export const arraysEqual = (first = [], second = []) => {
  if (first === second) return true;
  if (!Array.isArray(first) || !Array.isArray(second)) return false;
  if (first.length !== second.length) return false;
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) {
      return false;
    }
  }
  return true;
};

export const getPrefixedBingoValue = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  if (value >= 1 && value <= 15) return `b${value}`;
  if (value >= 16 && value <= 30) return `i${value}`;
  if (value >= 31 && value <= 45) return `n${value}`;
  if (value >= 46 && value <= 60) return `g${value}`;
  if (value >= 61 && value <= 75) return `o${value}`;
  return null;
};

export const DEFAULT_WATCHER_MESSAGE = "The game is already in progress. Please wait until it finishes to join the next round.";
export const DEFAULT_DISQUALIFICATION_MESSAGE = "Invalid Bingo claim. You're observing the rest of this round.";
