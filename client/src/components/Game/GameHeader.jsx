import React from "react";
import { Settings } from "lucide-react";
import GameStats from "./GameStats";

const GameHeader = ({
  updatedStakeAmount,
  numberOfPlayers,
  winAmount,
  liveResults,
  onOpenSettings,
}) => {
  return (
    <div className="w-full bg-bingo-card-alt backdrop-blur-md rounded-xl p-2 sm:p-3 border border-white/10 shadow-lg flex items-center justify-between gap-2 sm:gap-4 mb-2">
      {/* Stats Grid */}
      <div className="flex-1 overflow-hidden">
        <GameStats
          numberOfPlayers={numberOfPlayers}
          updatedStakeAmount={updatedStakeAmount}
          winAmount={winAmount}
          liveResults={liveResults}
        />
      </div>

      {/* Settings Action */}
      <button
        onClick={onOpenSettings}
        className="p-3 sm:p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5 flex flex-col items-center justify-center flex-shrink-0 active:scale-95 group"
      >
        <Settings size={24} className="text-white/80 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
      </button>
    </div>
  );
};
// now I think I need to save this one for the best there. we will work hard day in and day out!
export default GameHeader;
