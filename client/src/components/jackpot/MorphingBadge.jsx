import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

const MorphingBadge = ({ level, isActive }) => {
    const [showCondition, setShowCondition] = useState(false);

    useEffect(() => {
        if (isActive) {
            const interval = setInterval(() => {
                setShowCondition(prev => !prev);
            }, 4500);
            return () => clearInterval(interval);
        }
    }, [isActive]);

    return (
        <Box sx={{
            mt: 1, px: 2.5, py: 0.6, borderRadius: "16px",
            background: isActive ? `linear-gradient(180deg, ${level.color}25 0%, ${level.color}10 100%)` : "rgba(255,255,255,0.05)",
            border: `1px solid ${isActive ? level.color : "rgba(255,255,255,0.1)"}50`,
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "160px", height: "32px", position: "relative", overflow: "hidden",
            boxShadow: isActive ? `inset 0 0 10px ${level.color}20` : "none",
            zIndex: 5
        }}>
            <AnimatePresence mode="wait">
                {!showCondition ? (
                    <motion.div
                        key="label"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                        <Typography variant="body2" sx={{ fontSize: "1.1rem", filter: isActive ? `drop-shadow(0 0 5px ${level.color}80)` : "none" }}>{level.icon}</Typography>
                        <Typography variant="caption" sx={{ color: "#FFF", fontWeight: 950, fontSize: "0.7rem", letterSpacing: 1.5 }}>JACKPOT</Typography>
                    </motion.div>
                ) : (
                    <motion.div
                        key="hint"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                    >
                        <Typography variant="caption" sx={{ color: level.color, fontWeight: 950, fontSize: "0.65rem", letterSpacing: 0.8, textTransform: "uppercase" }}>
                            {level.winConditions.maxCalls} CALLS / {level.winConditions.maxSeconds}S
                        </Typography>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
};

export default MorphingBadge;
