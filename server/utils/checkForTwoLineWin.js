/**
 * Two-line win detection for Bingo.
 *
 * A "two-line win" is declared when any TWO of the following patterns are
 * simultaneously completed on a single card:
 *   - Any of the 5 horizontal rows
 *   - Any of the 5 vertical columns
 *   - Diagonal top-left → bottom-right
 *   - Diagonal top-right → bottom-left
 *   - Four corners
 *
 * Valid combos include: 2 rows, 2 columns, 1 row + 1 column, 1 row + 1 diagonal,
 * 1 column + 1 diagonal, 2 diagonals, 1 line + corner, etc.
 */

const checkForTwoLineWin = (cardGrid, drawnNumbers) => {
  const isMarked = (num) => num === "F" || drawnNumbers.includes(num);

  // Collect all possible lines / patterns
  const patterns = [];

  // 5 rows
  for (let r = 0; r < 5; r++) {
    patterns.push(cardGrid[r]);
  }

  // 5 columns
  for (let c = 0; c < 5; c++) {
    patterns.push(cardGrid.map((row) => row[c]));
  }

  // Diagonal 1 (top-left → bottom-right)
  patterns.push([
    cardGrid[0][0],
    cardGrid[1][1],
    cardGrid[2][2],
    cardGrid[3][3],
    cardGrid[4][4],
  ]);

  // Diagonal 2 (top-right → bottom-left)
  patterns.push([
    cardGrid[0][4],
    cardGrid[1][3],
    cardGrid[2][2],
    cardGrid[3][1],
    cardGrid[4][0],
  ]);

  // Corner pattern
  patterns.push([
    cardGrid[0][0],
    cardGrid[0][4],
    cardGrid[4][0],
    cardGrid[4][4],
  ]);

  // Find all completed patterns
  const completedPatterns = patterns.filter((pattern) =>
    pattern.every(isMarked)
  );

  if (completedPatterns.length >= 2) {
    // Merge all winning cells (deduplicate)
    const winningSet = new Set();
    completedPatterns.forEach((pattern) => {
      pattern.forEach((num) => winningSet.add(num));
    });
    return { winningCombo: [...winningSet] };
  }

  return null;
};

module.exports = checkForTwoLineWin;
