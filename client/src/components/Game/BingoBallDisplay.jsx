import { useMemo } from "react";
import { getLastTwoDraws } from "../../utils/gameUtils";

const BALL_COLORS = {
  B: "var(--color-ball-b)",
  I: "var(--color-ball-i)",
  N: "var(--color-ball-n)",
  G: "var(--color-ball-g)",
  O: "var(--color-ball-o)",
};

const getBallStyle = (draw) => {
  if (!draw) {
    return {
      bg: "var(--color-bingo-primary)",
      text: "white",
      label: "-",
      short: "-",
    };
  }

  const value = String(draw).toUpperCase();
  const prefix = value[0];
  const number = value.slice(1);

  const isValidPrefix = ["B", "I", "N", "G", "O"].includes(prefix);

  if (!isValidPrefix) {
    return {
      bg: "var(--color-bingo-primary)",
      text: "white",
      label: value,
      short: value,
    };
  }

  return {
    bg: BALL_COLORS[prefix] || "var(--color-bingo-primary)",
    text: prefix === "B" || prefix === "G" ? "black" : "white",
    label: `${prefix}${number}`,
    short: `${prefix}${number}`,
  };
};

const BingoBallDisplay = ({
  prefixedNumber,
  animationTrigger,
  liveResults = [],
  gameStarted,
}) => {
  const currentBall = useMemo(() => {
    if (prefixedNumber) return prefixedNumber;
    if (Array.isArray(liveResults) && liveResults.length > 0) {
      return liveResults[liveResults.length - 1];
    }
    return null;
  }, [prefixedNumber, liveResults]);

  const currentStyle = useMemo(() => getBallStyle(currentBall), [currentBall]);

  const lastTwo = useMemo(() => {
    return getLastTwoDraws(liveResults) || [];
  }, [liveResults]);

  if (!gameStarted) {
    return (
      <div className="flex items-center justify-center w-full py-2">
        <h3 className="text-white text-xs sm:text-sm font-semibold text-center">
          Waiting for more players...
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center justify-between w-full gap-2 sm:gap-4">

      {/* CURRENT BALL (responsive size) */}
      <div
        className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-lg border border-white ${animationTrigger ? "animate-bounce-in" : ""
          }`}
        style={{
          backgroundColor: currentStyle.bg,
          color: currentStyle.text,
        }}
      >
        <span className="text-sm sm:text-lg md:text-xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          {currentStyle.label}
        </span>
      </div>

      {/* RECENT BALLS (compact horizontal scroll/wrap) */}
      <div className="flex flex-1 flex-wrap gap-1 sm:gap-2 justify-end items-center">

        {lastTwo
          .slice()
          .reverse()
          .map((draw, index) => {
            const style = getBallStyle(draw);

            return (
              <div
                key={`${draw}-${index}`}
                className="w-8 h-8 sm:w-10 sm:h-10 md:w-[50px] md:h-[50px] rounded-full flex items-center justify-center font-bold shadow-md cursor-pointer animate-float-slow"
                title={style.label}
                style={{
                  backgroundColor: style.bg,
                  color: style.text,
                  boxShadow: "0 6px 14px rgba(0,0,0,0.28)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  animationDelay: `${index * 90}ms`,
                }}
              >
                <span className="text-[10px] sm:text-xs font-black">
                  {style.short}
                </span>
              </div>
            );
          })}

      </div>
    </div>
  );
};

export default BingoBallDisplay;