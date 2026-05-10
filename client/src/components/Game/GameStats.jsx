import React from "react";
import { Users, Coins, Trophy, Hash } from "lucide-react";

const GameStats = ({
  numberOfPlayers,
  updatedStakeAmount,
  winAmount,
  liveResults,
}) => {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5 sm:gap-2">
      {[
        { label: "ተጫዋች", value: numberOfPlayers, color: "text-ball-i text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]", icon: <Users size={16} /> },
        { label: "ምድብ", value: updatedStakeAmount, color: "text-ball-n text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]", icon: <Coins size={16} /> },
        { label: "ደራሽ", value: winAmount, color: "text-ball-b text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]", icon: <Trophy size={16} /> },
        { label: "የተጠራ", value: liveResults?.length || 0, color: "text-ball-o text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.5)]", icon: <Hash size={16} /> },
      ].map((stat, i) => (
        <div
          key={i}
          className="bg-white/10 backdrop-blur-lg rounded-xl p-2 sm:p-3 border border-white/20 shadow-[0_4px_15px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center transition-transform hover:scale-[1.05] relative overflow-hidden group"
        >
          {/* Subtle top glare */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" />
          
          <div className="flex items-center gap-1.5 mb-1 text-white/90">
            <span className={stat.color.split(" ")[1]}>{stat.icon}</span>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">{stat.label}</span>
          </div>
          <span className={`text-lg sm:text-2xl font-black ${stat.color}`}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default GameStats;
