const TOTAL_BINGO_NUMBERS = 75;

const collectWinningLines = (grid) => {
  const lines = [];
  if (!Array.isArray(grid) || grid.length !== 5) {
    return lines;
  }

  for (let row = 0; row < 5; row += 1) {
    if (Array.isArray(grid[row])) {
      lines.push([...grid[row]]);
    }
  }

  for (let col = 0; col < 5; col += 1) {
    const column = [];
    for (let row = 0; row < 5; row += 1) {
      column.push(grid[row]?.[col]);
    }
    lines.push(column);
  }

  lines.push([
    grid[0]?.[0],
    grid[1]?.[1],
    grid[2]?.[2],
    grid[3]?.[3],
    grid[4]?.[4],
  ]);

  lines.push([
    grid[0]?.[4],
    grid[1]?.[3],
    grid[2]?.[2],
    grid[3]?.[1],
    grid[4]?.[0],
  ]);

  lines.push([grid[0]?.[0], grid[0]?.[4], grid[4]?.[0], grid[4]?.[4]]);

  return lines;
};

// Bias selection toward lines that let the robot reach bingo fastest.
const pickRobotFavoredNumber = (robotCardGrids, drawnNumbers, availableNumbers) => {
  if (!robotCardGrids.length) {
    return null;
  }

  const drawnSet = new Set(drawnNumbers);
  const availableSet = new Set(availableNumbers);
  const comboCandidates = [];
  const occurrenceCounts = new Map();

  for (const grid of robotCardGrids) {
    const lines = collectWinningLines(grid);
    for (const line of lines) {
      const filteredLine = line.filter((cell) => cell !== "F" && cell !== undefined && cell !== null);
      if (filteredLine.length === 0) continue;

      const remainingNumbers = filteredLine.filter((num) => !drawnSet.has(num));
      if (remainingNumbers.length === 0) continue;

      comboCandidates.push({ remainingNumbers });

      for (const num of remainingNumbers) {
        if (!availableSet.has(num)) continue;
        occurrenceCounts.set(num, (occurrenceCounts.get(num) || 0) + 1);
      }
    }
  }

  comboCandidates.sort((a, b) => a.remainingNumbers.length - b.remainingNumbers.length);

  for (const candidate of comboCandidates) {
    let bestNumber = null;
    let bestScore = -1;
    for (const num of candidate.remainingNumbers) {
      if (!availableSet.has(num)) continue;
      const score = occurrenceCounts.get(num) || 0;
      if (score > bestScore || (score === bestScore && (bestNumber === null || num < bestNumber))) {
        bestNumber = num;
        bestScore = score;
      }
    }
    if (bestNumber !== null) {
      return bestNumber;
    }
  }

  const fallback = Array.from(occurrenceCounts.keys()).filter((num) => availableSet.has(num));
  if (fallback.length > 0) {
    const index = Math.floor(Math.random() * fallback.length);
    return fallback[index];
  }

  return null;
};

const pickRandomNumber = (availableNumbers) => {
  if (!availableNumbers.length) {
    return null;
  }
  const index = Math.floor(Math.random() * availableNumbers.length);
  return availableNumbers[index];
};

// Draw a number, honoring any robot-winning bias preferences when provided.
const drawNumber = (drawnNumbers, options = {}) => {
  const availableNumbers = Array.from({ length: TOTAL_BINGO_NUMBERS }, (_, i) => i + 1).filter(
    (num) => !drawnNumbers.includes(num)
  );

  if (!availableNumbers.length) {
    return null;
  }

  const { robotWinningPercent = 0, robotCardGrids = [] } = options || {};
  const clampedPercent = Math.max(0, Math.min(100, Number(robotWinningPercent) || 0));

  if (clampedPercent > 0 && robotCardGrids.length) {
    const shouldBias = clampedPercent === 100 || Math.random() < clampedPercent / 100;
    if (shouldBias) {
      const favored = pickRobotFavoredNumber(robotCardGrids, drawnNumbers, availableNumbers);
      if (favored !== null && favored !== undefined) {
        return favored;
      }
    }
  }

  return pickRandomNumber(availableNumbers);
};

module.exports = drawNumber;
