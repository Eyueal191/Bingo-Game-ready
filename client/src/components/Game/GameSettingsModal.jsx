import React from "react";
import { Volume2, VolumeX, X, RefreshCw, Zap } from "lucide-react";
import VoiceSelect from "./VoiceSelect";

const GameSettingsModal = ({
  isManualMode,
  toggleMode,
  voiceOption,
  voiceOptions,
  handleVoiceChange,
  isMuted,
  toggleMute,
  isWatcher = false,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-bingo-card-alt backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden animate-bounce-in">
        {/* Header Section */}
        <div className="bg-linear-to-r from-blue-600/20 to-purple-600/20 p-8 text-center relative border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-90"
          >
            <X size={24} />
          </button>

          <div className="flex flex-col items-center gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              Live Session
            </div>
            <h2 className="text-white text-3xl font-black italic tracking-tighter uppercase">Game Settings</h2>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Controls Section */}
          <div className="space-y-6">
            {/* Play Mode */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-center text-white/30">Play Mode Control</h3>
              <button
                onClick={() => {
                  if (isWatcher) return;
                  toggleMode();
                }}
                disabled={isWatcher}
                className={`w-full py-4 px-4 rounded-2xl flex items-center justify-center gap-4 shadow-xl border-2 transition-all active:scale-95 ${isWatcher
                  ? "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
                  : isManualMode
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-500"
                    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                  }`}
              >
                {isManualMode ? (
                  <Zap size={22} className="text-amber-500" />
                ) : (
                  <RefreshCw size={22} className="text-emerald-500 animate-spin-slow" />
                )}
                <span className="text-lg font-black uppercase tracking-tight">
                  {isWatcher ? "Watching Only" : isManualMode ? "Manual Mode" : "Auto Mode"}
                </span>
              </button>
            </div>

            {/* Audio Section */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-center text-white/30">Audio & Voice Configuration</h3>
              <div className="flex flex-col gap-3">
                <div className="bg-white/5 p-2 rounded-2xl border border-white/5">
                  <VoiceSelect
                    voiceOption={voiceOption}
                    voiceOptions={voiceOptions}
                    handleVoiceChange={handleVoiceChange}
                    theme="dark"
                  />
                </div>

                <button
                  onClick={toggleMute}
                  className={`flex items-center justify-center gap-3 py-4 rounded-2xl font-black border-2 transition-all active:scale-95 ${isMuted
                    ? "bg-red-500/10 border-red-500/40 text-red-500"
                    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                    }`}
                >
                  {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                  <span className="uppercase text-sm font-black">{isMuted ? "Muted" : "Audio Active"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4">
            <button
              onClick={onClose}
              className="w-full bg-linear-to-r from-emerald-500 to-emerald-700 text-white font-black py-5 rounded-[1.5rem] shadow-2xl border border-white/20 uppercase tracking-[0.2em] text-xs hover:brightness-110 active:scale-95 transition-all"
            >
              Resume Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSettingsModal;
