import { styled } from "@mui/system";
import { TableCell } from "@mui/material";

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  color: "var(--color-bingo-white)",
  padding: theme.breakpoints.down("sm") ? "12px 10px" : "18px 20px",
  fontSize: theme.breakpoints.down("sm")
    ? "0.85rem"
    : theme.breakpoints.down("md")
    ? "0.95rem"
    : "1rem",
  border: "none",
  background:
    "linear-gradient(145deg, rgba(27,33,48,0.92) 0%, rgba(32,40,58,0.96) 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.4)",
  fontWeight: 600,
  letterSpacing: "0.02em",
  borderRadius: 0,
  position: "relative",
  zIndex: 1,
  transition: "background 0.2s ease, transform 0.2s ease",

  "&:first-of-type": {
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },

  "&:last-of-type": {
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },

  "&:hover": {
    background:
      "linear-gradient(145deg, rgba(32,40,58,0.98) 0%, rgba(39,49,70,0.98) 100%)",
    transform: "translateY(-2px)",
  },
}));
