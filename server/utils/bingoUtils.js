/**
 * Bingo game utility functions
 */

const normalizeCardValue = (value) => {
    if (value === undefined || value === null) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const buildCardGrid = (cardDoc) => {
    if (!cardDoc) return null;
    const cell = (key) => normalizeCardValue(cardDoc[key]);
    return [
        [cell("b1"), cell("i1"), cell("n1"), cell("g1"), cell("o1")],
        [cell("b2"), cell("i2"), cell("n2"), cell("g2"), cell("o2")],
        [cell("b3"), cell("i3"), "F", cell("g3"), cell("o3")],
        [cell("b4"), cell("i4"), cell("n4"), cell("g4"), cell("o4")],
        [cell("b5"), cell("i5"), cell("n5"), cell("g5"), cell("o5")],
    ];
};

module.exports = {
    buildCardGrid,
    normalizeCardValue,
};
