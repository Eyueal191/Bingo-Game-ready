import React from "react";
import { Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";

const getBannerColor = (rank) => {
  if (rank === 1) return "rgba(255, 215, 0, 0.9)";
  if (rank === 2) return "rgba(192, 192, 192, 0.9)";
  return "rgba(30, 144, 255, 0.9)";
};

const WinnerBanner = ({ winner }) => (
  <AnimatePresence>
    {winner && (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
          backgroundColor: getBannerColor(winner.rank),
          padding: "8px 16px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        }}
      >
        <Typography variant="h6" sx={{ color: "black", fontWeight: "bold", textAlign: "center" }}>
          ደረጃ {winner.rank} አሸናፊ: {winner.number} ({winner.user})
        </Typography>
        <Typography variant="body2" sx={{ color: "black", textAlign: "center" }}>
          ሽልማት: {winner.prize.toFixed(2)} ብር
        </Typography>
      </motion.div>
    )}
  </AnimatePresence>
);

export default WinnerBanner;
