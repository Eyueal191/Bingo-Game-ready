import React from "react";
import { Box } from "@mui/material";
import { DarkMode, LightMode } from "@mui/icons-material";

/**
 * Premium animated pill-style theme toggle.
 * Accepts `isDark` (boolean) and `toggleTheme` (function) props.
 * Optional `size` prop: "small" (for navbar) or "default" (for profile page).
 */
const ThemeToggle = ({ isDark, toggleTheme, size = "default" }) => {
  const isSmall = size === "small";
  const trackW = isSmall ? 44 : 52;
  const trackH = isSmall ? 24 : 28;
  const knobSize = isSmall ? 18 : 22;
  const knobOffset = isSmall ? 3 : 3;
  const iconSize = isSmall ? 11 : 13;

  return (
    <Box
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
      sx={{
        width: trackW,
        height: trackH,
        borderRadius: `${trackH / 2}px`,
        background: isDark
          ? "linear-gradient(135deg, #7C4DFF, #00E5FF)"
          : "linear-gradient(135deg, #FFD700, #FF9F1C)",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.3s ease",
        boxShadow: isDark
          ? "0 2px 12px rgba(124,77,255,0.3)"
          : "0 2px 12px rgba(255,159,28,0.3)",
        flexShrink: 0,
        "&:active": { transform: "scale(0.95)" },
      }}
    >
      <Box
        sx={{
          width: knobSize,
          height: knobSize,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: knobOffset,
          left: isDark ? knobOffset : trackW - knobSize - knobOffset,
          transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isDark ? (
          <DarkMode sx={{ fontSize: iconSize, color: "#7C4DFF" }} />
        ) : (
          <LightMode sx={{ fontSize: iconSize, color: "#FF9F1C" }} />
        )}
      </Box>
    </Box>
  );
};

export default ThemeToggle;
