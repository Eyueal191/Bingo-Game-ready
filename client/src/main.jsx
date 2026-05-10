import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/socketContext";
import { WalletProvider } from "./contexts/WalletContext";
import WebApp from "@twa-dev/sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ReservationProvider } from "./contexts/ReservationContext";
import { ApiProvider } from "./contexts/ApiContext";
import { AppConfigProvider } from "./contexts/AppConfigContext";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";


WebApp.ready();

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: false, // Disable refetch on focus for better UX
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ApiProvider>
          <AppConfigProvider>
            <AuthProvider>
              <SocketProvider>
              <ReservationProvider>
                <WalletProvider>
                  <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <App />
                  </ThemeProvider>
                  <Toaster
                    position="top-center"
                    richColors
                    closeButton={false}
                  />
                </WalletProvider>
              </ReservationProvider>
              </SocketProvider>
            </AuthProvider>
          </AppConfigProvider>
        </ApiProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
