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
  GameCounter,
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

  const {
    handleModalClose,
    handleToggleNumber,
    toggleMute,
    toggleMode,
    handleVoiceChange,
    handleLeave,
    handleRefresh,
    disqualificationStorageKey,
    watcherStorageKey,
  } = useGameController(socket, roomId, userId, authLoading);

  useGameSocketEvents(
    socket,
    roomId,
    userId,
    disqualificationStorageKey,
    watcherStorageKey
  );

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
    countdown,
    waitingForCounter,
  } = useAppStore();

  const [theme] = useState("dark");

  useEffect(() => {
    if (!animationTrigger) return;
    const timeout = setTimeout(
      () => useAppStore.getState().setAnimationTrigger(false),
      400
    );
    return () => clearTimeout(timeout);
  }, [animationTrigger]);

  if (authLoading) {
    return <BingoLoading message="መጫወቻው እየተዘጋጀ ነው..." size="large" />;
  }

  const isWatcher = isDisqualified || isTemporaryWatcher;

  return (
    <div
      className={`w-full min-h-[113vh] bg-[#21103D] ${theme === "dark" ? "text-white" : "text-black"
        }`}
    >
      {/* ===================== 100vh GAME AREA ===================== */}
      <div className="h-[100vh] w-full mx-auto p-1 lg:p-2 xl:p-3 max-w-7xl relative flex flex-col overflow-hidden">

        {loading ? (
          <BingoLoading message="Loading..." size="large" />
        ) : (
          <>
            {/* HEADER */}
            <div className="shrink-0">
              <GameHeader
                updatedStakeAmount={
                  isWatcher ? 0 : updatedStakeAmount || stakeAmount
                }
                numberOfPlayers={numberOfPlayers}
                winAmount={winAmount}
                liveResults={liveResults}
              />
            </div>

            {/* COUNTER */}
            <div className="shrink-0 flex justify-center">
              <GameCounter
                countdown={countdown}
                waitingForCounter={waitingForCounter}
                gameStarted={gameStarted || liveResults.length > 0}
              />
            </div>

            {/* MAIN CONTENT */}
            <div className="flex flex-1 min-h-0 flex-row w-full">

              {/* LEFT GRID */}
              <div className="w-[50%] sm:w-[40%] lg:w-[30%] min-w-0 flex flex-col">
                <div className="bg-bingo-bg rounded-lg flex-1 flex flex-col">
                  <BingoGrid
                    numbers={Array.from({ length: 75 }, (_, i) => i + 1)}
                    liveResults={liveResults}
                    animationTrigger={animationTrigger}
                  />
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div className="w-[50%] sm:w-[60%] lg:w-[70%] flex flex-col min-w-0">

                {/* MODE TOGGLE */}
                <PlayModeToggle
                  isManualMode={isManualMode}
                  toggleMode={toggleMode}
                  isWatcher={isWatcher}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />

                {/* CURRENT BALL */}
                <BingoBallDisplay
                  prefixedNumber={prefixedNumber}
                  animationTrigger={animationTrigger}
                  liveResults={liveResults}
                  gameStarted={gameStarted || liveResults.length > 0}
                />

                {/* PLAYER CARDS */}
                <div className="bg-bingo-card-alt backdrop-blur-sm rounded-xl p-0 shadow-lg flex-1 h-[300px] max-h-[300px] overflow-y-auto">
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
          </>
        )}
      </div>

      {/* ===================== 13vh CONTROLS ===================== */}
      <div className="h-[13vh] w-full flex items-end">
        <div className="w-full p-1 bg-gradient-to-t from-bingo-bg/90 to-transparent">
          <GameControls
            handleLeave={handleLeave}
            handleRefresh={handleRefresh}
            isWatcher={isWatcher}
          />
        </div>
      </div>

      {/* ===================== MODALS ===================== */}
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
          winPattern={winPattern}
        />
      )}
    </div>
  );
}

export default Game;