import BingoCell from "./BingoCell";
import { columnColors } from "../../utils/gridColumnColors";

const BingoColumn = ({ 
  letter, 
  numbers, 
  onNumberClick, 
  isClickable, 
  getIsMarked,
  getIsWinning = () => false,
  getIsNormallyCalled = () => false,
  getIsLastCalled = () => false,
  hideHeader = false,
  size = "normal", // "normal" or "mini"
  isAutoMode = false,
}) => {
  return (
    <div className={`flex flex-col ${size === "mini" ? "gap-0.5" : "gap-1"} items-center`}>
      {!hideHeader && (
        <div
          className={`text-center font-bold text-xs w-7 h-6 min-w-6 min-h-6] sm:w-8 sm:h-8 sm:min-w-8 sm:min-h-8
            flex items-center justify-center text-white ${columnColors[letter]} rounded-full shadow-sm`}
        >
          {letter}
        </div>
      )}
      {numbers.map((num, index) => (
        <BingoCell
          key={`${letter}${index}`}
          number={num}
          isMarked={getIsMarked ? getIsMarked(num) : false}
          isWinning={getIsWinning(num, index)}
          isNormallyCalled={getIsNormallyCalled(num)}
          isLastCalled={getIsLastCalled(num)}
          isClickable={isClickable}
          onNumberClick={onNumberClick}
          size={size}
          isAutoMode={isAutoMode}
        />
      ))}
    </div>
  );
};

export default BingoColumn;