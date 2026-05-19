import "../../styles/WinnerModal.css";
import React, { useEffect, useRef, useState } from "react";
import { BingoColumn } from "../../components/cartela";
import { Trophy, Ban, Users } from "lucide-react";
import confetti from "canvas-confetti";

const bingo = "/bingo.mp3";
const winner = "/winner.mp3";

/* ---------------- NAME FORMATTER ---------------- */
const formatName = (name = "") =>
  name.length > 8 ? name.slice(0, 8) + "..." : name;

/* ---------------- BINGO CARD ---------------- */

const BingoCard = ({
  cardGrid,
  drawnNumbers,
  isWinnerCard,
  winningCombo,
}) => {
  if (!cardGrid) return null;

  const letters = ["B", "I", "N", "G", "O"];
  const columns = letters.reduce((acc, letter, colIndex) => {
    acc[letter] = cardGrid.map((row) => row[colIndex]);
    return acc;
  }, {});

  const winningSet = new Set((winningCombo || []).map(String));
  const drawnSet = new Set((drawnNumbers || []).map(String));

  return (
    <div
      className="relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 shadow-inner w-full transition-all duration-500"
    >
      <div className="p-2 flex justify-center gap-1">
        {Object.entries(columns).map(([letter, numbers]) => (
          <BingoColumn
            key={letter}
            letter={letter}
            numbers={numbers}
            isClickable={false}
            getIsWinning={(num) =>
              isWinnerCard && winningSet.has(String(num))
            }
            getIsNormallyCalled={(num) =>
              drawnSet.has(String(num)) || String(num) === "0" || String(num) === "F"
            }
            getIsLastCalled={() => false}
          />
        ))}
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
  result = null,
  userPrize = 0,
  userLoss = 0,
  disqualificationMessage = "",
}) => {
  const isWinner = !disqualified && winners.includes(playerId);
  const isSpectator = isWatcher || result === "Watching" || (!winners.includes(playerId) && !disqualified && userLoss === 0 && userPrize === 0);

  const [seconds, setSeconds] = useState(6);
  const hasPlayedRef = useRef(false);
  const intervalRef = useRef(null);

  const bingoAudioRef = useRef(null);
  const winnerAudioRef = useRef(null);

  /* ---------------- RESET ON OPEN ---------------- */
  useEffect(() => {
    setSeconds(6);
    hasPlayedRef.current = false;
  }, []);

  /* ---------------- ANIMATION + SOUND ---------------- */
  useEffect(() => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: isWinner
        ? ["#fbbf24", "#34d399", "#60a5fa"]
        : ["#6366f1", "#4f46e5", "#818cf8"],
    });

    if (!isMuted && bingoAudioRef.current) {
      bingoAudioRef.current.play().catch(() => { });
    }
  }, [isWinner, isMuted]);

  /* ---------------- AUTO CLOSE TIMER ---------------- */
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  /* ---------------- CLOSE WHEN ZERO ---------------- */
  useEffect(() => {
    if (seconds <= 0) {
      clearInterval(intervalRef.current);
      onClose?.();
    }
  }, [seconds, onClose]);

  /* ---------------- SOUND END ---------------- */
  const handleBingoEnded = () => {
    if (isWinner && !isMuted && winnerAudioRef.current) {
      winnerAudioRef.current.play().catch(() => { });
    }
  };

  const theme = isSpectator
    ? { bg: "bg-indigo-600", title: "ጨዋታው ተጠናቋል", icon: <Users /> }
    : isWinner
      ? { bg: "bg-emerald-600", title: "አሸንፈዋል", icon: <Trophy /> }
      : { bg: "bg-rose-600", title: "ተሸንፈዋል", icon: <Ban /> };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* AUDIO */}
      {!isMuted && (
        <>
          <audio
            ref={bingoAudioRef}
            src={bingo}
            onEnded={handleBingoEnded}
          />
          {isWinner && <audio ref={winnerAudioRef} src={winner} />}
        </>
      )}

      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative w-full max-w-[360px] bg-[#1a1b2e] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">

        {/* HEADER */}
        <div className={`${theme.bg} py-8 flex flex-col items-center gap-3`}>
          <div className="bg-white/20 p-4 rounded-full">
            {theme.icon}
          </div>
          <h1 className="text-white text-3xl font-black">
            {theme.title}
          </h1>
        </div>

        {/* CONTENT */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* NOTIFICATION MESSAGE */}
          <div className={`p-4 rounded-2xl border text-center text-sm font-semibold transition-all duration-300 ${disqualified
            ? "bg-rose-500/10 border-rose-500/20 text-rose-300 animate-pulse"
            : isWinner
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : isSpectator
                ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-300"
            }`}>
            {disqualified ? (
              <span className="flex items-center justify-center gap-2">
                ⚠️ {disqualificationMessage || "You have been disqualified."}
              </span>
            ) : isWinner ? (
              <span className="flex items-center justify-center gap-2">
                🎉 Congratulations! You won {userPrize} Birr!
              </span>
            ) : isSpectator ? (
              <span className="flex items-center justify-center gap-2">
                👀 Spectating: Round completed.
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                😢 Game Over. You lost {userLoss} Birr.
              </span>
            )}
          </div>

          {winningCards.slice(0, 1).map((cardId, index) => (
            <div
              key={cardId}
              className="bg-white/5 border border-white/10 rounded-[2rem] p-5"
            >
              <div className="flex justify-between mb-4">
                <span>#{cardId}</span>
                <span className="text-emerald-400">
                  {formatName(firstNames[index] || "Player")}
                </span>
              </div>

              <BingoCard
                cardGrid={winningCardGrids[index]}
                drawnNumbers={drawnNumbers}
                isWinnerCard={true}
                winningCombo={winningCombos[index] || []}
              />
            </div>
          ))}

          <button
            onClick={onClose}
            className={`${theme.bg} w-full py-4 rounded-2xl font-black text-white hover:opacity-90 transition-all`}
          >
            CONTINUE ({seconds}s)
          </button>
        </div>
      </div>
    </div>
  );
};

export default BingoModal;