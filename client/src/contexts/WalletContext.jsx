// [2024-06-09] Migrated to Zustand: wallet state and actions now use Zustand store.
import { createContext, useContext } from "react";
import { useAppStore } from "../store";

const WalletContext = createContext();

export function WalletProvider({ children }) {
  // Use Zustand for wallet and bonus state
  const wallet = useAppStore((state) => state.wallet);
  const setWallet = useAppStore((state) => state.setWallet);
  const bonus = useAppStore((state) => state.bonus);
  const setBonus = useAppStore((state) => state.setBonus);

  return (
    <WalletContext.Provider value={{ wallet, setWallet, bonus, setBonus }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
