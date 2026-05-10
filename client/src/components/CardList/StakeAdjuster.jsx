import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";

/**
 * StakeAdjuster — renders [ምድብ] [−] value [+] [✓]
 * Designed to sit inline on a row, no outer container.
 * Props:
 *  - pendingStake: the displayed/preview value
 *  - userStake: the committed value (for change detection)
 *  - increaseStake/decreaseStake: handlers
 *  - onConfirmStake: confirm handler
 *  - canIncrease: whether + is allowed (wallet & max check)
 *  - canDecrease: whether − is allowed (min check)
 */
const StakeAdjuster = ({
  pendingStake,
  userStake,
  increaseStake,
  decreaseStake,
  onConfirmStake,
  canIncrease,
  canDecrease,
  minStake,
  maxStake,
}) => {
  const isChanged = pendingStake !== userStake;

  return (
    <div className="flex flex-col w-full items-center ">
<div className="flex items-baseline justify-between px-3 pt-1 pb-0.5">
        <span className="text-[11px] font-bold text-white/35 tracking-wide">
          ትንሹ: {minStake} &nbsp;&nbsp; ትልቁ: {maxStake}
        </span>
      </div>
    <div className="flex flex-row w-full items-center gap-1">
      {/* ምድብ label */}
      <span className="text-[12px] font-bold text-white/50 shrink-0 mr-2">ምድብ</span>
 
      {/* Adjuster box: [−] value [+] */}
      <div className="flex items-center h-9 border border-white/15 rounded-lg bg-[#1a1c2a] overflow-hidden flex-1">
        <button
          onClick={decreaseStake}
          disabled={!canDecrease}
          className="w-9 h-full flex items-center justify-center border-0! bg-transparent! text-white/80 disabled:text-white/20 disabled:cursor-not-allowed transition-colors p-0!"
        >
          <RemoveIcon sx={{ fontSize: 19 }} />
        </button>

        <div className="flex-1 text-center border-x border-white/10 h-full flex items-center justify-center bg-black/20">
          <span className="text-xl font-black text-white tabular-nums">
            {pendingStake}
          </span>
        </div>

        <button
          onClick={increaseStake}
          disabled={!canIncrease}
          className="w-9 h-full flex items-center justify-center border-0! bg-transparent! text-white/80 disabled:text-white/20 disabled:cursor-not-allowed transition-colors p-0!"
        >
          <AddIcon sx={{ fontSize: 19 }} />
        </button>
      </div>

      {/* Confirm button — only visible when stake is changed */}
      {isChanged && (
        <button
          onClick={onConfirmStake}
          className="w-9 h-9 rounded-lg flex items-center justify-center border-0! bg-[#10b981]! text-white! shadow-lg transition-all duration-200 p-0! shrink-0 animate-in fade-in"
        >
          <CheckIcon sx={{ fontSize: 20 }} />
        </button>
      )}
    </div>
    </div>
  );
};

export default StakeAdjuster;
