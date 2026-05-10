import "../../styles/WinnerModal.css";
import React, { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { BingoColumn } from "../../components/cartela";
import { Trophy, Ban, Hash, Coins, Users, ChevronRight, Volume2 } from "lucide-react";
const BingoCard = ({
  cardGrid,
  drawnNumbers,
  isWinnerCard,
  winningCombo,
}) => {
  if (!cardGrid) return <div>Loading...</div>;

  const isDiagonalWin = (winningCombo, cardGrid) => {
    const mainDiagonal =
      cardGrid[0][0] &&
      cardGrid[1][1] &&
      cardGrid[2][2] &&
      cardGrid[3][3] &&
      cardGrid[4][4] &&
      [
        cardGrid[0][0],
        cardGrid[1][1],
        cardGrid[2][2],
        cardGrid[3][3],
        cardGrid[4][4],
      ].every((num) => winningCombo.includes(num) || num === "0");

    const secondaryDiagonal =
      cardGrid[0][4] &&
      cardGrid[1][3] &&
      cardGrid[2][2] &&
      cardGrid[3][1] &&
      cardGrid[4][0] &&
      [
        cardGrid[0][4],
        cardGrid[1][3],
        cardGrid[2][2],
        cardGrid[3][1],
        cardGrid[4][0],
      ].every((num) => winningCombo.includes(num) || num === "0");

    return mainDiagonal || secondaryDiagonal;
  };

  const isFreePartOfDiagonalWin =
    isWinnerCard && isDiagonalWin(winningCombo, cardGrid);

  const columns = {
    B: [cardGrid[0][0], cardGrid[1][0], cardGrid[2][0], cardGrid[3][0], cardGrid[4][0]],
    I: [cardGrid[0][1], cardGrid[1][1], cardGrid[2][1], cardGrid[3][1], cardGrid[4][1]],
    N: [cardGrid[0][2], cardGrid[1][2], cardGrid[2][2], cardGrid[3][2], cardGrid[4][2]],
    G: [cardGrid[0][3], cardGrid[1][3], cardGrid[2][3], cardGrid[3][3], cardGrid[4][3]],
    O: [cardGrid[0][4], cardGrid[1][4], cardGrid[2][4], cardGrid[3][4], cardGrid[4][4]],
  };

  return (
    <div className="bg-bingo-surface rounded-2xl overflow-hidden shadow-2xl w-full max-w-[280px] border border-white/10">
      <div className="flex flex-col">
        <div className="p-3 bg-bingo-card">
          <div className="flex justify-center gap-1">
            {Object.entries(columns).map(([letter, numbers], colIndex) => {
              const getIsWinning = (num, rowIndex) => {
                const isFreeCellInDiagonalWin =
                  num === "0" &&
                  rowIndex === 2 &&
                  colIndex === 2 &&
                  isFreePartOfDiagonalWin;
                return isWinnerCard && (winningCombo.includes(num) || isFreeCellInDiagonalWin);
              };

              const getIsNormallyCalled = (num) => drawnNumbers.includes(num) || num === "0";
              const getIsLastCalled = (num) => {
                const normalize = (val) => parseInt(String(val).replace(/^[a-zA-Z]/, ""), 10);
                const lastNum = drawnNumbers[drawnNumbers.length - 1];
                return lastNum && normalize(num) === normalize(lastNum);
              };

              return (
                <BingoColumn
                  key={letter}
                  letter={letter}
                  numbers={numbers}
                  isClickable={false}
                  getIsWinning={getIsWinning}
                  getIsNormallyCalled={getIsNormallyCalled}
                  getIsLastCalled={getIsLastCalled}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const BingoModal = ({
  playerId,
  onClose,
  winners = [],
  winningCards = [],
  winningCombos = [],
  prizes = [],
  drawnNumbers = [],
  winningCardGrids = [],
  userLoss,
  firstNames = [],
  isWatcher = false,
  disqualified = false,
  disqualificationMessage = "",
  isMuted = false,
}) => {
  const isWinner = !disqualified && winners.includes(playerId);
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(15);
  const hasPlayedAudio = useRef(false);

  useEffect(() => {
    // 10. Play bingo and winner.mp3 ONLY ONCE per game
    if (!hasPlayedAudio.current && !isMuted) {
      try {
        const bingoAudio = new Audio("/assets/bingo.mp3");
        
        if (isWinner) {
          const winnerAudio = new Audio("/assets/winner.mp3");
          // 10. Play winner.mp3 AFTER bingo.mp3 finishes
          bingoAudio.onended = () => {
            winnerAudio.play().catch(e => console.warn("Winner audio prevented", e));
          };

          // Trigger Confetti immediately
          const duration = 5 * 1000;
          const animationEnd = Date.now() + duration;
          const frame = () => {
            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, zIndex: 1203 });
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, zIndex: 1203 });
            if (Date.now() < animationEnd) requestAnimationFrame(frame);
          };
          frame();
        }

        // Play bingo.mp3 for everyone
        bingoAudio.play().catch(e => console.warn("Bingo audio prevented", e));
        hasPlayedAudio.current = true;
      } catch (err) {
        console.error("Audio playback failed", err);
      }
    }

    const interval = setInterval(() => setAutoCloseSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [isWinner, isMuted]);

  useEffect(() => {
    if (autoCloseSeconds === 0) onClose();
  }, [autoCloseSeconds, onClose]);

  // UI Themes based on role
  const getTheme = () => {
    if (disqualified) return { bg: "bg-slate-800", icon: <Ban size={48} className="text-red-500" />, title: "ተሰናብተዋል", subtitle: disqualificationMessage };
    if (isWinner) return { bg: "bg-emerald-600", icon: <Trophy size={48} className="text-amber-300 animate-bounce" />, title: "BINGO!", subtitle: "አሸንፈዋል!" };
    if (isWatcher) return { bg: "bg-indigo-600", icon: <Users size={48} className="text-indigo-200" />, title: "", subtitle: "" }; // 6. No message for watcher
    return { bg: "bg-rose-600", icon: <Volume2 size={48} className="text-white/80" />, title: "ተሸንፈዋል", subtitle: `ያጡት መጠን: ${userLoss || 0} ETB` };
  };

  const theme = getTheme();

  useEffect(() => {
    console.log("WinnerModal Props Debug:", {
      playerId,
      isWinner,
      isWatcher,
      winners,
      winningCards,
      winningCardGridsCount: winningCardGrids?.length,
      winningCombosCount: winningCombos?.length
    });
  }, [playerId, isWinner, isWatcher, winners, winningCards, winningCardGrids, winningCombos]);

  return (
    <>
      <div className="fixed inset-0 bg-black/90 z-1200 backdrop-blur-md" onClick={onClose}></div>

      <div className="fixed inset-0 z-1201 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
        <div className="relative w-full max-w-lg bg-bingo-bg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-bounce-in pointer-events-auto border border-white/10">

          {/* HEADER SECTION - MESSAGE BOX */}
          <div className={`${theme.bg} p-6 text-center relative overflow-hidden transition-colors duration-500`}>
            <div className="relative z-10 flex flex-col items-center gap-2">
              {theme.icon}
              {/* Show different message for winner/loser but NONE for watcher */}
              {theme.title && (
                <h1 className="text-white text-4xl sm:text-5xl font-black italic tracking-tighter uppercase drop-shadow-lg">
                  {theme.title}
                </h1>
              )}
              {theme.subtitle && (
                <p className="font-black text-lg text-white/90 uppercase tracking-widest">
                  {theme.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* MAIN CONTENT - SHOW WINNER CARD FOR ALL */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
            <div className="space-y-8">

              {/* STATS SUMMARY */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center">
                  <Users size={16} className="text-blue-400 mb-1" />
                  <span className="text-[10px] text-white/40 uppercase font-black">Winners</span>
                  <span className="text-lg font-black text-white">{winners.length}</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center">
                  <Coins size={16} className="text-amber-400 mb-1" />
                  <span className="text-[10px] text-white/40 uppercase font-black">Prize Pool</span>
                  <span className="text-lg font-black text-amber-500">{prizes.reduce((a, b) => a + b, 0)} ETB</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center">
                  <Hash size={16} className="text-emerald-400 mb-1" />
                  <span className="text-[10px] text-white/40 uppercase font-black">Balls</span>
                  <span className="text-lg font-black text-emerald-500">{drawnNumbers.length}</span>
                </div>
              </div>

              {/* WINNING BOARDS - SHOWN TO EVERYBODY */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.3em]">Winning Board</h3>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="flex flex-col items-center gap-10">
                  {winningCards.map((cardId, index) => (
                    <div key={cardId} className="w-full flex flex-col items-center animate-slide-up" style={{ animationDelay: `${index * 150}ms` }}>
                      <div className="flex items-center justify-between w-full max-w-[280px] mb-3 px-2">
                        <span className="text-[10px] font-black text-white/40 uppercase">Card #{cardId}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-500">{firstNames[index] || "Player"}</span>
                          <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full font-black">+{prizes[index] || 0} ETB</span>
                        </div>
                      </div>
                      <BingoCard
                        cardGrid={winningCardGrids[index]}
                        drawnNumbers={drawnNumbers}
                        isWinnerCard={true}
                        winningCombo={winningCombos[index] || []}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* DRAWN NUMBERS RECAP - ONLY FOR WINNER (KEEP IT CLEAN FOR OTHERS) */}
              {isWinner && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.3em] text-center">Numbers Recap</h3>
                  <div className="flex flex-wrap justify-center gap-1.5 opacity-60">
                    {drawnNumbers.slice().reverse().map((num, idx) => (
                      <div key={idx} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border ${idx === 0 ? 'bg-amber-500 border-amber-400 text-white' : 'bg-white/5 border-white/5 text-white/60'}`}>
                        {String(num).replace(/^[a-zA-Z]/, "")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* FOOTER - REDIRECT TIMER */}
          <div className="p-6 bg-bingo-surface border-t border-white/5 relative z-20">
            <button
              onClick={onClose}
              className={`w-full group relative overflow-hidden flex items-center justify-between p-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl ${theme.bg}`}
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl group-hover:rotate-12 transition-transform">
                  <ChevronRight size={20} />
                </div>
                <span className="text-white">Exit to Lobby</span>
              </div>
              <div className="bg-black/20 px-3 py-1.5 rounded-full text-[10px] text-white/80 tabular-nums">
                {autoCloseSeconds}s
              </div>
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default BingoModal;