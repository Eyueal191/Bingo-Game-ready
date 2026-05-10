import {
  Leaderboard,
  EmojiEvents,
  HelpOutline,
  PersonAdd,
  ContactMail,
  Casino,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useAppConfig } from "../contexts/AppConfigContext";

export const useNavItems = () => {
  const { isAdmin, role, gamePermissions, isGuest } = useAuth();
  const { config } = useAppConfig();

  const navItems = [
    (isAdmin ||
      ["manager", "finance", "secretary"].includes(role) ||
      (role === "game_manager" && gamePermissions?.bingo)) && {
      to: "/bingo-dashboard",
      label: "Dashboard",
      icon: Leaderboard,
    },
    // (isAdmin || (role === "game_manager" && gamePermissions?.keshkesh)) && {
    //   to: "/kesh-admin-dash",
    //   label: "Keshkesh Dash",
    //   icon: Leaderboard,
    // },
    // (isAdmin ||
    //   (role === "game_manager" && gamePermissions?.material_lottery)) && {
    //   to: "/material-lottery-admin-dash",
    //   label: "Material dash",
    //   icon: EmojiEvents,
    // },
    {
      to: "/game-center",
      label: isGuest ? "Watch games" : "Game center",
      icon: Casino,
    },
    config.leaderboard?.enabled && {
      to: "/leader-board",
      label: "Leaderboard",
      icon: Leaderboard,
    },
    {
      to: "/recent-winners",
      label: "Top 100 Winners",
      icon: EmojiEvents,
    },
    {
      to: "/how-to-play",
      label: "How to Play",
      icon: HelpOutline,
    },
    !isGuest && {
      to: "/referral",
      label: "Referral",
      icon: PersonAdd,
    },
    config.bot?.supportUserName && {
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

  const mobileNavItems = navItems.filter(
    (item) => !["/game-center", "/recent-winners"].includes(item.to)
  );

  return { navItems, mobileNavItems };
};