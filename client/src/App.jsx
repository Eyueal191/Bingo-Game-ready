import { useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import AppRoutes from "./routes/AppRoutes";
import { useAuth } from "./contexts/AuthContext";
import PromoSpotlightModal from "./pages/common/PromoSpotlightModal"
import Navbar from "./pages/common/NavBar";
import SocketStatusIndicator from "./components/common/SocketStatusIndicator";
import BottomNav from "./components/common/BottomNav";


const useHidePromo = () => {
  const location = useLocation();

  return (
    location.pathname.startsWith("/play-game") ||
    location.pathname === "/bingo-dashboard"
  );
};

function App() {
  const location = useLocation();
  const { token, isAdmin } = useAuth();

  const isAuthenticated = !!token;
    const hidePromo = useHidePromo();
    const hideNavbar =
      location.pathname.startsWith("/play-game") || 
      location.pathname.startsWith("/cards-list") ||
      location.pathname === "/bingo-dashboard";
    
  let redirectPath;
  if (isAuthenticated) {
    // Admin users go to admin dashboard; others to games
    if (isAdmin) {
      redirectPath = "/bingo-dashboard";
    } else {
      redirectPath = "/games";
    }
  } else {
    redirectPath = "/login";
  }

  return (
    <>
      <SocketStatusIndicator />
      {isAuthenticated && !hideNavbar && <Navbar />}
      {!hidePromo && isAuthenticated && <PromoSpotlightModal />}
  <Box
        sx={{
          // Apply bottom padding ONLY on mobile/tablet to avoid BottomNav overlap
          pb: { xs: isAuthenticated && !hideNavbar ? "calc(var(--nav-bottom-height) + env(safe-area-inset-bottom))" : 0, md: 0 },
        }}
      >
      <AppRoutes
        redirectPath={redirectPath}
        isAuthenticated={isAuthenticated}
      />
      </Box>
            {isAuthenticated && !hideNavbar && <BottomNav />}

    </>
  );
}

export default App;
