import React from "react";
import { Zap, Hand } from "lucide-react";

/**
 * PlayModeToggle - A premium toggle component for switching between Auto and Manual play modes.
 * Now includes a settings entry point and live session indicator.
 */
export const PlayModeToggle = ({ isManualMode, toggleMode, isWatcher }) => {
  return (
    <div className="flex items-center justify-between mb-2 px-1 gap-2">
      {/* Left: Live Indicator */}
      <div className="flex items-center gap-2 flex-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-[10px] sm:text-xs font-black text-white/40 uppercase tracking-[0.2em] whitespace-nowrap">
          Live Session
        </span>
      </div>
      
      {/* Right: Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleMode}
          disabled={isWatcher}
          className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 shadow-lg border ${
            isWatcher ? "opacity-50 cursor-not-allowed grayscale" : ""
          } ${
            isManualMode
              ? "bg-amber-500/10 border-amber-500/50 text-amber-500 hover:bg-amber-500/20"
              : "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/20"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {isManualMode ? (
              <>
                <CustomHand size={14} className="animate-pulse" />
                <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-tight">Manual</span>
              </>
            ) : (
              <>
                <Zap size={14} className="animate-pulse" />
                <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-tight">Auto</span>
              </>
            )}
          </div>
          
          {/* Subtle indicator dot */}
          <div className={`w-1.5 h-1.5 rounded-full ${isManualMode ? "bg-amber-500" : "bg-emerald-500"} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
        </button>
      </div>
    </div>
  );
};

// Hand icon component
const CustomHand = ({ size, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

export default PlayModeToggle;
