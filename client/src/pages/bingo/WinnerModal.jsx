import "../../styles/WinnerModal.css";
import React, { useEffect, useRef, useState } from "react";
import { BingoColumn } from "../../components/cartela";
import { Trophy, Ban, Users } from "lucide-react";
const bingo = "/bingo.mp3";
const winner = "/winner.mp3";
import confetti from "canvas-confetti";

/* ---------------- NAME FORMATTER ---------------- */
const formatName = (name = "") => {
  return name.length > 8 ? name.slice(0, 8) + "..." : name;
};

/* ---------------- BINGO CARD (FIXED & CLEANED) ---------------- */
const BingoCard = ({
  cardGrid,
  drawnNumbers,
  isWinnerCard,
  winningCombo,
  isWatcher,
  disqualified,
}) => {
  if (!cardGrid) return null;

  const letters = ["B", "I", "N", "G", "O"];
  const columns = letters.reduce((acc, letter, colIndex) => {
    acc[letter] = cardGrid.map((row) => row[colIndex]);
    return acc;
  }, {});

  return (
    <div className={`relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 shadow-inner w-full transition-all duration-500 ${disqualified ? "grayscale opacity-60" : ""}`}>
      {disqualified && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-rose-900/20 backdrop-blur-[2px]">
          <span className="bg-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg border border-white/20">
            Disqualified
          </span>
        </div>
      )}
      <div className="p-2">
        <div className="flex justify-center gap-1">
          {Object.entries(columns).map(([letter, numbers]) => (
            <BingoColumn
              key={letter}
              letter={letter}
              numbers={numbers}
              isClickable={false}
              getIsWinning={(num) => isWinnerCard && winningCombo.includes(num)}
              getIsNormallyCalled={(num) => drawnNumbers.includes(num) || num === "0"}
              getIsLastCalled={() => false}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------------- MAIN MODAL ---------------- */
const BingoModal = ({
  playerId,
  onClose,
  winners = [],
  winningCards = [],
  winningCombos = [],
  drawnNumbers = [],
  winningCardGrids = [],
  firstNames = [],
  isWatcher = false,
  disqualified = false,
  isMuted = false,
  winPattern = "",
}) => {
  const isWinner = !disqualified && winners.includes(playerId);
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(15);
  const hasPlayedRef = useRef(false);
  const bingoAudioRef = useRef(null);
  const winnerAudioRef = useRef(null);

  /* ---------------- ANIMATION + TIMER ---------------- */
  useEffect(() => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: isWinner ? ["#fbbf24", "#34d399", "#60a5fa"] : ["#6366f1", "#4f46e5", "#818cf8"],
    });

    if (!isMuted && bingoAudioRef.current) {
      bingoAudioRef.current.play().catch(() => {});
    }

    const interval = setInterval(() => {
      setAutoCloseSeconds((s) => Math.max(0, s - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isWinner]);

  useEffect(() => {
    if (autoCloseSeconds === 0) onClose();
  }, [autoCloseSeconds, onClose]);

  // Handler to play winner sound after bingo ends
  const handleBingoEnded = () => {
    if (isWinner && !isMuted && winnerAudioRef.current) {
      winnerAudioRef.current.play().catch(() => {});
    }
  };

  const getTheme = () => {
    if (isWatcher) return { bg: "bg-indigo-600", title: "ጨዋታው ተጠናቋል", icon: <Users size={40} className="text-white" /> };
    if (isWinner) return { bg: "bg-emerald-600", title: "አሸንፈዋል", icon: <Trophy size={40} className="text-amber-300" /> };
    return { bg: "bg-rose-600", title: "ተሸንፈዋል", icon: <Ban size={40} className="text-white" /> };
  };

  const theme = getTheme();

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* AUDIO ELEMENTS */}
      {!isMuted && (
        <>
          <audio ref={bingoAudioRef} src={bingo} onEnded={handleBingoEnded} />
          {isWinner && <audio ref={winnerAudioRef} src={winner} />}
        </>
      )}

      {/* BACKDROP */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      {/* MODAL */}
      <div className="relative w-full max-w-[360px] bg-[#1a1b2e] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* HEADER */}
        <div className={`${theme.bg} py-8 flex flex-col items-center gap-3 shadow-lg relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm border border-white/10 shadow-xl">
            {theme.icon}
          </div>
          <h1 className="text-white text-3xl font-black tracking-tight drop-shadow-md">
            {theme.title}
          </h1>
        </div>

        {/* CONTENT */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {winningCards.slice(0, 1).map((cardId, index) => (
            <div key={cardId} className="bg-white/5 border border-white/10 rounded-[2rem] p-5 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex flex-col">
                  <span className="text-white/40 text-[10px] uppercase font-bold tracking-[0.2em]">Card No</span>
                  <span className="text-white font-mono font-black text-xl">#{cardId}</span>
                </div>
                <div className="h-12 w-px bg-white/10 mx-2" />
                <div className="flex flex-col text-right">
                  <span className="text-white/40 text-[10px] uppercase font-bold tracking-[0.2em]">Winner</span>
                  <span className="text-emerald-400 font-black text-xl">{formatName(firstNames[index] || "Player")}</span>
                </div>
              </div>

              <div className="mb-5 py-2.5 px-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center justify-center gap-2.5 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                <span className="text-amber-400 text-[11px] font-black uppercase tracking-wider">
                  {winPattern === "one_line" ? "አንድ መስመር (ONE LINE)" : "ሁለት መስመር (TWO LINES)"}
                </span>
              </div>

              <BingoCard
                cardGrid={winningCardGrids[index]}
                drawnNumbers={drawnNumbers}
                isWinnerCard={true}
                winningCombo={winningCombos[index] || []}
                isWatcher={isWatcher}
                disqualified={disqualified}
              />
            </div>
          ))}

          <button
            onClick={onClose}
            className={`${theme.bg} w-full py-4.5 rounded-2xl text-white font-black text-lg shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:brightness-110 active:scale-95 transition-all duration-200 uppercase tracking-widest border-t border-white/20`}
          >
            CONTINUE ({autoCloseSeconds}S)
          </button>
        </div>
      </div>
    </div>
  );
};

export default BingoModal;