const LudoRoom = require("../models/LudoRoom");
const LudoGame = require("../models/LudoGame");
const User = require("../models/userModels");
const AppConfig = require("../models/appConfig");
const ludoService = require("../services/ludoService");
const ludoLogic = require("../utils/ludoGameLogic");
const logger = require("../utils/winstonLogger");

// In-memory turn timers per room
const turnTimers = new Map();
// In-memory disconnect timers per user
const disconnectTimers = new Map();
// Room timeout timers (waiting rooms)
const roomTimeouts = new Map();

const TURN_TIMEOUT_MS = 15000; // 15 seconds per turn
const DISCONNECT_GRACE_MS = 30000; // 30 seconds to reconnect
const ROOM_WAIT_TIMEOUT_MS = 300000; // 5 minutes waiting timeout
const MAX_CONSECUTIVE_TIMEOUTS = 3; // Forfeit after 3 consecutive timeouts

let isWatchingLudoRooms = false;

const emitLudoPlayerCounts = async (target) => {
    try {
        const activeRooms = await LudoRoom.find({
            status: { $in: ["waiting", "full", "playing"] }
        }).select("players playerCount");

        let count2p = 0;
        let count4p = 0;

        activeRooms.forEach(room => {
            if (room.playerCount === 2) {
                count2p += room.players.length;
            } else if (room.playerCount === 4) {
                count4p += room.players.length;
            }
        });

        target.emit("ludo:player_counts", { count2p, count4p });
    } catch (error) {
        logger.error("Error emitting ludo player counts", error);
    }
};

let ludoRoomChangeStream = null;
let appConfigChangeStream = null;

const watchLudoRooms = (io) => {
    if (isWatchingLudoRooms) return;
    isWatchingLudoRooms = true;

    try {
        ludoRoomChangeStream = LudoRoom.watch();
        ludoRoomChangeStream.on("change", async (change) => {
            try {
                if (["insert", "update", "delete", "replace"].includes(change.operationType)) {
                    const allRooms = await ludoService.getAvailableRooms();
                    io.emit("ludo:rooms", allRooms);
                    emitLudoPlayerCounts(io);
                }
            } catch (err) {
                logger.error("Error broadcasting Ludo rooms from change stream", err);
            }
        });

        ludoRoomChangeStream.on("error", (error) => {
            if (error.message?.includes('client was closed')) return;
            logger.error("LudoRoom change stream error", error);
            isWatchingLudoRooms = false;
        });
    } catch (err) {
        logger.error("Failed to initialize LudoRoom change stream", err);
    }
};

let isWatchingAppConfig = false;

const watchAppConfig = (io) => {
    if (isWatchingAppConfig) return;
    isWatchingAppConfig = true;

    try {
        appConfigChangeStream = AppConfig.watch();
        appConfigChangeStream.on("change", async (change) => {
            try {
                if (["insert", "update", "replace"].includes(change.operationType)) {
                    const cfg = await AppConfig.getConfig();
                    io.emit("ludo:settings", cfg.ludo || {});
                }
            } catch (err) {
                logger.error("Error broadcasting AppConfig changes to Ludo", err);
            }
        });

        appConfigChangeStream.on("error", (error) => {
            if (error.message?.includes('client was closed')) return;
            logger.error("AppConfig change stream error in Ludo", error);
            isWatchingAppConfig = false;
        });
    } catch (err) {
        logger.error("Failed to initialize AppConfig change stream in Ludo", err);
    }
};

/**
 * Initialize Ludo Socket handlers
 */
const initializeLudoSocket = (io) => {
    watchLudoRooms(io);
    watchAppConfig(io);
    recoverOrphanedRooms(io); // Clean up rooms stuck from previous server lifecycle

    io.on("connection", (socket) => {
        emitLudoPlayerCounts(socket);

        // Emit latest settings on connection so fresh users get sync'd immediately
        AppConfig.getConfig()
            .then(cfg => socket.emit("ludo:settings", cfg.ludo || {}))
            .catch(err => logger.error("Failed to emit initial ludo settings", err));

        // ──────────────────────────────────────────────
        // List available rooms
        // ──────────────────────────────────────────────
        socket.on("ludo:get_rooms", async (filters = {}) => {
            try {
                const rooms = await ludoService.getAvailableRooms(filters);
                socket.emit("ludo:rooms", rooms);
                emitLudoPlayerCounts(socket);
            } catch (error) {
                logger.error("Error fetching Ludo rooms", error);
                socket.emit("ludo:error", { message: "Failed to load rooms" });
            }
        });

        // ──────────────────────────────────────────────
        // Create a room
        // ──────────────────────────────────────────────
        socket.on("ludo:create_room", async ({ stakeAmount, mode, playerCount, userId }) => {
            try {
                if (!userId) {
                    socket.emit("ludo:error", { message: "Authentication required" });
                    return;
                }

                const room = await ludoService.createRoom({
                    userId,
                    stakeAmount: parseFloat(stakeAmount),
                    mode: mode || "classic",
                    playerCount: parseInt(playerCount) || 2,
                });

                socket.join(`ludo:${room._id}`);
                socket.ludoRoomId = room._id.toString();
                socket.userId = userId;

                socket.emit("ludo:room_created", {
                    roomId: room._id,
                    stakeAmount: room.stakeAmount,
                    mode: room.mode,
                    playerCount: room.playerCount,
                    players: room.players,
                    winAmount: room.winAmount,
                });

                // Broadcast updated room list to all
                const allRooms = await ludoService.getAvailableRooms();
                io.emit("ludo:rooms", allRooms);

                // Set room waiting timeout
                const timeoutId = setTimeout(async () => {
                    try {
                        const currentRoom = await LudoRoom.findById(room._id);
                        if (currentRoom && currentRoom.status === "waiting" && !currentRoom.gameId) {
                            await ludoService.cancelRoom(room._id, "Room timeout");
                            io.to(`ludo:${room._id}`).emit("ludo:room_cancelled", {
                                roomId: room._id,
                                reason: "Room expired due to timeout",
                            });
                            // Emit wallet updates to refunded players
                            for (const player of currentRoom.players) {
                                const u = await User.findById(player.userId).select("wallet bonus");
                                if (u) {
                                    io.to(player.userId.toString()).emit("walletUpdate", { wallet: u.wallet, bonus: u.bonus });
                                }
                            }
                            const updated = await ludoService.getAvailableRooms();
                            io.emit("ludo:rooms", updated);
                        }
                    } catch (err) {
                        logger.error("Room timeout error", err);
                    }
                }, ROOM_WAIT_TIMEOUT_MS);

                roomTimeouts.set(room._id.toString(), timeoutId);

            } catch (error) {
                logger.error("Error creating Ludo room", error);
                socket.emit("ludo:error", { message: error.message || "Failed to create room" });
            }
        });

        // ──────────────────────────────────────────────
        // Join a room
        // ──────────────────────────────────────────────
        socket.on("ludo:join_room", async ({ roomId, userId, stakeAmount, mode, playerCount }) => {
            try {
                if (!userId) {
                    socket.emit("ludo:error", { message: "Authentication required" });
                    return;
                }

                const room = await ludoService.joinRoom({
                    userId,
                    roomId,
                    stakeAmount: stakeAmount ? parseFloat(stakeAmount) : undefined,
                    mode,
                    playerCount: playerCount ? parseInt(playerCount) : undefined,
                });

                socket.join(`ludo:${room._id}`);
                socket.ludoRoomId = room._id.toString();
                socket.userId = userId;

                // Notify all players in room
                io.to(`ludo:${room._id}`).emit("ludo:room_update", {
                    roomId: room._id,
                    players: room.players,
                    status: room.status,
                    stakeAmount: room.stakeAmount,
                    mode: room.mode,
                    playerCount: room.playerCount,
                    winAmount: room.winAmount,
                    creatorUserId: room.creatorUserId,
                });

                // Broadcast updated room list
                const allRooms = await ludoService.getAvailableRooms();
                io.emit("ludo:rooms", allRooms);

                // If room is full, start the game
                if (room.status === "full") {
                    // Clear room timeout
                    const timeoutId = roomTimeouts.get(room._id.toString());
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        roomTimeouts.delete(room._id.toString());
                    }

                    // Short delay for client readiness
                    setTimeout(async () => {
                        try {
                            await startLudoGame(io, room._id.toString());
                        } catch (err) {
                            logger.error("Error starting Ludo game after room full", err);
                        }
                    }, 1500);
                }

            } catch (error) {
                logger.error("Error joining Ludo room", error);
                socket.emit("ludo:error", { message: error.message || "Failed to join room" });
            }
        });

        // ──────────────────────────────────────────────
        // Dice Roll
        // ──────────────────────────────────────────────
        socket.on("ludo:dice_roll", async ({ roomId, userId }) => {
            try {
                const game = await LudoGame.findOne({ roomId, status: "playing" });
                if (!game) {
                    socket.emit("ludo:error", { message: "Game not found" });
                    return;
                }

                // Validate it's this player's turn
                const currentPlayer = game.players[game.currentTurnIndex];
                if (!currentPlayer || currentPlayer.userId.toString() !== userId) {
                    socket.emit("ludo:error", { message: "Not your turn" });
                    return;
                }

                if (game.diceRolled) {
                    socket.emit("ludo:error", { message: "Already rolled" });
                    return;
                }

                const diceValue = ludoLogic.rollDice();

                // Reset consecutive timeout counter — player is active
                currentPlayer.consecutiveTimeouts = 0;

                // Save dice roll
                game.currentDiceValue = diceValue;
                game.diceRolled = true;
                game.diceRolls.push({
                    userId,
                    value: diceValue,
                    timestamp: new Date(),
                });

                // Get valid moves
                const validMoves = ludoLogic.getValidMoves(
                    { players: game.players, currentTurnIndex: game.currentTurnIndex },
                    game.currentTurnIndex,
                    diceValue
                );

                await game.save();

                // Clear existing turn timer
                clearTurnTimer(roomId);

                // Emit dice result to all players
                io.to(`ludo:${roomId}`).emit("ludo:dice_result", {
                    userId,
                    value: diceValue,
                    validMoves,
                    currentTurnIndex: game.currentTurnIndex,
                });

                // If no valid moves, auto-skip after a short delay
                if (validMoves.length === 0) {
                    setTimeout(async () => {
                        try {
                            await autoAdvanceTurn(io, roomId, diceValue, false);
                        } catch (err) {
                            logger.error("Error auto-advancing turn", err);
                        }
                    }, 1500);
                } else {
                    // Start turn timer for move selection
                    startTurnTimer(io, roomId, userId);
                }

            } catch (error) {
                logger.error("Error in ludo:dice_roll", error);
                socket.emit("ludo:error", { message: "Failed to roll dice" });
            }
        });

        // ──────────────────────────────────────────────
        // Move Token
        // ──────────────────────────────────────────────
        socket.on("ludo:move_token", async ({ roomId, userId, tokenId }) => {
            try {
                const game = await LudoGame.findOne({ roomId, status: "playing" });
                if (!game) {
                    socket.emit("ludo:error", { message: "Game not found" });
                    return;
                }

                const currentPlayer = game.players[game.currentTurnIndex];
                if (!currentPlayer || currentPlayer.userId.toString() !== userId) {
                    socket.emit("ludo:error", { message: "Not your turn" });
                    return;
                }

                if (!game.diceRolled || game.currentDiceValue === null) {
                    socket.emit("ludo:error", { message: "Roll the dice first" });
                    return;
                }

                // Validate move
                const validMoves = ludoLogic.getValidMoves(
                    { players: game.players, currentTurnIndex: game.currentTurnIndex },
                    game.currentTurnIndex,
                    game.currentDiceValue
                );

                const selectedMove = validMoves.find((m) => m.tokenId === tokenId);
                if (!selectedMove) {
                    socket.emit("ludo:error", { message: "Invalid move" });
                    return;
                }

                // Apply move
                // Reset consecutive timeout counter — player is active
                currentPlayer.consecutiveTimeouts = 0;

                const gameState = {
                    players: game.players,
                    currentTurnIndex: game.currentTurnIndex,
                    consecutiveSixes: game.consecutiveSixes,
                    diceRolled: game.diceRolled,
                    currentDiceValue: game.currentDiceValue,
                };

                const { captured, capturedInfo, from, to } = ludoLogic.applyMove(
                    gameState,
                    game.currentTurnIndex,
                    tokenId,
                    game.currentDiceValue
                );

                // Log the move
                game.moves.push({
                    userId,
                    tokenId,
                    from: from,
                    to: to === -1 ? 999 : to, // 999 = finished
                    captured,
                    capturedUserId: capturedInfo?.capturedUserId || null,
                    capturedTokenId: capturedInfo?.capturedTokenId ?? null,
                    timestamp: new Date(),
                });

                // Update game players state
                game.players = gameState.players;

                // Clear turn timer
                clearTurnTimer(roomId);

                // Check win condition
                const hasWon = ludoLogic.checkWinCondition(gameState, game.currentTurnIndex);

                if (hasWon) {
                    game.winnerUserId = userId;
                    game.status = "ended";
                    await game.save();

                    // Process payout
                    const room = await ludoService.processWinPayout(roomId, userId);

                    const winner = await User.findById(userId).select("fullName wallet");

                    io.to(`ludo:${roomId}`).emit("ludo:token_moved", {
                        userId,
                        tokenId,
                        from,
                        to: to === -1 ? "finish" : to,
                        captured,
                        capturedInfo,
                        players: game.players,
                    });

                    io.to(`ludo:${roomId}`).emit("ludo:game_end", {
                        winnerUserId: userId,
                        winnerName: winner?.fullName || "Player",
                        winAmount: room.winAmount,
                        stakeAmount: room.stakeAmount,
                        mode: room.mode,
                        playerCount: room.playerCount,
                    });

                    // Emit wallet updates
                    for (const player of room.players) {
                        const u = await User.findById(player.userId).select("wallet bonus");
                        if (u) {
                            io.to(player.userId.toString()).emit("walletUpdate", { wallet: u.wallet, bonus: u.bonus });
                        }
                    }

                    // Update room list
                    const allRooms = await ludoService.getAvailableRooms();
                    io.emit("ludo:rooms", allRooms);

                    logger.info(`Ludo game ended: room ${roomId}, winner ${userId}`);
                    return;
                }

                // Advance turn
                const diceValue = game.currentDiceValue;
                const finished = to === -1;
                ludoLogic.getNextTurn(gameState, diceValue, captured, finished);
                game.currentTurnIndex = gameState.currentTurnIndex;
                game.consecutiveSixes = gameState.consecutiveSixes;
                game.diceRolled = false;
                game.currentDiceValue = null;
                game.lastTurnAt = new Date();

                await game.save();

                // Emit move result
                io.to(`ludo:${roomId}`).emit("ludo:token_moved", {
                    userId,
                    tokenId,
                    from,
                    to: to === -1 ? "finish" : to,
                    captured,
                    capturedInfo,
                    players: game.players,
                });

                // Emit turn change
                const nextPlayer = game.players[game.currentTurnIndex];
                io.to(`ludo:${roomId}`).emit("ludo:turn_change", {
                    currentTurnIndex: game.currentTurnIndex,
                    currentPlayerUserId: nextPlayer?.userId,
                    currentPlayerColor: nextPlayer?.color,
                });

                // Start new turn timer
                startTurnTimer(io, roomId, nextPlayer?.userId?.toString());

            } catch (error) {
                logger.error("Error in ludo:move_token", error);
                socket.emit("ludo:error", { message: "Failed to move token" });
            }
        });

        // ──────────────────────────────────────────────
        // Check if user has an active game (for lobby rejoin banner)
        // ──────────────────────────────────────────────
        socket.on("ludo:check_active_game", async ({ userId }) => {
            try {
                if (!userId) {
                    socket.emit("ludo:active_game", null);
                    return;
                }
                const activeRoom = await LudoRoom.findOne({
                    "players.userId": userId,
                    status: { $in: ["waiting", "full", "playing"] },
                }).select("_id stakeAmount mode playerCount status creatorUserId");

                if (activeRoom) {
                    socket.emit("ludo:active_game", {
                        roomId: activeRoom._id,
                        stakeAmount: activeRoom.stakeAmount,
                        mode: activeRoom.mode,
                        playerCount: activeRoom.playerCount,
                        status: activeRoom.status,
                        creatorUserId: activeRoom.creatorUserId,
                    });
                } else {
                    socket.emit("ludo:active_game", null);
                }
            } catch (err) {
                logger.error("Error checking active Ludo game", err);
                socket.emit("ludo:active_game", null);
            }
        });

        // ──────────────────────────────────────────────
        // Cancel room (creator only, waiting rooms)
        // ──────────────────────────────────────────────
        socket.on("ludo:cancel_room", async ({ roomId, userId }) => {
            try {
                if (!userId || !roomId) {
                    socket.emit("ludo:error", { message: "Invalid request" });
                    return;
                }
                const room = await LudoRoom.findById(roomId);
                if (!room) {
                    socket.emit("ludo:error", { message: "Room not found" });
                    return;
                }
                if (room.creatorUserId?.toString() !== userId) {
                    socket.emit("ludo:error", { message: "Only the room creator can cancel" });
                    return;
                }
                if (room.status !== "waiting") {
                    socket.emit("ludo:error", { message: "Cannot cancel — game already started" });
                    return;
                }

                // Clear room timeout timer
                const timeoutId = roomTimeouts.get(roomId.toString());
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    roomTimeouts.delete(roomId.toString());
                }

                await ludoService.cancelRoom(roomId, "Creator cancelled");

                io.to(`ludo:${roomId}`).emit("ludo:room_cancelled", {
                    roomId,
                    reason: "Room cancelled by creator",
                });

                // Emit wallet updates to refunded players
                for (const player of room.players) {
                    const u = await User.findById(player.userId).select("wallet bonus");
                    if (u) {
                        io.to(player.userId.toString()).emit("walletUpdate", { wallet: u.wallet, bonus: u.bonus });
                    }
                }

                const allRooms = await ludoService.getAvailableRooms();
                io.emit("ludo:rooms", allRooms);

                logger.info(`Ludo room ${roomId} cancelled by creator ${userId}`);
            } catch (error) {
                logger.error("Error in ludo:cancel_room", error);
                socket.emit("ludo:error", { message: error.message || "Failed to cancel room" });
            }
        });

        // ──────────────────────────────────────────────
        // Rejoin game (after disconnect/refresh)
        // ──────────────────────────────────────────────
        socket.on("ludo:rejoin", async ({ roomId, userId }) => {
            try {
                socket.join(`ludo:${roomId}`);
                socket.ludoRoomId = roomId;
                socket.userId = userId; // Fix: set userId for disconnect handler

                // Clear disconnect timer
                const dKey = `${roomId}:${userId}`;
                if (disconnectTimers.has(dKey)) {
                    clearTimeout(disconnectTimers.get(dKey));
                    disconnectTimers.delete(dKey);
                }

                const room = await LudoRoom.findById(roomId);
                if (!room) {
                    socket.emit("ludo:error", { message: "Room not found" });
                    return;
                }

                if (room.status === "playing" && room.gameId) {
                    const game = await LudoGame.findById(room.gameId);
                    if (game) {
                        const validMoves =
                            game.diceRolled && game.players[game.currentTurnIndex]?.userId?.toString() === userId
                                ? ludoLogic.getValidMoves(
                                    { players: game.players, currentTurnIndex: game.currentTurnIndex },
                                    game.currentTurnIndex,
                                    game.currentDiceValue
                                )
                                : [];

                        socket.emit("ludo:game_state", {
                            roomId: room._id,
                            stakeAmount: room.stakeAmount,
                            mode: room.mode,
                            playerCount: room.playerCount,
                            winAmount: room.winAmount,
                            players: game.players,
                            currentTurnIndex: game.currentTurnIndex,
                            currentPlayerUserId: game.players[game.currentTurnIndex]?.userId,
                            currentDiceValue: game.currentDiceValue,
                            diceRolled: game.diceRolled,
                            status: game.status,
                            validMoves,
                        });
                    }
                } else if (room.status === "ended") {
                    socket.emit("ludo:game_end", {
                        winnerUserId: room.winnerUserId,
                        winAmount: room.winAmount,
                        stakeAmount: room.stakeAmount,
                        mode: room.mode,
                        playerCount: room.playerCount,
                    });
                } else if (room.status === "cancelled") {
                    socket.emit("ludo:room_cancelled", {
                        roomId: room._id,
                        reason: "Room was cancelled",
                    });
                } else {
                    socket.emit("ludo:room_update", {
                        roomId: room._id,
                        players: room.players,
                        status: room.status,
                        stakeAmount: room.stakeAmount,
                        mode: room.mode,
                        playerCount: room.playerCount,
                        winAmount: room.winAmount,
                        creatorUserId: room.creatorUserId,
                    });
                }
            } catch (error) {
                logger.error("Error in ludo:rejoin", error);
                socket.emit("ludo:error", { message: "Failed to rejoin" });
            }
        });

        // ──────────────────────────────────────────────
        // Handle disconnect
        // ──────────────────────────────────────────────
        socket.on("disconnect", () => {
            const roomId = socket.ludoRoomId;
            const userId = socket.userId || socket.handshake?.auth?.userId;

            if (roomId && userId) {
                const dKey = `${roomId}:${userId}`;
                const timerId = setTimeout(async () => {
                    try {
                        const game = await LudoGame.findOne({ roomId, status: "playing" });
                        if (!game) return;

                        // Check if player reconnected on a different socket
                        const sockets = await io.in(`ludo:${roomId}`).fetchSockets();
                        const hasReconnected = sockets.some(
                            (s) => (s.userId === userId || s.handshake?.auth?.userId === userId) && s.id !== socket.id
                        );

                        if (!hasReconnected) {
                            logger.info(`Player ${userId} disconnected from Ludo room ${roomId}, auto-advancing turn`);
                            const currentPlayer = game.players[game.currentTurnIndex];
                            if (currentPlayer?.userId?.toString() === userId) {
                                await autoAdvanceTurn(io, roomId, 0, false);
                            }
                        }
                    } catch (err) {
                        logger.error("Disconnect handler error", err);
                    }
                    disconnectTimers.delete(dKey);
                }, DISCONNECT_GRACE_MS);

                disconnectTimers.set(dKey, timerId);
            }
        });
    });
};

// ─── Helper: Start Game ──────────────────────────────────────────────
async function startLudoGame(io, roomId) {
    try {
        const { room, game } = await ludoService.startGame(roomId);

        const firstPlayer = game.players[0];

        io.to(`ludo:${roomId}`).emit("ludo:game_start", {
            roomId: room._id,
            stakeAmount: room.stakeAmount,
            mode: room.mode,
            playerCount: room.playerCount,
            winAmount: room.winAmount,
            players: game.players,
            currentTurnIndex: 0,
            currentPlayerUserId: firstPlayer?.userId,
            currentPlayerColor: firstPlayer?.color,
        });

        // Emit wallet updates to all players
        for (const player of room.players) {
            const u = await User.findById(player.userId).select("wallet bonus");
            if (u) {
                io.to(player.userId.toString()).emit("walletUpdate", { wallet: u.wallet, bonus: u.bonus });
            }
        }

        // Start turn timer
        startTurnTimer(io, roomId, firstPlayer?.userId?.toString());

        // Update room list
        const allRooms = await ludoService.getAvailableRooms();
        io.emit("ludo:rooms", allRooms);

    } catch (error) {
        logger.error(`Error starting Ludo game for room ${roomId}`, error);
        io.to(`ludo:${roomId}`).emit("ludo:error", {
            message: "Failed to start game: " + error.message,
        });
    }
}

// ─── Helper: Turn Timer ──────────────────────────────────────────────
function startTurnTimer(io, roomId, userId) {
    clearTurnTimer(roomId);

    const timerId = setTimeout(async () => {
        try {
            logger.info(`Turn timeout for user ${userId} in room ${roomId}`);
            await autoAdvanceTurn(io, roomId, 0, false);
        } catch (err) {
            logger.error("Turn timer error", err);
        }
    }, TURN_TIMEOUT_MS);

    turnTimers.set(roomId.toString(), timerId);
}

function clearTurnTimer(roomId) {
    const timerId = turnTimers.get(roomId?.toString());
    if (timerId) {
        clearTimeout(timerId);
        turnTimers.delete(roomId.toString());
    }
}

// ─── Helper: Auto-advance turn (with forfeit tracking) ──────────────
async function autoAdvanceTurn(io, roomId, diceValue, captured) {
    try {
        const game = await LudoGame.findOne({ roomId, status: "playing" });
        if (!game) return;

        const timedOutPlayer = game.players[game.currentTurnIndex];
        if (!timedOutPlayer) return;

        // Track consecutive timeouts for this player
        timedOutPlayer.consecutiveTimeouts = (timedOutPlayer.consecutiveTimeouts || 0) + 1;

        // Check if player should be forfeited
        if (timedOutPlayer.consecutiveTimeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
            const timedOutUserId = timedOutPlayer.userId.toString();
            logger.info(`Player ${timedOutUserId} forfeited in room ${roomId} after ${MAX_CONSECUTIVE_TIMEOUTS} consecutive timeouts`);

            // Mark all tokens as finished (forfeited — they lose)
            timedOutPlayer.tokens.forEach((t) => {
                t.isFinished = true;
                t.isHome = false;
                t.position = -1;
            });
            timedOutPlayer.forfeited = true;
            timedOutPlayer.consecutiveTimeouts = 0; // Reset for good measure

            // Notify clients of forfeit
            io.to(`ludo:${roomId}`).emit("ludo:player_forfeited", {
                userId: timedOutUserId,
                color: timedOutPlayer.color,
                reason: `Forfeited after ${MAX_CONSECUTIVE_TIMEOUTS} consecutive timeouts`,
            });

            // Check if only one active player remains — they win
            const activePlayers = game.players.filter(
                (p) => !p.forfeited && !p.tokens.every((t) => t.isFinished)
            );

            if (activePlayers.length <= 1 && activePlayers.length > 0) {
                const winnerId = activePlayers[0].userId.toString();
                game.winnerUserId = winnerId;
                game.status = "ended";
                await game.save();

                const room = await ludoService.processWinPayout(roomId, winnerId);
                const winner = await User.findById(winnerId).select("fullName wallet");

                io.to(`ludo:${roomId}`).emit("ludo:game_end", {
                    winnerUserId: winnerId,
                    winnerName: winner?.fullName || "Player",
                    winAmount: room.winAmount,
                    stakeAmount: room.stakeAmount,
                    mode: room.mode,
                    playerCount: room.playerCount,
                });

                for (const player of room.players) {
                    const u = await User.findById(player.userId).select("wallet bonus");
                    if (u) {
                        io.to(player.userId.toString()).emit("walletUpdate", { wallet: u.wallet, bonus: u.bonus });
                    }
                }

                const allRooms = await ludoService.getAvailableRooms();
                io.emit("ludo:rooms", allRooms);
                clearTurnTimer(roomId);
                return;
            }
        }

        const gameState = {
            players: game.players,
            currentTurnIndex: game.currentTurnIndex,
            consecutiveSixes: game.consecutiveSixes || 0,
            diceRolled: false,
            currentDiceValue: null,
        };

        ludoLogic.getNextTurn(gameState, diceValue, captured);

        // Skip forfeited players
        let attempts = 0;
        while (
            attempts < gameState.players.length &&
            gameState.players[gameState.currentTurnIndex]?.forfeited
        ) {
            gameState.currentTurnIndex =
                (gameState.currentTurnIndex + 1) % gameState.players.length;
            attempts++;
        }

        game.currentTurnIndex = gameState.currentTurnIndex;
        game.consecutiveSixes = gameState.consecutiveSixes;
        game.diceRolled = false;
        game.currentDiceValue = null;
        game.lastTurnAt = new Date();
        await game.save();

        const nextPlayer = game.players[game.currentTurnIndex];

        io.to(`ludo:${roomId}`).emit("ludo:turn_change", {
            currentTurnIndex: game.currentTurnIndex,
            currentPlayerUserId: nextPlayer?.userId,
            currentPlayerColor: nextPlayer?.color,
            reason: "timeout",
        });

        startTurnTimer(io, roomId, nextPlayer?.userId?.toString());
    } catch (err) {
        logger.error("Auto-advance turn error", err);
    }
}

// ─── Startup: Recover orphaned rooms ─────────────────────────────────
async function recoverOrphanedRooms(io) {
    try {
        const fiveMinAgo = new Date(Date.now() - ROOM_WAIT_TIMEOUT_MS);
        const staleRooms = await LudoRoom.find({
            status: "waiting",
            createdAt: { $lt: fiveMinAgo },
        });

        for (const room of staleRooms) {
            try {
                await ludoService.cancelRoom(room._id, "Server restart recovery");
                // Emit wallet updates to refunded players
                for (const player of room.players) {
                    const u = await User.findById(player.userId).select("wallet bonus");
                    if (u) {
                        io.to(player.userId.toString()).emit("walletUpdate", { wallet: u.wallet, bonus: u.bonus });
                    }
                }
                logger.info(`Recovered orphaned Ludo room: ${room._id}`);
            } catch (err) {
                logger.error(`Failed to recover orphaned Ludo room ${room._id}`, err);
            }
        }

        if (staleRooms.length > 0) {
            const allRooms = await ludoService.getAvailableRooms();
            io.emit("ludo:rooms", allRooms);
        }

        logger.info(`Ludo startup recovery: processed ${staleRooms.length} orphaned rooms`);
    } catch (err) {
        logger.error("Error in Ludo startup recovery", err);
    }
}
const closeStream = async (name, streamRef) => {
    if (!streamRef.current) return;

    try {
        await streamRef.current.close();
        logger.info(`Closed ${name} change stream`);
    } catch (error) {
        if (!error.message?.includes("client was closed")) {
            logger.error(`Failed to close ${name} change stream`, error);
        }
    } finally {
        streamRef.current = null;
    }
};

const closeLudoChangeStreams = async () => {
    await Promise.all([
        closeStream("LudoRoom", ludoRoomChangeStream),
        closeStream("AppConfig", appConfigChangeStream),
    ]);
};

module.exports = { initializeLudoSocket, closeLudoChangeStreams };
