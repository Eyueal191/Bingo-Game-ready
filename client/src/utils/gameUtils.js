// utils/gameUtils.js
export const chunkArray = (array, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};


export const getLastTwoDraws = (winnerNumbersArray) => {
  return winnerNumbersArray.slice(-4,-1).map((number) => {
    let prefix = "";
    if (number >= 1 && number <= 15) prefix = "b";
    else if (number >= 16 && number <= 30) prefix = "i";
    else if (number >= 31 && number <= 45) prefix = "n";
    else if (number >= 46 && number <= 60) prefix = "g";
    else if (number >= 61 && number <= 75) prefix = "o";
    return prefix + number;
  });
};
