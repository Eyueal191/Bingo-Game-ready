import { Box, Typography } from "@mui/material";

const GameRoomsHeader = () => {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          color: "var(--color-bingo-yellow)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: { xs: "1.25rem", sm: "1.65rem" },
        }}
      >
        Bingo Games
      </Typography>

      <Typography
        variant="body1"
        sx={{
          mt: 1,
          color: "var(--color-bingo-focus)",
          fontSize: { xs: "0.85rem", sm: "0.95rem" },
        }}
      >
        Select the stake and prize pool, then start the game!
      </Typography>
    </Box>
  );
};

export default GameRoomsHeader;