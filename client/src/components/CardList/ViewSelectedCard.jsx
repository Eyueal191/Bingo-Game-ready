import { useState, useEffect } from "react";
import { Card, CardContent, Box } from "@mui/material";
import bingoCardsData from "../../data/bingoCard";
import {BingoColumn} from "../cartela";

const BingoCardPreview = ({ card, isReserved }) => {
  const columns = {
    B: [card.b1, card.b2, card.b3, card.b4, card.b5],
    I: [card.i1, card.i2, card.i3, card.i4, card.i5],
    N: [card.n1, card.n2, card.n3, card.n4, card.n5],
    G: [card.g1, card.g2, card.g3, card.g4, card.g5],
    O: [card.o1, card.o2, card.o3, card.o4, card.o5],
  };

  return (
    <Card
      elevation={2}
      sx={{
        flex: "0 0 auto",
        borderRadius: 2,
        background: "var(--color-bingo-card)",
        border: `1px solid var(--color-bingo-border)`,
        boxShadow: "0 2px 8px var(--color-bingo-shadow)",
        overflow: "hidden",
        m: 0.25,
      }}
    >
      <CardContent
        sx={{
          p: 0.75,
          "&:last-child": { pb: 0.75 },
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        <Box display="flex" gap={0.25} justifyContent="center" sx={{ minWidth: "100px" }}>
          {Object.entries(columns).map(([letter, numbers]) => (
            <BingoColumn
              key={letter}
              letter={letter}
              numbers={numbers}
              isClickable={false}
              getIsMarked={(num) => num === 0 || num === "0"}
              hideHeader={true}
              size="mini"
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

const ViewSelectedCards = ({ selectedCards = [], userReservedCardIds = [] }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const selectedIds = selectedCards.map(String);
      const reservedIds = userReservedCardIds.map(String);
      const allIds = Array.from(new Set([...selectedIds, ...reservedIds]));

      const filteredCards = bingoCardsData.cards.filter((card) =>
        allIds.includes(card.cardId.toString())
      );

      setCards(
        filteredCards.map((card) => ({
          ...card,
          isReserved: reservedIds.includes(card.cardId.toString()),
        }))
      );
    } catch (err) {
      console.error("Error processing card data", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCards, userReservedCardIds]);

  if (loading || cards.length === 0) return null;

  return (
    <Box
      sx={{
        width: "100%",
        overflowX: "auto",
        display: "flex",
        flexDirection: "row",
        gap: 1,
        py: 0.5,
        scrollbarWidth: "thin",
        "&::-webkit-scrollbar": {
          height: "6px",
        },
        "&::-webkit-scrollbar-track": {
          background: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "var(--color-bingo-border)",
          borderRadius: "10px",
        },
      }}
    >
      {cards.map((card) => (
        <BingoCardPreview
          key={card.cardId}
          card={card}
          isReserved={card.isReserved}
        />
      ))}
    </Box>
  );
};

export default ViewSelectedCards;