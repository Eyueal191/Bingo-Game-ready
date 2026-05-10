import React from 'react';
import PlayerCard from "../../../pages/bingo/PlayerCard";

const PlayerCardList = ({
    cards,
    userId,
    roomId,
    liveResults,
    isManualMode,
    sharedSelectedNumbers,
    onToggleNumber,
    enforcedReadOnly,
    onMatchCountChange,
}) => {
    return (
        <div className="w-full min-w-0">
            <div className="flex flex-col gap-2 xl:hidden max-h-112.5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent w-full">
                {cards.map((card) => (
                    <div
                        key={card}
                        className="relative group touch-manipulation shrink-0 w-full min-w-0"
                    >
                        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-1.5 border border-white/10 active:border-white/30 transition-all duration-200 active:scale-[0.98] shadow-lg w-full min-w-0">
                            <div className="w-full min-w-0">
                                <PlayerCard
                                    cardId={card}
                                    userId={userId}
                                    roomId={roomId}
                                    liveResults={liveResults}
                                    isManualMode={isManualMode}
                                    sharedSelectedNumbers={sharedSelectedNumbers}
                                    onToggleNumber={onToggleNumber}
                                    isReadOnly={enforcedReadOnly}
                                    isWatcher={enforcedReadOnly}
                                    onMatchCountChange={onMatchCountChange}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden xl:grid xl:grid-cols-2 gap-3 xl:gap-4">
                {cards.map((card) => (
                    <div key={card} className="relative group w-full">
                        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200 hover:shadow-lg w-full">
                            <PlayerCard
                                cardId={card}
                                userId={userId}
                                roomId={roomId}
                                liveResults={liveResults}
                                isManualMode={isManualMode}
                                sharedSelectedNumbers={sharedSelectedNumbers}
                                onToggleNumber={onToggleNumber}
                                isReadOnly={enforcedReadOnly}
                                isWatcher={enforcedReadOnly}
                                onMatchCountChange={onMatchCountChange}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlayerCardList;
