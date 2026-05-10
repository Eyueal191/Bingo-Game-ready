import React from "react";
import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Tooltip } from "@mui/material";

const GameControls = ({ handleLeave, handleRefresh, isWatcher = false }) => {
  return (
    <div className="flex flex-row gap-2 sm:gap-3 lg:gap-4 w-full sm:w-auto mt-4 sm:mt-6 bg-bingo-surface p-2 sm:p-3 rounded-2xl border border-bingo-border shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
      <Tooltip title="Exit to Lobby" arrow placement="top">
        <button
          onClick={handleLeave}
          className="flex-1 flex items-center justify-center gap-1.5 lg:gap-2.5 px-4 lg:px-6 py-2.5 lg:py-3.5 
                     bg-linear-to-b from-red-500/10 to-red-600/30
                     hover:from-red-500/20 hover:to-red-600/40 
                     active:from-red-500/30 active:to-red-600/50 
                     border border-red-500/30 hover:border-red-400/50
                     text-red-100 font-bold rounded-xl
                     shadow-[0_4px_12px_rgba(239,68,68,0.15)]
                     transition-all duration-300 ease-out transform hover:-translate-y-0.5 active:translate-y-0
                     min-h-11 lg:min-h-13 touch-manipulation group"
          aria-label="Exit Game"
        >
          <LogoutIcon className="w-5 h-5 lg:w-6 lg:h-6 text-red-400 group-hover:text-red-300 transition-colors" />
          <span className="text-sm lg:text-base tracking-wide uppercase text-shadow-sm">
            Leave Game
          </span>
        </button>
      </Tooltip>

      <Tooltip title={isWatcher ? "Disabled during observation" : "Sync Game State"} arrow placement="top">
        <div className="flex-1 flex">
          <button
            onClick={handleRefresh}
            disabled={isWatcher}
            aria-disabled={isWatcher}
            className={`flex-1 flex items-center justify-center gap-1.5 lg:gap-2.5 px-4 lg:px-6 py-2.5 lg:py-3.5 
                      rounded-xl border transition-all duration-300 ease-out
                      min-h-11 lg:min-h-13 touch-manipulation font-bold uppercase tracking-wide
                      ${
                        isWatcher
                          ? "bg-gray-800/40 border-gray-700/50 text-gray-500 cursor-not-allowed shadow-none"
                          : "bg-linear-to-b from-bingo-surface to-bingo-bg hover:from-[#1a2f4c] hover:to-bingo-surface active:from-bingo-bg active:to-bingo-surface border-bingo-border-strong hover:border-bingo-accent/50 text-gray-200 hover:text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 active:translate-y-0 group"
                      }`}
            aria-label="Refresh Game State"
          >
            <RefreshIcon
              className={`w-5 h-5 lg:w-6 lg:h-6 transition-all duration-500 ${
                isWatcher ? "text-gray-600" : "text-bingo-accent group-hover:rotate-180"
              }`}
            />
            <span className="text-sm lg:text-base text-shadow-sm truncate">
              Refresh
            </span>
            {isWatcher && <span className="sr-only">Refresh disabled while watching</span>}
          </button>
        </div>
      </Tooltip>
    </div>
  );
};

export default GameControls;