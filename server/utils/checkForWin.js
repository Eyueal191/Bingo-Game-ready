const checkForTwoLineWin = require('./checkForTwoLineWin');

const checkForWin = (cardGrid, drawnNumbers, winPattern = "two_line") => {
  // Two-line mode: delegate to the dedicated two-line checker
  if (winPattern === "two_line") {
    return checkForTwoLineWin(cardGrid, drawnNumbers);
  }

  // --- Existing one-line / corner detection ---
  for (const row of cardGrid) {
    if (row.every((num) => num === "F" || drawnNumbers.includes(num))) {
      return { winningCombo: [...row] };
    }
  }
  for (let col = 0; col < 5; col++) {
    const column = cardGrid.map((row) => row[col]);
    if (column.every((num) => num === "F" || drawnNumbers.includes(num))) {
      return { winningCombo: [...column] };
    }
  }
  const diag1 = [
    cardGrid[0][0],
    cardGrid[1][1],
    cardGrid[2][2],
    cardGrid[3][3],
    cardGrid[4][4],
  ];
  const diag2 = [
    cardGrid[0][4],
    cardGrid[1][3],
    cardGrid[2][2],
    cardGrid[3][1],
    cardGrid[4][0],
  ];
  if (diag1.every((num) => num === "F" || drawnNumbers.includes(num))) {
    return { winningCombo: [...diag1] };
  }
  if (diag2.every((num) => num === "F" || drawnNumbers.includes(num))) {
    return { winningCombo: [...diag2] };
  }
  const corner = [
    cardGrid[0][0],
    cardGrid[0][4],
    cardGrid[4][0],
    cardGrid[4][4],
  ];
  if (corner.every((num) => num === "F" || drawnNumbers.includes(num))) {
    return { winningCombo: [...corner] };
  }
  return null;
};

module.exports = checkForWin;