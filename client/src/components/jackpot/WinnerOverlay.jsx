import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import ShootingStar from "./ShootingStar";
import NeonShimmer from "./effects/NeonShimmer";

const WinnerOverlay = ({ lastWinner }) => {
    return (
        <AnimatePresence>
            {lastWinner && (
                <motion.div
                    initial={{ scale: 0.4, rotateX: 90, opacity: 0 }}
                    animate={{ scale: 1, rotateX: 0, opacity: 1 }}
                    exit={{ scale: 0.4, rotateX: -90, opacity: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 100 }}
                    style={{ position: "absolute", top: -40, left: 0, right: 0, zIndex: 200, display: "flex", justifyContent: "center" }}
                >
                    <ShootingStar color={lastWinner.color} count={60} />
                    <Paper sx={{
                        px: { xs: 4, md: 7 }, py: { xs: 3, md: 4 },
                        background: `linear-gradient(145deg, ${lastWinner.color}CC 0%, #050810 F0 100%)`,
                        borderRadius: "48px", border: `5px solid ${lastWinner.color}`,
                        textAlign: "center", boxShadow: `0 0 100px ${lastWinner.color}80, inset 0 0 50px ${lastWinner.color}40`,
                        backdropFilter: "blur(30px)",
                        position: "relative", overflow: "hidden"
                    }}>
                        <NeonShimmer />
                        <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                            <Typography variant="h2" sx={{ mb: 1.5, filter: `drop-shadow(0 0 20px ${lastWinner.color})` }}>{lastWinner.icon}</Typography>
                        </motion.div>
                        <Typography variant="h4" sx={{
                            fontWeight: 950, color: "#FFF", textTransform: "uppercase",
                            letterSpacing: 6, mb: 1,
                            fontFamily: "'Orbitron', sans-serif"
                        }}>JACKPOT SHATTERED!</Typography>
                        <Typography variant="h2" sx={{
                            fontWeight: 400, color: lastWinner.winnerName ? lastWinner.color : "#FFF",
                            mb: 2,
                            fontFamily: "'Pacifico', cursive",
                            textShadow: `0 0 20px ${lastWinner.color}80`
                        }}>{lastWinner.winnerName}</Typography>
                        <Box sx={{
                            display: "inline-block", px: 5, py: 1.5, borderRadius: "24px",
                            background: "rgba(255,255,255,0.15)", border: `2px solid ${lastWinner.color}`
                        }}>
                            <Typography variant="h3" sx={{
                                fontWeight: 900, color: "#FFF", letterSpacing: 2,
                                fontFamily: "'Orbitron', sans-serif"
                            }}>
                                {lastWinner.amount.toLocaleString()} <Typography component="span" variant="h5" sx={{ fontFamily: "inherit" }}>Coins</Typography>
                            </Typography>
                        </Box>
                    </Paper>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default WinnerOverlay;
