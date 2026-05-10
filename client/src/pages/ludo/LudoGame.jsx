import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/socketContext";
import { toast } from "sonner";
import LudoBoard from "./LudoBoard";
import LudoDice from "./LudoDice";
import LudoWinnerModal from "./LudoWinnerModal";
import LudoWaiting from "./LudoWaiting";
import { useLudoSound } from "./useLudoSound";
import "../../styles/ludo.css";

const PILE_IMAGES = {
    red: "/piles/red.png",
    green: "/piles/green.png",
    yellow: "/piles/yellow.png",
    blue: "/piles/blue.png",
};

const COLOR_HEX = {
    red: "#ff3b30",
    green: "#116f4d",
    yellow: "#f8d517",
    blue: "#22409A",
};

const LudoGame = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const socket = useSocket();
    const { playSound, stopAll } = useLudoSound();

    const [gameState, setGameState] = useState(null);
    const [roomData, setRoomData] = useState(null);
    const [validMoves, setValidMoves] = useState([]);
    const [winner, setWinner] = useState(null);
    const [isWaiting, setIsWaiting] = useState(true);
    const [turnTimer, setTurnTimer] = useState(15);
    const [isRolling, setIsRolling] = useState(false);
    const [moveHistory, setMoveHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [cancelConfirm, setCancelConfirm] = useState(false); // still used in-game screen if needed
    const [backConfirm, setBackConfirm] = useState(false);
    const timerRef = useRef(null);

    const userId = user?._id;

    // Find my color
    const myColor = gameState?.players?.find(
        (p) => p.userId?.toString?.() === userId || p.userId === userId
    )?.color;

    const currentPlayer = gameState?.players?.[gameState?.currentTurnIndex];
    const isMyTurn =
        currentPlayer &&
        (currentPlayer.userId?.toString?.() === userId ||
            currentPlayer.userId === userId);

    // ─── Turn Timer ────────────────────────────────
    useEffect(() => {
        if (!isMyTurn || winner) {
            clearInterval(timerRef.current);
            return;
        }
        setTurnTimer(15);
        timerRef.current = setInterval(() => {
            setTurnTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [isMyTurn, gameState?.currentTurnIndex, winner]);

    // ─── Socket Events ─────────────────────────────
    useEffect(() => {
        if (!socket || !roomId || !userId) return;

        // Rejoin on connect
        const rejoin = () => {
            socket.emit("ludo:rejoin", { roomId, userId });
        };

        if (socket.connected) rejoin();
        socket.on("connect", rejoin);

        // Room update (waiting phase)
        const handleRoomUpdate = (data) => {
            if (data.roomId?.toString() !== roomId) return;
            setRoomData(data);
            setIsWaiting(true);
        };

        // Game start
        const handleGameStart = (data) => {
            if (data.roomId?.toString() !== roomId) return;
            setGameState(data);
            setRoomData(data);
            setIsWaiting(false);
            setValidMoves([]);
            playSound("game_start", 0.4);
        };

        // Full game state (rejoin)
        const handleGameState = (data) => {
            if (data.roomId?.toString() !== roomId) return;
            setGameState(data);
            setRoomData(data);
            setIsWaiting(false);
            if (data.validMoves) setValidMoves(data.validMoves);
            if (data.status === "ended") {
                setWinner(data);
            }
        };

        // Dice result
        const handleDiceResult = (data) => {
            setIsRolling(false);
            setGameState((prev) => {
                if (!prev) return prev;
                return { ...prev, currentDiceValue: data.value, diceRolled: true };
            });
            setValidMoves(data.validMoves || []);
        };

        // Token moved
        const handleTokenMoved = (data) => {
            setGameState((prev) => {
                if (!prev) return prev;
                return { ...prev, players: data.players };
            });
            setValidMoves([]);

            // Play sound effects
            const SAFE_SPOTS = [1, 9, 14, 22, 27, 35, 40, 48];
            if (data.captured) {
                playSound("collide", 0.5);
            } else if (data.to === "finish") {
                playSound("home_win", 0.5);
            } else if (SAFE_SPOTS.includes(data.to)) {
                playSound("safe_spot", 0.4);
            } else {
                playSound("pile_move", 0.3);
            }

            // Add to move history
            setMoveHistory((prev) => [
                ...prev,
                {
                    userId: data.userId,
                    tokenId: data.tokenId,
                    from: data.from,
                    to: data.to,
                    captured: data.captured,
                },
            ]);
        };

        // Turn change
        const handleTurnChange = (data) => {
            setGameState((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    currentTurnIndex: data.currentTurnIndex,
                    diceRolled: false,
                    currentDiceValue: null,
                };
            });
            setValidMoves([]);

            if (data.currentPlayerUserId === userId) {
                playSound("ui", 0.4);
            }
        };

        // Game end
        const handleGameEnd = (data) => {
            setWinner(data);
            clearInterval(timerRef.current);
        };

        // Error
        const handleError = (data) => {
            toast.error(data?.message || "Something went wrong");
        };

        // Handle room cancellation
        const handleRoomCancelled = (data) => {
            toast.error(data.reason || "Room was cancelled");
            navigate("/ludo");
        };

        socket.on("ludo:room_update", handleRoomUpdate);
        socket.on("ludo:game_start", handleGameStart);
        socket.on("ludo:game_state", handleGameState);
        socket.on("ludo:dice_result", handleDiceResult);
        socket.on("ludo:token_moved", handleTokenMoved);
        socket.on("ludo:turn_change", handleTurnChange);
        socket.on("ludo:game_end", handleGameEnd);
        socket.on("ludo:error", handleError);
        socket.on("ludo:room_cancelled", handleRoomCancelled);

        // Player forfeited (3 consecutive timeouts)
        const handlePlayerForfeited = (data) => {
            const isSelf = data.userId === userId;
            toast(
                isSelf
                    ? "You were forfeited for inactivity!"
                    : `${data.color} player forfeited for inactivity!`,
                { icon: "⚠️", duration: 4000 }
            );
            // Update players state if game state available
            setGameState((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    players: prev.players.map((p) =>
                        p.userId === data.userId || p.userId?.toString?.() === data.userId
                            ? { ...p, forfeited: true, tokens: p.tokens.map((t) => ({ ...t, isFinished: true, position: -1, isHome: false })) }
                            : p
                    ),
                };
            });
        };
        socket.on("ludo:player_forfeited", handlePlayerForfeited);

        return () => {
            socket.off("connect", rejoin);
            socket.off("ludo:room_update", handleRoomUpdate);
            socket.off("ludo:game_start", handleGameStart);
            socket.off("ludo:game_state", handleGameState);
            socket.off("ludo:dice_result", handleDiceResult);
            socket.off("ludo:token_moved", handleTokenMoved);
            socket.off("ludo:turn_change", handleTurnChange);
            socket.off("ludo:game_end", handleGameEnd);
            socket.off("ludo:error", handleError);
            socket.off("ludo:player_forfeited", handlePlayerForfeited);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, roomId, userId]);

    // ─── Handlers ──────────────────────────────────
    const handleDiceRoll = useCallback(() => {
        if (!isMyTurn || isRolling) return;
        setIsRolling(true);
        playSound("dice_roll", 0.5);
        socket.emit("ludo:dice_roll", { roomId, userId });
    }, [socket, roomId, userId, isMyTurn, isRolling, playSound]);

    const handleTokenClick = useCallback(
        (tokenId) => {
            if (!isMyTurn || validMoves.length === 0) return;
            const move = validMoves.find((m) => m.tokenId === tokenId);
            if (!move) return;
            socket.emit("ludo:move_token", { roomId, userId, tokenId });
            setValidMoves([]);
        },
        [socket, roomId, userId, isMyTurn, validMoves]
    );

    const handlePlayAgain = useCallback(() => {
        setWinner(null);
        stopAll();
        navigate("/ludo");
    }, [navigate, stopAll]);

    const handleReload = useCallback(() => {
        socket.emit("ludo:rejoin", { roomId, userId });
        toast("Reconnecting...", { icon: "🔄" });
    }, [socket, roomId, userId]);

    // ─── Waiting Screen ────────────────────────────
    if (isWaiting && !gameState?.players?.length) {
        return (
            <LudoWaiting
                roomId={roomId}
                roomData={roomData}
                userId={userId}
                socket={socket}
            />
        );
    }

    // ─── Game Screen ───────────────────────────────
    const players = gameState?.players || [];

    return (
        <div className="ludo-game-page">
            {/* Header */}
            <div className="ludo-game-header">
                {backConfirm ? (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ color: "var(--color-bingo-muted)", fontSize: "0.82rem" }}>Leave game?</span>
                        <button
                            className="ludo-game-header__back"
                            style={{ background: "var(--color-bingo-red)", borderColor: "var(--color-bingo-red)", color: "white" }}
                            onClick={() => navigate("/ludo")}
                        >
                            Yes
                        </button>
                        <button
                            className="ludo-game-header__back"
                            onClick={() => setBackConfirm(false)}
                        >
                            No
                        </button>
                    </div>
                ) : (
                    <button
                        className="ludo-game-header__back"
                        onClick={() => {
                            if (gameState?.status === "playing") {
                                setBackConfirm(true);
                            } else {
                                navigate("/ludo");
                            }
                        }}
                    >
                        🔙
                    </button>
                )}
            </div>

            {/* Player Cards are now integrated into the bottom layout */}

            {/* Main Game Area Container */}
            <div className="ludo-main-area">
                {/* Board */}
                <div className="ludo-board-wrapper">
                    <LudoBoard
                        players={players}
                        onTokenClick={handleTokenClick}
                        validMoves={validMoves}
                        currentPlayerColor={currentPlayer?.color}
                        myColor={myColor}
                        isMyTurn={isMyTurn}
                    />
                </div>

                {/* Turn Indicator & Timer */}
                <div className="ludo-turn-info">
                    {/* Turn info removed to match target directly */}
                </div>

                {/* Bottom Controls / Dice Area */}
                <div className="ludo-player-controls-area">
                    {/* Me (Left) */}
                    {players.filter(p => p.userId?.toString() === userId || p.userId === userId).map(p => {
                        const isMyTurnActive = gameState.currentTurnIndex === players.indexOf(p);
                        return (
                            <div key={`me-${p.color}`} className={`ludo-my-player-info ${isMyTurnActive ? "ludo-bottom-player--active" : ""}`} style={isMyTurnActive ? { textShadow: `0 0 10px ${COLOR_HEX[p.color]}` } : {}}>
                                <img src={PILE_IMAGES[p.color]} alt="Me" className="ludo-my-avatar" />
                                <span>You</span>
                            </div>
                        );
                    })}

                    <div className="ludo-dice-container">
                        <LudoDice
                            value={gameState?.currentDiceValue || 1}
                            canRoll={isMyTurn && !gameState?.diceRolled}
                            onRoll={handleDiceRoll}
                            disabled={!isMyTurn || gameState?.diceRolled}
                            isRolling={isRolling}
                        />
                        {isMyTurn && (
                            <div className="ludo-turn-timer-active">
                                {turnTimer}s
                            </div>
                        )}
                    </div>

                    {/* Opponent (Right) */}
                    {players.filter((p) => p.userId?.toString() !== userId && p.userId !== userId).slice(0, 1).map((p) => {
                        const actualIndex = players.findIndex(player => player.userId === p.userId);
                        const isOpponentTurn = gameState.currentTurnIndex === actualIndex;
                        return (
                            <div key={`opp-${p.color}`} className={`ludo-my-player-info ${isOpponentTurn ? "ludo-bottom-player--active" : ""}`} style={isOpponentTurn ? { textShadow: `0 0 10px ${COLOR_HEX[p.color]}` } : {}}>
                                <img src={PILE_IMAGES[p.color]} alt="Opp" className="ludo-my-avatar" />
                                <span>{p.userId?.fullName?.split(" ")?.[0] || 'Opponent'}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="ludo-bottom-controls">
                <button className="ludo-reload-btn" onClick={handleReload}>
                    🔄 Reload
                </button>
                <button
                    className="ludo-reload-btn"
                    onClick={() => setShowHistory(!showHistory)}
                >
                    📋 History ({moveHistory.length})
                </button>
            </div>

            {/* Move History */}
            {showHistory && moveHistory.length > 0 && (
                <div className="ludo-move-history">
                    <div className="ludo-move-history__list">
                        {moveHistory
                            .slice(-20)
                            .reverse()
                            .map((m, i) => (
                                <div key={i} className="ludo-move-history__item">
                                    Token {m.tokenId + 1}: {m.from} → {m.to}
                                    {m.captured ? " 💥 Capture!" : ""}
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Winner Modal */}
            {winner && (
                <LudoWinnerModal
                    winnerName={winner.winnerName || "Player"}
                    winAmount={winner.winAmount}
                    isWinner={
                        winner.winnerUserId === userId ||
                        winner.winnerUserId?.toString?.() === userId
                    }
                    stakeAmount={winner.stakeAmount || roomData?.stakeAmount}
                    mode={winner.mode || roomData?.mode}
                    onPlayAgain={handlePlayAgain}
                />
            )}
        </div>
    );
};

export default LudoGame;
