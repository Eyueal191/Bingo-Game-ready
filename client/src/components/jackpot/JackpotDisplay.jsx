import React, { useState, useEffect, useCallback } from "react";
import { Box, IconButton } from "@mui/material";
import { useApi } from "../../contexts/ApiContext";
import { useSocket } from "../../contexts/socketContext";
import { motion, AnimatePresence } from "framer-motion";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

// Modular Components
import JackpotCard from "./JackpotCard";
import WinnerOverlay from "./WinnerOverlay";

const JackpotDisplay = () => {
    const api = useApi();
    const { socket } = useSocket();
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastWinner, setLastWinner] = useState(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

    const fetchPublicData = useCallback(async () => {
        try {
            const res = await api.get("/api/v1/jackpot/public");
            setLevels(res.data.levels || []);
        } catch (err) {
            console.error("Failed to fetch jackpot data", err);
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchPublicData();
        const handleResize = () => setIsMobile(window.innerWidth < 900);
        window.addEventListener("resize", handleResize);

        if (socket) {
            socket.on("jackpotUpdate", setLevels);
            socket.on("jackpotWon", (data) => {
                setLastWinner(data);
                setTimeout(() => setLastWinner(null), 12000);
            });
            return () => {
                socket.off("jackpotUpdate");
                socket.off("jackpotWon");
                window.removeEventListener("resize", handleResize);
            };
        }
    }, [socket, fetchPublicData]);

    useEffect(() => {
        if (isMobile && levels.length > 0) {
            const timer = setInterval(() => {
                setActiveIndex((prev) => (prev + 1) % levels.length);
            }, 6000);
            return () => clearInterval(timer);
        }
    }, [isMobile, levels.length]);

    if (loading || levels.length === 0) return null;

    return (
        <Box sx={{
            width: "100%",
            position: "relative",
            py: 3,
            px: 1,
            // Atmospheric row aura to separate from lobby background
            "&::before": {
                content: '""',
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "90%",
                height: "60%",
                background: "rgba(0,0,0,0.3)",
                filter: "blur(60px)",
                borderRadius: "100px",
                zIndex: -1
            }
        }}>
            {/* High-Drama Jackpot Winner Overlay */}
            <WinnerOverlay lastWinner={lastWinner} />

            {/* Layout Row */}
            <Box sx={{ display: "flex", justifyContent: "center", gap: { xs: 0, md: 3.5 }, alignItems: "center" }}>
                {!isMobile ? (
                    // Desktop: Ultimate Shimmering Row
                    levels.map((level) => (
                        <JackpotCard key={level.key} level={level} isActive={true} isMobile={false} />
                    ))
                ) : (
                    // Mobile: High-Depth "Sliding Reel" Slot Machine
                    <Box sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", perspective: "1500px", position: "relative" }}>
                        <IconButton
                            onClick={() => setActiveIndex((prev) => (prev - 1 + levels.length) % levels.length)}
                            sx={{ position: "absolute", left: 0, color: "rgba(255,255,255,0.3)", zIndex: 10, bgcolor: "rgba(0,0,0,0.2)" }}
                        >
                            <ChevronLeftIcon />
                        </IconButton>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                initial={{ x: 100, y: 50, opacity: 0, rotateY: 45, scale: 0.8 }}
                                animate={{ x: 0, y: 0, opacity: 1, rotateY: 0, scale: 1 }}
                                exit={{ x: -100, y: -50, opacity: 0, rotateY: -45, scale: 0.8 }}
                                transition={{ type: "spring", damping: 15, stiffness: 110 }}
                            >
                                <JackpotCard level={levels[activeIndex]} isActive={true} isMobile={true} />
                            </motion.div>
                        </AnimatePresence>

                        <IconButton
                            onClick={() => setActiveIndex((prev) => (prev + 1) % levels.length)}
                            sx={{ position: "absolute", right: 0, color: "rgba(255,255,255,0.3)", zIndex: 10, bgcolor: "rgba(0,0,0,0.2)" }}
                        >
                            <ChevronRightIcon />
                        </IconButton>

                        {/* Pagination Micro-dots */}
                        <Box sx={{ position: "absolute", bottom: -28, display: "flex", gap: 1.5 }}>
                            {levels.map((_, idx) => (
                                <Box
                                    key={idx}
                                    onClick={() => setActiveIndex(idx)}
                                    sx={{
                                        width: idx === activeIndex ? "28px" : "10px",
                                        height: "5px", borderRadius: "3px",
                                        background: idx === activeIndex ? "var(--color-bingo-yellow)" : "rgba(255,255,255,0.15)",
                                        boxShadow: idx === activeIndex ? "0 0 10px var(--color-bingo-yellow)" : "none",
                                        transition: "all 0.5s cubic-bezier(0.19, 1, 0.22, 1)",
                                        cursor: "pointer"
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default JackpotDisplay;
