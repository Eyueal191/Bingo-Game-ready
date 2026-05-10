import { GameLoading } from "../../components/common";
import {
  BingoColumn,
  BingoButton,
  InvalidClaimModal,
  WatcherOverlay
} from "../../components/cartela";
import { usePlayerCard } from "../../hooks/usePlayerCard";

const PlayerCard = ({
  cardId,
  liveResults,
  isManualMode,
  roomId,
  userId,
  sharedSelectedNumbers,
  onToggleNumber,
  isReadOnly = false,
  isWatcher = false,
  winPattern = "two_line",
}) => {
  const {
    card,
    columns,
    cardGrid,
    getIsMarked,
    isClickable,
    canClaimBingo,
    showWatcherOverlay,
    showModal,
    handleNumberClick,
    handleBingoClick,
    handleModalClose,
    isLoading,
  } = usePlayerCard({
    cardId,
    liveResults,
    isManualMode,
    roomId,
    userId,
    sharedSelectedNumbers,
    onToggleNumber,
    isReadOnly,
    isWatcher,
    winPattern,
  });

  if (isLoading || !card) {
    return <GameLoading message="Loading card..." size="small" showBalls={false} />;
  }

  return (
    <div
      className={`relative bg-bingo-card w-full max-w-[210px] mx-auto rounded-xl p-0.5 sm:p-1 transition-all duration-300 ${showWatcherOverlay ? "opacity-90" : "opacity-100"
        }`}
    >
      {showWatcherOverlay && <WatcherOverlay />}

      <div className="flex justify-center gap-1 bg-bingo-card rounded-b-lg p-1">
        {Object.entries(columns).map(([letter, numbers]) => (
          <BingoColumn
            key={letter}
            letter={letter}
            numbers={numbers}
            onNumberClick={handleNumberClick}
            isClickable={isClickable}
            getIsMarked={getIsMarked}
            isAutoMode={!isManualMode}
          />
        ))}
      </div>

      {canClaimBingo && <BingoButton onClick={handleBingoClick} />}

      <InvalidClaimModal
        isOpen={showModal && isManualMode}
        onClose={handleModalClose}
        cardId={cardId}
        cardGrid={cardGrid}
        liveResults={liveResults}
        columns={columns}
      />
    </div>
  );
};

export default PlayerCard;