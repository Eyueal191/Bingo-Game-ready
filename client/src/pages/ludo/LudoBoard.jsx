import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { useLudoSound } from "./useLudoSound";

const PILE_IMAGES = {
    red: "/piles/red.png",
    green: "/piles/green.png",
    yellow: "/piles/yellow.png",
    blue: "/piles/blue.png",
};

const COLOR_HEX = { red: "#E6231F", green: "#37C365", yellow: "#F0C919", blue: "#287CBA" };

const Plot1Data = [13, 14, 15, 16, 17, 18, 12, 221, 222, 223, 224, 225, 11, 10, 9, 8, 7, 6];
const Plot2Data = [24, 25, 26, 23, 331, 27, 22, 332, 28, 21, 333, 29, 20, 334, 30, 19, 335, 31];
const Plot3Data = [32, 33, 34, 35, 36, 37, 445, 444, 443, 442, 441, 38, 44, 43, 42, 41, 40, 39];
const Plot4Data = [5, 115, 45, 4, 114, 46, 3, 113, 47, 2, 112, 48, 1, 111, 49, 52, 51, 50];

const StarSpots = [9, 22, 35, 48];
const startingPoints = [1, 14, 27, 40];
const MAIN_TRACK = Array.from({ length: 52 }, (_, i) => i + 1);
const TURNING_POINTS = { red: 51, green: 12, yellow: 25, blue: 38 };

const homeColumns = {
    red: [111, 112, 113, 114, 115],
    green: [221, 222, 223, 224, 225],
    yellow: [331, 332, 333, 334, 335],
    blue: [441, 442, 443, 444, 445],
};

function buildCellMap() {
    const map = {};
    for (let g = 0; g < 3; g++) { const c = 8 - g; for (let r = 0; r < 6; r++) map[Plot1Data[g * 6 + r]] = { row: r, col: c }; }
    for (let g = 0; g < 6; g++) { const c = 14 - g; for (let r = 0; r < 3; r++) map[Plot2Data[g * 3 + r]] = { row: 6 + r, col: c }; }
    for (let g = 0; g < 3; g++) { const c = 8 - g; for (let r = 0; r < 6; r++) map[Plot3Data[g * 6 + r]] = { row: 9 + r, col: c }; }
    for (let g = 0; g < 6; g++) { const c = 5 - g; for (let r = 0; r < 3; r++) map[Plot4Data[g * 3 + r]] = { row: 6 + r, col: c }; }
    return map;
}
const CELL_MAP = buildCellMap();

// Token positions in home base (centered in the 4×4 inner white area)
const HOME_TOKEN_POSITIONS = {
    red: [{ row: 1.8, col: 1.8 }, { row: 1.8, col: 3.2 }, { row: 3.2, col: 1.8 }, { row: 3.2, col: 3.2 }],
    green: [{ row: 1.8, col: 10.8 }, { row: 1.8, col: 12.2 }, { row: 3.2, col: 10.8 }, { row: 3.2, col: 12.2 }],
    blue: [{ row: 10.8, col: 1.8 }, { row: 10.8, col: 3.2 }, { row: 12.2, col: 1.8 }, { row: 12.2, col: 3.2 }],
    yellow: [{ row: 10.8, col: 10.8 }, { row: 10.8, col: 12.2 }, { row: 12.2, col: 10.8 }, { row: 12.2, col: 12.2 }],
};

// Colored circle positions RELATIVE to inner card
const HOME_SPOT_OFFSETS = [
    { top: "18%", left: "18%" },
    { top: "18%", left: "58%" },
    { top: "58%", left: "18%" },
    { top: "58%", left: "58%" },
];

const ARROW_SPOTS = {
    51: { char: "→", color: "red" },
    12: { char: "↓", color: "green" },
    25: { char: "←", color: "yellow" },
    38: { char: "↑", color: "blue" },
};

function computePath(fromPos, toPos, color) {
    if (!fromPos || fromPos === 0) return [toPos];
    const hc = homeColumns[color];
    if (hc && hc.includes(fromPos)) {
        const fi = hc.indexOf(fromPos), ti = hc.indexOf(toPos);
        if (ti >= 0 && ti > fi) return hc.slice(fi + 1, ti + 1);
        return [toPos];
    }
    const fi = MAIN_TRACK.indexOf(fromPos);
    if (fi < 0) return [toPos];
    const ti = MAIN_TRACK.indexOf(toPos);
    if (ti >= 0) { const p = []; let i = fi; while (i !== ti) { i = (i + 1) % 52; p.push(MAIN_TRACK[i]); } return p; }
    if (hc && hc.includes(toPos)) {
        const tpi = MAIN_TRACK.indexOf(TURNING_POINTS[color]);
        const p = []; let i = fi; while (i !== tpi) { i = (i + 1) % 52; p.push(MAIN_TRACK[i]); }
        const thi = hc.indexOf(toPos); for (let j = 0; j <= thi; j++) p.push(hc[j]); return p;
    }
    return [toPos];
}

function getCellClass(cellId) {
    const cls = ["ludo-cell"];
    if (homeColumns.red.includes(cellId)) cls.push("home-col-red");
    else if (homeColumns.green.includes(cellId)) cls.push("home-col-green");
    else if (homeColumns.yellow.includes(cellId)) cls.push("home-col-yellow");
    else if (homeColumns.blue.includes(cellId)) cls.push("home-col-blue");
    if (cellId === 1) cls.push("start-red");
    else if (cellId === 14) cls.push("start-green");
    else if (cellId === 27) cls.push("start-yellow");
    else if (cellId === 40) cls.push("start-blue");
    if (StarSpots.includes(cellId) || startingPoints.includes(cellId)) cls.push("safe-spot");
    return cls.join(" ");
}

function getHomeCellClass(r, c) {
    if (r < 6 && c < 6) return "ludo-cell home-red";
    if (r < 6 && c > 8) return "ludo-cell home-green";
    if (r > 8 && c < 6) return "ludo-cell home-blue";
    if (r > 8 && c > 8) return "ludo-cell home-yellow";
    return "ludo-cell";
}

function isHomeBase(r, c) { return (r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8); }
function isCenterCell(r, c) { return r >= 6 && r <= 8 && c >= 6 && c <= 8; }

// ─── Component ─────────────────────────────────────────────
const ANIM_STEP_MS = 150;

const LudoBoard = ({ players = [], validMoves = [], isMyTurn = false, myColor = "", onTokenClick }) => {
    const boardRef = useRef(null);
    const [cellSize, setCellSize] = useState(0);
    const { playSound } = useLudoSound();
    const prevPositions = useRef({});
    const [animPositions, setAnimPositions] = useState({});
    const [returningTokens, setReturningTokens] = useState({});
    const animTimers = useRef({});
    const captureTimers = useRef({});

    useEffect(() => {
        const measure = () => { if (boardRef.current) setCellSize(boardRef.current.getBoundingClientRect().width / 15); };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    // ── Detect position changes → animate ──
    useEffect(() => {
        let maxForwardSteps = 0;
        const captures = [];

        players.forEach((player) => {
            player.tokens.forEach((token) => {
                const key = `${player.color}-${token.id}`;
                const prevPos = prevPositions.current[key];
                const newPos = token.position;

                if (prevPos !== undefined && prevPos !== newPos) {
                    // CAPTURE: token going back to home
                    if ((newPos === 0 || token.isHome) && prevPos !== 0) {
                        captures.push({ key, prevPos });
                    }
                    // FORWARD MOVE: step by step animation
                    else if (newPos !== 0) {
                        const path = computePath(prevPos, newPos, player.color);
                        if (path.length > 1) {
                            maxForwardSteps = Math.max(maxForwardSteps, path.length);
                            if (animTimers.current[key]) clearInterval(animTimers.current[key]);
                            let step = 0;
                            setAnimPositions((p) => ({ ...p, [key]: path[0] }));

                            animTimers.current[key] = setInterval(() => {
                                step++;
                                if (step >= path.length) {
                                    clearInterval(animTimers.current[key]);
                                    delete animTimers.current[key];
                                    setAnimPositions((p) => { const n = { ...p }; delete n[key]; return n; });
                                    return;
                                }
                                setAnimPositions((p) => ({ ...p, [key]: path[step] }));
                                playSound("pile_move", 0.3);
                            }, ANIM_STEP_MS);
                            // Also play sound for the first jump
                            playSound("pile_move", 0.3);
                        }
                    }
                }
                prevPositions.current[key] = newPos;
            });
        });

        // DELAYED CAPTURES: wait for the capturer to finish moving FIRST
        if (captures.length > 0) {
            const captureDelay = maxForwardSteps * ANIM_STEP_MS + 150;

            captures.forEach(({ key, prevPos }) => {
                captureTimers.current[key] = setTimeout(() => {
                    // 1. Hold captured token at its old track position
                    setAnimPositions((p) => ({ ...p, [key]: prevPos }));
                    setReturningTokens((p) => ({ ...p, [key]: true }));

                    // 2. After 2 frames, release → CSS transition slides it home
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            setAnimPositions((p) => { const n = { ...p }; delete n[key]; return n; });
                        });
                    });

                    // 3. Clean up returning class after slide completes
                    setTimeout(() => {
                        setReturningTokens((p) => { const n = { ...p }; delete n[key]; return n; });
                    }, 700);
                }, captureDelay);
            });
        }
    }, [players, playSound]);

    // Cleanup timers
    useEffect(() => {
        const currentAnimTimers = animTimers.current;
        const currentCaptureTimers = captureTimers.current;
        return () => {
            Object.values(currentAnimTimers).forEach(t => clearInterval(t));
            Object.values(currentCaptureTimers).forEach(t => clearTimeout(t));
        };
    }, []);

    const posToCell = useMemo(() => {
        const m = {};
        for (const [cid, pos] of Object.entries(CELL_MAP)) m[`${pos.row},${pos.col}`] = parseInt(cid);
        return m;
    }, []);

    const gridCells = useMemo(() => {
        const cells = [];
        for (let row = 0; row < 15; row++) {
            for (let col = 0; col < 15; col++) {
                const key = `${row},${col}`;
                const cellId = posToCell[key];
                let cls, content = null;
                if (isCenterCell(row, col)) { cls = "ludo-cell center-home"; }
                else if (isHomeBase(row, col)) { cls = getHomeCellClass(row, col); }
                else if (cellId !== undefined) {
                    cls = getCellClass(cellId);
                    if (ARROW_SPOTS[cellId]) {
                        const { char, color } = ARROW_SPOTS[cellId];
                        content = <span className={`ludo-cell-arrow ludo-arrow-${color}`}>{char}</span>;
                    }
                    if (StarSpots.includes(cellId) || startingPoints.includes(cellId)) {
                        content = <span className="ludo-cell-star">☆</span>;
                    }
                } else { cls = "ludo-cell"; }
                cells.push(
                    <div key={key} className={cls} data-cell-id={cellId} style={{ gridRow: row + 1, gridColumn: col + 1 }}>{content}</div>
                );
            }
        }
        return cells;
    }, [posToCell]);

    const isMovable = useCallback((tid) => validMoves.some((m) => m.tokenId === tid), [validMoves]);

    const getTokenPosition = useCallback((token, color, key) => {
        if (!cellSize) return null;
        if (token.isFinished) {
            // Position finished tokens in their color's triangle sector near center
            // Map coordinates strictly inside each color's 1.5x1.5 triangular sector
            const finishPositions = {
                red: [{ col: 6.2, row: 7.2 }, { col: 6.2, row: 7.7 }, { col: 6.7, row: 7.2 }, { col: 6.7, row: 7.7 }],
                green: [{ col: 7.3, row: 6.2 }, { col: 7.8, row: 6.2 }, { col: 7.3, row: 6.7 }, { col: 7.8, row: 6.7 }],
                yellow: [{ col: 8.3, row: 7.3 }, { col: 8.3, row: 7.8 }, { col: 8.8, row: 7.3 }, { col: 8.8, row: 7.8 }],
                blue: [{ col: 7.3, row: 8.3 }, { col: 7.8, row: 8.3 }, { col: 7.3, row: 8.8 }, { col: 7.8, row: 8.8 }],
            };
            const positions = finishPositions[color] || [];
            const pos = positions[token.id % positions.length] || { col: 7.5, row: 7.5 };
            return { left: pos.col * cellSize, top: pos.row * cellSize };
        }
        const animPos = animPositions[key];
        if (animPos !== undefined) {
            const cell = CELL_MAP[animPos];
            if (cell) return { left: (cell.col + 0.5) * cellSize, top: (cell.row + 0.5) * cellSize };
        }
        if (token.isHome || token.position === 0) {
            const hp = HOME_TOKEN_POSITIONS[color]?.[token.id];
            if (!hp) return null;
            return { left: (hp.col + 0.5) * cellSize, top: (hp.row + 0.5) * cellSize };
        }
        const cell = CELL_MAP[token.position];
        if (!cell) return null;
        return { left: (cell.col + 0.5) * cellSize, top: (cell.row + 0.5) * cellSize };
    }, [cellSize, animPositions]);

    const trackTokenSize = cellSize * 0.72;
    const homeTokenSize = cellSize * 0.95; // Slightly smaller than before for better proportions

    const homeBases = [
        { color: "red", t: 1, l: 1 },
        { color: "green", t: 1, l: 10 },
        { color: "blue", t: 10, l: 1 },
        { color: "yellow", t: 10, l: 10 },
    ];

    return (
        <div className="ludo-board-wrapper">
            <div className="ludo-board-container">
                <div className="ludo-board" ref={boardRef}>{gridCells}</div>

                {/* Home base inner white cards with colored token spots */}
                {homeBases.map(({ color, t, l }) => (
                    <div
                        key={`home-${color}`}
                        className={`ludo-home-inner-card ludo-home-inner-${color}`}
                        style={{
                            top: `calc(${t} / 15 * 100%)`,
                            left: `calc(${l} / 15 * 100%)`,
                            width: `calc(4 / 15 * 100%)`,
                            height: `calc(4 / 15 * 100%)`,
                        }}
                    >
                        {HOME_SPOT_OFFSETS.map((off, i) => (
                            <div
                                key={i}
                                className={`ludo-home-spot ludo-home-spot-${color}`}
                                style={{ top: off.top, left: off.left }}
                            />
                        ))}
                    </div>
                ))}

                {/* Center triangles */}
                <div className="ludo-center-triangles">
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="0,0 100,0 50,50" fill={COLOR_HEX.green} stroke="#ffffff" strokeWidth="1.5" />
                        <polygon points="100,0 100,100 50,50" fill={COLOR_HEX.yellow} stroke="#ffffff" strokeWidth="1.5" />
                        <polygon points="0,100 100,100 50,50" fill={COLOR_HEX.blue} stroke="#ffffff" strokeWidth="1.5" />
                        <polygon points="0,0 0,100 50,50" fill={COLOR_HEX.red} stroke="#ffffff" strokeWidth="1.5" />
                        <circle cx="50" cy="50" r="8" fill="#ffffff" opacity="0.95" />
                    </svg>
                </div>

                {/* Tokens */}
                {cellSize > 0 && players.map((player) =>
                    player.tokens.map((token) => {
                        const key = `${player.color}-${token.id}`;
                        const pos = getTokenPosition(token, player.color, key);
                        if (!pos) return null;
                        const movable = isMyTurn && player.color === myColor && isMovable(token.id);
                        const isAnimating = animPositions[key] !== undefined;
                        const isReturning = returningTokens[key];
                        const isInHome = (token.isHome || token.position === 0) && !isAnimating;
                        const size = isInHome ? homeTokenSize : trackTokenSize;

                        const sameCell = !isInHome && player.tokens.filter(
                            (t2) => !t2.isHome && !t2.isFinished && t2.position === token.position && t2.position !== 0 && t2.id !== token.id
                        );
                        const offset = (sameCell && sameCell.length > 0) ? (token.id % 2 === 0 ? -1 : 1) * cellSize * 0.1 : 0;

                        return (
                            <div
                                key={key}
                                className={`ludo-token-wrapper ${isAnimating ? "ludo-token--animating" : ""} ${isReturning ? "ludo-token--returning" : ""}`}
                                style={{
                                    left: `${pos.left - size / 2 + offset}px`,
                                    top: `${pos.top - size / 2 + offset}px`,
                                    width: `${size}px`,
                                    height: `${size}px`,
                                }}
                            >
                                <div
                                    className={`ludo-token ${movable ? `ludo-token--clickable ludo-token--clickable-${player.color}` : ""}`}
                                    onClick={() => movable && onTokenClick?.(token.id)}
                                    style={{
                                        width: "100%", height: "100%",
                                        cursor: movable ? "pointer" : "default",
                                        opacity: 1,
                                        "--pulse-color": COLOR_HEX[player.color],
                                    }}
                                >
                                    <img src={PILE_IMAGES[player.color]} alt={`${player.color} ${token.id + 1}`} draggable={false} />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LudoBoard;
