/**
 * Shared Game State
 * 
 * Centralized state management for bingo game operations.
 * This module breaks circular dependencies by providing a single source of truth
 * for shared state that was previously spread across bingoCardHandler and countHandler.
 */

// ============ Counter State ============
// Manages countdown timers for each game room
// Structure: { [counterId]: { count, intervalId, gameStarted } }
const counters = {};
const counterLocks = new Set();

// ============ Number Calling State ============
// Tracks active number calling intervals for each game room
const numberCallingIntervals = new Map();
const numberCallingInProgress = new Map(); // Guard to prevent overlapping calls

// ============ Bot Reservation State ============
// Manages system reservation bot intervals and state
const systemReservationIntervals = new Map();
const roomLocks = new Map();
const botReservationCounts = new Map();

// ============ State Access Functions ============

/**
 * Get counter for a room
 * @param {string} roomId 
 * @returns {Object|null}
 */
const getCounter = (roomId) => {
    const counterId = `counter${roomId}`;
    return counters[counterId] || null;
};

/**
 * Set counter for a room
 * @param {string} roomId 
 * @param {Object} counterData 
 */
const setCounter = (roomId, counterData) => {
    const counterId = `counter${roomId}`;
    counters[counterId] = counterData;
};

/**
 * Delete counter for a room
 * @param {string} roomId 
 */
const deleteCounter = (roomId) => {
    const counterId = `counter${roomId}`;
    delete counters[counterId];
};

/**
 * Check if counter is locked for a room
 * @param {string} roomId 
 * @returns {boolean}
 */
const isCounterLocked = (roomId) => {
    return counterLocks.has(roomId);
};

/**
 * Lock counter for a room
 * @param {string} roomId 
 */
const lockCounter = (roomId) => {
    counterLocks.add(roomId);
};

/**
 * Unlock counter for a room
 * @param {string} roomId 
 */
const unlockCounter = (roomId) => {
    counterLocks.delete(roomId);
};

/**
 * Check if room is locked for bot operations
 * @param {string} roomId 
 * @returns {boolean}
 */
const isRoomLocked = (roomId) => {
    return roomLocks.get(roomId) === true;
};

/**
 * Lock room for bot operations
 * @param {string} roomId 
 */
const lockRoom = (roomId) => {
    roomLocks.set(roomId, true);
};

/**
 * Unlock room for bot operations
 * @param {string} roomId 
 */
const unlockRoom = (roomId) => {
    roomLocks.delete(roomId);
};

/**
 * Check if number calling is in progress for a room
 * @param {string} roomId 
 * @returns {boolean}
 */
const isNumberCallingInProgress = (roomId) => {
    return numberCallingInProgress.get(roomId) === true;
};

/**
 * Set number calling progress status
 * @param {string} roomId 
 * @param {boolean} status 
 */
const setNumberCallingProgress = (roomId, status) => {
    if (status) {
        numberCallingInProgress.set(roomId, true);
    } else {
        numberCallingInProgress.delete(roomId);
    }
};

module.exports = {
    // Counter state
    counters,
    counterLocks,
    getCounter,
    setCounter,
    deleteCounter,
    isCounterLocked,
    lockCounter,
    unlockCounter,

    // Number calling state
    numberCallingIntervals,
    numberCallingInProgress,
    isNumberCallingInProgress,
    setNumberCallingProgress,

    // Bot reservation state
    systemReservationIntervals,
    roomLocks,
    botReservationCounts,
    isRoomLocked,
    lockRoom,
    unlockRoom,
};
