import { styled } from "@mui/system";
import { TableCell } from "@mui/material";

export const StyledTableHeadCell = styled(TableCell)(({ theme }) => ({
  color: "var(--color-bingo-white)",
  fontWeight: 800,
  padding: theme.breakpoints.down("sm") ? "12px 10px" : "20px 22px",
  fontSize: theme.breakpoints.down("sm")
    ? "0.95rem"
    : theme.breakpoints.down("md")
    ? "1.05rem"
    : "1.1rem",
  border: "none",
  background:
    "linear-gradient(145deg, rgba(27,33,48,0.72) 0%, rgba(33,42,60,0.9) 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.45)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  position: "relative",
  zIndex: 2,

  "&:after": {
    content: '""',
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 6,
    height: 3,
    borderRadius: 6,
    background:
      "linear-gradient(90deg, rgba(245,179,1,0.85) 0%, rgba(245,179,1,0.2) 100%)",
    boxShadow:
      "0 0 18px -8px rgba(245,179,1,0.65), 0 0 0 1px rgba(245,179,1,0.18)",
  },
}));
