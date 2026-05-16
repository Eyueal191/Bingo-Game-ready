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

    if (!liveResults.includes(number)) return;

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
    <div className="w-full h-full min-h-0 flex flex-col">

      {cardsToDisplay.length > 0 ? (
        <div className="w-full h-full min-h-0">

          {/* SCROLL CONTAINER (ONLY ONE) */}
          <div className="h-full min-h-0 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent flex flex-col gap-2 md:gap-4">

            {/* MOBILE VIEW */}
            <div className="flex flex-col gap-2 md:hidden">

              {isAutoMode && cardCount >= 2 && <AutoModeBanner />}

              {cardsToDisplay.map((card, index) => (
                <div
                  key={index}
                  className="relative group shrink-0 w-full"
                >
                  <div className="bg-bingo-card-alt rounded-lg p-0.5 w-full">
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

                  {isAutoMode && cardCount === 1 && <AutoModeBanner />}
                </div>
              ))}
            </div>

            {/* DESKTOP GRID */}
            <div className="hidden md:grid md:grid-cols-2 gap-3 md:gap-4">

              {isAutoMode && cardCount >= 2 && (
                <div className="col-span-2">
                  <AutoModeBanner />
                </div>
              )}

              {cardsToDisplay.map((card, index) => (
                <div key={index} className="relative group w-full">
                  <div className="bg-bingo-card-alt rounded-xl border border-white/10 w-full">
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

                  {isAutoMode && cardCount === 1 && <AutoModeBanner />}
                </div>
              ))}
            </div>

          </div>
        </div>
      ) : (
        <div className="text-center p-6 my-4 lg:p-8 bg-bingo-card-alt rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <p className="text-txt-waiting text-sm lg:text-base font-medium text-yellow-500">
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