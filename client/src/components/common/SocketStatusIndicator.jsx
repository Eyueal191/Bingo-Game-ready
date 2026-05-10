import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useAppStore } from "../../store";
import  { useState, useRef } from "react";
import Draggable from "react-draggable"; 

export default function SocketStatusIndicator() {
  const socketStatus = useAppStore((state) => state.socketStatus);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [position, setPosition] = useState({ x: 12, y: 10 }); // Initial position
  const draggableRef = useRef(null); // Create a ref for the draggable element

  // Conditional colors and labels based on socket status
  let color = "gray";
  let label = "...";
  if (socketStatus === "connected") {
    color = "#22c55e"; // green
    label = "";
  } else if (socketStatus === "reconnecting") {
    color = "#f59e42"; // orange
    label = "...";
  } else if (socketStatus === "disconnected") {
    color = "#ef4444"; // red
    label = "";
  }

  // Adjust position styles based on screen size and route
  const positionStyles = isMobile
    ?  {
        bottom: "calc(env(safe-area-inset-bottom, 16px) + 88px)",
        right: 12,
        left: "auto",
        top: "auto",
      }
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
        className="indicator-handle" 
        sx={{
          position: "fixed",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 1,
          background: "transparent",
          color: "white",
          borderRadius: 1,
          px: 1.5,
          py: 0.5,
          fontSize: 14,
          fontWeight: 500,
          pointerEvents: "auto",
          cursor: "move",
          ...positionStyles,
        }}
      >
        <Box
          component="span"
          sx={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: color,
            mr: 1,
          }}
        />
        {label}
      </Box>
    </Draggable>
  );
}