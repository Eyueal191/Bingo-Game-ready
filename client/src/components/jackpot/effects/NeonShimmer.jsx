import React from "react";
import { motion } from "framer-motion";

const NeonShimmer = () => (
    <motion.div
        style={{
            position: "absolute",
            top: 0,
            left: "-150%",
            width: "60%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
            skewX: -25,
            zIndex: 4,
        }}
        animate={{ left: "150%" }}
        transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 3.5 }}
    />
);

export default NeonShimmer;
