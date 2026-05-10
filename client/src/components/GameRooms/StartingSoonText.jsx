import { styled } from "@mui/system";
import { Typography } from "@mui/material";

export const StartingSoonText = styled(Typography)(() => ({
  fontWeight: 700,
  color: "var(--color-bingo-yellow)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  animation: `startPulse 1.4s ease-in-out infinite`,
  "@keyframes startPulse": {
    "0%": { opacity: 0.82, transform: "scale(1)" },
    "50%": { opacity: 1, transform: "scale(1.06)" },
    "100%": { opacity: 0.82, transform: "scale(1)" },
  },
}));
