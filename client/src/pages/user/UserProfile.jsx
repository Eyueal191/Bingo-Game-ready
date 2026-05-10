import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { Logout } from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useAppConfig } from "../../contexts/AppConfigContext";
import GlassCard from "../../components/common/GlassCard";
import MenuItem from "../../components/common/MenuItem";
import ProfileHeader from "../../components/user/ProfileHeader";
import BalanceCard from "../../components/user/BalanceCard";
import ProfileMenu from "../../components/user/ProfileMenu";
import ChangePasswordModal from "../../components/user/ChangePasswordModal";

const UserProfile = () => {
  const { isGuest, logout } = useAuth();
  const { config } = useAppConfig();
  const navigate = useNavigate();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        background: "var(--color-bingo-background2)",
        pb: { xs: 12, md: 4 },
        pt: 2,
        px: { xs: 1.5, sm: 2 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 480 }}>
        <ProfileHeader />
        <BalanceCard />
        <ProfileMenu onOpenPasswordModal={() => setPasswordModalOpen(true)} />

        {/* Sign out card */}
        <GlassCard sx={{ mb: 3 }}>
          <MenuItem
            icon={<Logout />}
            label={isGuest ? "Exit Guest Mode" : "Sign Out"}
            onClick={handleLogout}
            danger
          />
        </GlassCard>

        {/* App Version */}
        <Typography
          sx={{
            textAlign: "center",
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.15)",
            pb: 3,
          }}
        >
          {config?.identity?.appName || "Bingo"} • v1.0
        </Typography>
      </Box>

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </Box>
  );
};

export default UserProfile;