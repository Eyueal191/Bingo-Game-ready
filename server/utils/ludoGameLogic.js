const crypto = require("crypto");

/**
 * Ludo Game Logic Engine
 * Pure functional, server-authoritative game logic
 * Board uses the PlotData cell numbering from the LUDO_ASSETS
 */

// ─── Board Layout Constants ───────────────────────────────────────────
// Plot data defines the grid cells for each quadrant (6×3 per plot)
const Plot1Data = [13, 14, 15, 16, 17, 18, 12, 221, 222, 223, 224, 225, 11, 10, 9, 8, 7, 6];
const Plot2Data = [24, 25, 26, 23, 331, 27, 22, 332, 28, 21, 333, 29, 20, 334, 30, 19, 335, 31];
const Plot3Data = [32, 33, 34, 35, 36, 37, 445, 444, 443, 442, 441, 38, 44, 43, 42, 41, 40, 39];
const Plot4Data = [5, 115, 45, 4, 114, 46, 3, 113, 47, 2, 112, 48, 1, 111, 49, 52, 51, 50];

// Star cells are safe — tokens cannot be captured here
const StarSpots = [9, 22, 35, 48];

// Arrows indicate the entry direction
const ArrowSpots = [12, 51, 38, 25];

// Where pieces enter the main track from home base
const startingPoints = [1, 14, 27, 40];

// Where pieces turn into the home column (Arrow cells)
const turningPoints = [51, 12, 25, 38];

// Home column starting cells (safe zone, 5 cells each)
const victoryStart = [111, 221, 331, 441];

// Home column cells for each color
const homeColumns = {
    red: [111, 112, 113, 114, 115],
    green: [221, 222, 223, 224, 225],
    yellow: [331, 332, 333, 334, 335],
    blue: [441, 442, 443, 444, 445],
};

// All safe spots (home columns + starting points + star spots)
const SafeSpots = [
    ...homeColumns.red, ...homeColumns.green,
    ...homeColumns.yellow, ...homeColumns.blue,
    ...startingPoints, ...StarSpots,
];

// The main circular track (52 cells, 1-indexed)
// Path goes: 1→2→3→...→52→1 (circular)
const mainTrack = [];
for (let i = 1; i <= 52; i++) mainTrack.push(i);

// Color configuration
const COLORS = ["red", "green", "yellow", "blue"];

// Color-to-track mapping
const colorConfig = {
    red: {
        startPos: 1,        // Entry point to main track
        turningPoint: 51,   // Last cell before home column (arrow cell)
        homeColumn: [111, 112, 113, 114, 115],
        homeFinish: 115,    // Final home cell (or 116 conceptual "finished")
        baseOffset: 0,
    },
    green: {
        startPos: 14,
        turningPoint: 12,
        homeColumn: [221, 222, 223, 224, 225],
        homeFinish: 225,
        baseOffset: 1,
    },
    yellow: {
        startPos: 27,
        turningPoint: 25,
        homeColumn: [331, 332, 333, 334, 335],
        homeFinish: 335,
        baseOffset: 2,
    },
    blue: {
        startPos: 40,
        turningPoint: 38,
        homeColumn: [441, 442, 443, 444, 445],
        homeFinish: 445,
        baseOffset: 3,
    },
};


// ─── Dice ─────────────────────────────────────────────────────────────

const rollDice = () => {
    return crypto.randomInt(1, 7);
};

// ─── State Initialization ─────────────────────────────────────────────
/**
 * Create initial game state
 * @param {Array<{userId: string, color: string}>} players
 * @param {string} mode - "classic" or "quick"
 * @returns {Object} initial game state
 */
const createInitialState = (players, mode = "classic") => {
    const tokensPerPlayer = mode === "sprint" ? 1 : mode === "quick" ? 2 : 4;

    const playerStates = players.map((p) => ({
        userId: p.userId,
        color: p.color,
        tokens: Array.from({ length: tokensPerPlayer }, (_, i) => ({
            id: i,
            position: 0, // 0 = in home base
            isHome: true,
            isFinished: false,
        })),
    }));

    return {
        players: playerStates,
        currentTurnIndex: 0,
        currentDiceValue: null,
        diceRolled: false,
        consecutiveSixes: 0,
        status: "playing",
        winnerUserId: null,
    };
};

// ─── Path Calculation ─────────────────────────────────────────────────
/**
 * Get the next position on the track for a given color
 * Handles wrapping around the circular track and entering home column
 */
const getNextPosition = (currentPos, steps, color) => {
    const config = colorConfig[color];
    if (!config) return null;

    // Token is in home base — can only move out with a 6
    if (currentPos === 0) {
        if (steps === 6) {
            return config.startPos;
        }
        return null; // Can't move
    }

    // Token is in the home column
    const homeIdx = config.homeColumn.indexOf(currentPos);
    if (homeIdx !== -1) {
        const newIdx = homeIdx + steps;
        if (newIdx < config.homeColumn.length) {
            return config.homeColumn[newIdx];
        } else if (newIdx === config.homeColumn.length) {
            return -1; // Exactly reached finish (special marker)
        }
        return null; // Overshoot — can't move
    }

    // Token is on main track
    let pos = currentPos;
    for (let i = 0; i < steps; i++) {
        // Check if we're at the turning point to enter home column
        if (pos === config.turningPoint) {
            const remainingSteps = steps - i;
            if (remainingSteps <= config.homeColumn.length) {
                return config.homeColumn[remainingSteps - 1];
            } else if (remainingSteps === config.homeColumn.length + 1) {
                return -1; // Exactly reached finish
            }
            return null; // Overshoot home column
        }
        // Move forward on main track
        pos = pos >= 52 ? 1 : pos + 1;
    }

    return pos;
};

// ─── Valid Moves ──────────────────────────────────────────────────────
/**
 * Get all valid moves for a player given a dice value
 * @returns {Array<{tokenId, from, to}>}
 */
const getValidMoves = (gameState, playerIndex, diceValue) => {
    const player = gameState.players[playerIndex];
    if (!player) return [];

    const validMoves = [];

    for (const token of player.tokens) {
        if (token.isFinished) continue;

        const newPos = getNextPosition(token.position, diceValue, player.color);
        if (newPos !== null) {
            validMoves.push({
                tokenId: token.id,
                from: token.position,
                to: newPos === -1 ? "finish" : newPos,
            });
        }
    }

    return validMoves;
};

// ─── Move Application ─────────────────────────────────────────────────
/**
 * Apply a move to the game state (mutates and returns)
 * @returns {{ gameState, captured, capturedInfo }}
 */
const applyMove = (gameState, playerIndex, tokenId, diceValue) => {
    const player = gameState.players[playerIndex];
    const token = player.tokens.find((t) => t.id === tokenId);
    if (!token) return { gameState, captured: false };

    const newPos = getNextPosition(token.position, diceValue, player.color);
    if (newPos === null) return { gameState, captured: false };

    const oldPos = token.position;
    let captured = false;
    let capturedInfo = null;

    if (newPos === -1) {
        // Token reached finish
        token.position = -1;
        token.isFinished = true;
        token.isHome = false;
    } else {
        token.position = newPos;
        token.isHome = false;

        // Check for capture — only on main track, not on safe spots
        if (newPos > 0 && newPos <= 52 && !SafeSpots.includes(newPos)) {
            for (const otherPlayer of gameState.players) {
                if (otherPlayer.userId === player.userId) continue;

                for (const otherToken of otherPlayer.tokens) {
                    if (otherToken.position === newPos && !otherToken.isFinished && !otherToken.isHome) {
                        // Capture! Send opponent's token back to home base
                        otherToken.position = 0;
                        otherToken.isHome = true;
                        captured = true;
                        capturedInfo = {
                            capturedUserId: otherPlayer.userId,
                            capturedTokenId: otherToken.id,
                            capturedColor: otherPlayer.color,
                        };
                        break;
                    }
                }
                if (captured) break;
            }
        }
    }

    return { gameState, captured, capturedInfo, from: oldPos, to: newPos };
};

// ─── Win Detection ────────────────────────────────────────────────────
/**
 * Check if a player has won
 * Classic: all tokens must reach finish
 * Quick: all tokens must reach finish (but only 2 tokens)
 */
const checkWinCondition = (gameState, playerIndex) => {
    const player = gameState.players[playerIndex];
    if (!player) return false;
    return player.tokens.every((t) => t.isFinished);
};

// ─── Turn Management ──────────────────────────────────────────────────
/**
 * Advance to next turn
 * Rules:
 * - Rolling a 6 gives an extra turn (unless 3 consecutive sixes)
 * - Capturing gives an extra turn
 * - Otherwise, next player
 */
const getNextTurn = (gameState, diceValue, captured, finished = false) => {
    // Three consecutive sixes: forfeit turn, skip to next
    if (diceValue === 6) {
        gameState.consecutiveSixes += 1;
        if (gameState.consecutiveSixes >= 3) {
            // Three sixes in a row — turn forfeited
            gameState.consecutiveSixes = 0;
            gameState.currentTurnIndex =
                (gameState.currentTurnIndex + 1) % gameState.players.length;
            gameState.diceRolled = false;
            gameState.currentDiceValue = null;
            return gameState;
        }
        // Extra turn for rolling 6
        gameState.diceRolled = false;
        gameState.currentDiceValue = null;
        return gameState;
    }

    if (captured) {
        // Extra turn for capturing
        gameState.consecutiveSixes = 0;
        gameState.diceRolled = false;
        gameState.currentDiceValue = null;
        return gameState;
    }

    if (finished) {
        // Extra turn for reaching home finish
        gameState.consecutiveSixes = 0;
        gameState.diceRolled = false;
        gameState.currentDiceValue = null;
        return gameState;
    }

    // Normal: next player
    gameState.consecutiveSixes = 0;
    gameState.currentTurnIndex =
        (gameState.currentTurnIndex + 1) % gameState.players.length;
    gameState.diceRolled = false;
    gameState.currentDiceValue = null;

    // Skip players who have already finished or been forfeited
    let attempts = 0;
    while (
        attempts < gameState.players.length &&
        (gameState.players[gameState.currentTurnIndex].tokens.every((t) => t.isFinished) ||
            gameState.players[gameState.currentTurnIndex].forfeited)
    ) {
        gameState.currentTurnIndex =
            (gameState.currentTurnIndex + 1) % gameState.players.length;
        attempts++;
    }

    return gameState;
};

// ─── Color Assignment ─────────────────────────────────────────────────
/**
 * Assign colors to players based on count
 * 2 players: blue, green (opposite corners)
 * 4 players: red, green, yellow, blue (all corners)
 */
const assignColors = (playerCount) => {
    if (playerCount === 2) {
        return ["blue", "green"];
    }
    return ["red", "green", "yellow", "blue"];
};

// ─── Payout Calculation ───────────────────────────────────────────────
/**
 * Calculate winner payout
 * winner gets (stake × players) × (1 - commission/100)
 */
const calculatePayout = (stakeAmount, playerCount, commissionPercent) => {
    const totalPot = stakeAmount * playerCount;
    const commission = totalPot * (commissionPercent / 100);
    const winAmount = totalPot - commission;
    return {
        totalPot: Number(totalPot.toFixed(2)),
        commission: Number(commission.toFixed(2)),
        winAmount: Number(winAmount.toFixed(2)),
    };
};

// ─── Serialization Helpers ────────────────────────────────────────────
/**
 * Serialize game state for client
 */
const serializeGameState = (gameState, roomData) => {
    return {
        players: gameState.players.map((p) => ({
            userId: p.userId,
            color: p.color,
            tokens: p.tokens.map((t) => ({
                id: t.id,
                position: t.position,
                isHome: t.isHome,
                isFinished: t.isFinished,
            })),
        })),
        currentTurnIndex: gameState.currentTurnIndex,
        currentPlayerUserId:
            gameState.players[gameState.currentTurnIndex]?.userId || null,
        currentDiceValue: gameState.currentDiceValue,
        diceRolled: gameState.diceRolled,
        status: gameState.status,
        winnerUserId: gameState.winnerUserId,
        mode: roomData?.mode || "classic",
        stakeAmount: roomData?.stakeAmount || 0,
        winAmount: roomData?.winAmount || 0,
    };
};

module.exports = {
    rollDice,
    createInitialState,
    getValidMoves,
    applyMove,
    checkWinCondition,
    getNextTurn,
    assignColors,
    calculatePayout,
    serializeGameState,
    getNextPosition,
    // Constants exports for client reference
    COLORS,
    colorConfig,
    SafeSpots,
    StarSpots,
    ArrowSpots,
    startingPoints,
    turningPoints,
    homeColumns,
    Plot1Data,
    Plot2Data,
    Plot3Data,
    Plot4Data,
};
