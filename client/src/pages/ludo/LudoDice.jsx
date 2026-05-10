import React, { useState, useCallback, useRef, useEffect } from "react";
import Lottie from "lottie-react";
import { useLudoSound } from "./useLudoSound";

// Dice face images from /dice/
const DICE_IMAGES = {
    1: "/dice/1.png",
    2: "/dice/2.png",
    3: "/dice/3.png",
    4: "/dice/4.png",
    5: "/dice/5.png",
    6: "/dice/6.png",
};

const LudoDice = ({ value = 1, canRoll, onRoll, disabled, isRolling }) => {
    const { playSound } = useLudoSound();
    const [showLottie, setShowLottie] = useState(false);
    const [lottieData, setLottieData] = useState(null);
    const timeoutRef = useRef(null);

    // Load dice roll Lottie JSON once
    useEffect(() => {
        fetch("/animation/diceroll.json")
            .then((r) => r.json())
            .then((data) => setLottieData(data))
            .catch(() => { });
    }, []);

    // Show Lottie animation while rolling
    useEffect(() => {
        if (isRolling && lottieData) {
            setShowLottie(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setShowLottie(false), 800);
        } else {
            setShowLottie(false);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isRolling, lottieData]);

    const handleClick = useCallback(() => {
        if (!canRoll || disabled || isRolling) return;
        playSound("dice_roll", 0.5);
        onRoll?.();
    }, [canRoll, disabled, isRolling, onRoll, playSound]);

    const diceClass = [
        "ludo-dice",
        isRolling && "ludo-dice--rolling",
        disabled && "ludo-dice--disabled",
        canRoll && !disabled && !isRolling && "ludo-dice--can-roll",
    ]
        .filter(Boolean)
        .join(" ");

    // Label text
    let labelText = "";
    let labelClass = "ludo-dice-label";
    if (isRolling) {
        labelText = "Rolling...";
    } else if (canRoll && !disabled) {
        labelText = "🎯 Tap to Roll!";
        labelClass += " ludo-dice-label--tap";
    } else if (disabled) {
        labelText = "Wait...";
    }

    return (
        <div className="ludo-dice-area" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className={diceClass} onClick={handleClick}>
                {showLottie && lottieData ? (
                    <Lottie
                        animationData={lottieData}
                        loop={true}
                        autoplay={true}
                        style={{ width: "100%", height: "100%" }}
                    />
                ) : (
                    <img
                        src={DICE_IMAGES[value] || DICE_IMAGES[1]}
                        alt={`Dice showing ${value}`}
                        draggable={false}
                    />
                )}
            </div>
            {labelText && <span className={labelClass} style={{ marginTop: "8px" }}>{labelText}</span>}
        </div>
    );
};

export default LudoDice;
