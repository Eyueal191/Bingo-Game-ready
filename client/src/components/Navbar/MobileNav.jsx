import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Avatar,
} from "@mui/material";
import {
  PersonAdd,
  Add,
  VisibilityOff,
  Visibility,
  AccountBalanceWallet,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useAppConfig } from "../../contexts/AppConfigContext.jsx";
const MobileNav = ({
  wallet,
  bonus,
  showBalance,
  toggleShowBalance,
  colors,
  isGuest,
}) => {

  const { config } = useAppConfig()
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: "#160a29",
        boxShadow:
          "0 16px 40px -28px var(--color-bingo-shadow), 0 1px 0 rgba(255,255,255,0.04) inset",
        pb: 0.5,
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: { xs: 58, sm: 64 },
          px: 1.2,
        }}
      >
        {/* Logo */}
        <Box
          component={Link}
          to="/games"
          sx={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >

          <Typography
            variant="h6"
            sx={{
              fontWeight: 900,
              color: "#fff",
              letterSpacing: 1.4,
              fontFamily:
                "'Manrope', 'Montserrat', sans-serif",
              textShadow: "0 0 14px rgba(0,0,0,0.35)",
              fontSize: { xs: "1.1rem", sm: "1.2rem" },
              ml: 1,
              whiteSpace: "nowrap",
            }}
          >
            {config.identity?.appNameLocalized}
          </Typography>
        </Box>

        {/* Right Section */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box
            component={Link}
            to="/how-to-play"
            sx={{
              color: "#fff",
              textDecoration: "none",
              fontSize: "0.8rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 1,
              opacity: 0.9,
              border: "1px solid rgba(255,255,255,0.15)",
              px: 1.5,
              py: 0.5,
              borderRadius: "12px",
              background: "rgba(255,255,255,0.05)",
              "&:hover": {
                opacity: 1,
                background: "rgba(255,255,255,0.1)",
              },
            }}
          >
            Rules
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default MobileNav;
