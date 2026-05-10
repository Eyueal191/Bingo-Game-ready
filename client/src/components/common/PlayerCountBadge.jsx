import { Box, Typography } from "@mui/material";

const PlayerIcon = ({ size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="currentColor"
    style={{ marginRight: 4 }}
  >
    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
  </svg>
);

const PlayerCountBadge = ({
  count,
  bottom = 8,
  right = 8,
  small = false,
}) => {
  if (!count || count <= 0) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        bottom,
        right,
        display: "flex",
        alignItems: "center",
        gap: "3px",
        background: "rgba(0,0,0,0.7)",
        color: "#22C55E",
        padding: small ? "1px 6px" : "2px 8px",
        borderRadius: small ? "10px" : "12px",
        fontSize: small ? "0.65rem" : "0.75rem",
        fontWeight: "bold",
        zIndex: 2,
        pointerEvents: "none",
      }}
    >
      <PlayerIcon size={small ? 10 : 12} />
      <Typography
        component="span"
        sx={{ fontSize: "inherit", fontWeight: "inherit" }}
      >
        {count}
      </Typography>
    </Box>
  );
};

export default PlayerCountBadge;