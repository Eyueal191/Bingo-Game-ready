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
        background: "#160a29",
        boxShadow:
          "0 22px 48px -32px var(--color-bingo-shadow), 0 1px 0 rgba(255, 255, 255, 0.04) inset",
        pb: 1,
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

            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                color: "#fff",
                letterSpacing: 2,
                fontFamily:
                  "'Manrope', 'Montserrat', sans-serif",
                textShadow: "0 0 18px rgba(0, 0, 0, 0.35)",
                fontSize: { xs: "1.2rem", sm: "1.2rem", md: "1.35rem" },
                ml: 1,
              }}
            >
              DIL BINGO
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
