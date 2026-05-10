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
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useAuth } from "../../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { useApi } from "../../../contexts/ApiContext";
import SpinAdminSidebar from "./SpinAdminSidebar";
import SpinDashboardSection from "./SpinDashboardSection";
import SpinUsersSection from "./SpinUsersSection";
import SpinGamesSection from "./SpinGamesSection";
import SpinGameHistorySection from "./SpinGameHistorySection";
import SpinTransactionsSection from "./SpinTransactionsSection";
import SpinPayoutsSection from "./SpinPayoutsSection";
import { toast } from "sonner";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const SpinAdminDashboard = () => {
  const { isAdmin, gamePermissions } = useAuth();
  const api = useApi();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [analytics, setAnalytics] = useState(null);
  // Settings removed in favor of per-room configuration
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  // Sections fetch paged data themselves: no local state needed
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Date range for analytics lists
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  const [sidebarCollapsed, setSidebarCollapsed] = useState(isSmall);
  // Keep sidebar responsive to viewport changes (collapse on small screens)
  React.useEffect(() => {
    setSidebarCollapsed(isSmall);
  }, [isSmall]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = {};
        if (fromDate) params.from = fromDate;
        if (toDate) params.to = toDate;
        // History and transactions are now fetched in their sections with server-side paging.

        const [analyticsRes, usersRes, gamesRes, payoutsRes, statsRes] =
          await Promise.all([
            api.get("/api/v1/admin/dashboard", { params }),
            api.get("/api/v1/users/all", { params }),
            api.get("/api/v1/spin", { params }),
            api.get("/api/v1/admin/payouts", { params }),
            api.get("/api/v1/admin/stats", { params }),
          ]);

        setAnalytics(analyticsRes.data);
        setUsers(usersRes.data.users || []);
        setGames(gamesRes.data || []);
        // Transactions list will be fetched by the Transactions section
        setPayouts(payoutsRes.data || []);
        setStats(statsRes.data);
      } catch (err) {
        const errorMessage =
          err.response?.data?.error || "Failed to fetch Spin-Spin admin data";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fromDate, toDate, api]);

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
        <SpinAdminSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((s) => !s)}
        />
        <Box
          sx={{
            flexGrow: 1,
            ml: { sm: sidebarCollapsed ? "72px" : "250px" },
            p: 3,
            bgcolor: "transparent",
            overflowX: "hidden",
          }}
        >
          {(isAdmin || gamePermissions?.bingo) && (
            <Button
              component={Link}
              to="/bingo-dashboard"
              variant="contained"
              sx={{ mb: 2, mr: 1 }}
            >
              Go to Bingo Dashboard
            </Button>
          )}
          {(isAdmin || gamePermissions?.keshkesh) && (
            <Button
              component={Link}
              to="/kesh-admin-dash"
              variant="contained"
              sx={{ mb: 2, mr: 1 }}
            >
              Go to Kesh-Kesh Dashboard
            </Button>
          )}
          {(isAdmin || gamePermissions?.material_lottery) && (
            <Button
              component={Link}
              to="/material-lottery-admin-dash"
              variant="contained"
              sx={{ mb: 2, mr: 1 }}
            >
              Go to Material Lottery Dashboard
            </Button>
          )}
          {(isAdmin || gamePermissions?.ludo) && (
            <Button
              component={Link}
              to="/ludo-admin-dash"
              variant="contained"
              sx={{ mb: 2 }}
              color="secondary"
            >
              🎲 Go to Ludo Dashboard
            </Button>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {activeSection === "dashboard" && (
            <>
              <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ padding: 8, borderRadius: 6 }}
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ padding: 8, borderRadius: 6 }}
                />
              </Box>
              <SpinDashboardSection analytics={analytics} stats={stats} />
            </>
          )}
          {activeSection === "users" && (
            <SpinUsersSection
              users={users}
              setUsers={setUsers}
              setError={setError}
            />
          )}
          {activeSection === "games" && (
            <SpinGamesSection games={games} setGames={setGames} />
          )}
          {activeSection === "game_history" && <SpinGameHistorySection />}
          {activeSection === "transactions" && <SpinTransactionsSection />}
          {activeSection === "payouts" && (
            <SpinPayoutsSection
              payouts={payouts}
              setPayouts={setPayouts}
              setError={setError}
            />
          )}
          {/* Settings removed: legacy global settings no longer used for Spin-Spin */}
        </Box>
      </Box>
    </motion.div>
  );
};

export default SpinAdminDashboard;
