import React from "react";
import GameStats from "./GameStats";

const GameHeader = ({
  updatedStakeAmount,
  numberOfPlayers,
  winAmount,
  liveResults,
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
    </div>
  );
};

export default GameHeader;