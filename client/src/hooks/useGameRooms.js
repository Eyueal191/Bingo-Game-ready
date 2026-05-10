import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../contexts/socketContext";

/**
 * Custom hook for GameRooms page logic.
 */
export function useGameRooms() {
  const socket = useSocket();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [counters, setCounters] = useState({});
  const [fakeCounters, setFakeCounters] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [countdownDuration, setCountdownDuration] = useState(30); // Default 30, updated from server
  const [platformStats, setPlatformStats] = useState({ activePlayers: 0, gamesPlayed: 0 });

  // Subscribe to socket events for rooms, counters, and settings
  useEffect(() => {
    if (!socket) return;
    // Request initial data
    setIsLoading(true);
    socket.emit("requestInitialData");
    socket.emit("get_platform_stats");

    const handleRooms = (newRooms) => {
      const sortedRooms = [...(Array.isArray(newRooms) ? newRooms : [])].sort(
        (a, b) => a.stakeAmount - b.stakeAmount
      );
      setRooms(sortedRooms || []);
      setIsLoading(false);
    };
    const handleCounters = (updatedCounters) => {
      setCounters((prev) => ({ ...prev, ...updatedCounters }));
    };
    const handleCounterUpdate = ({ counterId, count }) => {
      setCounters((prev) => ({ ...prev, [counterId]: count }));
    };
    const handleSettings = (settings) => {
      if (settings?.countdownDuration) {
        setCountdownDuration(settings.countdownDuration);
      }
    };
    const handlePlatformStats = (stats) => {
      setPlatformStats(stats);
    };

    socket.on("rooms", handleRooms);
    socket.on("counters", handleCounters);
    socket.on("counter", handleCounterUpdate);
    socket.on("settings", handleSettings);
    socket.on("platformStats", handlePlatformStats);

    return () => {
      socket.off("rooms", handleRooms);
      socket.off("counters", handleCounters);
      socket.off("counter", handleCounterUpdate);
      socket.off("settings", handleSettings);
      socket.off("platformStats", handlePlatformStats);
    };
  }, [socket]);

  // Fake counters logic for waiting rooms - uses dynamic countdownDuration
  useEffect(() => {
    const interval = setInterval(() => {
      setFakeCounters((prev) => {
        const updated = { ...prev };
        rooms.forEach((room) => {
          if (
            (room.stakeAmount === 10 || room.stakeAmount === 50) &&
            room.status === "waiting"
          ) {
            const key = `fakeCounter${room._id}`;
            const count = prev[key] !== undefined ? prev[key] : countdownDuration;
            updated[key] = count > 0 ? count - 1 : countdownDuration;
          }
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rooms, countdownDuration]);

  const handleJoinGame = (roomId, stakeAmount) => {
    navigate(`/cards-list/${stakeAmount}`);
  };

  return { rooms, counters, fakeCounters, isLoading, handleJoinGame, countdownDuration, platformStats };
}
