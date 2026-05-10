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
      <div className="flex items-center justify-center w-full min-h-[80px]">
        <h3 className="text-white text-sm font-semibold text-center">
          Waiting for more players...
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 w-full">

      {/* CURRENT BALL */}
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg border border-white ${
          animationTrigger ? "animate-bounce-in" : ""
        }`}
        style={{
          backgroundColor: currentStyle.bg,
          color: currentStyle.text,
        }}
      >
        <span className="text-lg sm:text-xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          {currentStyle.label}
        </span>
      </div>

      {/* RECENT BALLS */}
      <div className="flex-none flex flex-wrap gap-2 justify-center">

        {lastTwo
          .slice()
          .reverse()
          .map((draw, index) => {

            const style = getBallStyle(draw);

            return (
              <div
                key={`${draw}-${index}`}
                className="w-[clamp(40px,5vw,60px)] h-[clamp(40px,5vw,60px)] rounded-full flex items-center justify-center font-bold shadow-md cursor-pointer animate-float-slow"
                title={style.label}
                style={{
                  backgroundColor: style.bg,
                  color: style.text,
                  boxShadow: "0 6px 14px rgba(0,0,0,0.28)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  animationDelay: `${index * 90}ms`,
                }}
              >
                <span className="text-sm font-black">
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