import React from "react";
import { Wallet, Gift } from "lucide-react";

const WalletSummaryCard = ({ wallet = 0, bonus = 0 }) => {
  return (
    <div
      className="bg-transparent 
      backdrop-blur-2xl p-4 sm:p-5
      border border-white/10 shadow-lg rounded-sm"
    >
      <div className="flex items-center justify-center gap-2 sm:gap-6">
        {/* WALLET */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-xl bg-[#55ff77]/10 text-[#55ff77] border border-[#55ff77]/20">
            <Wallet size={window.innerWidth < 400 ? 14 : 18} />
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[11px] uppercase text-white/40 font-bold tracking-wide">
              Wallet
            </span>

            <span className="text-base sm:text-xl font-black text-white leading-none">
              {wallet.toLocaleString()}
            </span>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="w-px h-8 sm:h-10 bg-white/10 mx-1 sm:mx-2"></div>

        {/* BONUS */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-xl bg-[#f8d517]/10 text-[#f8d517] border border-[#f8d517]/20">
            <Gift size={window.innerWidth < 400 ? 14 : 18} />
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[11px] uppercase text-white/40 font-bold tracking-wide">
              Bonus
            </span>

            <span className="text-base sm:text-xl font-black text-white leading-none flex items-center gap-1">
              {bonus.toLocaleString()}
              <span className="text-xs text-[#f8d517]">🔒</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletSummaryCard;