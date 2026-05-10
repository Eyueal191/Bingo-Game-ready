import { createPortal } from "react-dom";
import "../../styles/ManualClaimModal.css";
import BingoColumn from "./BingoColumn";

const InvalidClaimModal = ({ isOpen, onClose, cardId, cardGrid, liveResults, columns }) => {
  if (!isOpen || typeof document === "undefined") return null;

  const allNumbers = Object.values(columns).flat();
  const calledNumbersOnCard = liveResults.filter((num) => allNumbers.includes(num));

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-80 z-1200 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-1201 flex items-start justify-center pt-[128px] p-4 overflow-y-auto"
      >
        <div className="relative w-full manual-claim-modal animate-pulse-modal max-w-sm">
          <div className="manual-claim-modal-content text-center w-full">
            <p className="manual-claim-title text-base sm:text-lg md:text-xl font-semibold mb-4">
              You haven't won yet. Keep playing!
            </p>
            
            <div className="bg-bingo-surface rounded-2xl overflow-hidden shadow-2xl w-full border border-bingo-border p-3 mb-4">
               <div className="card-header-number pb-2 fw-bolder border-0 text-center manual-claim-card-title text-txt-muted text-xs uppercase tracking-widest">
                  Card No. {cardId}
                </div>
              <div className="flex justify-center gap-1">
                {["B", "I", "N", "G", "O"].map((letter) => (
                  <BingoColumn
                    key={letter}
                    letter={letter}
                    numbers={columns[letter]}
                    isClickable={false}
                    getIsNormallyCalled={(num) => liveResults.includes(num) || num === "F" || num === "0"}
                  />
                ))}
              </div>
            </div>

            <p className="manual-claim-called text-txt-dim text-sm mb-4">
              <strong>Called Numbers on Card:</strong> {calledNumbersOnCard.join(", ")}
            </p>
            <div className="manual-claim-button-wrapper">
              <button
                type="button"
                className="w-full mt-2 bg-bingo-secondary hover:bg-[#e67e22] text-white text-lg font-black py-2 rounded-lg shadow-[0_4px_0_#d35400] active:shadow-none active:translate-y-1 transition-all duration-100 uppercase tracking-widest"
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

export default InvalidClaimModal;