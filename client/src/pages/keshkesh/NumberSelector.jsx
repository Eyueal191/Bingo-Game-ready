import { Box, Button, Typography } from "@mui/material";
import { useState, useMemo } from "react";

const NumberSelector = ({
  maxNumbers,
  takenNumbers,
  selectedNumbers,
  onSelect,
}) => {
  const [error, setError] = useState("");

  const takenSet = useMemo(() => new Set(takenNumbers), [takenNumbers]);

  const handleNumberClick = (number) => {
    if (takenSet.has(number)) {
      setError(`ቁጥር ${number} የተወሰደ ነው`);
      return;
    }
    setError("");
    onSelect(number);
  };

  return (
    <Box sx={{ maxWidth: "600px", mx: "auto" }}>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
          gap: 1,
        }}
      >
        {Array.from({ length: maxNumbers }, (_, i) => i + 1).map((number) => {
          const isTaken = takenSet.has(number);
          const isSelected = selectedNumbers.includes(number);
          const bg = isTaken ? "#d32f2f" : isSelected ? "#1976d2" : "#03D300";
          const border = isTaken
            ? "#b71c1c"
            : isSelected
          "#1565c0"
          "#00aa00";
          const hoverBg = isTaken
            ? "#c62828"
            : isSelected
          "#1565c0"
          "#00b000";
          const boxShadow = isTaken
            ? "0 4px 10px rgba(255, 0, 0, 0.3)"
            : isSelected
          "0 4px 12px rgba(25, 118, 210, 0.4)"
          "0 4px 14px rgba(0, 255, 0, 0.4)";
          const hoverBoxShadow = isTaken
            ? "0 6px 16px rgba(255, 0, 0, 0.4)"
            : isSelected
          "0 6px 18px rgba(21, 101, 192, 0.5)"
          "0 6px 18px rgba(0, 255, 0, 0.5)";
          return (
            <Button
              key={number}
              variant={isSelected ? "contained" : "outlined"}
              onClick={() => !isTaken && handleNumberClick(number)}
              disabled={isTaken}
              disableElevation
              sx={{
                "&&": {
                  minWidth: "40px",
                  height: "40px",
                  fontSize: "1.75rem",
                  borderRadius: "8px",
                  fontWeight: 900,
                  color: "#ffffff !important",
                  backgroundColor: `${bg} !important`,
                  background: `${bg} !important`,
                  border: "2px solid !important",
                  borderColor: `${border} !important`,
                  boxShadow: `${boxShadow} !important`,
                  transform: "perspective(500px) rotateX(12deg) rotateY(4deg)",
                  transformStyle: "preserve-3d",
                  transition: "all 0.25s ease",
                  cursor: isTaken ? "not-allowed" : "pointer",
                  "&:hover": {
                    backgroundColor: `${hoverBg} !important`,
                    background: `${hoverBg} !important`,
                    boxShadow: `${hoverBoxShadow} !important`,
                    transform:
                      "perspective(500px) rotateX(8deg) rotateY(2deg) scale(1.05)",
                  },
                  "&:active": {
                    transform: "perspective(500px) rotateX(20deg) scale(0.96)",
                    boxShadow: "0 3px 8px rgba(0, 0, 0, 0.3) !important",
                  },
                  "&.Mui-disabled": {
                    color: "#fff !important", // keeps text readable when disabled
                    backgroundColor: "#d32f2f !important",
                    background: "#d32f2f !important",
                    borderColor: "#b71c1c !important",
                    boxShadow: "0 4px 10px rgba(255, 0, 0, 0.3) !important",
                  },
                },
              }}
            >
              {number}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
};

export default NumberSelector;
