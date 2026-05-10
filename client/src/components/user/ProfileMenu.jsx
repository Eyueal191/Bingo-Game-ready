import {
  History,
  GroupAdd,
  HelpOutline,
  SupportAgent,
  LockReset,
  Leaderboard,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useAppConfig } from "../../contexts/AppConfigContext";
import GlassCard from "../common/GlassCard";
import MenuItem from "../common/MenuItem";
import Sep from "../common/Sep";

const ProfileMenu = ({ onOpenPasswordModal }) => {
  const { isGuest, isAdmin, role, gamePermissions } = useAuth();
  const { config } = useAppConfig();

  return (
    <GlassCard sx={{ mb: 2 }}>
      {/* Admin / Staff Dashboards */}
      {!isGuest &&
        (isAdmin ||
          (role === "game_manager" && gamePermissions?.bingo)) && (
          <>
            <MenuItem
              icon={<Leaderboard />}
              label="Admin Dashboard"
              subtitle="Manage platform and games"
              to="/bingo-dashboard"
            />
            <Sep />
          </>
        )}

      {!isGuest && role === "agent" && (
        <>
          <MenuItem
            icon={<Leaderboard />}
            label="Agent Panel"
            subtitle="View network stats"
            to="/agent/dashboard"
          />
          <Sep />
        </>
      )}

      {!isGuest && (
        <>
          <MenuItem
            icon={<History />}
            label="Game History"
            subtitle="View past games & results"
            to="/game-history"
          />
          <Sep />
          {/* {config?.leaderboard?.enabled && (
            <>
              <MenuItem
                icon={<Leaderboard />}
                label="Leaderboard"
                subtitle="View top players"
                to="/leader-board"
              />
              <Sep />
            </>
          )} */}
          <MenuItem
            icon={<GroupAdd />}
            label="Invite Friends"
            subtitle="Earn bonus rewards"
            to="/referral"
          />
          <Sep />
        </>
      )}

      <MenuItem
        icon={<HelpOutline />}
        label="How to Play"
        subtitle="Rules & tips"
        to="/how-to-play"
      />

      {config?.bot?.supportUserName && (
        <>
          <Sep />
          <MenuItem
            icon={<SupportAgent />}
            label="Contact Support"
            subtitle={`@${config.bot.supportUserName}`}
            to={`https://t.me/${config.bot.supportUserName}`}
            external
          />
        </>
      )}

      {!isGuest && (
        <>
          <Sep />
          <MenuItem
            icon={<LockReset />}
            label="Change Password"
            subtitle="Update your security credentials"
            onClick={onOpenPasswordModal}
          />
        </>
      )}
    </GlassCard>
  );
};

export default ProfileMenu;