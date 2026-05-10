// cardData.js
const generateInitialCards = () => {
  const cards = [];
  for (let i = 1; i <= 200; i++) {
    cards.push({ cardId: i.toString(), isReserved: false });
  }
  return cards;
};

export const initialCards = generateInitialCards();
