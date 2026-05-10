import { toast } from "sonner";
import { checkWin, checkCrossWinPattern} from "../utils/checkWin";

export const usePlayerCardActions = ({
  card,
  socket,
  userId,
  roomId,
  sharedSelectedNumbers,
  isManualMode,
  isReadOnly,
  isWatcher,
  onToggleNumber,
  setShowModal,
}) => {

  const handleNumberClick = (number) => {
    if (isReadOnly || isWatcher) {
      toast.info("Watching mode is read-only this round.");
      return;
    }

    if (!isManualMode) return;

    onToggleNumber?.(number);
  };

  const handleBingoClick = () => {
    if (isReadOnly || isWatcher) {
      toast.info("You're watching this round only.");
      return;
    };
    const isWin = checkWin(card, sharedSelectedNumbers);
    const isCrossWin = checkCrossWinPattern(card, sharedSelectedNumbers);
const cardGrid = [
        [card.b1, card.i1, card.n1, card.g1, card.o1],
        [card.b2, card.i2, card.n2, card.g2, card.o2],
        [card.b3, card.i3, "F", card.g3, card.o3],
        [card.b4, card.i4, card.n4, card.g4, card.o4],
        [card.b5, card.i5, card.n5, card.g5, card.o5],
      ];
    if (isWin) {
      
      socket.emit("manual_bingo_claim", {
        userId,
        cardId: card.cardId,
        roomId,
        cardGrid,
        isCrossWin,
      });
    } else {
      // socket.emit("manual_bingo_claim", {
      //   userId,
      //   cardId: card.cardId,
      //   roomId,
      //   cardGrid,
      // });
      setShowModal(true);
      toast.error("Not a valid Bingo yet.");
    }
  };

  const canClaimBingo = !isWatcher && !isReadOnly && isManualMode;

  return {
    handleNumberClick,
    handleBingoClick,
    canClaimBingo,
  };
};