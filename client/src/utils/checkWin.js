export const checkWin = (card, selectedNumbers, winPattern = "two_line") => {
  const grid = [
    [card.b1, card.i1, card.n1, card.g1, card.o1],
    [card.b2, card.i2, card.n2, card.g2, card.o2],
    [card.b3, card.i3, "F", card.g3, card.o3],
    [card.b4, card.i4, card.n4, card.g4, card.o4],
    [card.b5, card.i5, card.n5, card.g5, card.o5],
  ];

  const isMarked = (val) => val === "F" || selectedNumbers.has(val);

  const patterns = [];

  // rows
  for (let r = 0; r < 5; r++) patterns.push(grid[r]);

  // columns
  for (let c = 0; c < 5; c++) patterns.push(grid.map((row) => row[c]));

  // diagonals
  patterns.push([0, 1, 2, 3, 4].map((i) => grid[i][i]));
  patterns.push([0, 1, 2, 3, 4].map((i) => grid[i][4 - i]));

  // four corners
  patterns.push([grid[0][0], grid[0][4], grid[4][0], grid[4][4]]);

  const completedCount = patterns.filter((pattern) =>
    pattern.every(isMarked)
  ).length;

  return winPattern === "two_line" ? completedCount >= 2 : completedCount >= 1;
};