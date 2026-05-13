const BingoCell = ({
  number,
  isMarked,
  isClickable,
  onNumberClick,
  isWinning = false,
  isLastCalled = false,
  isNormallyCalled = false,
  isAutoMode = false,
  size = "normal",
}) => {
  const cursorClass = isClickable ? "cursor-pointer" : "cursor-not-allowed";
  const displayNumber = number === "F" || number === "0" ? "*" : number;

  let cellStyles = "";

  // Determine base cell style
  if (isWinning) {
    cellStyles = "bg-green-500 shadow-sm text-white";
  } else if (isMarked) {
    cellStyles = isAutoMode
      ? "bg-green-500 shadow-sm text-white"
      : "bg-green-500 shadow-sm text-white";
  } else if (isNormallyCalled) {
    cellStyles = "bg-bingo-focus text-white";
  } else {
    cellStyles = "bg-bingo-card-alt hover:bg-bingo-card-alt text-white border";
  }

  // Add pulse class if it's the last called number
  const pulseClass = isLastCalled ? "animate-pulse-super scale-110 brightness-110" : "";

  const layoutClasses =
    size === "mini"
      ? "text-center font-black text-[8px] rounded-sm w-6 h-6 flex items-center justify-center transition-all duration-200"
      : "text-center font-black text-[10px] sm:text-sm rounded-md gap-1 w-7 h-6 sm:w-8 sm:h-8 flex items-center justify-center transition-all duration-200";

  return (
    <div
      onClick={isClickable ? () => onNumberClick(number) : undefined}
      className={`${layoutClasses} ${cellStyles} ${cursorClass} ${pulseClass}`}
    >
      {displayNumber}
    </div>
  );
};
export default BingoCell;