import React from "react";
import { Zap, Hand, Settings } from "lucide-react";

/**
 * PlayModeToggle - Toggle on left, settings on right
 */
export const PlayModeToggle = ({
  isManualMode,
  toggleMode,
  isWatcher,
  onOpenSettings,
}) => {
  return (
    <div className="flex items-center justify-between mb-2 px-1 gap-2 w-full">
      {/*Space taker div*/}
      <div className="flex-1 w-50" ></div>
      {/*Right dive */}

      <div className="flex-1 w-50 flex items-center justify-between mb-2 px-1 gap-2 w-full" ></div>
      {/* LEFT: Play Mode Toggle */}
      <div className="flex items-center">
        <button
          onClick={toggleMode}
          disabled={isWatcher}
          className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 shadow-lg border ${isWatcher ? "opacity-50 cursor-not-allowed grayscale" : ""
            } ${isManualMode
              ? "bg-amber-500/10 border-amber-500/50 text-amber-500 hover:bg-amber-500/20"
              : "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/20"
            }`}
        >
          <div className="flex items-center gap-1.5">
            {isManualMode ? (
              <>
                <CustomHand size={14} className="animate-pulse" />
                <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-tight">
                  Manual
                </span>
              </>
            ) : (
              <>
                <Zap size={14} className="animate-pulse" />
                <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-tight">
                  Auto
                </span>
              </>
            )}
          </div>

          <div
            className={`w-1.5 h-1.5 rounded-full ${isManualMode ? "bg-amber-500" : "bg-emerald-500"
              }`}
          />
        </button>
      </div>

      {/* RIGHT: Settings */}
      <div className="flex items-center">
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95"
        >
          <Settings size={16} className="text-white/70 hover:text-white transition-colors" />
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