// pages/bingo/Game.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../../contexts/socketContext";
import BingoModal from "./WinnerModal";
import { useAuth } from "../../contexts/AuthContext";
import {
  BingoBallDisplay,
  BingoGrid,
  PlayerCardsSection,
  PlayModeToggle,
  GameControls,
  GameHeader,
  GameSettingsModal,
} from "../../components/Game";
import BingoLoading from "../../components/common/BingoLoading";
import { useAppStore } from "../../store";
import { useGameSocketEvents } from "../../hooks/bingo/useGameSocketEvents";
import { useGameController } from "../../hooks/bingo/useGameController";
import { voiceOptions } from "../../utils/voiceOptions";
import { DEFAULT_DISQUALIFICATION_MESSAGE } from "../../utils/bingoUtils";

function Game() {
  const { roomId, stakeAmount } = useParams();
  const socket = useSocket();
  const { userId, loading: authLoading } = useAuth();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Unified Game Controller (Logic & Mode Sync)
  const {
    handleModalClose,
    handleToggleNumber,
    toggleMute,
    toggleMode,
    handleVoiceChange,
    handleLeave,
    handleRefresh,
    disqualificationStorageKey,
    watcherStorageKey
  } = useGameController(
    socket,
    roomId,
    userId,
    authLoading
  );

  // 2. Network Events (Socket.IO -> Zustand Hub)
  useGameSocketEvents(
    socket,
    roomId,
    userId,
    disqualificationStorageKey,
    watcherStorageKey
  );

  // 3. State Subscription (Single Source of Truth)
  const {
    loading,
    liveResults,
    currentNumber,
    prefixedNumber,
    finishedGame,
    isMuted,
    voiceOption,
    animationTrigger,
    storedCards,
    gameStarted,
    result,
    winners,
    winningCards,
    winningCombos,
    prizes,
    drawnNumbers,
    winningCardGrids,
    userPrize,
    userLoss,
    updatedStakeAmount,
    numberOfPlayers,
    shuffling,
    winPattern,
    winAmount,
    isManualMode,
    sharedSelectedNumbers,
    firstNames,
    isDisqualified,
    disqualificationMessage,
    disqualifiedCards,
    isTemporaryWatcher,
    temporaryWatcherMessage,
    roomData,
    countdown,
    waitingForCounter
  } = useAppStore();

  const [theme] = useState("dark"); // Design constant

  // UI Heartbeat (Animations)
  useEffect(() => {
    if (!animationTrigger) return;
    const timeout = setTimeout(() => useAppStore.getState().setAnimationTrigger(false), 400);
    return () => clearTimeout(timeout);
  }, [animationTrigger]);

  if (authLoading) {
    return <BingoLoading message="መጫወቻው እየተዘጋጀ ነው..." size="large" />;
  }

  const isWatcher = isDisqualified || isTemporaryWatcher;

  // 4. View Rendering (Pure Layout)
  return (
    <div
      className={`fixed inset-0 overflow-hidden bg-[#1A0A2E] ${theme === "dark" ? "text-white" : "text-black"
        }`}
    >
      <div className="w-full h-full mx-auto p-1 lg:p-2 xl:p-3 max-w-7xl relative flex flex-col overflow-hidden">
        {loading ? (
          <BingoLoading message="Loading..." size="large" />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
              {/* PERMANENT FULL-WIDTH HEADER */}
              <div className="mb-2">
                <GameHeader
                  updatedStakeAmount={isWatcher ? 0 : updatedStakeAmount || stakeAmount}
                  numberOfPlayers={numberOfPlayers}
                  winAmount={winAmount}
                  liveResults={liveResults}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              </div>

              <div className="flex flex-row w-full my-1 gap-1 sm:gap-2">

                {/* LEFT GRID */}
                <div className="w-[50%] sm:w-[40%] lg:w-[30%] min-w-0">
                  <div className="bg-bingo-bg rounded-lg p-0 sm:p-0.5">
                    <BingoGrid
                      numbers={Array.from({ length: 75 }, (_, index) => index + 1)}
                      liveResults={liveResults}
                      animationTrigger={animationTrigger}
                      shuffling={shuffling}
                      isMuted={isMuted}
                    />
                  </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="w-[50%] sm:w-[60%] lg:w-[70%] flex flex-col gap-1 sm:gap-2 min-w-0">
                  <PlayModeToggle
                    isManualMode={isManualMode}
                    toggleMode={toggleMode}
                    isWatcher={isWatcher}
                  />
                  {/* CURRENT BALL PILL */}
                  <div>
                    <BingoBallDisplay
                      prefixedNumber={prefixedNumber}
                      animationTrigger={animationTrigger}
                      liveResults={liveResults}
                      gameStarted={gameStarted || liveResults.length > 0}
                    />
                  </div>

                  {/* PLAYER CARDS */}
                  <div className="bg-bingo-card-alt backdrop-blur-sm rounded-xl p-0 shadow-lg flex-1">
                    <PlayerCardsSection
                      storedCards={storedCards}
                      userId={userId}
                      roomId={roomId}
                      liveResults={liveResults}
                      isManualMode={isManualMode}
                      sharedSelectedNumbers={sharedSelectedNumbers}
                      onToggleNumber={handleToggleNumber}
                      isWatcher={isWatcher}
                      isDisqualifiedWatcher={isDisqualified}
                      disqualificationMessage={
                        disqualificationMessage || DEFAULT_DISQUALIFICATION_MESSAGE
                      }
                      disqualifiedCards={disqualifiedCards}
                      spectatorMessage={temporaryWatcherMessage}
                      winPattern={winPattern}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* MODALS */}
            {isSettingsOpen && (
              <GameSettingsModal
                isManualMode={isManualMode}
                toggleMode={toggleMode}
                voiceOption={voiceOption}
                voiceOptions={voiceOptions}
                handleVoiceChange={handleVoiceChange}
                isMuted={isMuted}
                toggleMute={toggleMute}
                isWatcher={isWatcher}
                onClose={() => setIsSettingsOpen(false)}
              />
            )}

            {finishedGame && (
              <BingoModal
                playerId={userId || "unknown"}
                roomId={roomId}
                isWatcher={isWatcher}
                onClose={handleModalClose}
                winners={winners}
                winningCards={winningCards}
                winningCombos={winningCombos}
                prizes={prizes}
                drawnNumbers={drawnNumbers}
                winningCardGrids={winningCardGrids}
                result={result}
                userPrize={userPrize}
                userLoss={userLoss}
                firstNames={firstNames}
                lastBall={currentNumber}
                disqualified={isDisqualified || result === "Disqualified"}
                disqualificationMessage={
                  disqualificationMessage || DEFAULT_DISQUALIFICATION_MESSAGE
                }
                disqualifiedCards={disqualifiedCards}
                isMuted={isMuted}
              />
            )}
            
            <div className="fixed bottom-0 left-0 right-0 p-2 z-10 bg-gradient-to-t from-bingo-bg to-transparent">
                <GameControls
                    handleLeave={handleLeave}
                    handleRefresh={handleRefresh}
                    isWatcher={isWatcher}
                />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Game;