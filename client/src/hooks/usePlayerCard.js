import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSocket } from "../contexts/socketContext";
import { checkWin } from "../utils/checkWin";

export const usePlayerCard = ({
  cardId,
  liveResults,
  isManualMode,
  roomId,
  userId,
  sharedSelectedNumbers,
  onToggleNumber,
  isReadOnly,
  isWatcher,
  winPattern,
}) => {
  const [card, setCard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    if (cardId && socket) {
      socket.emit("get_player_card", { cardId }, (response) => {
        if (response?.card) setCard(response.card);
        else toast.error(response?.error || "Failed to load card");
      });
    }
  }, [cardId, socket]);

  const handleNumberClick = (number) => {
    if (isReadOnly || isWatcher) {
      toast.info("Watching mode is read-only this round.");
      return;
    }
    if (!isManualMode) return;
    onToggleNumber && onToggleNumber(number);
  };

  const handleBingoClick = () => {
    if (isReadOnly || isWatcher) {
      toast.info("You're watching this round only.");
      return;
    }
    socket.emit("manual_bingo_claim", {
        userId,
        cardId: card.cardId,
        roomId,
        cardGrid: [
          [card.b1, card.i1, card.n1, card.g1, card.o1],
          [card.b2, card.i2, card.n2, card.g2, card.o2],
          [card.b3, card.i3, "F", card.g3, card.o3],
          [card.b4, card.i4, card.n4, card.g4, card.o4],
          [card.b5, card.i5, card.n5, card.g5, card.o5],
        ],
      });
  };

  const handleModalClose = () => setShowModal(false);

  if (!card) return { card: null, isLoading: true };

  const columns = {
    B: [card.b1, card.b2, card.b3, card.b4, card.b5],
    I: [card.i1, card.i2, card.i3, card.i4, card.i5],
    N: [card.n1, card.n2, "F", card.n4, card.n5],
    G: [card.g1, card.g2, card.g3, card.g4, card.g5],
    O: [card.o1, card.o2, card.o3, card.o4, card.o5],
  };

  const cardGrid = [
    [card.b1, card.i1, card.n1, card.g1, card.o1],
    [card.b2, card.i2, card.n2, card.g2, card.o2],
    [card.b3, card.i3, "F", card.g3, card.o3],
    [card.b4, card.i4, card.n4, card.g4, card.o4],
    [card.b5, card.i5, card.n5, card.g5, card.o5],
  ];

  const getIsMarked = (number) => {
    if (number === "F") return true;
    const isAutoMarked = !isManualMode && !isWatcher && liveResults.includes(number);
    const isSharedMarked = sharedSelectedNumbers.has(number);
    return isAutoMarked || (isWatcher ? false : isSharedMarked);
  };

  const isClickable = !isReadOnly && !isWatcher && isManualMode;
  const canClaimBingo = !isWatcher && !isReadOnly && isManualMode;
  const showWatcherOverlay = isReadOnly || isWatcher;

  return {
    card,
    columns,
    cardGrid,
    getIsMarked,
    isClickable,
    canClaimBingo,
    showWatcherOverlay,
    showModal,
    handleNumberClick,
    handleBingoClick,
    handleModalClose,
    isLoading: false,
  };
};