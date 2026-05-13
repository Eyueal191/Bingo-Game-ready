/* ONLY VERTICAL DIMENSION UPDATED
   - No animation changes
   - No width changes
   - No styling changes
   - No structural changes
   - Only height system updated
*/

import { chunkArray } from "../../utils/gameUtils";
import { columnColors } from "../../utils/gridColumnColors";
import React, { useEffect, useMemo, useState, useRef } from "react";

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const getBingoLetter = (number) => {
  if (number >= 1 && number <= 15) return "B";
  if (number >= 16 && number <= 30) return "I";
  if (number >= 31 && number <= 45) return "N";
  if (number >= 46 && number <= 60) return "G";
  return "O";
};

const BingoGrid = ({
  numbers = [],
  liveResults = [],
  isWatcher = false,
}) => {

  const liveSet = useMemo(
    () => new Set(liveResults || []),
    [liveResults]
  );

  const isCalled = (num) => {
    if (!liveResults || liveResults.length === 0) return false;

    if (liveSet.has(num)) return true;

    const letter = getBingoLetter(num);

    return (
      liveSet.has(`${letter}${num}`) ||
      liveSet.has(`${letter.toLowerCase()}${num}`)
    );
  };

  /* =========================================================
     TOTAL HEIGHT SYSTEM
  ========================================================= */

  // WATCHER MODE
  // MAIN = 64.5vh

  // PLAYER MODE
  // MAIN = 70.5vh

  const totalHeight = isWatcher ? 64.5 : 70.5;

  /*
    INTERNAL VERTICAL SYSTEM

    HEADER ROW      = 4vh
    HEADER GAP      = 1vh
    OUTER PADDING   = 2vh
    ROW GAP         = 0.35vh
  */

  const headerHeight = 4;
  const headerGap = 1;
  const outerPadding = 2;
  const rowGap = 0.35;

  const totalRowGapHeight = rowGap * 14;

  const remainingHeight =
    totalHeight -
    headerHeight -
    headerGap -
    outerPadding -
    totalRowGapHeight;

  const cellHeight = remainingHeight / 15;

  const lastCalledNumber =
    Array.isArray(liveResults) && liveResults.length > 0
      ? liveResults[liveResults.length - 1]
      : null;

  const renderNumberCell = (number, variant = "desktop") => {

    const numberCalled = isCalled(number);

    const isLastCalled = lastCalledNumber === number;

    const baseClasses =
      variant === "mobile"
        ? "w-full flex items-center justify-center font-bold text-[10px] rounded-[3px] transition-all duration-300"
        : "w-full flex items-center justify-center font-bold text-[13px] rounded-md transition-all duration-300 shadow-sm";

    let stateClasses =
      "bg-[#51496f] text-white font-black border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]";

    if (numberCalled) {
      stateClasses = isLastCalled
        ? "bg-[#10b981] text-white shadow-[0_0_20px_rgba(16,185,129,0.6)] scale-110 z-10 animate-pulse rounded-md border border-emerald-300/50"
        : "bg-[#f59e0b] text-white border border-amber-400/30 rounded-md shadow-[0_2px_10px_rgba(245,158,11,0.3)]";
    }

    return (
      <span
        key={number}
        style={{
          height: `${cellHeight}vh`,
          minHeight: `${cellHeight}vh`,
        }}
        className={`${baseClasses} ${stateClasses} cursor-default`}
      >
        {number}
      </span>
    );
  };

  // --- MOBILE: vertical columns like your working snippet ---
  const getColumns = () => {
    const cols = { B: [], I: [], N: [], G: [], O: [] };

    numbers.forEach((num) => {
      const letter = getBingoLetter(num);
      cols[letter].push(num);
    });

    return cols;
  };

  const columns = getColumns();

  return (
    <div
      className="w-full"
      style={{
        height: `${totalHeight}vh`,
      }}
    >

      {/* =========================================================
          MOBILE / TABLET
      ========================================================= */}

      <div
        className="
          lg:hidden
          w-full
          h-full
          bg-[#2c2453]
          py-1.5
          px-2
          rounded-xl
          sm:rounded-2xl
          border
          border-white/10
          shadow-xl
        "
      >

        <div className="w-[90%] sm:w-[85%] mx-auto h-full">

          {/* HEADER ROW */}
          <div
            className="grid grid-cols-5 gap-1 w-full"
            style={{
              height: `${headerHeight}vh`,
              marginBottom: `${headerGap}vh`,
            }}
          >
            {["B", "I", "N", "G", "O"].map((letter) => (
              <div
                key={letter}
                className={`
                  text-center
                  font-bold
                  text-[10px]
                  rounded
                  w-full
                  flex
                  items-center
                  justify-center
                  text-white
                  shadow-sm
                  ${columnColors[letter] || "bg-blue-500"}
                `}
              >
                {letter}
              </div>
            ))}
          </div>

          {/* NUMBER GRID */}
          <div
            className="grid grid-cols-5 w-full pb-0.5"
            style={{
              gap: `${rowGap}vh`,
            }}
          >
            {Array.from({ length: 15 }, (_, rowIdx) => (
              ["B", "I", "N", "G", "O"].map((letter) => {

                const num = columns[letter][rowIdx];

                if (num === undefined) {
                  return <span key={`${letter}-${rowIdx}`} />;
                }

                return renderNumberCell(num, "mobile");

              })
            ))}
          </div>

        </div>
      </div>

      {/* =========================================================
          DESKTOP
      ========================================================= */}

      <div
        className="
          hidden
          lg:grid
          grid-cols-5
          gap-2
          p-3
          h-full
          bg-[#2c2453]
          rounded-[2rem]
          shadow-2xl
          border
          border-white/10
        "
      >

        {["B", "I", "N", "G", "O"].map((letter) => (

          <div
            key={letter}
            className="flex flex-col"
            style={{
              gap: `${rowGap}vh`,
            }}
          >

            {/* LETTER HEADER */}
            <div
              style={{
                height: `${headerHeight}vh`,
                minHeight: `${headerHeight}vh`,
                marginBottom: `${headerGap}vh`,
              }}
              className={`
                text-center
                font-black
                text-lg
                w-10
                mx-auto
                flex
                items-center
                justify-center
                rounded-md
                text-white
                shadow-[0_4px_12px_rgba(0,0,0,0.3)]
                border-2
                border-white/20

                ${letter === "B"
                  ? "bg-ball-b"
                  : letter === "I"
                    ? "bg-ball-i"
                    : letter === "N"
                      ? "bg-ball-n"
                      : letter === "G"
                        ? "bg-ball-g"
                        : "bg-ball-o"}
              `}
            >
              {letter}
            </div>

            {/* NUMBER CELLS */}
            <div
              className="grid grid-cols-1"
              style={{
                gap: `${rowGap}vh`,
              }}
            >
              {columns[letter].map((number) =>
                renderNumberCell(number)
              )}
            </div>

          </div>
        ))}

      </div>
    </div>
  );
};

export default BingoGrid;