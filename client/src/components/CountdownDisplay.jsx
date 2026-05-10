import { styled } from "@mui/system";
import { keyframes } from "@emotion/react";
import { Typography } from "@mui/material";


const subtleGlow = keyframes`
  0% {
    text-shadow: 
      0 0 4px rgba(0, 255, 120, 0.7),
      0 0 8px rgba(0, 255, 120, 0.4);
    box-shadow: 
      0 0 8px rgba(0, 255, 120, 0.25);
  }
  50% {
    text-shadow: 
      0 0 6px rgba(0, 255, 120, 0.9),
      0 0 12px rgba(0, 255, 120, 0.6);
    box-shadow: 
      0 0 14px rgba(0, 255, 120, 0.35);
  }
  100% {
    text-shadow: 
      0 0 4px rgba(0, 255, 120, 0.7),
      0 0 8px rgba(0, 255, 120, 0.4);
    box-shadow: 
      0 0 8px rgba(0, 255, 120, 0.25);
  }
`;

const flicker = keyframes`
  0% { opacity: 1; }
  2% { opacity: 0.96; }
  4% { opacity: 1; }
  6% { opacity: 0.97; }
  8% { opacity: 1; }
  100% { opacity: 1; }
`;

const CountdownDisplayWrapper = styled("div")(() => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(145deg, #0a0a0a, #1a1a1a)",
  padding: {
    xs: "12px 16px",
    sm: "14px 18px",
    md: "16px 20px",
    lg: "18px 22px",
    xl: "20px 24px",
  },
  borderRadius: "8px",
  border: "1px solid rgba(0, 255, 120, 0.25)",
  boxShadow: `
    inset 0 4px 8px rgba(0, 0, 0, 0.85),
    0 0 18px rgba(0, 255, 120, 0.35)
  `,
  position: "relative",
  overflow: "hidden",
  animation: `${subtleGlow} 1.5s infinite ease-in-out`,
  "&:before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "linear-gradient(145deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0))",
    borderRadius: "8px",
    pointerEvents: "none",
  },
}));

const Digit = styled(Typography)(() => ({
  fontFamily: "'Seven Segment', 'Orbitron', monospace",
  fontWeight: "900",
  color: "#22c55e",
  fontSize: {
    xs: "4rem",
    sm: "4.2rem",
    md: "4.4rem",
    lg: "4.6rem",
    xl: "4.8rem",
  },
  lineHeight: 1,
  textShadow: `
    0 0 6px rgba(0, 255, 0, 0.8),
    0 0 12px rgba(0, 255, 0, 0.5),
    0 0 20px rgba(0, 255, 0, 0.3)`,
  animation: `${flicker} 0.5s infinite step-end`,
  letterSpacing: "3px",
  padding: "3px 6px",
  position: "relative",
  "&::before": {
    content: "attr(data-text)",
    position: "absolute",
    top: "3px",
    left: "4px",
    color: "transparent",
    WebkitTextStroke: "2px rgba(0, 255, 0, 0.8)",
    zIndex: -1,
  },
}));

const ColonWrapper = styled("div")(() => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  height: "100%",
  margin: "0 4px",
}));

const ColonDot = styled("div")(() => ({
  width: "3px",
  height: "3px",
  backgroundColor: "#22c55e",
  borderRadius: "50%",
  margin: "2px 0",
  boxShadow: `
    0 0 6px rgba(0, 255, 0, 0.8),
    0 0 12px rgba(0, 255, 0, 0.5)
  `,
  animation: `${flicker} 0.5s infinite step-end`,
}));

const CountdownDisplay = ({ children }) => {
  const [minutes, seconds] = children.split(":");

  return (
    <CountdownDisplayWrapper>
      <Digit component="span" data-text={minutes}>
        {minutes}
      </Digit>
      <ColonWrapper>
        <ColonDot />
        <ColonDot />
      </ColonWrapper>
      <Digit component="span" data-text={seconds}>
        {seconds}
      </Digit>
    </CountdownDisplayWrapper>
  );
};

export default CountdownDisplay;