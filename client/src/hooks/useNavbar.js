import { useState } from "react";
import { useTheme, useMediaQuery } from "@mui/material";
import {
  Leaderboard,
  Casino,
  HelpOutline,
  PersonAdd,
  ContactMail,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useWallet } from "../contexts/WalletContext";
import { useAppConfig } from "../contexts/AppConfigContext";

export const useNavbar = () => {
  const { isAdmin, role, gamePermissions, isGuest } = useAuth();
  const { config } = useAppConfig();
  const { wallet, bonus } = useWallet();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [showBalance, setShowBalance] = useState(false);

  const toggleShowBalance = () => setShowBalance((prev) => !prev);

  // Construct nav items dynamically based on user role and permissions
  const navItems = [
    (isAdmin || (role === "game_manager" && gamePermissions?.bingo)) && {
      to: "/bingo-dashboard",
      label: "Dashboard",
      icon: Leaderboard, // Pass component reference
    },
    {
      to: "/games",
      label: "Play Bingo",
      icon: Casino,
    },
    config?.leaderboard?.enabled && {
      to: "/leader-board",
      label: "Leaderboard",
      icon: Leaderboard,
    },
    {
      to: "/how-to-play",
      label: "How to Play",
      icon: HelpOutline,
    },
    {
      to: "/referral",
      label: "Referral",
      icon: PersonAdd,
    },
    config?.bot?.supportUserName && {
      to: `https://t.me/${config.bot.supportUserName}`,
      label: "Contact",
      icon: ContactMail,
      target: "_blank",
    },
  ].filter(Boolean);

  if (role === "agent") {
    navItems.splice(2, 0, {
      to: "/agent/dashboard",
      label: "Agent Panel",
      icon: Leaderboard,
    });
  }

  // Branding palette sourced from CSS variables in index.css
  const colors = {
    background: "var(--color-bingo-primary)",
    navGradient: "#21103D",
    surface: "var(--color-bingo-surface)",
    surfaceAlt: "var(--color-bingo-card-alt)",
    border: "rgba(255, 255, 255, 0.1)",
    text: "var(--color-bingo-white)",
    textDark: "var(--color-bingo-text-dark)",
    muted: "rgba(255, 255, 255, 0.6)",
    accent: "var(--color-bingo-secondary)",
    accentDark: "#e67e00",
    warning: "var(--color-bingo-secondary)",
  };

  return {
    isMobile,
    navItems,
    wallet,
    bonus,
    showBalance,
    toggleShowBalance,
    colors,
    config,
    isGuest,
  };
};
