import React from "react";
import { Box, Typography, Paper, Tooltip, Zoom } from "@mui/material";
import { motion } from "framer-motion";
import TickerNumber from "./TickerNumber";
import MorphingBadge from "./MorphingBadge";
import MagicalParticles from "./effects/MagicalParticles";
import FireAura from "./effects/FireAura";
import NeonShimmer from "./effects/NeonShimmer";

const JackpotCard = ({ level, isActive, isMobile }) => {
    return (
        <Tooltip
            title={`Win Conditions: ≤${level.winConditions.maxCalls} calls & ≤${level.winConditions.maxSeconds}s`}
            arrow
            TransitionComponent={Zoom}
        >
            <Paper
                component={motion.div}
                whileHover={{ y: -10, scale: 1.05 }}
                sx={{
                    width: isMobile ? "260px" : "225px",
                    height: "135px",
                    background: "rgba(10, 14, 26, 0.88)",
                    backdropFilter: "blur(24px)",
                    borderRadius: "32px",
                    border: `2px solid ${isActive ? level.color : "rgba(255,255,255,0.1)"}40`,
                    boxShadow: isActive ? `0 20px 50px -15px ${level.color}60, inset 0 0 30px ${level.color}20` : "none",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                    cursor: "pointer",
                    "&::before": isActive ? {
                        content: '""',
                        position: "absolute",
                        top: 0, left: 0, right: 0, height: "6px",
                        background: `linear-gradient(90deg, transparent, ${level.color}, #FFF, ${level.color}, transparent)`,
                        animation: "neon-marquee 2.5s infinite ease-in-out",
                        zIndex: 6
                    } : {},
                    "@keyframes neon-marquee": {
                        "0%, 100%": { opacity: 0.4, filter: "brightness(1) blur(1px)" },
                        "50%": { opacity: 1, filter: "brightness(2) blur(3px)" },
                    }
                }}
            >
                {isActive && <FireAura color={level.color} />}
                {isActive && <NeonShimmer />}
                {isActive && <MagicalParticles color={level.color} />}

                {/* Status Indicator (Magician Style) */}
                <Box sx={{ position: "absolute", top: 15, left: 18, display: "flex", alignItems: "center", gap: 0.8, zIndex: 7 }}>
                    <motion.div
                        animate={{
                            boxShadow: [`0 0 0px ${level.color}`, `0 0 10px ${level.color}`, `0 0 0px ${level.color}`],
                            scale: [1, 1.4, 1]
                        }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        style={{ width: "8px", height: "8px", borderRadius: "50%", background: level.color }}
                    />
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 900, fontSize: "0.55rem", letterSpacing: 1.5 }}>ONLINE</Typography>
                </Box>

                {/* Engagement Decoration (Faded Icon) */}
                <Box sx={{ position: "absolute", top: -15, right: -15, p: 2, opacity: 0.1, zIndex: 0 }}>
                    <Typography variant="h1" sx={{ color: level.color, fontSize: "6rem" }}>{level.icon}</Typography>
                </Box>

                <Typography variant="caption" sx={{
                    color: level.color,
                    fontWeight: 950,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                    textShadow: isActive ? `0 0 12px ${level.color}` : "none",
                    mb: 0.8,
                    zIndex: 1,
                    opacity: isActive ? 1 : 0.6
                }}>
                    {level.label}
                </Typography>

                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 950,
                        color: "#FFF",
                        fontFamily: "'Orbitron', sans-serif",
                        textShadow: isActive ? `0 0 25px ${level.color}, 0 0 50px ${level.color}40` : "none",
                        zIndex: 1,
                        fontSize: "1.7rem",
                        lineHeight: 1
                    }}
                >
                    <TickerNumber value={level.balance} />
                </Typography>

                <MorphingBadge level={level} isActive={isActive} />
            </Paper>
        </Tooltip>
    );
};

export default JackpotCard;
