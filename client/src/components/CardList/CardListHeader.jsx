import { Box, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import CardStats from "./CardStats";
import PlayModeToggle from "./PlayModeToggle";


/**
 * CardListHeader — modular container that composes CardStats and PlayModeToggle.
 * Layout matches target:
 *   Row 1: [Stats boxes]
 *   Row 3: [●toggle] [ምድብ]
 *   Row 4: Win pattern text
 *   Row 5: Card selection instruction
 */
const CardListHeader = ({
  wallet,
  bonus,
  stake,
  roomData,
  counters,
  isManualMode,
  toggleMode,
  hasReservedCards,
  winPattern,
  handleRefresh,
}) => {
  const navigate = useNavigate();
  const counterValue = counters[`counter${roomData.roomId}`];
  const playerCount = roomData.numberOfPlayers;

  const goBack = () => {
    // Check if Telegram WebApp is available to perhaps use its native back handling or simply use react-router
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
    }
    navigate('/games');
  };

  return (
    <Box
      sx={{
        width: "100%",
        flexShrink: 0,
        zIndex: 20,
        bgcolor: "transparent",
        display: "flex",
        flexDirection: "column",
        pb: 0.5,
      }}
    >
      {/* Top Action Bar (Back / Refresh) matching user target image */}
      <Box sx={{ display: "flex", justifyContent: "space-between", px: { xs: 1, sm: 2 }, mb: 1, mt: 0.5 }}>
        <Button
          onClick={goBack}
          variant="outlined"
          startIcon={<ArrowBackIcon fontSize="small" />}
          sx={{
            color: "#fff",
            borderColor: "rgba(255,255,255,0.2)",
            textTransform: "none",
            borderRadius: "8px",
            fontWeight: 700,
            py: 0.3,
            px: 1.5,
            fontSize: "0.85rem",
            background: "rgba(255,255,255,0.05)",
            "&:hover": { borderColor: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.1)" }
          }}
        >
          Back
        </Button>

        <Button
          onClick={() => {
            if (window.Telegram?.WebApp) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
            }
            if (handleRefresh) handleRefresh();
          }}
          variant="outlined"
          startIcon={<RefreshIcon fontSize="small" />}
          sx={{
            color: "#fff",
            borderColor: "rgba(255,255,255,0.2)",
            textTransform: "none",
            borderRadius: "8px",
            fontWeight: 700,
            py: 0.3,
            px: 1.5,
            fontSize: "0.85rem",
            background: "rgba(255,255,255,0.05)",
            "&:hover": { borderColor: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.1)" }
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Row 1: Stats */}
      <CardStats
        stats={[
          {
            label: "main wallet",
            value: `${(wallet || 0).toLocaleString()}`,
            color: "text-ball-b",
          },
          {
            label: "play wallet",
            value: `${(bonus || 0).toLocaleString()}`,
            color: "text-ball-i",
          },
          // {
          //   label: "ተጫዋች",
          //   value: playerCount != null ? playerCount : "--",
          //   color: "text-[#10b981]",
          // },
          {
            label: "stake",
            value: `${(stake || 0).toLocaleString()}`,
            color: "text-ball-n",
          },
          {
            label: "ቀሪ ጊዜ",
            value: counterValue != null ? `${counterValue}s` : "-",
            color: "text-ball-g",
          },
        ]}
      >
        {/* <PlayModeToggle
          isManualMode={isManualMode}
          toggleMode={toggleMode}
          isWatcher={!hasReservedCards}
        /> */}
      </CardStats>

      {/* Row 4-5: Win pattern + instruction */}
      <div className="flex flex-col items-center py-1">
        <p className="text-bingo-accent-dark text-[14px] font-black tracking-tight leading-tight">
          {winPattern === "one_line"
            ? "ጨዋታው በአንድ ዝግ ነው!"
            : "ጨዋታው በሁለት ዝግ ነው!"}
        </p>
        <p className="text-txt-main font-bold text-[13px] mt-0.5">
          የካርቴላ ቁጥር ይምረጡ
        </p>
      </div>
    </Box>
  );
};

export default CardListHeader;
