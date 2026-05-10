// [2024-06-09] Migrated to Zustand: reservation state and actions now use Zustand store.
import React, { createContext, useContext } from "react";
import { useAppStore } from '../store';

const ReservationContext = createContext();

export const ReservationProvider = ({ children }) => {
  // Use Zustand for reservation state
  const reservedRoomId = useAppStore((state) => state.reservedRoomId);
  const reservedCardIds = useAppStore((state) => state.reservedCardIds);
  const reserveCards = useAppStore((state) => state.reserveCards);
  const clearReservation = useAppStore((state) => state.clearReservation);

  return (
    <ReservationContext.Provider value={{ reservedRoomId, reservedCardIds, reserveCards, clearReservation }}>
      {children}
    </ReservationContext.Provider>
  );
};

export const useReservation = () => useContext(ReservationContext);