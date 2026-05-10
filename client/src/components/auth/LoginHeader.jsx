import { Typography } from "@mui/material";

const LoginHeader = ({ config }) => {
  return (
    <>
      <Typography
        variant="h3"
        sx={{ 
          fontWeight: 900, 
          mb: 0.5, 
          background: "var(--gradient-gold)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "-0.04em",
          textTransform: "uppercase",
          fontSize: { xs: "2.5rem", sm: "3.5rem" },
          textShadow: "0 10px 20px rgba(0,0,0,0.3)"
        }}
      >
        {config?.identity?.appName || "Bingo"}
      </Typography>
      <Typography
        variant="body2"
        sx={{ 
          mb: 4, 
          color: "var(--color-txt-muted)",
          fontWeight: 600
        }}
      >
        Log in to start winning BINGO!
      </Typography>
    </>
  );
};

export default LoginHeader;
