import { Box } from "@mui/material";

const LoginBackground = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bingo-bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Blobs */}
      <Box sx={{
        position: "absolute", top: "-10%", right: "-10%", width: "40%", height: "40%",
        background: "radial-gradient(circle, var(--color-bingo-primary) 0%, transparent 70%)",
        opacity: 0.1, filter: "blur(60px)", zIndex: 0
      }} />
      <Box sx={{
        position: "absolute", bottom: "-10%", left: "-10%", width: "40%", height: "40%",
        background: "radial-gradient(circle, var(--color-bingo-secondary) 0%, transparent 70%)",
        opacity: 0.1, filter: "blur(60px)", zIndex: 0
      }} />
      <Box sx={{ position: "relative", zIndex: 1, width: "100%", padding: { xs: 2, sm: 3 } }}>
        {children}
      </Box>
    </Box>
  );
};

export default LoginBackground;
