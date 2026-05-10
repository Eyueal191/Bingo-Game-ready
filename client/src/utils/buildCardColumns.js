export const buildCardColumns = (card) => ({
  B: [card.b1, card.b2, card.b3, card.b4, card.b5],
  I: [card.i1, card.i2, card.i3, card.i4, card.i5],
  N: [card.n1, card.n2, "F", card.n4, card.n5],
  G: [card.g1, card.g2, card.g3, card.g4, card.g5],
  O: [card.o1, card.o2, card.o3, card.o4, card.o5],
});