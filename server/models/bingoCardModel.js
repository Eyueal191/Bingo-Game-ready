const mongoose = require("mongoose");

const bingoCardSchema = new mongoose.Schema({
  cardId: {
    type: String,
    required: true,
    unique: true,
  },
  b1: { type: Number, required: true },
  b2: { type: Number, required: true },
  b3: { type: Number, required: true },
  b4: { type: Number, required: true },
  b5: { type: Number, required: true },
  i1: { type: Number, required: true },
  i2: { type: Number, required: true },
  i3: { type: Number, required: true },
  i4: { type: Number, required: true },
  i5: { type: Number, required: true },
  n1: { type: Number, required: true },
  n2: { type: Number, required: true },
  n3: { type: Number, default: 0 },
  n4: { type: Number, required: true },
  n5: { type: Number, required: true },
  g1: { type: Number, required: true },
  g2: { type: Number, required: true },
  g3: { type: Number, required: true },
  g4: { type: Number, required: true },
  g5: { type: Number, required: true },
  o1: { type: Number, required: true },
  o2: { type: Number, required: true },
  o3: { type: Number, required: true },
  o4: { type: Number, required: true },
  o5: { type: Number, required: true },
});

const BingoCard = mongoose.model("BingoCard", bingoCardSchema);
module.exports = BingoCard;
