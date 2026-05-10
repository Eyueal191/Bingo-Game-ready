import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import BingoLoading from "../components/common/BingoLoading";
import { useAppStore } from "../store";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { userId, isAuthLoading } = useAuth();
  const setSocketStatus = useAppStore((state) => state.setSocketStatus);
  const setWallet = useAppStore((state) => state.setWallet);
  const setBonus = useAppStore((state) => state.setBonus);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_APP_API_URL;
    setSocketStatus("connecting");
    const socketInstance = io(apiUrl, {
      withCredentials: true,
      auth: { userId: userId || "pending" },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => setSocketStatus("connected"));
    socketInstance.on("disconnect", () => setSocketStatus("disconnected"));
    socketInstance.on("reconnect_attempt", () => setSocketStatus("reconnecting"));
    socketInstance.on("reconnect", () => setSocketStatus("connected"));
    socketInstance.on("connecting", () => setSocketStatus("connecting"));

    const handleWalletUpdate = (data) => {
      if (typeof data.wallet !== "undefined") setWallet(data.wallet);
      if (typeof data.bonus !== "undefined") setBonus(data.bonus);
    };
    socketInstance.on("walletUpdate", handleWalletUpdate);

    return () => {
      socketInstance.off("walletUpdate", handleWalletUpdate);
      socketInstance.disconnect();
      socketInstance.off("connect");
      socketInstance.off("disconnect");
      socketInstance.off("reconnect_attempt");
      socketInstance.off("reconnect");
      socketInstance.off("connecting");
    };
  }, [userId, setSocketStatus, setWallet, setBonus]);

  if (isAuthLoading) {
    return <BingoLoading message="Loading..." size="large" />;
  }

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
