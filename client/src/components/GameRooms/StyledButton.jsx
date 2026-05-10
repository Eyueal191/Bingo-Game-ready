import { styled } from "@mui/system";
import { Button } from "@mui/material";

export const StyledButton = styled(Button)(({ theme }) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: 18,
  padding: theme.breakpoints.down("sm") ? "10px 18px" : "14px 28px",
  fontWeight: 800,
  fontSize: theme.breakpoints.down("sm") ? "0.95rem" : "1.05rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-bingo-blue)",
  background:
    "linear-gradient(135deg, var(--color-bingo-yellow) 0%, var(--color-bingo-yellow-dark) 100%)",
  border: "1px solid var(--color-bingo-yellow-dark)",
  boxShadow:
    "0 22px 42px -28px rgba(245,179,1,0.65), 0 0 0 1px rgba(255,255,255,0.12) inset",
  transition: "transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease",
  cursor: "pointer",
  zIndex: 2,

  "&:before": {
    content: '""',
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(120deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 65%)",
    opacity: 0.16,
    pointerEvents: "none",
  },

  "&:hover": {
    transform: "translateY(-1px)",
    boxShadow:
      "0 26px 46px -26px rgba(245,179,1,0.72), 0 0 0 1px rgba(255,255,255,0.16) inset",
    filter: "brightness(1.02)",
  },

  "&:active": {
    transform: "scale(0.98)",
    boxShadow:
      "0 12px 30px -24px rgba(245,179,1,0.55), 0 0 0 1px rgba(255,255,255,0.12) inset",
  },

  "&:focus-visible": {
    outline: "3px solid var(--color-bingo-focus)",
    outlineOffset: 4,
  },

  "&:disabled": {
    background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 100%)",
    color: "var(--color-bingo-muted)",
    boxShadow: "none",
    borderColor: "rgba(255,255,255,0.06)",
    cursor: "not-allowed",
    opacity: 0.75,
  },
}));
