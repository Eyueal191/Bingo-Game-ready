import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Alert,
  CircularProgress,
  Button,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link } from "react-router-dom";
import { useApi } from "../../../contexts/ApiContext";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "sonner";
import MaterialLotteryAdminSidebar from "./MaterialLotteryAdminSidebar";
import MaterialLotteryDashboardSection from "./MaterialLotteryDashboardSection";
import MaterialLotteryGamesSection from "./MaterialLotteryGamesSection";
import MaterialLotteryGameHistorySection from "./MaterialLotteryGameHistorySection";
import MaterialLotteryPayoutsSection from "./MaterialLotteryPayoutsSection";

const MaterialLotteryAdminDashboard = () => {
  const api = useApi();
  const { isAdmin, gamePermissions } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [analytics, setAnalytics] = useState(null);
  const [games, setGames] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isSmall);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  React.useEffect(() => setSidebarCollapsed(isSmall), [isSmall]);

  const fetchData = async (from = "", to = "") => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (from) queryParams.append("from", from);
      if (to) queryParams.append("to", to);

      const [gamesRes, gameHistoryRes, payoutsRes, dashboardRes] =
        await Promise.all([
          api.get("/api/v1/material-lottery"),
          api.get("/api/v1/material-lottery/history"),
          api.get("/api/v1/material-lottery/payouts"),
          api.get(
            `/api/v1/material-lottery/dashboard?${queryParams.toString()}`
          ),
        ]);
      console.log("payoutsRes", payoutsRes.data);
      setGames(gamesRes.data || []);
      setGameHistory(gameHistoryRes.data || []);
      setPayouts(payoutsRes.data || []);
      setAnalytics(dashboardRes.data);
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        "Failed to fetch Material Lottery admin data";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyFilters = (newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    fetchData(newStartDate, newEndDate);
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    fetchData();
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="py-10 px-4"
    >
      <Box
        sx={{
          display: "flex",
          minHeight: "calc(100vh - 64px)",
          overflowX: "hidden",
        }}
      >
        <MaterialLotteryAdminSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((s) => !s)}
        />
        <Box
          sx={{
            flexGrow: 1,
            ml: { sm: sidebarCollapsed ? "64px" : "240px" },
            p: 3,
            bgcolor: "transparent",
            overflowX: "hidden",
          }}
        >
          {(isAdmin || gamePermissions?.bingo) && (
            <Button
              component={Link}
              to="/konjo-bingo-admin-dashboard"
              variant="contained"
              sx={{ mb: 2, mr: 2 }}
            >
              Go to Bingo Dashboard
            </Button>
          )}
          {(isAdmin || gamePermissions?.keshkesh) && (
            <Button
              component={Link}
              to="/kesh-admin-dash"
              variant="contained"
              sx={{ mb: 2 }}
            >
              Go to Kesh-Kesh Dashboard
            </Button>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {activeSection === "dashboard" && (
            <MaterialLotteryDashboardSection
              analytics={analytics}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
            />
          )}
          {activeSection === "games" && (
            <MaterialLotteryGamesSection
              games={games}
              setGames={setGames}
              setError={setError}
            />
          )}
          {activeSection === "game_history" && (
            <MaterialLotteryGameHistorySection gameHistory={gameHistory} />
          )}
          {activeSection === "payouts" && (
            <MaterialLotteryPayoutsSection
              payouts={payouts}
              setPayouts={setPayouts}
              setError={setError}
            />
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

export default MaterialLotteryAdminDashboard;