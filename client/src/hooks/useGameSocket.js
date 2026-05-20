import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../contexts/socketContext";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import { useAppStore } from "../store";

/**
 * Custom hook to manage Bingo game socket interactions.
 * Sets up event listeners and updates Zustand store.
 */
export function useGameSocket() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { userId, isAuthLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Zustand actions
  const setCards = useAppStore((state) => state.setCards);
  const updateCard = useAppStore((state) => state.updateCard);
  const setLiveResults = useAppStore((state) => state.setLiveResults);
  const setCurrentNumber = useAppStore((state) => state.setCurrentNumber);
  const setDrawnNumbers = useAppStore((state) => state.setDrawnNumbers);
  const setGameStarted = useAppStore((state) => state.setGameStarted);
  const setWaitingForCounter = useAppStore(
    (state) => state.setWaitingForCounter
  );
  const setResult = useAppStore((state) => state.setResult);
  const setWinners = useAppStore((state) => state.setWinners);
  const setWinningCards = useAppStore((state) => state.setWinningCards);
  const setPrizes = useAppStore((state) => state.setPrizes);
  const setWinningCombos = useAppStore((state) => state.setWinningCombos);
  const setWinningCardGrids = useAppStore((state) => state.setWinningCardGrids);
  const setUserPrize = useAppStore((state) => state.setUserPrize);
  const setUserLoss = useAppStore((state) => state.setUserLoss);

  useEffect(() => {
    if (isAuthLoading || !userId || !roomId) {
      setLoading(false);
      if (!userId) navigate("/login");
      return;
    }
    if (!socket) {
      setError("Connecting to server...");
      setLoading(true);
      return;
    }

    socket.emit("get_cards", roomId);

    // Card events
    const handleCards = ({ cardsWithStatus }) => {
      setCards(cardsWithStatus);
      setLoading(false);
    };
    const handleCardUpdate = (updatedCard) =>
      updateCard(updatedCard.cardId, updatedCard);

    socket.on("cards", handleCards);
    socket.on("cardStatusUpdated", handleCardUpdate);

    // Connection events
    const onConnect = () => {
      setError(null);
      setLoading(false);
      socket.emit("join_room", { roomId, userId });
    };
    const onDisconnect = () => {
      setError("Lost connection...");
      setLoading(true);
    };
    const onError = (err) => {
      setError(`Server error: ${err.message}`);
      setLoading(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("error", onError);

    // Game events
    socket.on("start_game", ({ drawnNumbers, userCards }) => {
      setGameStarted(true);
      setWaitingForCounter(false);
      setDrawnNumbers(drawnNumbers);
      if (userCards && userCards[userId]) setCards(userCards[userId]);
    });

    socket.on("number_called", ({ number, drawnNumbers }) => {
      if (number) {
        setCurrentNumber(number);
        setLiveResults(drawnNumbers);
        setDrawnNumbers(drawnNumbers);
      }
    });

    socket.on(
      `game_over_${userId}`,
      ({
        result,
        winners = [],
        winningCards = [],
        prizes = [],
        drawnNumbers = [],
        winningCombos = [],
        winningCardGrids = [],
        userPrize = 0,
        userLoss = 0,
      }) => {
        setResult(result);
        setWinners(winners);
        setWinningCards(winningCards);
        setPrizes(prizes);
        setDrawnNumbers(drawnNumbers);
        setWinningCombos(winningCombos);
        setWinningCardGrids(winningCardGrids);
        setUserPrize(userPrize);
        setUserLoss(userLoss);
        toast.success(
          `Game Over! Result: ${result}. Winners: ${winners.join(", ")}`
        );
        setLoading(false);
      }
    );

    // Cleanup
    return () => {
      socket.off("cards", handleCards);
      socket.off("cardStatusUpdated", handleCardUpdate);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("error", onError);
      socket.off("start_game");
      socket.off("number_called");
      socket.off(`game_over_${userId}`);
    };
  }, [
    socket,
    userId,
    roomId,
    isAuthLoading,
    navigate,
    updateCard,
    setCards,
    setLiveResults,
    setCurrentNumber,
    setDrawnNumbers,
    setGameStarted,
    setWaitingForCounter,
    setResult,
    setWinners,
    setWinningCards,
    setPrizes,
    setWinningCombos,
    setWinningCardGrids,
    setUserPrize,
    setUserLoss,
  ]);

  return { loading, error };
}
