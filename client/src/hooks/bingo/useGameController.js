import { useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAppStore } from "../../store";
import { useApi } from "../../contexts/ApiContext";
import { DEFAULT_WATCHER_MESSAGE, DEFAULT_DISQUALIFICATION_MESSAGE } from "../../utils/bingoUtils";

export const useGameController = (socket, roomId, userId, authLoading) => {
  const navigate = useNavigate();
  const api = useApi();
  
  const {
     isDisqualified,
     isTemporaryWatcher,
     isManualMode,
     liveResults,
     updatedStakeAmount,
     storedCards,
     isMuted,
     voiceOption
  } = useAppStore();

  const watcherStorageKey = useMemo(() => {
    if (!roomId || !userId) return null;
    return `watcher:${roomId}:${userId}`;
  }, [roomId, userId]);

  const disqualificationStorageKey = useMemo(() => {
    if (!roomId || !userId) return null;
    return `disqualified:${roomId}:${userId}`;
  }, [roomId, userId]);

  const clearWatcherState = useCallback(() => {
    if (watcherStorageKey) sessionStorage.removeItem(watcherStorageKey);
    useAppStore.getState().setIsTemporaryWatcher(false);
    useAppStore.getState().setTemporaryWatcherMessage(DEFAULT_WATCHER_MESSAGE);
  }, [watcherStorageKey]);

  const activateTemporaryWatcher = useCallback((message) => {
    const finalMessage = message || DEFAULT_WATCHER_MESSAGE;
    useAppStore.getState().setIsTemporaryWatcher(true);
    useAppStore.getState().setTemporaryWatcherMessage(finalMessage);
    if (watcherStorageKey) {
      sessionStorage.setItem(watcherStorageKey, JSON.stringify({ message: finalMessage }));
    }
  }, [watcherStorageKey]);

  const clearDisqualificationState = useCallback(() => {
    if (disqualificationStorageKey) localStorage.removeItem(disqualificationStorageKey);
    const store = useAppStore.getState();
    store.setIsDisqualified(false);
    store.setDisqualificationMessage("");
    store.setDisqualifiedCards([]);
  }, [disqualificationStorageKey]);

  // Settings Init
  useEffect(() => {
    const fetchWinPattern = async () => {
      try {
        const res = await api.get('/api/v1/settings');
        if (res.data?.success && res.data.data?.winPattern) {
          useAppStore.getState().setWinPattern(res.data.data.winPattern);
        }
      } catch (err) {}
    };
    fetchWinPattern();
  }, [api]);

  // Main Init / Room Entry Logic
  useEffect(() => {
    if (authLoading) return;

    const store = useAppStore.getState();

    if (!userId) {
      store.setLoading(false);
      store.setError("User ID not found. Please log in again.");
      navigate("/");
      return;
    }

    if (!roomId) {
      store.setLoading(false);
      navigate("/");
      return;
    }

    if (!socket) {
      store.setError("Connecting to server... Please wait.");
      store.setLoading(true);
      return;
    }

    // ── Reset stale game state from previous session ──────────────────────
    store.setFinishedGame(false);
    store.setResult(null);
    store.setWinners([]);
    store.setWinningCards([]);
    store.setWinningCombos([]);
    store.setWinningCardGrids([]);
    store.setPrizes([]);
    store.setFirstNames([]);
    store.setLiveResults([]);
    store.setDrawnNumbers([]);
    store.setCurrentNumber(null);
    store.setPrefixedNumber(null);
    store.setAnimationTrigger(false);
    store.setGameStarted(false);
    store.setStoredCards([]);
    store.setSharedSelectedNumbers(new Set(["F"]));
    store.setUserPrize(0);
    store.setUserLoss(0);
    store.setLoading(true);
    store.setError(null);
    // ─────────────────────────────────────────────────────────────────────

    // 1. Restore watcher session limits if they exist
    if (watcherStorageKey) {
      const storedWatcher = sessionStorage.getItem(watcherStorageKey);
      if (storedWatcher) {
        try {
          const parsed = JSON.parse(storedWatcher);
          activateTemporaryWatcher(parsed?.message);
        } catch { sessionStorage.removeItem(watcherStorageKey); }
      }
    }

    // 2. Restore disqualification constraints if they exist
    if (disqualificationStorageKey) {
      const stored = localStorage.getItem(disqualificationStorageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          store.setIsDisqualified(true);
          store.setDisqualificationMessage(parsed?.message || DEFAULT_DISQUALIFICATION_MESSAGE);
          if (Array.isArray(parsed?.cards)) {
            store.setDisqualifiedCards(parsed.cards);
            store.setStoredCards(parsed.cards);
          }
          store.setIsManualMode(false);
          store.setSharedSelectedNumbers(new Set(["F"]));
        } catch { localStorage.removeItem(disqualificationStorageKey); }
      }
    }

    // 3. Fetch reserved cards from server
    const fetchCards = () => {
      socket.emit("get_reserved_cards", { userId, roomId }, (response) => {
        const currentStore = useAppStore.getState();
        const cardIds = Array.isArray(response?.cardIds) ? response.cardIds : [];
        const serverDisqualified = Boolean(response?.isDisqualified);
        const reasonFromServer = response?.disqualificationReason;
        const serverPlayMode = response?.playMode;

        if (serverDisqualified) {
          const messageForUser = reasonFromServer || DEFAULT_DISQUALIFICATION_MESSAGE;
          currentStore.setIsDisqualified(true);
          currentStore.setDisqualificationMessage(messageForUser);
          currentStore.setDisqualifiedCards(cardIds);
          currentStore.setStoredCards([]);
          currentStore.setIsManualMode(false);
          currentStore.setSharedSelectedNumbers(new Set(["F"]));
          if (disqualificationStorageKey) {
            localStorage.setItem(disqualificationStorageKey, JSON.stringify({ message: messageForUser, cards: cardIds }));
          }
          currentStore.setLoading(false);
          return;
        }

        if (currentStore.isDisqualified) clearDisqualificationState();

        if (cardIds.length > 0) {
          currentStore.setStoredCards(cardIds);
          clearWatcherState();
          const normalizedMode = serverPlayMode === "auto" ? "auto" : "manual";
          currentStore.setIsManualMode(normalizedMode === "manual");
          currentStore.setLoading(false);
          return;
        }

        if (currentStore.isDisqualified) {
          const cardsForWatcher = currentStore.disqualifiedCards.length > 0 ? currentStore.disqualifiedCards : [];
          currentStore.setStoredCards(cardsForWatcher);
          currentStore.setLoading(false);
          return;
        }

        let watcherMessage = DEFAULT_WATCHER_MESSAGE;
        if (watcherStorageKey) {
          const storedWatcher = sessionStorage.getItem(watcherStorageKey);
          if (storedWatcher) {
             try { watcherMessage = JSON.parse(storedWatcher)?.message || watcherMessage; } catch {}
          }
        }

        activateTemporaryWatcher(watcherMessage);
        currentStore.setStoredCards([]);
        currentStore.setIsManualMode(serverPlayMode === "auto" ? false : true);
        currentStore.setSharedSelectedNumbers(new Set(["F"]));
        currentStore.setLoading(false);
      });
    };

    fetchCards();

    // Attach as a method we can reuse
    useAppStore.getState().___fetchCardsCache = fetchCards;

  }, [
    authLoading, userId, roomId, socket, navigate,
    watcherStorageKey, disqualificationStorageKey,
    activateTemporaryWatcher, clearWatcherState, clearDisqualificationState
  ]);

  const handleLeave = useCallback(() => {
    clearDisqualificationState();
    clearWatcherState();
    useAppStore.getState().setStoredCards([]);
    navigate("/games");
  }, [clearDisqualificationState, clearWatcherState, navigate]);

  const handleRefresh = useCallback(() => {
    if (isTemporaryWatcher || isDisqualified) return;
    const fetchFn = useAppStore.getState().___fetchCardsCache;
    if (typeof fetchFn === "function") {
       fetchFn();
    }
  }, [isTemporaryWatcher, isDisqualified]);

  const handleModalClose = useCallback(() => {
    clearDisqualificationState();
    useAppStore.getState().setFinishedGame(false);
    clearWatcherState();
    useAppStore.getState().setStoredCards([]);
    navigate(`/cards-list/${updatedStakeAmount}`);
  }, [updatedStakeAmount, navigate, clearDisqualificationState, clearWatcherState]);

  const handleToggleNumber = useCallback((number) => {
    if (number === "F") return;
    if (isDisqualified || isTemporaryWatcher) {
      toast.info("You're currently watching only. Wait for the next game to play again.");
      return;
    }
    if (!isManualMode) return;

    if (!liveResults.includes(number)) {
      toast.warn("You can only mark numbers that have been called.", {
        position: "top-center",
        autoClose: 2000,
      });
      return;
    }

    const store = useAppStore.getState();
    const nextSet = new Set(store.sharedSelectedNumbers);
    if (nextSet.has(number)) nextSet.delete(number); else nextSet.add(number);
    store.setSharedSelectedNumbers(nextSet);
  }, [isDisqualified, isTemporaryWatcher, isManualMode, liveResults]);

  const toggleMute = useCallback(() => {
    useAppStore.getState().setIsMuted(!isMuted);
  }, [isMuted]);

  const toggleMode = useCallback(() => {
    if (isDisqualified || isTemporaryWatcher) {
      toast.info("You're watching this game for the rest of the round.");
      return;
    }
    useAppStore.getState().setIsManualMode(!isManualMode);
  }, [isDisqualified, isTemporaryWatcher, isManualMode]);

  const handleVoiceChange = useCallback((selected) => {
    useAppStore.getState().setVoiceOption(selected.value);
  }, []);

  // Sync mode with server
  useEffect(() => {
    if (!socket || !userId || !roomId || authLoading || isTemporaryWatcher || isDisqualified) return;
    if (isManualMode === null) return;
    
    const nextMode = isManualMode ? "manual" : "auto";
    socket.emit("update_play_mode", { userId, playMode: nextMode, roomId });
  }, [socket, userId, roomId, authLoading, isManualMode, isTemporaryWatcher, isDisqualified]);

  return {
    handleModalClose,
    handleToggleNumber,
    toggleMute,
    toggleMode,
    handleVoiceChange,
    handleLeave,
    handleRefresh,
    disqualificationStorageKey,
    watcherStorageKey
  };
};
