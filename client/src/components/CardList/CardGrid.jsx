import React, { useMemo } from "react";
import { Paper, Box, Typography } from "@mui/material";

// Memoized individual card item to prevent re-renders of all cards when one changes
const CardItem = React.memo(({ card, onSelect, getBackgroundColor, gameStarting, userId }) => {
  const cardIdStr = card.cardId.toString();
  const bgColor = getBackgroundColor(card);
  const isReserved = card.isReserved;
  const isReservedByMe = isReserved && card.reservedBy?.toString() === userId?.toString();

  const cursor = gameStarting ? "not-allowed" : isReserved && !isReservedByMe ? "not-allowed" : "pointer";

  return (
    <Paper
      elevation={1}
      onClick={() => !gameStarting && onSelect(card)}
      sx={{
        textAlign: "center",
        backgroundColor: bgColor,
        backgroundImage: "none",
        color: "var(--color-txt-main)",
        fontSize: "0.85rem",
        fontWeight: 700,
        cursor: cursor,
        width: "100%",
        aspectRatio: "1/1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "6px",
        border: "1px solid rgba(255, 255, 255, 0.25)",
        transition: "transform 0.1s",
        '&:active': {
          transform: "scale(0.95)",
        }
      }}
    >
      {card.cardId}
    </Paper>
  );
});

const CardGrid = ({
  cards,
  onSelect,
  getBackgroundColor,
  gameStarting,
  userId,
}) => {
  // Sort cards only when the array reference changes
  const sorted = useMemo(() => {
    return [...cards].sort((a, b) => a.cardId - b.cardId);
  }, [cards]);

  if (!cards || cards.length === 0) {
    return (
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center', width: '100%' }}>
        <Typography variant="body1">
          No cards available to display.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(8, 1fr)",
          sm: "repeat(9, 1fr)",
          md: "repeat(auto-fit, minmax(60px, 1fr))",
        },
        gap: 1,
        mb: 3,
        width: "100%"
      }}
    >
      {sorted.map((card) => (
        <CardItem
          key={card.cardId}
          card={card}
          onSelect={onSelect}
          getBackgroundColor={getBackgroundColor}
          gameStarting={gameStarting}
          userId={userId}
        />
      ))}
    </Box>
  );
};

export default React.memo(CardGrid);
