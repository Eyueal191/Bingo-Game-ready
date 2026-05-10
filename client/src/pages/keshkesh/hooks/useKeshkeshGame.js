import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const useKeshkeshGame = ({
  gameId,
  socket,
  user,
  triggerShake,
  stopShake,
  playWinnerSound,
  onNavigateHome,
}) => {
  const [currentGame, setCurrentGame] = useState(null);
  const [winners, setWinners] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isGameCompleted, setIsGameCompleted] = useState(false);
  const gameCompleteTimeoutRef = useRef(null);
  const isGameCompletedRef = useRef(false);

  useEffect(() => {
    isGameCompletedRef.current = isGameCompleted;
  }, [isGameCompleted]);

  useEffect(() => {
    if (!gameId || !socket || !user) return undefined;

    const maxRetries = 3;
    let retryCount = 0;

    const connectSocket = () => {
      if (!socket.connected && retryCount < maxRetries) {
        socket.connect();
      }
    };

    const handleConnect = () => {
      socket.emit("join_keshkesh", gameId);
      retryCount = 0;
      if (!isGameCompletedRef.current) {
        triggerShake();
      }
    };

    const handleRoomData = (data) => {
      if (data.roomId === gameId) {
        setCurrentGame(data);
        setLoading(false);
      } else if (data.gameType === "keshkesh" && isGameCompletedRef.current) {
        console.log("[GamePlay] Ignoring new game data for room:", data.roomId);
      }
    };

    const handleGameUpdate = (data) => {
      if (data.gameType !== "keshkesh" || data.roomId !== gameId) return;
      console.log("[GamePlay] gameUpdate received:", data);

      if (data.type === "update") {
        setCurrentGame((prev) => ({ ...prev, ...data.game }));
        setLoading(false);
        return;
      }

      if (data.type === "winner") {
        let shouldPlayWinnerSound = false;
        setWinners((prev) => {
          const exists = prev.some(
            (winner) => winner.rank === data.rank && winner.number === data.number
          );
          if (exists) {
            return prev;
          }
          shouldPlayWinnerSound = true;
          return [...prev, data];
        });
        setLoading(false);
        if (shouldPlayWinnerSound) {
          playWinnerSound();
        }
        return;
      }

      if (data.type === "status" && data.status === "completed") {
        stopShake();
        isGameCompletedRef.current = true;
        setIsGameCompleted(true);
        setLoading(false);

        if (gameCompleteTimeoutRef.current) {
          clearTimeout(gameCompleteTimeoutRef.current);
        }

        gameCompleteTimeoutRef.current = setTimeout(() => {
          console.log("[GamePlay] Auto navigating back to /keshkesh-rooms");
          onNavigateHome?.();
          setCurrentGame(null);
          setWinners([]);
          isGameCompletedRef.current = false;
          setIsGameCompleted(false);
        }, 5000);
      }
    };



    const handleError = ({ message, gameId: payloadGameId }) => {
      if (!payloadGameId || payloadGameId === gameId) {
        setError(message);
        toast.error(message);
        setLoading(false);
      }
    };

    const handleConnectError = () => {
      retryCount += 1;
      if (retryCount < maxRetries) {
        setTimeout(() => socket.connect(), 1000 * retryCount);
      } else {
        const failureMessage = "Failed to connect to game server after retries";
        setError(failureMessage);
        toast.error(failureMessage);
        setLoading(false);
      }
    };

    const handleReshake = (data) => {
      if (data.roomId === gameId && data.shake && !isGameCompletedRef.current) {
        console.log("[GamePlay] Received keshkesh_reshake event");
        triggerShake();
      }
    };

    connectSocket();

    socket.on("connect", handleConnect);
    socket.on("keshkesh_room_data", handleRoomData);
    socket.on("gameUpdate", handleGameUpdate);
    socket.on("error", handleError);
    socket.on("connect_error", handleConnectError);
    socket.on("keshkesh_reshake", handleReshake);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("keshkesh_room_data", handleRoomData);
      socket.off("gameUpdate", handleGameUpdate);
      socket.off("error", handleError);
      socket.off("connect_error", handleConnectError);
      socket.off("keshkesh_reshake", handleReshake);
      stopShake();
      if (gameCompleteTimeoutRef.current) {
        clearTimeout(gameCompleteTimeoutRef.current);
      }
      isGameCompletedRef.current = false;
    };
  }, [
    gameId,
    socket,
    user,
    triggerShake,
    stopShake,
    playWinnerSound,
    onNavigateHome,
  ]);

  return {
    currentGame,
    setCurrentGame,
    winners,
    setWinners,
    error,
    setError,
    loading,
    setLoading,
    isGameCompleted,
    setIsGameCompleted,
  };
};
