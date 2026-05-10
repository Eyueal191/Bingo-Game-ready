import { Box, Typography, Avatar } from "@mui/material";
import { Person } from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";

const ProfileHeader = () => {
  const { user, isGuest } = useAuth();

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pt: 2,
        pb: 3,
      }}
    >
      <Avatar
        sx={{
          width: 80,
          height: 80,
          background: "var(--gradient-blue-shield)",
          color: "var(--color-txt-main)",
          fontWeight: 800,
          fontSize: "1.75rem",
          mb: 1.5,
          boxShadow: "var(--shadow-glow-blue)",
          border: "3px solid var(--color-bingo-border-strong)",
        }}
      >
        {initials || <Person sx={{ fontSize: 36 }} />}
      </Avatar>

      <Typography
        sx={{
          fontWeight: 800,
          color: "var(--color-bingo-white)",
          fontSize: "1.25rem",
          lineHeight: 1.2,
        }}
      >
        {isGuest ? "Guest User" : user?.fullName || "User"}
      </Typography>

      {!isGuest && (
        <Typography
          sx={{
            color: "var(--color-bingo-muted)",
            fontSize: "0.85rem",
            mt: 0.3,
          }}
        >
          {user?.phone || user?.email || ""}
        </Typography>
      )}
    </Box>
  );
};

export default ProfileHeader;