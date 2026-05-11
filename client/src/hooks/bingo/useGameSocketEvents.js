import { useEffect } from "react";
import { toast } from "sonner";
import { useAppStore } from "../../store";
import {
  getPrefixedBingoValue,
  DEFAULT_DISQUALIFICATION_MESSAGE,
} from "../../utils/bingoUtils";
import { voiceOptions } from "../../utils/voiceOptions";


export const useGameSocketEvents = (socket, roomId, userId, disqualificationStorageKey, watcherStorageKey) => {
  useEffect(() => {
    if (!socket || !roomId || !userId) return;

    // Use getState to avoid re-rendering the hook on every store update
    const getStore = () => useAppStore.getState();

    const playAudio = (speakNumber) => {
      if (!speakNumber) return;
      const store = getStore();
      const prefixedNum = getPrefixedBingoValue(speakNumber);
      if (!prefixedNum) return;

      if (store.isMuted) return;

      const selectedVoice = voiceOptions.find(
        (option) => option.value === store.voiceOption
      );
      const folder = selectedVoice ? selectedVoice.folder : "meron";
      const audioPath = `/assets/${folder}/${store.voiceOption}${prefixedNum}.mp3`;

      const audio = new Audio(audioPath);
      audio
        .play()
        .catch((err) => console.error(`Error playing ${audioPath}:`, err));
    };

    const handleConnect = () => {
      const store = getStore();
      store.setError(null);
      store.setLoading(false);
      socket.emit("join_room", { roomId, userId });
    };

    const handleDisconnect = () => {
      const store = getStore();
      store.setError("Lost connection to server. Retrying...");
      store.setLoading(true);
    };

    const handleSocketError = (err) => {
      const store = getStore();
      console.error("Socket error:", err.message);
      store.setError(`Server error: ${err.message}. Please try again.`);
      store.setLoading(false);
    };

    const handleRoomData = ({ roomId: payloadRoomId, stakeAmount: payloadStake, bonusEnabled, bonusAmount, bonusDescription }) => {
      getStore().setRoomData({
        roomId: payloadRoomId,
        stakeAmount: payloadStake,
        bonusEnabled,
        bonusAmount,
        bonusDescription,
      });
    };

    const handleSettings = (data) => {
      if (data?.winPattern) {
        getStore().setWinPattern(data.winPattern);
      }
    };

    const handleStartGame = ({
      roomId: startedRoomId,
      drawnNumbers,
      userCards,
      numberOfPlayers: newPlayers,
      winAmount: newWinAmount,
      stakeAmount: gameStakeAmount,
      bonusEnabled,
      bonusAmount,
      bonusDescription,
    }) => {
      if (startedRoomId !== roomId) return;
      const store = getStore();

      // Clear Disqualification State safely
      if (disqualificationStorageKey) {
        localStorage.removeItem(disqualificationStorageKey);
      }
      store.setIsDisqualified(false);
      store.setDisqualificationMessage("");
      store.setDisqualifiedCards([]);

      store.setGameStarted(true);
      store.setWaitingForCounter(false);

      const currentStake = store.roomData.stakeAmount;
      store.setUpdatedStakeAmount(gameStakeAmount || currentStake);
      store.setNumberOfPlayers(newPlayers || 0);
      store.setWinAmount(newWinAmount || 0);

      const normalizedDrawnNumbers = Array.isArray(drawnNumbers) ? drawnNumbers : [];
      store.setLiveResults(normalizedDrawnNumbers);
      store.setDrawnNumbers(normalizedDrawnNumbers);

      if (normalizedDrawnNumbers.length > 0) {
        const lastCalled = normalizedDrawnNumbers[normalizedDrawnNumbers.length - 1];
        store.setCurrentNumber(lastCalled);
        const prefixed = getPrefixedBingoValue(lastCalled);
        if (prefixed) store.setPrefixedNumber(prefixed);
      } else {
        store.setCurrentNumber(null);
        store.setPrefixedNumber(null);
      }

      if (typeof bonusEnabled !== "undefined" || typeof bonusAmount !== "undefined" || typeof bonusDescription !== "undefined") {
        store.setRoomData({
          ...store.roomData,
          stakeAmount: gameStakeAmount || store.roomData.stakeAmount,
          bonusEnabled: !!bonusEnabled,
          bonusAmount: Number(bonusAmount) || 0,
          bonusDescription: bonusDescription || "",
        });
      }

      if (userCards && userCards[userId] && userCards[userId].length > 0) {
        // Safe arraysEqual logic
        const nextCards = Array.isArray(userCards[userId]) ? userCards[userId] : [];
        if (JSON.stringify(store.storedCards) !== JSON.stringify(nextCards)) {
          store.setStoredCards(nextCards);
        }
      } else {
        // Need to fetch cards again if none provided. 
        // We handle this via a small emit here to keep it decoupled.
        socket.emit("get_reserved_cards", { userId, roomId }, (response) => {
          if (Array.isArray(response?.cardIds) && JSON.stringify(store.storedCards) !== JSON.stringify(response.cardIds)) {
            store.setStoredCards(response.cardIds);
          }
        });
      }

      store.setError(null);
      store.setLoading(false);
      store.setShuffling(true);
    };

    const handleNumberCalled = ({ number, drawnNumbers: updatedDraws }) => {
      if (!number) return;
      const store = getStore();
      store.setGameStarted(true);
      store.setWaitingForCounter(false);
      store.setCurrentNumber(number);
      const prefixed = getPrefixedBingoValue(number);
      if (prefixed) store.setPrefixedNumber(prefixed);
      store.setLiveResults(updatedDraws);
      store.setDrawnNumbers(updatedDraws);
      store.setAnimationTrigger(true);
      playAudio(number);
      store.setError(null);
      store.setLoading(false);
      store.setShuffling(false);
    };

    const handleGameOver = ({
      result: gameResult,
      winners: winnerList,
      winningCards: winningCardList,
      prizes: prizeList,
      drawnNumbers: finalDraws,
      winningCombos: finalCombos,
      winningCardGrids: finalGrids,
      userPrize,
      userLoss,
      disqualified,
      disqualificationReason,
      disqualifiedCards: finalDisqualifiedCards = [],
      firstNames: winnerNames,
    }) => {
      const store = getStore();
      const wasDisqualified = Boolean(disqualified) || store.isDisqualified;
      const disqualifiedCardIds = Array.isArray(finalDisqualifiedCards) ? finalDisqualifiedCards : [];

      if (wasDisqualified) {
        const messageForUser = disqualificationReason || DEFAULT_DISQUALIFICATION_MESSAGE;
        store.setIsDisqualified(true);
        store.setDisqualificationMessage(messageForUser);
        store.setDisqualifiedCards(disqualifiedCardIds);
        store.setStoredCards([]);
        store.setIsManualMode(false);
        store.setSharedSelectedNumbers(new Set(["F"]));

        if (disqualificationStorageKey) {
          localStorage.setItem(
            disqualificationStorageKey,
            JSON.stringify({ message: messageForUser, cards: disqualifiedCardIds })
          );
        }
      }

      // Use global winner data directly for transparency across all roles (winner/loser/watcher)
      console.log("handleGameOver payload:", { gameResult, winnerList, winningCardList, finalGrids });
      store.setFinishedGame(true);
      store.setResult(wasDisqualified && gameResult !== "Disqualified" ? "Disqualified" : gameResult);
      store.setWinners(winnerList || []);
      store.setWinningCards(winningCardList || []);
      store.setPrizes(prizeList || []);
      store.setDrawnNumbers(finalDraws || []);
      store.setWinningCombos(finalCombos || []);
      store.setWinningCardGrids(finalGrids || []);
      store.setFirstNames(winnerNames || []);

      store.setUserPrize(wasDisqualified ? 0 : userPrize || 0);
      store.setUserLoss(userLoss || 0);

      store.setLoading(false);
    };

    const handleNewRoomCreated = ({ stakeAmount: nextStake } = {}) => {
      const store = getStore();
      if (!store.isTemporaryWatcher && !store.isDisqualified) return;

      store.setFinishedGame(true);
      store.setResult("Watching");
      store.setWinners([]);
      store.setWinningCards([]);
      store.setPrizes([]);
      store.setDrawnNumbers([]);
      store.setWinningCombos([]);
      store.setWinningCardGrids([]);
      store.setFirstNames([]);
      store.setGameStarted(false);
      store.setWaitingForCounter(true);
      store.setCountdown(null);
      store.setCurrentNumber(null);
      store.setPrefixedNumber(null);
      store.setAnimationTrigger(false);

      if (typeof nextStake === "number" && nextStake > 0) {
        store.setUpdatedStakeAmount(nextStake);
      }
      store.setLoading(false);
    };

    const handleCounter = ({ counterId, count }) => {
      if (counterId !== `counter${roomId}`) return;
      const store = getStore();

      if (typeof count === "number" && count >= 0) {
        store.setCountdown(count);
        store.setWaitingForCounter(false);
      } else {
        store.setCountdown(null);
        store.setWaitingForCounter(true);
      }
      store.setError(null);
      store.setLoading(false);
    };

    const handleBingoInvalid = ({ message, cards, disqualified: disqualifiedFlag, watcherOnly }) => {
      const store = getStore();
      try {
        const fallbackCards = Array.isArray(cards)
          ? cards
          : store.disqualifiedCards.length > 0
            ? store.disqualifiedCards
            : store.storedCards;
        const finalMessage = message || DEFAULT_DISQUALIFICATION_MESSAGE;
        const shouldWatchOnly = Boolean(disqualifiedFlag || watcherOnly);

        if (shouldWatchOnly) {
          const cardsToPersist = Array.isArray(fallbackCards) ? fallbackCards : [];
          store.setIsDisqualified(true);
          store.setDisqualificationMessage(finalMessage);
          store.setDisqualifiedCards(cardsToPersist);
          store.setStoredCards([]);
          store.setIsManualMode(false);
          store.setSharedSelectedNumbers(new Set(["F"]));

          if (disqualificationStorageKey) {
            localStorage.setItem(
              disqualificationStorageKey,
              JSON.stringify({ message: finalMessage, cards: cardsToPersist })
            );
          }
          toast.error(finalMessage);
        } else {
          toast.info(finalMessage);
        }
      } catch (e) {
        console.error("Failed handling bingo_invalid:", e);
      }
    };

    const handleGameFinished = (payload) => {
      console.log("handleGameFinished payload:", payload);
      const {
        winners: winnerList,
        winningCards: winningCardList,
        prizes: prizeList,
        drawnNumbers: finalDraws,
        winningCombos: finalCombos,
        winningCardGrids: finalGrids,
        firstNames: winnerNames,
        numberOfPlayers: totalCards,
        winAmount,
      } = payload;
      const store = getStore();

      // Update global game data for everyone (including watchers)
      if (winnerList && winnerList.length > 0) store.setWinners(winnerList);
      if (winningCardList && winningCardList.length > 0) store.setWinningCards(winningCardList);
      if (prizeList && prizeList.length > 0) store.setPrizes(prizeList);
      if (finalDraws && finalDraws.length > 0) store.setDrawnNumbers(finalDraws);
      if (finalCombos && finalCombos.length > 0) store.setWinningCombos(finalCombos);
      if (finalGrids && finalGrids.length > 0) store.setWinningCardGrids(finalGrids);
      if (winnerNames && winnerNames.length > 0) store.setFirstNames(winnerNames);

      if (winAmount !== undefined) store.setWinAmount(winAmount || 0);
      if (totalCards !== undefined) store.setNumberOfPlayers(totalCards || 0);

      // Only set finishedGame to true if not already handled by game_over event
      if (!store.finishedGame) {
        store.setFinishedGame(true);
        store.setResult("Watching"); // Default result for spectators
      }
    };

    const handleGameDetails = (data) => {
      const store = getStore();
      if (typeof data.numberOfPlayers === "number") store.setNumberOfPlayers(data.numberOfPlayers);
      if (typeof data.winAmount === "number") store.setWinAmount(data.winAmount);
      if (typeof data.stakeAmount === "number") store.setUpdatedStakeAmount(data.stakeAmount);
    };

    // Attach listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("error", handleSocketError);
    socket.on("room_data", handleRoomData);
    socket.on("settings", handleSettings);
    socket.on("start_game", handleStartGame);
    socket.on("number_called", handleNumberCalled);
    socket.on(`game_over_${userId}`, handleGameOver);
    socket.on("game_finished", handleGameFinished);
    socket.on("new_room_created", handleNewRoomCreated);
    socket.on("counter", handleCounter);
    socket.on("bingo_invalid", handleBingoInvalid);
    socket.on("Game-details", handleGameDetails);

    // Initial connection logic
    if (socket.connected) {
      handleConnect();
    } else {
      getStore().setError("Connecting to server... Please wait.");
      getStore().setLoading(true);
    }

    // Emit initial room stake fetch
    const storeStake = getStore().roomData.stakeAmount;
    if (storeStake > 0 && userId) {
      socket.emit("get_room_by_stake", { stakeAmount: storeStake, userId });
    }

    // Timeout logic
    const timeoutFn = setTimeout(() => {
      const storeState = getStore();
      if (!storeState.gameStarted && storeState.waitingForCounter && !storeState.error && socket.connected) {
        storeState.setError("Game failed to start. Please try again.");
        storeState.setLoading(false);
      }
    }, 60000);

    return () => {
      clearTimeout(timeoutFn);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("error", handleSocketError);
      socket.off("room_data", handleRoomData);
      socket.off("settings", handleSettings);
      socket.off("start_game", handleStartGame);
      socket.off("number_called", handleNumberCalled);
      socket.off(`game_over_${userId}`, handleGameOver);
      socket.off("game_finished", handleGameFinished);
      socket.off("new_room_created", handleNewRoomCreated);
      socket.off("counter", handleCounter);
      socket.off("bingo_invalid", handleBingoInvalid);
      socket.off("Game-details", handleGameDetails);
    };
  }, [socket, roomId, userId, disqualificationStorageKey, watcherStorageKey]);
};
