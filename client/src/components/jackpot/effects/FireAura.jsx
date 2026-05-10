import React from "react";
import { motion } from "framer-motion";

const FireAura = ({ color }) => (
    <motion.div
        style={{
            position: "absolute",
            inset: "-30%",
            background: `radial-gradient(circle, ${color}44 0%, ${color}11 40%, transparent 70%)`,
            zIndex: 0,
            filter: "blur(20px)",
        }}
        animate={{
            scale: [1, 1.15, 0.95, 1.1, 1],
            rotate: [0, 90, 180, 270, 360],
            opacity: [0.4, 0.7, 0.45, 0.8, 0.4],
        }}
        transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
        }}
    />
);

export default FireAura;
