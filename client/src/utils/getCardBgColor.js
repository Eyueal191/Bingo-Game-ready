const getCardBgColor = (card, selectedCards, userReservedCardIds, userId) => {
  const cardId = card.cardId.toString();
  const isSelected = selectedCards.map(String).includes(cardId);
  const isReserved = card.isReserved;
  const isReservedByMe =
    card.reservedBy === userId?.toString() ||
    userReservedCardIds?.map(String).includes(cardId);

  if (isReserved) {
    return isReservedByMe
      ? "var(--color-card-reserved-me)"
      : "var(--color-card-reserved)";
  }

  if (isSelected) {
    return "var(--color-card-selected)";
  }

  return "#51496f";
};

export default getCardBgColor;