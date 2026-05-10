import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import { keyframes } from "@mui/system";
import { useApi } from "../../contexts/ApiContext";
import { useSocket } from "../../contexts/socketContext";
import { useAuth } from "../../contexts/AuthContext";

const scrollAnimation = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const JackpotMarquee = () => {
    const api = useApi();
    const { socket } = useSocket();
    const { user } = useAuth();
    const [levels, setLevels] = useState([]);

    const fetchPublicData = useCallback(async () => {
        try {
            const res = await api.get("/api/v1/jackpot/public");
            setLevels(res.data.levels || []);
        } catch (err) {
            console.error("Failed to fetch jackpot data", err);
        }
    }, [api]);

    useEffect(() => {
        fetchPublicData();
        if (socket) {
            socket.on("jackpotUpdate", setLevels);
            return () => {
                socket.off("jackpotUpdate");
            };
        }
    }, [socket, fetchPublicData]);

    if (levels.length === 0) return null;

    // Duplicate levels array multiple times to ensure continuous marquee effect
    const repeatedLevels = [...levels, ...levels, ...levels, ...levels];

    return (
        <Box
            sx={{
                width: "100%",
                overflow: "hidden",
                whiteSpace: "nowrap",
                background: "rgba(10, 14, 26, 0.95)",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                py: 0.8,
                position: "relative",
                zIndex: 50,
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    width: "max-content",
                    animation: `${scrollAnimation} 30s linear infinite`,
                    "&:hover": {
                        animationPlayState: "paused"
                    }
                }}
            >
                {repeatedLevels.map((level, idx) => (
                    <Typography
                        key={idx}
                        component="span"
                        sx={{
                            color: level.color || "#FFD700",
                            fontWeight: "bold",
                            fontFamily: "'Orbitron', sans-serif",
                            fontSize: { xs: "0.75rem", md: "0.85rem", lg: "1rem" },
                            mx: { xs: 2, sm: 4, md: 6 },
                            textShadow: `0 0 8px ${level.color}80`,
                            display: "flex",
                            alignItems: "center",
                            gap: 1
                        }}
                    >
                        <span>{level.icon || "🎰"}</span>
                        <span>{level.label}: {Number(level.balance).toLocaleString()} coins</span>
                    </Typography>
                ))}
            </Box>
        </Box>
    );
};

export default JackpotMarquee;
