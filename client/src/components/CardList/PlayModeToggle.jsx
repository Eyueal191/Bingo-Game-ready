/**
 * PlayModeToggle — renders just the toggle switch (no container).
 * Designed to sit inline with other controls.
 */
const PlayModeToggle = ({
  isManualMode,
  toggleMode,
  isWatcher,
}) => {
  return (
    <div className="flex-1 flex flex-col justify-between items-center shadow-lg py-1 min-h-[60px]">
       <p className="text-[10px] font-bold uppercase tracking-widest text-txt-main mt-1">
          {isManualMode ? "ማንዋል" : "አውቶማቲክ"}
        </p>
      <div className="mb-1 flex items-center justify-center">
        <button
          onClick={toggleMode}
          disabled={isWatcher}
          className={`relative w-11 h-6 rounded-full transition-all duration-300 p-0! border-0! shrink-0 ${
            isWatcher
              ? "bg-white/10! cursor-not-allowed!"
              : isManualMode
                ? "bg-bingo-card-alt!"
                : "bg-bingo-secondary"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
              isManualMode ? "translate-x-0" : "translate-x-5"
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default PlayModeToggle;
