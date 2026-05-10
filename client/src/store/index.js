// store/index.js
import { create } from "zustand";

export const useAppStore = create((set, get) => ({
  // Auth token state
  token: null,
  setToken: (token) => set({ token }),
  clearToken: () => set({ token: null }),
  // User state
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),

  // Game state
  game: null,
  setGame: (game) => set({ game }),
  updateGame: (updates) =>
    set((state) => ({ game: { ...state.game, ...updates } })),
  clearGame: () => set({ game: null }),

  // Wallet state
  wallet: 0,
  bonus: 0,
  setWallet: (wallet) => set({ wallet }),
  setBonus: (bonus) => set({ bonus }),
  incrementWallet: (amount) =>
    set((state) => ({ wallet: state.wallet + amount })),
  decrementWallet: (amount) =>
    set((state) => ({ wallet: state.wallet - amount })),

  // Reservation state
  reservedRoomId: null,
  reservedCardIds: [],
  reserveCards: (roomId, cardIds) => {
    set({ reservedRoomId: roomId, reservedCardIds: cardIds });
    localStorage.setItem("reservedRoomId", roomId);
    localStorage.setItem("selectedCards", JSON.stringify(cardIds));
  },
  clearReservation: () => {
    set({ reservedRoomId: null, reservedCardIds: [] });
    localStorage.removeItem("selectedCards");
    localStorage.removeItem("reservedRoomId");
  },

  // Bingo cards state (real-time)
  cards: {}, // { [cardId]: cardData }
  setCards: (cardsArray) =>
    set({
      cards: Object.fromEntries(cardsArray.map((card) => [card.cardId, card])),
    }),
  updateCard: (cardId, updatedFields) =>
    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: { ...state.cards[cardId], ...updatedFields },
      },
    })),
  clearCards: () => set({ cards: {} }),

  // Global game state (real-time, for all rooms)
  liveResults: [],
  setLiveResults: (liveResults) => set({ liveResults }),
  currentNumber: null,
  setCurrentNumber: (currentNumber) => set({ currentNumber }),
  drawnNumbers: [],
  setDrawnNumbers: (drawnNumbers) => set({ drawnNumbers }),
  gameStarted: false,
  setGameStarted: (gameStarted) => set({ gameStarted }),
  waitingForCounter: true,
  setWaitingForCounter: (waitingForCounter) => set({ waitingForCounter }),
  result: null,
  setResult: (result) => set({ result }),
  winners: [],
  setWinners: (winners) => set({ winners }),
  winningCards: [],
  setWinningCards: (winningCards) => set({ winningCards }),
  winningCombos: [],
  setWinningCombos: (winningCombos) => set({ winningCombos }),
  prizes: [],
  setPrizes: (prizes) => set({ prizes }),
  winningCardGrids: [],
  setWinningCardGrids: (winningCardGrids) => set({ winningCardGrids }),
  userPrize: 0,
  setUserPrize: (userPrize) => set({ userPrize }),
  userLoss: 0,
  setUserLoss: (userLoss) => set({ userLoss }),
  updatedStakeAmount: null,
  setUpdatedStakeAmount: (updatedStakeAmount) => set({ updatedStakeAmount }),
  numberOfPlayers: 0,
  setNumberOfPlayers: (numberOfPlayers) => set({ numberOfPlayers }),
  winAmount: 0,
  setWinAmount: (winAmount) => set({ winAmount }),
  syncing: true,
  setSyncing: (syncing) => set({ syncing }),
  
  // Game UI & Interaction state
  prefixedNumber: null,
  setPrefixedNumber: (prefixedNumber) => set({ prefixedNumber }),
  finishedGame: false,
  setFinishedGame: (finishedGame) => set({ finishedGame }),
  isMuted: (() => {
    try {
      const saved = localStorage.getItem("isMuted");
      return saved ? JSON.parse(saved) : true;
    } catch { return true; }
  })(),
  setIsMuted: (isMuted) => {
    localStorage.setItem("isMuted", JSON.stringify(isMuted));
    set({ isMuted });
  },
  animationTrigger: false,
  setAnimationTrigger: (animationTrigger) => set({ animationTrigger }),
  storedCards: [],
  setStoredCards: (storedCards) => set({ storedCards }),
  countdown: null,
  setCountdown: (countdown) => set({ countdown }),
  shuffling: false,
  setShuffling: (shuffling) => set({ shuffling }),
  winPattern: "two_line",
  setWinPattern: (winPattern) => set({ winPattern }),
  isManualMode: null,
  setIsManualMode: (isManualMode) => set({ isManualMode }),
  sharedSelectedNumbers: new Set(["F"]),
  setSharedSelectedNumbers: (sharedSelectedNumbers) => set({ sharedSelectedNumbers }),
  firstNames: [],
  setFirstNames: (firstNames) => set({ firstNames }),
  
  // Game watcher/disqualification state
  isDisqualified: false,
  setIsDisqualified: (isDisqualified) => set({ isDisqualified }),
  disqualificationMessage: "",
  setDisqualificationMessage: (disqualificationMessage) => set({ disqualificationMessage }),
  disqualifiedCards: [],
  setDisqualifiedCards: (disqualifiedCards) => set({ disqualifiedCards }),
  isTemporaryWatcher: false,
  setIsTemporaryWatcher: (isTemporaryWatcher) => set({ isTemporaryWatcher }),
  temporaryWatcherMessage: "The game is already in progress. Please wait until it finishes to join the next round.",
  setTemporaryWatcherMessage: (temporaryWatcherMessage) => set({ temporaryWatcherMessage }),
  roomData: {
    roomId: null,
    stakeAmount: 0,
    bonusEnabled: false,
    bonusAmount: 0,
    bonusDescription: "",
  },
  setRoomData: (roomData) => set({ roomData }),
  
  // Voice & Audio state
  voiceOption: localStorage.getItem("selectedVoice") || "am",
  setVoiceOption: (voiceOption) => {
    localStorage.setItem("selectedVoice", voiceOption);
    set({ voiceOption });
  },

  clearGameState: () =>
    set({
      liveResults: [],
      currentNumber: null,
      drawnNumbers: [],
      gameStarted: false,
      waitingForCounter: true,
      result: null,
      winners: [],
      winningCards: [],
      winningCombos: [],
      prizes: [],
      winningCardGrids: [],
      userPrize: 0,
      userLoss: 0,
      updatedStakeAmount: null,
      numberOfPlayers: 0,
      winAmount: 0,
      syncing: true,
      prefixedNumber: null,
      finishedGame: false,
      animationTrigger: false,
      storedCards: [],
      countdown: null,
      shuffling: false,
      isManualMode: null,
      sharedSelectedNumbers: new Set(["F"]),
      firstNames: [],
      isDisqualified: false,
      disqualificationMessage: "",
      disqualifiedCards: [],
      isTemporaryWatcher: false,
      temporaryWatcherMessage: "The game is already in progress. Please wait until it finishes to join the next round.",
      roomData: { roomId: null, stakeAmount: 0, bonusEnabled: false, bonusAmount: 0, bonusDescription: "" },
    }),

  // Socket connection status
  socketStatus: "connecting", // 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  setSocketStatus: (status) => set({ socketStatus: status }),

  // Example: loading and error states
  loading: true,
  setLoading: (loading) => set({ loading }),
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
