import React from "react";
import { Alert } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";

const getBackgroundColor = (rank) => {
  if (rank === 1) return "#FFD700";
  if (rank === 2) return "#C0C0C0";
  return "#1E90FF";
};

const WinnerAlerts = ({ winners }) => (
  <AnimatePresence>
    {winners.map((winner, index) => (
      <motion.div
        key={`${winner.rank}-${winner.number}`}
        initial={{ scale: 0, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: -50 }}
        transition={{ duration: 0.6, delay: index * 0.4 }}
      >
        <Alert
          severity="success"
          sx={{
            bgcolor: getBackgroundColor(winner.rank),
            color: "black",
            fontWeight: "bold",
            fontSize: "1.2rem",
            padding: "16px",
            borderRadius: "8px",
          }}
        >
          ደረጃ {winner.rank} ሽልማት: ቁጥር {winner.number} ({winner.user}) - ሽልማት: {winner.prize.toFixed(2)} ብር
        </Alert>
      </motion.div>
    ))}
  </AnimatePresence>
);

export default WinnerAlerts;
