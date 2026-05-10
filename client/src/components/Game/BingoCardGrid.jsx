const BingoCardGrid = ({
  columns,
  columnColors,
  sharedSelectedNumbers,
  liveResults,
  isManualMode,
  isWatcher,
  isReadOnly,
  onNumberClick,
}) => {
  return (
    <div className="flex justify-center gap-0.5 bg-[#0f1221] rounded-b-lg p-1">
      {Object.entries(columns).map(([letter, numbers]) => (
        <div key={letter} className="flex flex-col items-center">
          <div
            className={`text-center font-bold text-sm w-8 h-8 min-w-8 min-h-8
            flex items-center justify-center ${
              letter === "N" ? "rounded-md" : "rounded-full"
            } text-white ${columnColors[letter]}`}
            style={letter === "N" ? { transform: "rotate(25deg)" } : {}}
          >
            {letter}
          </div>

          {numbers.map((num, index) => {
            const isAutoMarked =
              !isManualMode && !isWatcher && liveResults.includes(num);

            const isSharedMarked = sharedSelectedNumbers.has(num);

            const isMarked =
              num === "F" || isAutoMarked || (isWatcher ? false : isSharedMarked);

            const cursorClass =
              isReadOnly || isWatcher
                ? "cursor-not-allowed"
                : "cursor-pointer";

            return (
              <div
                key={`${letter}${index}`}
                onClick={() => onNumberClick(num)}
                className={`text-center font-bold text-sm border
                border-[#0f1221] rounded-md w-7 h-7 min-w-8 min-h-8 flex items-center
                justify-center transition-colors ${
                  isMarked
                    ? "bg-green-600 text-white"
                    : "bg-[#D3D3D3] text-black"
                } ${cursorClass}`}
              >
                {num}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default BingoCardGrid;