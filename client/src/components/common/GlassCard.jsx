import { Box } from "@mui/material";

const GlassCard = ({ children, sx = {}, ...rest }) => (
  <Box
    sx={{
      background: "var(--color-bingo-card)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderRadius: "20px",
      border: "1px solid var(--color-bingo-border)",
      boxShadow: "0 8px 32px var(--color-bingo-shadow)",
      overflow: "hidden",
      ...sx,
    }}
    {...rest}
  >
    {children}
  </Box>
);

export default GlassCard;