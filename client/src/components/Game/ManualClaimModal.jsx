import { createPortal } from "react-dom";
import { bingoColumnColors } from "../../constants/bingoColumnColors";

const ManualClaimModal = ({
    show,
    onClose,
    cardId,
    liveResults,
    columns,
}) => {
    if (!show || typeof document === "undefined") return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 bg-black bg-opacity-80 z-1200 backdrop-blur-sm"
                onClick={onClose}
            />

            <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-1201 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            >
                <div className="relative w-full manual-claim-modal animate-pulse-modal">
                    <div className="manual-claim-modal-content text-center w-full">
                        <p className="manual-claim-title text-base sm:text-lg md:text-xl font-semibold">
                            You haven't won yet. Keep playing!
                        </p>
                        <div className="manual-claim-card-wrapper">
                            <div className="bg-[#0f1221] rounded-lg p-2">
                                <p className="text-center text-bingo-yellow font-bold text-sm mb-2">
                                    Card No. {cardId}
                                </p>
                                <div className="flex justify-center gap-0.5">
                                    {Object.entries(columns).map(([letter, numbers]) => (
                                        <div key={letter} className="flex flex-col items-center">
                                            <div
                                                className={`text-center font-bold text-xs w-12 h-12 min-w-7 min-h-7
                                                flex items-center justify-center ${
                                                    letter === "N" ? "rounded-sm" : "rounded-full"
                                                } text-white ${bingoColumnColors[letter]}`}
                                                style={letter === "N" ? { transform: "rotate(25deg)" } : {}}
                                            >
                                                {letter}
                                            </div>
                                            {numbers.map((num, index) => {
                                                const isMarked = num === "F" || liveResults.includes(num);
                                                return (
                                                    <div
                                                        key={`${letter}${index}`}
                                                        className={`text-center font-bold text-xs border
                                                        border-[#0f1221] rounded-sm w-12 h-12 min-w-7 min-h-7 flex items-center
                                                        justify-center ${
                                                            isMarked
                                                                ? "bg-green-600 text-white"
                                                                : "bg-[#D3D3D3] text-black"
                                                        }`}
                                                    >
                                                        {num}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <p className="manual-claim-called">
                            <strong>Called Numbers on Card:</strong> {" "}
                            {liveResults
                                .filter((num) =>
                                    Object.values(columns).flat().includes(num)
                                )
                                .join(", ")}
                        </p>
                        <div className="manual-claim-button-wrapper">
                            <button
                                type="button"
                                className="btn-primary manual-claim-button font-bold"
                                onClick={onClose}
                            >
                                Continue Playing
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </>,
        document.body
    );
};

export default ManualClaimModal;