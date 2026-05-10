import React from 'react';

const EmptyCardsState = ({
    enforcedReadOnly,
    isDisqualifiedWatcher,
    disqualificationMessage,
    spectatorMessage,
}) => {
    return (
        <div className="text-center p-6! my-4! lg:p-8 bg-black/20 rounded-xl border border-white/10">
            <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <svg
                        className="w-6 h-6 lg:w-8 lg:h-8 text-white/60"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                    </svg>
                </div>
                <p className="text-white text-sm lg:text-base font-medium">
                    {enforcedReadOnly
                        ? isDisqualifiedWatcher
                            ? "You're watching this round"
                            : "Please wait for this game to be completed"
                        : "Waiting for game"}
                </p>
                <p className="text-white/60 text-xs lg:text-sm">
                    {enforcedReadOnly
                        ? isDisqualifiedWatcher
                            ? disqualificationMessage ||
                            "You can follow the calls, but your card is out for this game."
                            : spectatorMessage
                        : "Cards will appear here once the game starts"}
                </p>
            </div>
        </div>
    );
};

export default EmptyCardsState;
