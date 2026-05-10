import React from "react";

const HeaderStats = ({
  updatedStakeAmount,
  numberOfPlayers,
  winAmount,
  liveResults,
}) => (
  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 mt-4 sm:mt-6 rounded-3xl surface-panel surface-panel--muted max-w-full overflow-auto">
    <div className="stat-block">
      <span className="block text-[10px] sm:text-xs font-semibold tracking-wide">
        Bet
      </span>
      <span className="block text-sm sm:text-lg font-extrabold">
        {updatedStakeAmount}ብር
      </span>
    </div>
    <div className="stat-block">
      <span className="block text-[10px] sm:text-xs font-semibold tracking-wide">
        Players
      </span>
      <span className="block text-sm sm:text-lg font-extrabold">
        {numberOfPlayers}
      </span>
    </div>
    <div className="stat-block">
      <span className="block text-[10px] sm:text-xs font-semibold tracking-wide">
        ደራሽ
      </span>
      <span className="block text-sm sm:text-lg font-extrabold">
        {winAmount}ብር
      </span>
    </div>
    <div className="stat-block">
      <span className="block text-[10px] sm:text-xs font-semibold tracking-wide">
        የተጠራ
      </span>
      <span className="block text-sm sm:text-lg font-extrabold">
        {liveResults.length}/75
      </span>
    </div>
  </div>
);

export default HeaderStats;
