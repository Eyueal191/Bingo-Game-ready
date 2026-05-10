import { Box, Typography } from "@mui/material";
import { ChevronRight } from "@mui/icons-material";
import { Link } from "react-router-dom";
import React from "react";

const MenuItem = ({ icon, label, subtitle, to, onClick, danger, external }) => {
  const commonSx = {
    display: "flex",
    alignItems: "center",
    gap: 2,
    px: 2.5,
    py: 1.8,
    cursor: "pointer",
    transition: "background 0.15s ease",
    textDecoration: "none",
    "&:active": { background: "var(--color-bingo-card-alt)" },
    "&:hover": { background: "var(--color-bingo-card-alt)" },
  };

  const content = (
    <>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: danger
            ? "hsla(355, 85%, 50%, 0.12)"
            : "var(--color-bingo-surface)",
          flexShrink: 0,
          border: "1px solid var(--color-bingo-border)",
        }}
      >
        {React.cloneElement(icon, {
          sx: {
            fontSize: 20,
            color: danger
              ? "var(--color-bingo-red)"
              : "var(--color-bingo-white)",
            opacity: danger ? 1 : 0.8,
          },
        })}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "0.935rem",
            fontWeight: 600,
            color: danger
              ? "var(--color-bingo-red)"
              : "var(--color-bingo-white)",
            lineHeight: 1.3,
          }}
        >
          {label}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: danger
                ? "hsla(355, 85%, 50%, 0.7)"
                : "var(--color-bingo-muted)",
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {!danger && (
        <ChevronRight
          sx={{
            fontSize: 20,
            color: "var(--color-bingo-muted)",
            opacity: 0.5,
            flexShrink: 0,
          }}
        />
      )}
    </>
  );

  if (onClick) {
    return (
      <Box onClick={onClick} sx={commonSx}>
        {content}
      </Box>
    );
  }

  if (external) {
    return (
      <Box component="a" href={to} target="_blank" rel="noopener" sx={commonSx}>
        {content}
      </Box>
    );
  }

  return (
    <Box component={Link} to={to} sx={commonSx}>
      {content}
    </Box>
  );
};

export default MenuItem;