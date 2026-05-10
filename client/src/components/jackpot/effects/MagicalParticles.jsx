import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";

const MagicalParticles = ({ color }) => {
    const particles = useMemo(() => Array.from({ length: 15 }), []);
    return (
        <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
            {particles.map((_, i) => (
                <motion.div
                    key={i}
                    style={{
                        position: "absolute",
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        width: "2px",
                        height: "2px",
                        background: color,
                        borderRadius: "50%",
                        boxShadow: `0 0 6px ${color}`,
                    }}
                    animate={{
                        y: [0, -60, 0],
                        opacity: [0, 1, 0],
                        scale: [0, 2, 0],
                    }}
                    transition={{
                        duration: 2 + Math.random() * 3,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                    }}
                />
            ))}
        </Box>
    );
};

export default MagicalParticles;
