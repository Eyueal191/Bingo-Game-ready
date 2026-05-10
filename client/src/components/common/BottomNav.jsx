import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  Casino,
  History,
  AccountBalanceWallet,
  Person,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const tabs = [
  { label: "Game", icon: Casino, path: "/games" },
  { label: "History", icon: History, path: "/game-history" },
  { label: "Wallet", icon: AccountBalanceWallet, path: "/my-wallet", guestDisabled: true },
  { label: "Profile", icon: Person, path: "/user-profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const isGuest = role === "guest";
  const [activeIdx, setActiveIdx] = useState(0);

  // Sync active index with current route
  useEffect(() => {
    const idx = tabs.findIndex((t) => location.pathname.startsWith(t.path));
    setActiveIdx(idx >= 0 ? idx : -1);
  }, [location.pathname]);

  const handleTap = (tab, idx) => {
    if (tab.guestDisabled && isGuest) return;
    setActiveIdx(idx);
    navigate(tab.path);
  };

  return (
    <Box
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
      }}
    >
      {/* Frosted glass background */}
      <Box
        sx={{
          background: "var(--color-bingo-overlay)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          pb: "env(safe-area-inset-bottom)", // iOS safe area
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-around",
            height: "var(--nav-bottom-height)",
            maxWidth: 480,
            mx: "auto",
          }}
        >
          {tabs.map((tab, idx) => {
            const isActive = activeIdx === idx;
            const isDisabled = tab.guestDisabled && isGuest;
            const Icon = tab.icon;

            return (
              <Box
                key={tab.path}
                onClick={() => handleTap(tab, idx)}
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  cursor: isDisabled ? "default" : "pointer",
                  opacity: isDisabled ? 0.25 : 1,
                  position: "relative",
                  transition: "all 0.2s ease",
                  WebkitTapHighlightColor: "transparent",
                  "&:active": !isDisabled
                    ? { transform: "scale(0.9)" }
                    : {},
                }}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      width: 20,
                      height: 3,
                      borderRadius: "0 0 4px 4px",
                      background:
                        "linear-gradient(90deg, #00E5FF, #55ff77)",
                      boxShadow: "0 2px 8px rgba(0,229,255,0.4)",
                    }}
                  />
                )}

                <Icon
                  sx={{
                    fontSize: 22,
                    color: isActive ? "#00E5FF" : "rgba(255,255,255,0.4)",
                    transition: "color 0.2s ease",
                  }}
                />

                <Typography
                  sx={{
                    fontSize: "0.62rem",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#00E5FF" : "rgba(255,255,255,0.4)",
                    lineHeight: 1,
                    transition: "color 0.2s ease",
                  }}
                >
                  {tab.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default BottomNav;