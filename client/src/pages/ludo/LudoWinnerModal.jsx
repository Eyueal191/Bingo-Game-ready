import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import { useLudoSound } from "./useLudoSound";

const LudoWinnerModal = ({
    isWinner,
    winnerName,
    winAmount,
    stakeAmount,
    mode,
    onPlayAgain,
}) => {
    const navigate = useNavigate();
    const { playSound, stopAll } = useLudoSound();
    const [trophyData, setTrophyData] = useState(null);
    const [fireworkData, setFireworkData] = useState(null);

    // Load Lottie animations
    useEffect(() => {
        fetch("/animation/trophy.json")
            .then((r) => r.json())
            .then(setTrophyData)
            .catch(() => { });

        fetch("/animation/firework.json")
            .then((r) => r.json())
            .then(setFireworkData)
            .catch(() => { });
    }, []);

    // Play sound effects — use only verified existing SFX
    useEffect(() => {
        if (isWinner) {
            playSound("cheer", 0.6);
            playSound("home_win", 0.5);
        } else {
            playSound("lose", 0.5);
        }
        // Removed `return () => stopAll();` to prevent React strict-mode or re-renders from killing the sound early
        // Sounds will stop when user clicks Play Again or Back to Lobby
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isWinner]);

    const handlePlayAgain = () => {
        stopAll();
        onPlayAgain?.();
    };

    const handleBackToLobby = () => {
        stopAll();
        navigate("/game-center");
    };

    return (
        <div className={`ludo-winner-overlay ${isWinner ? "is-winner" : "is-loser"}`}>
            {/* Fireworks background for winner */}
            {isWinner && fireworkData && (
                <div className="ludo-winner-fireworks">
                    <Lottie
                        animationData={fireworkData}
                        loop={true}
                        autoplay={true}
                        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
                    />
                </div>
            )}

            <div className="ludo-winner-modal">
                {/* Trophy */}
                <div className="ludo-winner-modal__trophy">
                    {trophyData ? (
                        <Lottie
                            animationData={trophyData}
                            loop={true}
                            autoplay={true}
                            style={{ width: 120, height: 120 }}
                        />
                    ) : (
                        <span style={{ fontSize: "4rem" }}>{isWinner ? "🏆" : "😔"}</span>
                    )}
                </div>

                <div className="ludo-winner-modal__title">
                    {isWinner ? "🎉 Congratulations!" : "Hard Luck!"}
                </div>

                <div className="ludo-winner-modal__name">
                    {isWinner ? "You Won!" : `${winnerName || "Opponent"} Wins!`}
                </div>

                <div className="ludo-winner-modal__amount">
                    {isWinner && winAmount ? `+${winAmount.toLocaleString()} coins` : ""}
                    {!isWinner && stakeAmount ? `-${stakeAmount.toLocaleString()} coins` : ""}
                </div>

                <div className="ludo-winner-modal__mode">
                    {mode === "sprint" && <span className="ludo-tag tag-sprint">🏃 Sprint Mode</span>}
                    {mode === "quick" && <span className="ludo-tag tag-quick">⚡ Quick Mode</span>}
                    {mode === "classic" && <span className="ludo-tag tag-classic">♟️ Classic Mode</span>}
                    {stakeAmount ? <span className="ludo-stake-info"> • {stakeAmount} coins stake</span> : ""}
                </div>

                <div className="ludo-winner-modal__actions">
                    <button className="ludo-btn-play-again btn-primary" onClick={handlePlayAgain}>
                        🎮 Play Again {stakeAmount ? `(${stakeAmount} coins)` : ""}
                    </button>
                    <button className="ludo-btn-lobby btn-secondary" onClick={handleBackToLobby}>
                        🏠 Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LudoWinnerModal;
