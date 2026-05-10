import React from 'react';

const PlayerCardsHeader = ({
    isDisqualifiedWatcher,
    hasActiveCards,
    enforcedReadOnly,
    cardsCount,
}) => {
    return (
        <div className="text-center lg:text-left mb-2 lg:mb-3">
            <div className="flex items-center justify-between mb-1 lg:mb-2">
                <h3 className="text-white text-xs lg:text-lg font-bold tracking-wide">
                    {isDisqualifiedWatcher
                        ? hasActiveCards
                            ? "Active Cards"
                            : "Disqualified Cards"
                        : enforcedReadOnly
                            ? "Spectating"
                            : "Your Cards"}
                </h3>
                <div className="p-1 lg:p-2">
                    <div className="flex gap-1 lg:gap-2 items-center text-xs lg:text-sm">
                        <span>
                            {isDisqualifiedWatcher && !hasActiveCards ? "Disqualified" : "Total"}:
                        </span>
                        <span className="font-semibold text-white">{cardsCount}</span>
                    </div>
                </div>
            </div>
            <div className="w-full h-px bg-linear-to-r from-transparent via-white/30 to-transparent"></div>
        </div>
    );
};

export default PlayerCardsHeader;
