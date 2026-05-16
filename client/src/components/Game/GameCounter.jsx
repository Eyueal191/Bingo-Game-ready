import { Box, Typography } from "@mui/material";
import { CardCounter } from "../CardList";

export default function GameCounter({
  countdown,
  waitingForCounter,
  gameStarted,
}) {
  if (waitingForCounter && !gameStarted) {
    return (
      <Box className="text-center px-6! py-2!">
        <Typography className="block text-[10px] sm:text-sm font-semibold glow text-yellow-500 black">
          Waiting for more players...
        </Typography>
      </Box>
    );
  }

  if (!gameStarted && typeof countdown === "number" && countdown > 0) {
    return <CardCounter counterValue={countdown} variant="inline" />;
  }

  return null;
}