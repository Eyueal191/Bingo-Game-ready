import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../contexts/socketContext";
import { useAuth } from "../contexts/AuthContext";
import { useAppStore } from "../store";
import { toast } from "sonner";

/**
 * Custom hook for CardList page logic.
 * Supports multi-card selection, play mode toggle, and user stake adjuster.
 */
export function useCardList() {
  const { stakeAmount: initialStake } = useParams();
  const socket = useSocket();
  const navigate = useNavigate();

  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    severity: "info",
  });
  const [counters, setCounters] = useState({});
  const [gameStarting, setGameStarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeGames, setActiveGames] = useState(0);
  const [roomData, setRoomData] = useState({
    roomId: null,
    stakeAmount: initialStake,
    numberOfPlayers: 0,
    bonusEnabled: false,
    bonusAmount: 0,
    bonusDescription: "",
  });
  const [userReservedCardIds, setUserReservedCardIds] = useState([]);



  // Card reservation settings from server
  const [cardSettings, setCardSettings] = useState({
    mode: "single",
    maxCardsPerUser: 1,
    maxCardsPerRoom: 5,
    isClickToReserve: false,
    defaultPlayMode: "manual",
    winPattern: "two_line",
  });

  // Play mode state
  const [isManualMode, setIsManualMode] = useState(null);
  const lastPlayModeRef = useRef(null);

  const { userId, isAuthLoading } = useAuth();
  const wallet = useAppStore((state) => state.wallet);
  const bonus = useAppStore((state) => state.bonus);
  const setWallet = useAppStore((state) => state.setWallet);
  const setBonus = useAppStore((state) => state.setBonus);
  const clearGameState = useAppStore((state) => state.clearGameState);

  // Computed
  const isMultiCardMode = cardSettings.mode === "multiple" && cardSettings.maxCardsPerUser > 1;
  const isClickToReserve = cardSettings.isClickToReserve;
  const maxCards = cardSettings.maxCardsPerUser;
  const hasReservedCards = userReservedCardIds.length > 0;
  const roomStake = Number(roomData.stakeAmount || initialStake) || 0;
  const winPattern = cardSettings.winPattern;

  // Initialize play mode from server default once settings arrive, OR if the admin changes it globally
  useEffect(() => {
    // We want to apply the default play mode when the component mounts or when settings arrive.
    // However, if the user has ALREADY explicitly toggled the mode, we might want to respect their manual choice,
    // UNLESS they have zero reserved cards, in which case we should strictly sync with the global default.
    if (cardSettings && cardSettings.defaultPlayMode) {
      if (!hasReservedCards || isManualMode === null) {
        setIsManualMode(cardSettings.defaultPlayMode === "manual");
        lastPlayModeRef.current = cardSettings.defaultPlayMode;
      }
    }
  }, [cardSettings?.defaultPlayMode, hasReservedCards, isManualMode]);



  // Toggle play mode — only if user has reserved cards
  const toggleMode = useCallback(() => {
    if (!hasReservedCards) {
      toast.info("Reserve a card first to change play mode.");
      return;
    }
    setIsManualMode((prev) => !prev);
  }, [hasReservedCards]);

  // Emit play mode to server when it changes
  useEffect(() => {
    if (!socket || !userId || !roomData.roomId || isManualMode === null) return;
    const nextMode = isManualMode ? "manual" : "auto";
    if (lastPlayModeRef.current === nextMode) return;
    lastPlayModeRef.current = nextMode;
    socket.emit("update_play_mode", {
      userId,
      playMode: nextMode,
      roomId: roomData.roomId,
    });
  }, [socket, userId, roomData.roomId, isManualMode]);



  const activateWatcherMode = useCallback(
    (roomId, stakeAmount, message) => {
      if (!roomId || !userId) return;
      const watcherPayload = {
        message:
          message ||
          "The game is already in progress. You're now watching this round until it finishes.",
        createdAt: Date.now(),
      };
      try {
        sessionStorage.setItem(
          `watcher:${roomId}:${userId}`,
          JSON.stringify(watcherPayload)
        );
      } catch (err) {
        console.error("Failed to persist watcher mode", err);
      }
      navigate(`/play-game/${roomId}/${stakeAmount}`);
    },
    [navigate, userId]
  );

  const clearNotification = () => {
    setNotification((prev) => ({ ...prev, show: false }));
  };

  // Fetch card reservation settings via Socket
  useEffect(() => {
    if (!socket) return;

    socket.on("settings", (settings) => {
      if (settings?.cardReservation) {
        setCardSettings({
          mode: settings.cardReservation.mode || "single",
          maxCardsPerUser: settings.cardReservation.maxCardsPerUser || 1,
          maxCardsPerRoom: settings.cardReservation.maxCardsPerRoom || 5,
          isClickToReserve: !!settings.cardReservation.isClickToReserve,
          defaultPlayMode: settings.defaultPlayMode || "manual",
          winPattern: settings.winPattern || "two_line",
        });
      }
    });

    return () => {
      socket.off("settings");
    };
  }, [socket]);

  // Initial socket subscriptions and room/card data
  useEffect(() => {
    if (isAuthLoading || !userId) return;

    if (!socket || !initialStake) {
      setLoading(false);
      return;
    }

    socket.emit("get_room_by_stake", { stakeAmount: initialStake, userId });
    socket.emit("get_active_games_by_stake", { stakeAmount: initialStake });
    socket.emit("get_wallet", { userId });
    socket.emit("get_settings");

    socket.on(
      "room_data",
      (data) => {
        console.log("CardList: Received room_data", data);
        const {
          roomId,
          stakeAmount,
          numberOfPlayers,
          bonusEnabled,
          bonusAmount,
          bonusDescription,
        } = data;

        const roomIdStr = roomId?.toString();
        
        setRoomData((prev) => ({
          ...prev,
          roomId: roomIdStr,
          stakeAmount,
          numberOfPlayers: numberOfPlayers !== undefined ? numberOfPlayers : prev.numberOfPlayers,
          bonusEnabled,
          bonusAmount,
          bonusDescription,
        }));
        
        if (roomIdStr && userId) {
          socket.emit(
            "get_reserved_cards",
            { userId, roomId: roomIdStr },
            (response) => {
              if (response && response.cardIds) {
                setUserReservedCardIds(response.cardIds.map((id) => id.toString()));
              }
              
              if (response && response.playMode) {
                // Use the playMode from the user's active reservation if they have one
                const mode = response.playMode === "manual";
                setIsManualMode(mode);
                lastPlayModeRef.current = response.playMode;
              } else {
                // If they don't have reserved cards (or no specific mode saved),
                // default to exactly what the admin settings dictate
                setIsManualMode((prev) => {
                  // Important: we don't wipe it out if it already matched, 
                  // but we ensure it conforms to the default if it was null
                  if (prev === null && cardSettings && cardSettings.defaultPlayMode) {
                    const defaultModeVal = cardSettings.defaultPlayMode === "manual";
                    lastPlayModeRef.current = cardSettings.defaultPlayMode;
                    return defaultModeVal;
                  }
                  return prev;
                });
              }
            }
          );
        }
        setLoading(false);
      }
    );

    socket.on(
      "cards",
      ({ cardsWithStatus, stakeAmount: receivedStakeAmount }) => {
        setCards(cardsWithStatus || []);
        setLoading(false);
        setRoomData((prev) => ({
          ...prev,
          stakeAmount: receivedStakeAmount || prev.stakeAmount,
        }));
      }
    );

    socket.on("walletUpdate", (data) => {

      setWallet(data.wallet);
      if (data.bonus !== undefined) setBonus(data.bonus);
    });

    socket.on("error", (error) => {
      setNotification({
        show: true,
        message: error.message,
        severity: "error",
      });
      setLoading(false);
    });

    socket.on("active_games_by_stake", ({ stakeAmount, count }) => {
      if (parseFloat(stakeAmount) === parseFloat(initialStake)) {
        setActiveGames(count);
      }
    });

    socket.on("new_room_created", ({ newRoomId, stakeAmount }) => {
      if (parseFloat(stakeAmount) === parseFloat(initialStake)) {
        const roomIdStr = newRoomId?.toString();
        setRoomData({ roomId: roomIdStr, stakeAmount, numberOfPlayers: 0 });
        socket.emit("join_room", { roomId: roomIdStr, userId });
        socket.emit("get_cards", roomIdStr);
        setGameStarting(false);
        setUserReservedCardIds([]);
        setSelectedCards([]);
        setNotification({
          show: true,
          message: "New game room created!",
          severity: "info",
        });
      }
    });

    socket.on(
      "start_game",
      ({ roomId: startedRoomId, stakeAmount: gameStakeAmount }) => {
        setGameStarting(true);
        setLoading(false);
        setNotification({
          show: true,
          message: "Game starting!",
          severity: "info",
        });
        setRoomData((prev) => ({
          ...prev,
          stakeAmount: gameStakeAmount || prev.stakeAmount,
        }));

        const stakeForNavigation = gameStakeAmount || roomData.stakeAmount;

        socket.emit(
          "get_reserved_cards",
          { userId, roomId: startedRoomId },
          ({ cardIds }) => {
            if (cardIds && cardIds.length > 0) {
              navigate(`/play-game/${startedRoomId}/${stakeForNavigation}`);
            } else {
              activateWatcherMode(
                startedRoomId,
                stakeForNavigation,
                "The game has already started. You're watching this round."
              );
            }
          }
        );
      }
    );

    return () => {
      socket.off("room_data");
      socket.off("cards");
      socket.off("error");
      socket.off("active_games_by_stake");
      socket.off("new_room_created");
      socket.off("start_game");
      socket.off("walletUpdate");
    };
  }, [
    socket,
    initialStake,
    userId,
    isAuthLoading,
    navigate,
    roomData.stakeAmount,
    setWallet,
    activateWatcherMode,
  ]);

  // Counter updates within room
  useEffect(() => {
    if (!roomData.roomId || !socket) return;

    socket.emit("join_room", { roomId: roomData.roomId, userId });
    socket.emit("get_cards", roomData.roomId);

    const counterId = `counter${roomData.roomId}`;
    socket.on("counter", ({ counterId: receivedCounterId, count }) => {
      console.log(`CardList: Received counter ${receivedCounterId}=${count}, looking for ${counterId}`);
      if (receivedCounterId === counterId) {
        setCounters((prev) => ({ ...prev, [counterId]: count }));
      }
    });

    return () => {
      socket.off("counter");
    };
  }, [socket, roomData.roomId, userId]);

  // Auto navigate on counter reaching zero
  useEffect(() => {
    const counterId = `counter${roomData.roomId}`;
    const counterValue = counters[counterId];
    if (counterValue === 0 && !gameStarting) {
      socket.emit(
        "get_reserved_cards",
        { userId, roomId: roomData.roomId },
        ({ cardIds }) => {
          if (cardIds && cardIds.length > 0) {
            setGameStarting(true);
            setNotification({
              show: true,
              message: "Game is starting!",
              severity: "info",
            });
            navigate(`/play-game/${roomData.roomId}/${roomData.stakeAmount}`);
          } else {
            activateWatcherMode(
              roomData.roomId,
              roomData.stakeAmount,
              "You're joining as a watcher. Please wait for this game to finish."
            );
          }
        }
      );
    }
  }, [
    counters,
    roomData,
    gameStarting,
    navigate,
    socket,
    userId,
    userReservedCardIds,
    activateWatcherMode,
  ]);

  const formatCounter = (counterValue) => {
    const minutes = Math.floor(counterValue / 60);
    const seconds = counterValue % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  /**
   * Toggle card selection
   */
  const handleSelectCard = (card) => {
    if (!card) return;

    const cardIdStr = card.cardId?.toString();
    if (!cardIdStr) return;

    const reservedByAnotherUser =
      card.isReserved && card.reservedBy !== userId?.toString();
    if (reservedByAnotherUser) {
      setNotification({
        show: true,
        message: `Card ${cardIdStr} is already reserved by another player.`,
        severity: "warning",
      });
      return;
    }

    const alreadyReservedByUser = userReservedCardIds
      .map((id) => id.toString())
      .includes(cardIdStr);

    if (alreadyReservedByUser) {
      socket.emit(
        "unreserve_cards",
        {
          roomId: roomData.roomId,
          cardIds: [cardIdStr],
          userId,
        },
        (response) => {
          if (!response) return;
          if (response.error) {
            setNotification({
              show: true,
              message: response.error.message,
              severity: "error",
            });
            return;
          }
          // Remove it from the local state
          setUserReservedCardIds((prev) => prev.filter((id) => id !== cardIdStr));
          setNotification({
            show: true,
            message: response.message || `Card ${cardIdStr} unreserved.`,
            severity: "success",
          });
        }
      );
      return;
    }

    // Multi-card mode: toggle selection
    if (isMultiCardMode) {
      if (cardSettings.isClickToReserve) {
        const totalReserved = userReservedCardIds.length;
        if (totalReserved >= maxCards) {
          setNotification({
            show: true,
            message: `You can select up to ${maxCards} cards total.`,
            severity: "warning",
          });
          return;
        }

        const playMode = isManualMode ? "manual" : "auto";
        socket.emit(
          "reserve_cards",
          {
            roomId: roomData.roomId,
            cardIds: [cardIdStr],
            userId,
            playMode,
          },
          (response) => {
            if (!response) return;
            if (response.error) {
              setNotification({
                show: true,
                message: response.error.message,
                severity: "error",
              });
              return;
            }
            const reservedIds = response.reservedCardIds || [cardIdStr];
            setUserReservedCardIds(reservedIds.map((id) => id.toString()));
          }
        );
        return;
      }

      setSelectedCards((prev) => {
        const isAlreadySelected = prev.includes(cardIdStr);
        if (isAlreadySelected) {
          return prev.filter((id) => id !== cardIdStr);
        }

        const totalReserved = userReservedCardIds.length;
        if (prev.length + totalReserved >= maxCards) {
          setNotification({
            show: true,
            message: `You can select up to ${maxCards} cards total.`,
            severity: "warning",
          });
          return prev;
        }

        return [...prev, cardIdStr];
      });
      return;
    }

    // Single-card mode: immediate reservation
    if (!roomData.roomId) {
      setNotification({
        show: true,
        message: "Unable to reserve card: room information missing.",
        severity: "error",
      });
      return;
    }

    const hasExistingReservation = userReservedCardIds.length >= maxCards;
    const totalAvailable = (wallet || 0) + (bonus || 0);
    if (!hasExistingReservation && totalAvailable < roomData.stakeAmount) {
      setNotification({
        show: true,
        message: "Insufficient balance.",
        severity: "error",
      });
      return;
    }

    const playMode = isManualMode ? "manual" : "auto";
    socket.emit(
      "reserve_cards",
      {
        roomId: roomData.roomId,
        cardIds: [cardIdStr],
        userId,
        playMode,
      },
      (response) => {
        if (!response) return;

        if (response.error) {
          setNotification({
            show: true,
            message: response.error.message,
            severity: "error",
          });
          return;
        }

        const reservedIds = response.reservedCardIds || [cardIdStr];
        setUserReservedCardIds(reservedIds.map((id) => id.toString()));

        setNotification({
          show: true,
          message:
            response.message ||
            `Card ${cardIdStr} reserved successfully${response.previousCardIds?.length
              ? ` (replaced ${response.previousCardIds.join(", ")})`
              : ""
            }!`,
          severity: "success",
        });
      }
    );
  };

  /**
   * Reserve all selected cards (for multi-card mode with confirmation)
   */
  const handleReserve = () => {
    if (selectedCards.length === 0) {
      setNotification({
        show: true,
        message: "Please select at least one card to reserve.",
        severity: "warning",
      });
      return;
    }

    if (!roomData.roomId) {
      setNotification({
        show: true,
        message: "Unable to reserve cards: room information missing.",
        severity: "error",
      });
      return;
    }

    const newCardsCount = selectedCards.length;
    const totalCost = newCardsCount * roomData.stakeAmount;
    const totalAvailable = (wallet || 0) + (bonus || 0);

    if (totalAvailable < totalCost) {
      setNotification({
        show: true,
        message: `Insufficient balance. Need ${totalCost} ETB for ${newCardsCount} cards.`,
        severity: "error",
      });
      return;
    }

    const playMode = isManualMode ? "manual" : "auto";
    socket.emit(
      "reserve_cards",
      {
        roomId: roomData.roomId,
        cardIds: selectedCards,
        userId,
        playMode,
      },
      (response) => {
        if (!response) return;

        if (response.error) {
          setNotification({
            show: true,
            message: response.error.message,
            severity: "error",
          });
          return;
        }

        const reservedIds = response.reservedCardIds || selectedCards;
        setUserReservedCardIds(reservedIds.map((id) => id.toString()));
        setSelectedCards([]);

        setNotification({
          show: true,
          message: `Successfully reserved ${reservedIds.length} card(s)!`,
          severity: "success",
        });
      }
    );
  };

  const handleRefresh = () => {
    if (roomData.roomId) {
      socket.emit("get_cards", roomData.roomId);
      setNotification({
        show: true,
        message: "Refreshing cards...",
        severity: "info",
      });
    }
  };

  const sortedCards = [...cards].sort((a, b) => {
    const getStatusValue = (card) => {
      const reservedIds = userReservedCardIds.map((id) => id.toString());
      if (reservedIds.includes(card.cardId?.toString() ?? "")) return 0;
      if (card.isReserved && card.reservedBy === userId) return 1;
      if (!card.isReserved) return 2;
      return 3;
    };
    return getStatusValue(a) - getStatusValue(b);
  });

  return {
    sortedCards,
    selectedCards,
    notification,
    clearNotification,
    handleSelectCard,
    handleReserve,
    handleRefresh,
    counters,
    gameStarting,
    loading,
    activeGames,
    roomData,
    wallet,
    bonus,
    userId,
    formatCounter,
    userReservedCardIds,
    isMultiCardMode,
    isClickToReserve,
    maxCards,
    cardSettings,
    // Play mode
    isManualMode,
    toggleMode,
    hasReservedCards,
    // Win pattern
    winPattern,
    stake: initialStake,
  };
}
