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
  Person,
  PersonAdd,
  Add,
  VisibilityOff,
  Visibility,
  AccountBalanceWallet,
} from "@mui/icons-material";
import { Link } from "react-router-dom";

const DesktopNav = ({
  navItems,
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
          "0 22px 48px -32px var(--color-bingo-shadow), 0 1px 0 rgba(255, 255, 255, 0.04) inset",
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: 72,
        }}
      >
        {/* Logo and Title */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            component={Link}
            to="/games"
            sx={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              cursor: "pointer",
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
                width: 40,
                height: 40,
                borderRadius: 2,
                boxShadow:
                  "0 18px 32px -28px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.12) inset",
                border: `1px solid ${colors.border}`,
                color: "text.primary",
                backgroundColor: colors.surfaceAlt,
                padding: 0.5,
              }}
            />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: colors.text,
                letterSpacing: 2,
                fontFamily:
                  "'Noto Sans Ethiopic', 'Manrope', 'Montserrat', sans-serif",
                textShadow: "0 0 18px rgba(0, 0, 0, 0.35)",
                fontSize: { xs: "1.2rem", sm: "1.2rem", md: "1.35rem" },
                ml: 1,
                display: { xs: isGuest ? "block" : "none", sm: "block" },
              }}
            >
              {config?.identity?.appNameLocalized ||
                config?.identity?.appName ||
                ""}
            </Typography>
          </Box>
        </Box>

        {/* Main Content Area */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            justifyContent: "flex-end",
            gap: 1.5,
            minWidth: 0,
          }}
        >
          {/* Wallet Pill */}
          {!isGuest && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: "20px",
                padding: "6px 14px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                mr: "auto",
                ml: 2,
                whiteSpace: "nowrap",
              }}
            >
              <AccountBalanceWallet
                sx={{ color: "var(--color-bingo-yellow)", fontSize: 18, mr: 1 }}
              />
              <Typography
                sx={{ fontWeight: 700, color: "white", fontSize: "0.95rem" }}
              >
                {showBalance ? (wallet || 0).toLocaleString() : "***"}
              </Typography>
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.3)",
                  mx: 1,
                  fontSize: "0.95rem",
                }}
              >
                |
              </Typography>
              <Typography
                sx={{
                  fontWeight: 700,
                  color: "var(--color-bingo-yellow)",
                  fontSize: "0.95rem",
                  mr: 1,
                }}
              >
                {showBalance ? (bonus || 0).toLocaleString() : "***"}
              </Typography>
              <IconButton
                size="small"
                onClick={toggleShowBalance}
                sx={{ p: 0 }}
                aria-label="Toggle Balance Visibility"
              >
                {showBalance ? (
                  <VisibilityOff
                    sx={{ fontSize: 17, color: "rgba(255,255,255,0.5)" }}
                  />
                ) : (
                  <Visibility
                    sx={{ fontSize: 17, color: "rgba(255,255,255,0.5)" }}
                  />
                )}
              </IconButton>
            </Box>
          )}

          {/* Navigation Buttons */}
          <Box
            sx={{
              display: "flex",
              gap: 0.5,
              alignItems: "center",
              overflowX: "auto",
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.to}
                  component={Link}
                  to={item.to}
                  target={item.target || "_self"}
                  sx={{
                    borderRadius: "14px",
                    padding: "5px 12px",
                    fontWeight: 600,
                    color: colors.text,
                    background: colors.surfaceAlt,
                    fontSize: { xs: "0.85rem", sm: "0.78rem", md: "0.8rem" },
                    boxShadow:
                      "0 14px 28px -26px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.04) inset",
                    border: `1px solid ${colors.border}`,
                    transition: "all 0.2s ease",
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    textTransform: "none",
                    "&:hover": {
                      background: colors.surface,
                      color: colors.accent,
                      borderColor: colors.accent,
                      transform: "translateY(-1px)",
                    },
                  }}
                  startIcon={Icon ? <Icon fontSize="small" /> : null}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          {/* Actions */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
            }}
          >
            {!isGuest ? (
              <Button
                component={Link}
                to="/my-wallet"
                startIcon={<Add fontSize="small" sx={{ mr: -0.5 }} />}
                sx={{
                  borderRadius: "20px",
                  fontWeight: 800,
                  textTransform: "none",
                  color: "var(--color-bingo-dark)",
                  background:
                    "linear-gradient(135deg, var(--color-bingo-yellow) 0%, var(--color-bingo-yellow-dark) 100%)",
                  fontSize: "0.85rem",
                  padding: "6px 16px",
                  minWidth: "auto",
                  boxShadow: "0 4px 14px 0 rgba(255, 215, 0, 0.2)",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, var(--color-bingo-yellow-dark) 0%, var(--color-bingo-yellow) 100%)",
                    transform: "translateY(-1px)",
                    boxShadow: "0 6px 20px rgba(255, 215, 0, 0.3)",
                  },
                }}
              >
                Deposit
              </Button>
            ) : (
              <Button
                component={Link}
                to="/register"
                sx={{
                  borderRadius: "20px",
                  padding: "6px 18px",
                  fontWeight: 700,
                  color: "#ffffff",
                  background:
                    "linear-gradient(135deg, var(--color-bingo-green-dark) 0%, var(--color-bingo-green) 100%)",
                  fontSize: "0.85rem",
                  textTransform: "none",
                  transition: "all 0.22s ease",
                  whiteSpace: "nowrap",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, var(--color-bingo-green) 0%, var(--color-bingo-green-dark) 100%)",
                    transform: "translateY(-1px)",
                  },
                }}
                startIcon={<PersonAdd />}
              >
                Register
              </Button>
            )}

            {/* Profile Icon → navigates to /user-profile */}
            <IconButton
              component={Link}
              to="/user-profile"
              aria-label="Go to Profile"
              sx={{
                background: colors.surfaceAlt,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                boxShadow:
                  "0 12px 26px -24px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.06) inset",
                "&:hover": {
                  background: colors.surface,
                  color: colors.accent,
                },
              }}
            >
              <Person />
            </IconButton>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default DesktopNav;
