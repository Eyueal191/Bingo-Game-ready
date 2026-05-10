import { styled } from "@mui/system";
import { TableRow } from "@mui/material";

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  borderRadius: 22,
  display: "table-row",
  background:
    "linear-gradient(145deg, rgba(27,33,48,0.94) 0%, rgba(33,41,58,0.96) 100%)",
  border: "1px solid rgba(255,255,255,0.04)",
  boxShadow:
    "0 22px 48px -36px rgba(7,9,14,0.85), 0 0 0 1px rgba(255,255,255,0.03) inset",
  position: "relative",
  overflow: "hidden",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",

  [theme.breakpoints.down("sm")]: {
    borderRadius: 16,
    boxShadow:
      "0 18px 36px -34px rgba(7,9,14,0.82), 0 0 0 1px rgba(255,255,255,0.02) inset",
  },

  "&:hover, &:focus": {
    transform: "translateY(-2px)",
    boxShadow:
      "0 26px 48px -30px rgba(7,9,14,0.82), 0 0 0 1px rgba(245,179,1,0.18) inset",
  },

  "& > *": {
    borderBottom: "none",
    position: "relative",
    zIndex: 1,
    background: "none",
  },
}));
