import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",

    primary: {
      main: "#BC1BFF",       
      light: "#D46BFF",
      dark: "#6B0F9C",
    },

    secondary: {
      main: "hsl(155, 90%, 45%)",        
      light: "hsl(155, 85%, 60%)",
      dark: "hsl(155, 100%, 30%)",
    },

    warning: {
      main: "hsl(42, 95%, 52%)",         
    },

    background: {
      default: "#0D0517",      
      paper: "#1A0A2E",       
    },

    text: {
      primary: "hsl(0, 0%, 98%)",
      secondary: "hsl(215, 15%, 65%)",
    },
  },

  typography: {
    fontFamily: '"Inter", "Manrope", "Noto Sans Ethiopic", system-ui, sans-serif',
    h4: { fontWeight: 800 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: {
      textTransform: "none",
      fontWeight: 700,
    },
  },

  shape: {
    borderRadius: 16,
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: "8px 20px",
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: "1px solid hsla(222, 50%, 70%, 0.10)",
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid hsla(222, 50%, 70%, 0.05)",
        },
      },
    },
  },
});

export default theme;