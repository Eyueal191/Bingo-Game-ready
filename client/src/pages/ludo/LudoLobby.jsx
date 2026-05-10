import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/socketContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAppConfig } from "../../contexts/AppConfigContext";
import { useWallet } from "../../contexts/WalletContext";
import "../../styles/ludo.css";

const PILE_IMAGES = {
    red: "/piles/red.png",
    green: "/piles/green.png",
    yellow: "/piles/yellow.png",
    blue: "/piles/blue.png",
};

const GAME_MODES = [
    { id: "sprint", label: "Sprint", crowns: 1, desc: "1 token — fastest" },
    { id: "quick", label: "Quick", crowns: 2, desc: "2 tokens — fast" },
    { id: "classic", label: "Classic", crowns: 4, desc: "4 tokens — full" },
];

const CrownIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
    </svg>
);

const LudoLobby = () => {
    const navigate = useNavigate();
    const { playerCount: urlPlayerCount } = useParams();
    const { user } = useAuth();
    const { wallet, bonus } = useWallet();
    const socket = useSocket();
    const [rooms, setRooms] = useState([]);
    const [selectedStake, setSelectedStake] = useState(50);
    const [mode, setMode] = useState("quick");
    const playerCount = [2, 4].includes(Number(urlPlayerCount)) ? Number(urlPlayerCount) : 2;
    const [loading, setLoading] = useState(false);
    const { config: appConfig } = useAppConfig();
    const [stakes, setStakes] = useState([]);
    const [activeGame, setActiveGame] = useState(null);
    const [enabledModes, setEnabledModes] = useState({ sprint: true, quick: true, classic: true });
    const [cancelConfirm, setCancelConfirm] = useState(false);

    // Sync admin stakes and mode toggles
    useEffect(() => {
        if (appConfig?.ludo) {
            const adminStakes = appConfig.ludo.stakes || [];
            setStakes(adminStakes);

            if (adminStakes.length > 0 && !adminStakes.includes(selectedStake)) {
                setSelectedStake(adminStakes[0]);
            }

            const modes = {
                sprint: appConfig.ludo.sprintModeEnabled ?? true,
                quick: appConfig.ludo.quickModeEnabled ?? true,
                classic: appConfig.ludo.classicModeEnabled ?? true,
            };
            setEnabledModes(modes);

            // Auto-select first enabled mode if current is disabled
            if (!modes[mode]) {
                const firstEnabled = GAME_MODES.find((gm) => modes[gm.id]);
                if (firstEnabled) setMode(firstEnabled.id);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appConfig]);

    const visibleModes = GAME_MODES.filter((gm) => enabledModes[gm.id]);

    // Fetch rooms + check active game on mount
    useEffect(() => {
        if (!socket) return;

        socket.emit("ludo:get_rooms");

        // Check if user has an active game to rejoin
        if (user?._id) {
            socket.emit("ludo:check_active_game", { userId: user._id });
        }

        const handleRooms = (data) => {
            setRooms(Array.isArray(data) ? data : []);
        };

        const handleRoomCreated = (data) => {
            setLoading(false);
            navigate(`/ludo/game/${data.roomId}`);
        };

        const handleActiveGame = (data) => {
            if (data?.roomId) {
                setActiveGame(data);
            } else {
                setActiveGame(null);
            }
        };

        const handleError = (data) => {
            toast.error(data?.message || "Something went wrong");
            setLoading(false);
        };

        const handleSettings = (data) => {
            if (data) {
                const adminStakes = data.stakes || [];
                setStakes(adminStakes);
                setSelectedStake((prev) => adminStakes.includes(prev) ? prev : adminStakes[0]);
            }
        };

        socket.on("ludo:rooms", handleRooms);
        socket.on("ludo:room_created", handleRoomCreated);
        socket.on("ludo:active_game", handleActiveGame);
        socket.on("ludo:settings", handleSettings);
        socket.on("ludo:error", handleError);

        return () => {
            socket.off("ludo:rooms", handleRooms);
            socket.off("ludo:room_created", handleRoomCreated);
            socket.off("ludo:active_game", handleActiveGame);
            socket.off("ludo:settings", handleSettings);
            socket.off("ludo:error", handleError);
        };
    }, [socket, navigate, user]);

    const handlePlayNow = useCallback(() => {
        if (!user) {
            toast.error("Please log in to play");
            return;
        }
        if ((wallet + (bonus || 0)) < selectedStake) {
            toast.error("Insufficient balance. Please top up your wallet.");
            return;
        }
        setLoading(true);
        socket.emit("ludo:create_room", {
            userId: user._id,
            stakeAmount: selectedStake,
            mode,
            playerCount,
        });
    }, [socket, user, selectedStake, mode, playerCount]);

    const handleJoinRoom = useCallback(
        (room) => {
            if (!user) {
                toast.error("Please log in to play");
                return;
            }
            if ((wallet + (bonus || 0)) < room.stakeAmount) {
                toast.error(`Insufficient balance. You need ${room.stakeAmount} coins to join.`);
                return;
            }
            socket.emit("ludo:join_room", { roomId: room._id, userId: user._id });
            navigate(`/ludo/game/${room._id}`);
        },
        [socket, user, navigate]
    );

    const handleRejoin = useCallback(() => {
        if (activeGame?.roomId) {
            navigate(`/ludo/game/${activeGame.roomId}`);
        }
    }, [activeGame, navigate]);

    const commissionPercent = appConfig?.ludo?.commissionPercent ?? 10;
    const potentialWin = (
        selectedStake * playerCount * (1 - commissionPercent / 100)
    ).toFixed(0);

    const maskName = (name) => {
        if (!name || name.length < 3) return name || "Player";
        return name[0] + "***" + name.slice(-1);
    };

    const lobbyTitle = playerCount === 4 ? "Ludo 4 Player" : "Ludo 1v1";
    const lobbySubtitle = playerCount === 4 ? "Battle with 4 players — last one standing wins!" : "1v1 Duel — fast, intense, strategic";

    return (
        <div className="ludo-lobby">
            {/* Header */}
            <div className="ludo-lobby__header">
                <div className="ludo-lobby__title">🎲 {lobbyTitle}</div>
                <div className="ludo-lobby__subtitle">
                    {lobbySubtitle}
                </div>
            </div>

            {/* User Bar */}
            {user && (
                <div className="ludo-user-bar surface-panel" style={{ padding: "12px 20px", marginBottom: "20px" }}>
                    <span className="ludo-user-bar__name" style={{ color: "var(--color-bingo-yellow)", fontWeight: 700 }}>
                        👤 {user.fullName || user.phone || "Player"}
                    </span>
                    <span className="ludo-user-bar__balance" style={{ color: "var(--color-bingo-green)", fontWeight: 800 }}>
                        💰 {(wallet || 0).toFixed(2)} coins {bonus > 0 && <span style={{ fontSize: "0.7rem", color: "var(--color-bingo-yellow-soft)" }}>(+{bonus})</span>}
                    </span>
                </div>
            )}

            {/* Rejoin Banner */}
            {activeGame && (
                <div className="ludo-rejoin-banner" style={{ background: "rgba(248, 213, 23, 0.1)", borderColor: "var(--color-bingo-yellow)" }}>
                    <div>
                        <div className="ludo-rejoin-banner__text" style={{ color: "var(--color-bingo-yellow)" }}>
                            🎮 You have an active game!
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--color-bingo-muted)", marginTop: 2 }}>
                            {activeGame.stakeAmount} coins • {activeGame.mode} • {activeGame.playerCount}P
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {cancelConfirm ? (
                            <>
                                <span style={{ fontSize: "0.75rem", color: "var(--color-bingo-muted)" }}>Cancel room?</span>
                                <button
                                    className="btn-primary"
                                    style={{ padding: "5px 12px", fontSize: "0.78rem", background: "var(--color-bingo-red)", borderColor: "var(--color-bingo-red)" }}
                                    onClick={() => {
                                        socket.emit("ludo:cancel_room", { roomId: activeGame.roomId, userId: user._id });
                                        setActiveGame(null);
                                        setCancelConfirm(false);
                                    }}
                                >
                                    Yes, Cancel
                                </button>
                                <button
                                    className="btn-secondary"
                                    style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                                    onClick={() => setCancelConfirm(false)}
                                >
                                    No
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className="btn-primary"
                                    style={{ padding: "6px 16px", fontSize: "0.8rem" }}
                                    onClick={handleRejoin}
                                >
                                    Rejoin →
                                </button>
                                {activeGame.status === "waiting" && user && activeGame.creatorUserId === user._id && (
                                    <button
                                        className="btn-secondary"
                                        style={{ padding: "6px 16px", fontSize: "0.8rem", background: "rgba(255,59,48,0.15)", borderColor: "var(--color-bingo-red)", color: "var(--color-bingo-red)" }}
                                        onClick={() => setCancelConfirm(true)}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Available Rooms — filter out user's own active game room to avoid duplicate display */}
            {rooms.filter(r => !activeGame || String(r._id) !== String(activeGame.roomId)).length > 0 && (
                <div className="ludo-config-section">
                    <div className="ludo-config-section__title" style={{ color: "var(--color-bingo-yellow-soft)" }}>Available Games</div>
                    <div className="ludo-rooms-list">
                        <AnimatePresence>
                            {rooms.filter(r => !activeGame || String(r._id) !== String(activeGame.roomId)).map((room) => {
                                const roomWin = (
                                    room.stakeAmount *
                                    room.playerCount *
                                    (1 - (room.commissionPercent || 10) / 100)
                                ).toFixed(0);
                                const canAfford = (wallet + (bonus || 0)) >= room.stakeAmount;
                                const isMyRoom = user && room.players.some(p => p.userId === user._id);
                                return (
                                    <motion.div
                                        key={room._id}
                                        className="ludo-room-card surface-panel"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        style={{ marginBottom: "8px", border: "1px solid rgba(255,255,255,0.05)" }}
                                    >
                                        <div className="ludo-room-card__left">
                                            <div className="ludo-room-card__name" style={{ color: "var(--color-bingo-white)" }}>
                                                {room.players?.[0]?.color && (
                                                    <img
                                                        src={PILE_IMAGES[room.players[0].color]}
                                                        alt=""
                                                        style={{ width: 16, height: 16, verticalAlign: "middle", marginRight: 8 }}
                                                    />
                                                )}
                                                {maskName(room.players?.[0]?.userId?.fullName || "...")}
                                                <span className="ludo-room-card__mode" style={{ marginLeft: 8, background: "rgba(85, 255, 119, 0.15)", color: "var(--color-bingo-green)" }}>
                                                    {room.mode} · {room.playerCount}P
                                                </span>
                                            </div>
                                            <div className="ludo-room-card__info">
                                                <span className="ludo-room-card__stake" style={{ color: "var(--color-bingo-yellow)" }}>
                                                    {room.stakeAmount} coins
                                                </span>
                                                <span className="ludo-room-card__players" style={{ color: "var(--color-bingo-muted)" }}>
                                                    👥 {room.players?.length || 1}/{room.playerCount}
                                                </span>
                                                <span className="ludo-room-card__win" style={{ color: "var(--color-bingo-green)", fontWeight: 800 }}>
                                                    🏆 {roomWin} coins
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            className={isMyRoom ? "btn-secondary" : canAfford ? "btn-primary" : "btn-secondary"}
                                            style={{ padding: "6px 16px", fontSize: "0.85rem", opacity: isMyRoom || canAfford ? 1 : 0.6 }}
                                            onClick={() => !isMyRoom && handleJoinRoom(room)}
                                            disabled={isMyRoom}
                                        >
                                            {isMyRoom ? "Joined" : canAfford ? "Join" : "Low $"}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {rooms.length === 0 && (
                <div className="ludo-empty" style={{ color: "var(--color-bingo-muted)", padding: "40px 0" }}>
                    No active rooms. Create one below! 👇
                </div>
            )}

            {/* Stake Selection */}
            <div className="ludo-config-section">
                <div className="ludo-config-section__title" style={{ color: "var(--color-bingo-yellow-soft)" }}>Bet Amount (coins)</div>
                <div className="ludo-stake-grid">
                    {stakes.map((s) => (
                        <button
                            key={s}
                            className={`ludo-stake-btn ${selectedStake === s ? "ludo-stake-btn--active" : ""}`}
                            style={selectedStake === s ? { background: "var(--color-bingo-yellow)", color: "#000", borderColor: "var(--color-bingo-yellow)" } : {}}
                            onClick={() => setSelectedStake(s)}
                        >
                            {s >= 1000 ? `${(s / 1000).toFixed(s % 1000 ? 1 : 0)}K` : s}
                            {(wallet + (bonus || 0)) < s && (
                                <span className="ludo-stake-btn__badge" style={{ background: "var(--color-bingo-red)" }}>🔒</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Game Mode Selection — Crown Icons */}
            <div className="ludo-config-section">
                <div className="ludo-config-section__title" style={{ color: "var(--color-bingo-yellow-soft)" }}>Game Mode</div>
                <div className="ludo-mode-grid">
                    {visibleModes.map((gm) => (
                        <button
                            key={gm.id}
                            className={`ludo-mode-btn ludo-crown-mode ${mode === gm.id ? "ludo-mode-btn--active" : ""}`}
                            style={mode === gm.id ? { borderColor: "var(--color-bingo-yellow)", background: "rgba(248, 213, 23, 0.1)" } : {}}
                            onClick={() => setMode(gm.id)}
                        >
                            <span className="ludo-crown-icons" style={{ color: "var(--color-bingo-yellow)" }}>
                                {Array.from({ length: gm.crowns }).map((_, i) => (
                                    <CrownIcon key={i} />
                                ))}
                            </span>
                            <span className="ludo-mode-btn__label" style={{ color: mode === gm.id ? "var(--color-bingo-yellow)" : "var(--color-bingo-white)" }}>{gm.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Potential Win Display */}
            <div className="surface-panel" style={{ display: "flex", justifyContent: "center", gap: 32, padding: "12px", marginBottom: "20px" }}>
                <span style={{ color: "var(--color-bingo-muted)", fontSize: "0.82rem" }}>
                    Pot: <b style={{ color: "var(--color-bingo-white)" }}>{(selectedStake * playerCount).toLocaleString()} coins</b>
                </span>
                <span style={{ color: "var(--color-bingo-muted)", fontSize: "0.82rem" }}>
                    Win: <b style={{ color: "var(--color-bingo-green)", fontSize: "1rem" }}>{potentialWin} coins</b>
                </span>
            </div>

            {/* Play Now */}
            <button
                className="btn-primary"
                style={{ width: "100%", padding: "16px", fontSize: "1.1rem" }}
                onClick={handlePlayNow}
                disabled={loading || !user || (wallet + (bonus || 0)) < selectedStake}
            >
                {loading
                    ? "Creating..."
                    : (wallet + (bonus || 0)) < selectedStake
                        ? `💰 Insufficient Balance`
                        : `🎲 Play Now — ${selectedStake} coins`}
            </button>
        </div>
    );
};

export default LudoLobby;
