import React from "react";
import { Box, Typography } from "@mui/material";

const GameSummary = ({
  currentGame,
  prizeTiers,
  formatCurrency,
  totalNumbersTaken,
  isShaking,
  walletBalance,
  bonusBalance,
}) => (
  <Box sx={{ bgcolor: "white", p: 3, borderRadius: 2, boxShadow: 3, mb: 4 }}>
    <Typography color="textSecondary">መደብ: {currentGame.bet_amount} ብር</Typography>
    {prizeTiers.length > 0 ? (
      <Typography color="textSecondary">
        ሽልማቶች: {prizeTiers
          .map((tier) => {
            const amount =
              tier.amount ??
              (currentGame.prize_amount && tier.percent
                ? (currentGame.prize_amount * tier.percent) / 100
                : undefined);
            return `ደረጃ  ${tier.rank}: ${
              amount != null
                ? `${formatCurrency(amount)} ብር`
                : tier.percent != null
                ? `${tier.percent}%`
                : "-"
            }`;
          })
          .join(" | ")}
      </Typography>
    ) : (
      <>
        <Typography color="textSecondary">
          የመጀመሪያ ሽልማት: {currentGame.prize_structure?.first} ብር
        </Typography>
        <Typography color="textSecondary">
          ሁለተኛ ሽልማት: {currentGame.prize_structure?.second} ብር
        </Typography>
      </>
    )}
    <Typography color="textSecondary">
      የተወሰዱ ቁጥሮች: {totalNumbersTaken}/{currentGame.max_players}
    </Typography>
    <Typography color="textSecondary">
      ሁኔታ: {isShaking ? "Shaking the Jar..." : currentGame.status}
    </Typography>
    <Typography color="textSecondary">
       ዋሌት: {formatCurrency(walletBalance)} ብር | ቦነስ: {formatCurrency(bonusBalance)} ብር
    </Typography>
  </Box>
);

export default GameSummary;
