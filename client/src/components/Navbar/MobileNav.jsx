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

const MobileNav = ({
  wallet,
  bonus,
  showBalance,
  toggleShowBalance,
  colors,
  config,
  isGuest,
}) => {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: colors.navGradient,
        boxShadow:
          "0 16px 40px -28px var(--color-bingo-shadow), 0 1px 0 rgba(255,255,255,0.04) inset",
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        borderBottom: `1px solid ${colors.border}`,
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
          <Avatar
            src={
              config?.branding?.squareLogoUrl ||
              config?.branding?.logoUrl ||
              "/logo.png"
            }
            alt={config?.identity?.appName || "Bingo"}
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.8,
              color: "text.primary",
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surfaceAlt,
              p: 0.4,
            }}
          />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: colors.text,
              letterSpacing: 1.4,
              fontFamily:
                "'Noto Sans Ethiopic', 'Manrope', 'Montserrat', sans-serif",
              textShadow: "0 0 14px rgba(0,0,0,0.35)",
              fontSize: { xs: "1rem", sm: "1.1rem", md: "1.2rem" },
              ml: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {config?.identity?.appNameLocalized ||
              config?.identity?.appName ||
              ""}
          </Typography>
        </Box>

        {/* Right Section */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.8,
          }}
        >
          {/* Wallet */}
          {!isGuest && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                background: "rgba(0,0,0,0.25)",
                borderRadius: "16px",
                px: 1,
                py: 0.3,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <AccountBalanceWallet
                sx={{
                  color: "var(--color-bingo-yellow)",
                  fontSize: 15,
                  mr: 0.4,
                }}
              />

              <Typography
                sx={{
                  fontWeight: 700,
                  color: "var(--color-bingo-white)",
                  fontSize: "0.75rem",
                }}
              >
                {showBalance ? (wallet || 0).toLocaleString() : "***"}
              </Typography>

              <Typography
                sx={{
                  color: "rgba(255,255,255,0.25)",
                  mx: 0.5,
                  fontSize: "0.7rem",
                }}
              >
                |
              </Typography>

              <Typography
                sx={{
                  fontWeight: 700,
                  color: "var(--color-bingo-yellow)",
                  fontSize: "0.75rem",
                  mr: 0.3,
                }}
              >
                {showBalance ? (bonus || 0).toLocaleString() : "***"}
              </Typography>

              <IconButton
                size="small"
                onClick={toggleShowBalance}
                sx={{
                  p: 0.3,
                  ml: 0.2,
                }}
              >
                {showBalance ? (
                  <VisibilityOff
                    sx={{ fontSize: 15, color: "var(--color-bingo-muted)" }}
                  />
                ) : (
                  <Visibility
                    sx={{ fontSize: 15, color: "var(--color-bingo-muted)" }}
                  />
                )}
              </IconButton>
            </Box>
          )}

          {/* Action Button */}
          {!isGuest ? (
            <Button
              component={Link}
              to="/my-wallet"
              startIcon={<Add sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: "16px",
                fontWeight: 800,
                textTransform: "none",
                fontSize: "0.72rem",
                px: 1.4,
                py: 0.4,
                minWidth: "auto",
                color: "var(--color-bingo-dark)",
                background:
                  "linear-gradient(135deg, var(--color-bingo-yellow), var(--color-bingo-yellow-dark))",
                boxShadow: "0 3px 10px rgba(255,215,0,0.25)",
                "&:hover": {
                  transform: "translateY(-1px)",
                },
              }}
            >
              Deposit
            </Button>
          ) : (
            <Button
              component={Link}
              to="/register"
              startIcon={<PersonAdd sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: "16px",
                fontWeight: 700,
                fontSize: "0.72rem",
                px: 1.4,
                py: 0.4,
                textTransform: "none",
                color: "#fff",
                background:
                  "linear-gradient(135deg, var(--color-bingo-green-dark), var(--color-bingo-green))",
                "&:hover": {
                  transform: "translateY(-1px)",
                },
              }}
            >
              Register
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default MobileNav;
