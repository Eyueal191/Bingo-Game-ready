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
const BingoGrid = ({ numbers = [], liveResults = [], shuffling = false, isMuted = false }) => {
  const [shuffledNumber, setShuffledNumber] = useState(null);
  const [fastShuffleNums, setFastShuffleNums] = useState([]);
  const [displayNumbers, setDisplayNumbers] = useState({});
  const [isFastShuffling, setIsFastShuffling] = useState(false);
  const audioRef = useRef(null);

  const liveSet = useMemo(() => new Set(liveResults || []), [liveResults]);
  const numbersKey = useMemo(() => numbers.join(","), [numbers]);
  const liveResultsKey = useMemo(() => JSON.stringify(liveResults || []), [liveResults]);

  const isCalled = (num) => {
    if (!liveResults || liveResults.length === 0) return false;
    if (liveSet.has(num)) return true;
    const letter = getBingoLetter(num);
    return (
      liveSet.has(`${letter}${num}`) || liveSet.has(`${letter.toLowerCase()}${num}`)
    );
  };

  useEffect(() => {
    if (!audioRef.current) {
      try {
        const audio = new Audio("/assets/shuffle.wav");
        audio.preload = "auto";
        audio.loop = true;
        audio.volume = 0.6;
        audioRef.current = audio;
      } catch (error) {
        console.error("Failed to initialize shuffle audio:", error);
      }
    }

    if (!shuffling) {
      setShuffledNumber(null);
      setFastShuffleNums([]);
      setDisplayNumbers({});
      setIsFastShuffling(false);
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (_) {
          /* ignore */
        }
      }
      return;
    }

    const uncalled = numbers.filter((n) => !isCalled(n));
    if (uncalled.length === 0) {
      setShuffledNumber(null);
      setFastShuffleNums([]);
      setDisplayNumbers({});
      setIsFastShuffling(false);
      return;
    }

    setIsFastShuffling(true);
    let shuffleCount = 0;
    const maxShuffleRounds = 30;
    const numbersToShuffle = Math.min(40, uncalled.length);

    const fastShuffleInterval = setInterval(() => {
      shuffleCount += 1;
      const shuffledIndices = new Set();
      const shuffledNumbers = [];
      while (shuffledNumbers.length < numbersToShuffle) {
        const randomIndex = Math.floor(Math.random() * uncalled.length);
        if (!shuffledIndices.has(randomIndex)) {
          shuffledIndices.add(randomIndex);
          shuffledNumbers.push(uncalled[randomIndex]);
        }
      }
      setFastShuffleNums(shuffledNumbers);

      const nextDisplay = {};
      shuffledNumbers.forEach((num) => {
        nextDisplay[num] = getRandomInt(1, 75);
      });
      setDisplayNumbers(nextDisplay);

      if (shuffleCount >= maxShuffleRounds) {
        clearInterval(fastShuffleInterval);
        setIsFastShuffling(false);
        setFastShuffleNums([]);
        setDisplayNumbers({});
      }
    }, 80);

    const selectTimeout = setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * uncalled.length);
      setShuffledNumber(uncalled[randomIndex]);
    }, 80 * maxShuffleRounds + 400);

    if (audioRef.current) {
      try {
        if (!isMuted) {
          audioRef.current.play().catch((err) => {
            console.warn("Shuffle audio play prevented:", err);
          });
        } else {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      } catch (error) {
        console.error("Shuffle audio control failed:", error);
      }
    }

    return () => {
      clearInterval(fastShuffleInterval);
      clearTimeout(selectTimeout);
      setIsFastShuffling(false);
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (_) {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffling, isMuted, numbersKey, liveResultsKey]);

  const lastCalledNumber =
    Array.isArray(liveResults) && liveResults.length > 0
      ? liveResults[liveResults.length - 1]
      : null;

  const renderNumberCell = (number, variant = "desktop") => {
    const numberCalled = isCalled(number);
    const isLastCalled = lastCalledNumber === number;
    const isSelectedShuffle =
      number === shuffledNumber && !numberCalled && !isFastShuffling;
    const isFastShuffleEntry =
      fastShuffleNums.includes(number) && isFastShuffling && !numberCalled;
    const displayValue = isFastShuffleEntry
      ? displayNumbers[number] || number
      : number;
    const baseClasses =
      variant === "mobile"
        ? "w-full aspect-square flex items-center justify-center font-bold text-[10px] rounded-[3px] transition-all duration-300"
        : "w-full aspect-square flex items-center justify-center font-bold text-[13px] rounded-md transition-all duration-300 shadow-sm";

    let stateClasses = "bg-[#51496f] text-white font-black border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]";

    if (numberCalled) {
      stateClasses = isLastCalled
        ? "bg-[#10b981] text-white shadow-[0_0_20px_rgba(16,185,129,0.6)] scale-110 z-10 animate-pulse rounded-md border border-emerald-300/50"
        : "bg-[#f59e0b] text-white border border-amber-400/30 rounded-md shadow-[0_2px_10px_rgba(245,158,11,0.3)]";
    } else if (isSelectedShuffle) {
      stateClasses = "bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/50 animate-bounce-slow rounded-md";
    } else if (isFastShuffleEntry) {
      stateClasses = "bg-white/5 text-white/20 border border-dashed border-white/10 rounded-md";
    }

    return (
      <span key={number} className={`${baseClasses} ${stateClasses} cursor-default`}>
        {displayValue}
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
    <div className="w-full">
      {/* Mobile / Tablet layout (below lg) */}
      <div className="lg:hidden w-full bg-[#2c2453] py-1.5 px-2 rounded-xl sm:rounded-2xl border border-white/10 shadow-xl">
        <div className="w-[90%] sm:w-[85%] mx-auto">
          {/* Header row: B I N G O */}
          <div className="grid grid-cols-5 gap-1 mb-1.5 w-full">
            {["B", "I", "N", "G", "O"].map((letter) => (
              <div
                key={letter}
                className={`text-center font-bold text-[10px] rounded aspect-square w-full flex items-center justify-center text-white shadow-sm ${columnColors[letter] || "bg-blue-500"}`}
              >
                {letter}
              </div>
            ))}
          </div>

          {/* Number grid: 5 equal columns */}
          <div className="grid grid-cols-5 gap-[3px] w-full pb-0.5">
            {/* We need to transpose: render row by row, column by column */}
            {Array.from({ length: 15 }, (_, rowIdx) => (
              ["B", "I", "N", "G", "O"].map((letter) => {
                const num = columns[letter][rowIdx];
                if (num === undefined) return <span key={`${letter}-${rowIdx}`} />;
                return renderNumberCell(num, "mobile");
              })
            ))}
          </div>
        </div>
      </div>

      <div className="hidden lg:grid grid-cols-5 gap-2 p-3 bg-[#2c2453] rounded-[2rem] shadow-2xl border border-white/10">
        {["B", "I", "N", "G", "O"].map((letter) => (
          <div key={letter} className="flex flex-col gap-2">
            <div
              className={`text-center font-black text-lg w-10 h-10 mx-auto flex items-center justify-center rounded-md text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] border-2 border-white/20 ${letter === "B" ? "bg-ball-b" :
                letter === "I" ? "bg-ball-i" :
                  letter === "N" ? "bg-ball-n" :
                    letter === "G" ? "bg-ball-g" :
                      "bg-ball-o"
                }`}
            >
              {letter}
            </div>
            <div className="grid grid-cols-1 gap-1">
              {columns[letter].map((number) => renderNumberCell(number))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BingoGrid;