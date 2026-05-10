import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/ludo.css";

const PILE_IMAGES = {
    red: "/piles/red.png",
    green: "/piles/green.png",
    yellow: "/piles/yellow.png",
    blue: "/piles/blue.png",
};

const COLOR_LABELS = {
    red: "#ff3b30",
    green: "#00c853",
    yellow: "#f8d517",
    blue: "#448aff",
};

// Empty slot placeholder
const EmptySlot = ({ index }) => (
    <div className="ludo-player-card ludo-player-card--empty">
        <div className="ludo-player-card__avatar-placeholder" />
        <span className="ludo-player-card__name" style={{ color: "var(--ludo-text-dim)", fontStyle: "italic" }}>
            Waiting…
        </span>
    </div>
);

/**
 * LudoWaiting — Waiting screen shown while the room fills up.
 *
 * Props:
 *  - roomId        string
 *  - roomData      object  { players, playerCount, stakeAmount, mode, winAmount, creatorUserId }
 *  - userId        string  (current user's _id as string)
 *  - socket        socket.io client instance
 */
const LudoWaiting = ({ roomId, roomData, userId, socket }) => {
    const navigate = useNavigate();
    const [cancelConfirm, setCancelConfirm] = useState(false);

    const players = roomData?.players || [];
    const playerCount = roomData?.playerCount || 2;
    const isCreator = String(roomData?.creatorUserId) === String(userId);

    // Build slots: joined players + empty placeholders
    const slots = Array.from({ length: playerCount }, (_, i) => players[i] || null);

    const handleCancel = () => {
        socket.emit("ludo:cancel_room", { roomId, userId });
        setCancelConfirm(false);
    };

    const modeLabel = {
        sprint: "Sprint (1 token)",
        quick: "Quick (2 tokens)",
        classic: "Classic (4 tokens)",
    }[roomData?.mode] || roomData?.mode || "?";

    return (
        <div className="ludo-game-page">
            {/* ── Header ── */}
            <div className="ludo-game-header">
                <button
                    className="ludo-game-header__back"
                    onClick={() => navigate("/ludo")}
                    aria-label="Back to lobby"
                >
                    ← Back
                </button>
                <span className="ludo-game-header__id">
                    Room #{roomId?.slice(-6).toUpperCase()}
                </span>
                <span className="ludo-game-header__prize">
                    🏆 {roomData?.winAmount?.toFixed?.(0) ?? "..."} coins
                </span>
            </div>

            {/* ── Waiting Body ── */}
            <div className="ludo-waiting">
                {/* Animated spinner */}
                <div className="ludo-waiting__spinner" />

                <div className="ludo-waiting__text">
                    Waiting for players…
                </div>

                {/* Room info chips */}
                <div className="ludo-waiting__chips">
                    <span className="ludo-waiting__chip ludo-waiting__chip--stake">
                        💰 {roomData?.stakeAmount ?? "?"} coins
                    </span>
                    <span className="ludo-waiting__chip ludo-waiting__chip--mode">
                        🎮 {modeLabel}
                    </span>
                    <span className="ludo-waiting__chip ludo-waiting__chip--count">
                        👥 {players.length}/{playerCount}
                    </span>
                </div>

                {/* Player slots */}
                <div className="ludo-waiting__slots">
                    {slots.map((p, i) =>
                        p ? (
                            <div
                                key={i}
                                className={`ludo-player-card ${String(p.userId) === String(userId) ? "ludo-player-card--you" : ""
                                    }`}
                            >
                                <div
                                    className="ludo-waiting__slot-dot"
                                    style={{ background: COLOR_LABELS[p.color] || "#aaa" }}
                                />
                                <img
                                    className="ludo-player-card__avatar"
                                    src={PILE_IMAGES[p.color]}
                                    alt={p.color}
                                />
                                <span className="ludo-player-card__name">
                                    {String(p.userId) === String(userId) ? "You" : `Player ${i + 1}`}
                                </span>
                                {String(p.userId) === String(userId) && (
                                    <span className="ludo-player-card__you">YOU</span>
                                )}
                            </div>
                        ) : (
                            <EmptySlot key={i} index={i} />
                        )
                    )}
                </div>

                {/* Progress bar */}
                <div className="ludo-waiting__progress-track">
                    <div
                        className="ludo-waiting__progress-fill"
                        style={{ width: `${(players.length / playerCount) * 100}%` }}
                    />
                </div>

                {/* Cancel — only for creator, only while waiting */}
                {isCreator && (
                    <div className="ludo-cancel-wrapper">
                        {cancelConfirm ? (
                            <div className="ludo-cancel-confirm">
                                <span className="ludo-cancel-confirm__label">
                                    Cancel room &amp; get full refund?
                                </span>
                                <div className="ludo-cancel-confirm__actions">
                                    <button
                                        className="ludo-cancel-confirm__yes"
                                        onClick={handleCancel}
                                    >
                                        Yes, Cancel
                                    </button>
                                    <button
                                        className="ludo-cancel-confirm__no"
                                        onClick={() => setCancelConfirm(false)}
                                    >
                                        Keep Waiting
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                className="ludo-cancel-btn"
                                onClick={() => setCancelConfirm(true)}
                            >
                                ✕ Cancel Room
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LudoWaiting;
