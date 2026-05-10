import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useAppStore } from "../store";
import { useState, useRef } from "react";
import Draggable from "react-draggable"; 

export default function SocketStatusIndicator() {
  const socketStatus = useAppStore((state) => state.socketStatus);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [position, setPosition] = useState({ x: 12, y: 10 });
  const draggableRef = useRef(null);

  // Colors and glow based on status
  let color = "#116e51"; // gray by default
  let glow = "0 0 6px #116e51";
  let pulse = false;

  if (socketStatus === "connected") {
    color = "#55ff77"; // green
    glow = "0 0 10px #55ff77";
  } else if (socketStatus === "reconnecting") {
    color = "#ff9f1c"; // orange
    glow = "0 0 12px #ff9f1c";
    pulse = true; // pulsing animation for reconnecting
  } else if (socketStatus === "disconnected") {
    color = "#ff3b30"; // red
    glow = "0 0 10px #ff3b30";
  }

  const positionStyles = isMobile
    ? { bottom: "calc(env(safe-area-inset-bottom, 16px) + 88px)", right: 12 }
    : { bottom: 10, right: 13 };

  return (
    <Draggable
      axis="both"
      position={position}
      onStop={(e, data) => setPosition({ x: data.x, y: data.y })}
      nodeRef={draggableRef}
    >
      <Box
        ref={draggableRef}
        sx={{
          position: "fixed",
          zIndex: 9999,
          width: 20,
          height: 20,
          pointerEvents: "auto",
          cursor: "move",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...positionStyles,
        }}
      >
        <Box
          component="span"
          sx={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            bgcolor: color,
            boxShadow: glow,
            animation: pulse
              ? "pulse 1.5s infinite"
              : "none",
          }}
        />
        {/* Pulse animation keyframes */}
        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.4); opacity: 0.6; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}
        </style>
      </Box>
    </Draggable>
  );
}