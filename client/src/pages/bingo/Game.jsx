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
  if (isWatcher) {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#21103D] text-white">
        <div className="h-full max-w-7xl mx-auto flex flex-col">

          {/* HEADER */}
          <div className="h-[13.5vh] shrink-0 p-1 lg:p-2">
            <GameHeader
              updatedStakeAmount={0}
              numberOfPlayers={numberOfPlayers}
              winAmount={winAmount}
              liveResults={liveResults}
            />
          </div>

          {/* COUNTER */}
          <div className="h-[6vh] shrink-0 flex items-center justify-center">
            <GameCounter
              countdown={countdown}
              waitingForCounter={waitingForCounter}
              gameStarted={gameStarted || liveResults.length > 0}
            />
          </div>

          {/* MODE ROW */}
          <div className="h-[6vh] shrink-0 flex items-center px-2">
            <PlayModeToggle
              isManualMode={isManualMode}
              toggleMode={toggleMode}
              isWatcher={isWatcher}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>

          {/* MAIN */}
          <div className="h-[68.5vh] flex flex-row gap-2 p-1 lg:p-2 min-h-0">

            {/* LEFT GRID */}
            <div className="w-[45%] lg:w-[30%] flex min-h-0 border border-green-500">
              <div className="flex-1 bg-bingo-bg rounded-xl overflow-hidden min-h-0 border border-green-500">
                <BingoGrid
                  numbers={Array.from({ length: 75 }, (_, i) => i + 1)}
                  liveResults={liveResults}
                  animationTrigger={animationTrigger}
                />
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="w-[55%] lg:w-[70%] flex flex-col gap-2 min-h-0">

              {/* BALL */}
              <div className="h-[6vh] shrink-0 flex items-center border border-yellow-500">
                <BingoBallDisplay
                  prefixedNumber={prefixedNumber}
                  animationTrigger={animationTrigger}
                  liveResults={liveResults}
                  gameStarted={gameStarted || liveResults.length > 0}
                />
              </div>

              {/* PLAYER CARDS (FIXED SCROLL CORE) */}
              <div className="flex-1 min-h-0 bg-bingo-card-alt rounded-xl overflow-y-auto border border-red-500">
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
                  disqualificationMessage={disqualificationMessage || DEFAULT_DISQUALIFICATION_MESSAGE}
                  disqualifiedCards={disqualifiedCards}
                  spectatorMessage={temporaryWatcherMessage}
                  winPattern={winPattern}
                />
              </div>

            </div>
          </div>

          {/* FOOTER */}
          <div className="h-[10vh] shrink-0 p-1 lg:p-2">
            <GameControls
              handleLeave={handleLeave}
              handleRefresh={handleRefresh}
              isWatcher={isWatcher}
            />
          </div>

        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-screen overflow-hidden bg-[#21103D] text-white">
      <div className="h-full max-w-7xl mx-auto flex flex-col">

        {/* HEADER */}
        <div className="h-[13.5vh] shrink-0 p-1 lg:p-2">
          <GameHeader
            updatedStakeAmount={updatedStakeAmount || stakeAmount}
            numberOfPlayers={numberOfPlayers}
            winAmount={winAmount}
            liveResults={liveResults}
          />
        </div>

        {/* MODE ROW */}
        <div className="h-[6vh] shrink-0 flex items-center px-2">
          <PlayModeToggle
            isManualMode={isManualMode}
            toggleMode={toggleMode}
            isWatcher={isWatcher}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>

        {/* MAIN */}
        <div className="h-[74.5vh] flex flex-row gap-2 p-1 lg:p-2 min-h-0">

          {/* LEFT GRID */}
          <div className="w-[45%] lg:w-[30%] flex min-h-0">
            <div className="flex-1 bg-bingo-bg rounded-xl overflow-hidden min-h-0">
              <BingoGrid
                numbers={Array.from({ length: 75 }, (_, i) => i + 1)}
                liveResults={liveResults}
                animationTrigger={animationTrigger}
              />
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="w-[55%] lg:w-[70%] flex flex-col gap-2 min-h-0">

            {/* BALL */}
            <div className="h-[6vh] shrink-0 flex items-center">
              <BingoBallDisplay
                prefixedNumber={prefixedNumber}
                animationTrigger={animationTrigger}
                liveResults={liveResults}
                gameStarted={gameStarted || liveResults.length > 0}
              />
            </div>

            {/* PLAYER CARDS */}
            <div className="flex-1 min-h-0 bg-bingo-card-alt rounded-xl overflow-y-auto">
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
                disqualificationMessage={disqualificationMessage || DEFAULT_DISQUALIFICATION_MESSAGE}
                disqualifiedCards={disqualifiedCards}
                spectatorMessage={temporaryWatcherMessage}
                winPattern={winPattern}
              />
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div className="h-[10vh] shrink-0 p-1 lg:p-2">
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