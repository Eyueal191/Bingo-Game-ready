import { Button, CircularProgress } from "@mui/material";

const LoginButton = ({ onClick, loading, children }) => {
  return (
    <Button
    type="submit"
      variant="contained"
      fullWidth
      disabled={loading}
      sx={{ 
        mt: 1, 
        py: 1.8, 
        fontSize: "1.05rem",
        fontWeight: 900,
        borderRadius: "14px",
        background: "var(--gradient-gold)",
        border: "1px solid var(--color-bingo-accent-dark)",
        boxShadow: "0 6px 0 var(--color-bingo-accent-dark), 0 12px 24px hsla(215, 100%, 4%, 0.4)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--color-txt-black)",
        "&:hover": {
          background: "var(--gradient-gold-shimmer)",
          transform: "translateY(-1px)",
          boxShadow: "0 4px 0 var(--color-bingo-accent-dark), 0 15px 30px hsla(45, 92%, 52%, 0.25)",
        },
        "&:active": {
          transform: "translateY(4px)",
          boxShadow: "0 1px 0 var(--color-bingo-accent-dark), 0 4px 12px hsla(215, 100%, 4%, 0.4)",
        },
        transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      
    >
      {loading ? (
        <CircularProgress size={24} color="inherit" />
      ) : (
        children
      )}
    </Button>
  );
};

export default LoginButton;
