import { toast } from "sonner";
import PlayerCard from "../../pages/bingo/PlayerCard";

const AutoModeBanner = () => (
  <span className="font-semibold flex justify-center text-primary/80 text-lg text-center p-2 bg-gray-800 rounded-md">
    🤖 Automatic
  </span>
);

const PlayerCardsSection = ({
  storedCards,
  userId,
  roomId,
  liveResults,
  isManualMode,
  sharedSelectedNumbers,
  onToggleNumber,
  isWatcher = false,
  isDisqualifiedWatcher = false,
  disqualifiedCards = [],
  winPattern = "two_line",
}) => {
  const enforcedReadOnly = isWatcher || isDisqualifiedWatcher;
  const isAutoMode = !isManualMode;

  const handleToggleNumber = (number) => {
    if (number === "F") return;
    if (enforcedReadOnly) {
      toast.info("Watching mode is read-only for this round.");
      return;
    }
    if (!isManualMode) return;

    if (!liveResults.includes(number)) {
      return;
    }

    onToggleNumber(number);
  };

  const cardsToDisplay = isDisqualifiedWatcher
    ? Array.isArray(disqualifiedCards)
      ? disqualifiedCards
      : []
    : Array.isArray(storedCards)
      ? storedCards
      : [];

  const cardCount = cardsToDisplay.length;

  return (
    <div className="w-full flex flex-col gap-2 lg:gap-4">
      {cardsToDisplay.length > 0 ? (
        <div className="w-full min-w-0">
          {/* Mobile layout */}
          <div className="flex flex-col gap-2 md:hidden max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent w-full">
            {/* Auto banner ABOVE cards when 2+ cards */}
            {isAutoMode && cardCount >= 2 && <AutoModeBanner />}

            {cardsToDisplay.map((card, index) => (
              <div
                key={index}
                className="relative group touch-manipulation shrink-0 w-full min-w-0"
              >
                <div className="bg-bingo-card-alt rounded-lg p-0.5 transition-all duration-200 active:scale-[0.98] w-full min-w-0">
                  <div className="w-full min-w-0">
                    <PlayerCard
                      cardId={card}
                      userId={userId}
                      roomId={roomId}
                      liveResults={liveResults}
                      isManualMode={isManualMode}
                      sharedSelectedNumbers={sharedSelectedNumbers}
                      onToggleNumber={handleToggleNumber}
                      isReadOnly={enforcedReadOnly}
                      isWatcher={enforcedReadOnly}
                      winPattern={winPattern}
                    />
                  </div>
                </div>

                {/* Auto banner BELOW card when only 1 card */}
                {isAutoMode && cardCount === 1 && <AutoModeBanner />}
              </div>
            ))}
          </div>

          {/* Desktop grid layout */}
          <div className="hidden md:grid md:grid-cols-2 gap-3 md:gap-4 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {/* Auto banner spans full width above cards when 2+ */}
            {isAutoMode && cardCount >= 2 && (
              <div className="col-span-2">
                <AutoModeBanner />
              </div>
            )}

            {cardsToDisplay.map((card, index) => (
              <div key={index} className="relative group w-full">
                <div className="bg-bingo-card-alt rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200 hover:shadow-lg w-full">
                  <PlayerCard
                    cardId={card}
                    userId={userId}
                    roomId={roomId}
                    liveResults={liveResults}
                    isManualMode={isManualMode}
                    sharedSelectedNumbers={sharedSelectedNumbers}
                    onToggleNumber={handleToggleNumber}
                    isReadOnly={enforcedReadOnly}
                    isWatcher={enforcedReadOnly}
                  />
                </div>

                {/* Auto banner below card when only 1 card */}
                {isAutoMode && cardCount === 1 && <AutoModeBanner />}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center p-6! my-4! lg:p-8 bg-bingo-card-alt rounded-xl ">
          <div className="flex flex-col items-center gap-3">

            <p className="text-txt-waiting text-sm lg:text-base font-medium">
              {enforcedReadOnly
                ? isDisqualifiedWatcher
                  ? "You're watching this round"
                  : "Wait until this game is finished and you will join the next game."
                : "Waiting for game"}
            </p>

          </div>
        </div>
      )}

    </div>
  );
};

export default PlayerCardsSection;