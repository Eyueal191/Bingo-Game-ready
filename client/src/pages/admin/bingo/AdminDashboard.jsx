import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  useMediaQuery,
  useTheme,
  FormControlLabel,
  Switch,
  CssBaseline,
  Button,
} from "@mui/material";
import {
  Apps as CardsIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Payment as PaymentIcon,
  Money as MoneyIcon,
  ListAlt as TransactionsIcon,
  Casino as CasinoIcon,
  People as PeopleIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Brightness7,
  Brightness4,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CardGiftcard as BonusIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Wallet as WalletIcon,
   EmojiEvents as EmojiEventsIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import AdminReceipts from "./AdminReceipts";
import AdminDeposit from "./AdminDeposit";
import AdminWithdrawals from "./AdminWithdrawals";
import AdminWithdrawalApproval from "./AdminWithdrawalApproval";
import AdminTransactions from "./AdminTransactions";
import AdminUsers from "./AdminUsers";
import AdminAddispayTransactions from "./AdminAddispayTransactions";
import GameRoomManagement from "./GameRoomManagement";
import BingoDashboard from "./BingoDashboard";
import AdminBonuses from "./AdminBonuses";
import AdminAgents from "./AdminAgents";
import StakeBonusSettings from "./StakeBonusSettings";
import CommissionSettings from "./CommissionSettings";
import AdminNotifications from "./AdminNotifications";
import AdminProfileModal from "./AdminProfile";
import GameManagerManagement from "./GameManagerManagement";
import AdminRobotSettings from "./AdminRobotSettings";
import AdminSettings from "./AdminSettings";
import AdminCardsManagement from "./AdminCardsManagement";
import AdminConfig from "./AdminConfig";
import AdminWalletLogs from "./AdminWalletLogs";
import AdminRevenueBreakdown from "./AdminRevenueBreakdown";
import AdminRobotManagement from "./AdminRobotManagement";
import AdminGameTransactions from "./AdminGameTransactions";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { motion } from "framer-motion";
import { useAuth } from "../../../contexts/AuthContext";
import AdminLeaderboard from "./AdminLeaderboard";

// Theme configuration
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#3f51b5" },
    secondary: { main: "#f50057" },
    background: {
      default: "#f3f4f6",
      paper: "#ffffff",
    },
    text: {
      primary: "#1f2937",
      secondary: "#616161",
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: "#1a237e",
          color: "#ffffff",
          transition: "width 0.3s",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          "&:hover": { backgroundColor: "#3f51b5", color: "#ffffff" },
          "&.Mui-selected": { backgroundColor: "#3f51b5", color: "#ffffff" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          "&:hover": {
            transform: "translateY(-5px)",
            boxShadow: "0 10px 20px rgba(0, 0, 0, 0.2)",
          },
        },
      },
    },
  },
  typography: {
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
});

// Custom hook to handle theme toggle
const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(false);
  const updatedTheme = React.useMemo(
    () =>
      createTheme({
        ...theme,
        palette: {
          ...theme.palette,
          mode: darkMode ? "dark" : "light",
          background: {
            default: darkMode ? "#121212" : "#f3f4f6",
            paper: darkMode ? "#1e1e1e" : "#ffffff",
          },
          text: {
            primary: darkMode ? "#e5e7eb" : "#1f2937",
            secondary: darkMode ? "#b0b3b8" : "#616161",
          },
        },
      }),
    [darkMode]
  );
  return [darkMode, setDarkMode, updatedTheme];
};

const AdminDashboard = () => {
  const { isAdmin, gamePermissions } = useAuth();

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const getInitialTab = () => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get("tab");
        if (urlTab) {
          return urlTab;
        }
        const stored = localStorage.getItem("adminActiveTab");
        if (stored) {
          return stored;
        }
      } catch (error) {
        console.warn("Failed to resolve initial admin tab", error);
      }
    }
    return "dashboard";
  };
   const [activeTab, setActiveTab] = useState(getInitialTab);
const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [darkMode, setDarkMode, updatedTheme] = useDarkMode();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  useEffect(() => {
      if (typeof window === "undefined") {
        return;
      }

      try {
        localStorage.setItem("adminActiveTab", activeTab);
      } catch (error) {
        console.warn("Failed to persist admin active tab", error);
      }

      try {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", activeTab);
        window.history.replaceState({}, "", url.toString());
      } catch (error) {
        console.warn("Failed to sync admin tab query parameter", error);
      }
    }, [activeTab]);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const sidebarContent = (
    <Box
      sx={{
        width: collapsed ? 60 : 250,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          p: 2,
          bgcolor: "#20232A",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          flexShrink: 0,
        }}
      >
        <Typography
          variant="h6"
          sx={{ flexGrow: 1, display: collapsed ? "none" : "block" }}
        >
          Admin Panel
        </Typography>
        {/* collapse toggle on desktop or close on mobile */}
        {!isMobile ? (
          <IconButton
            onClick={() => setCollapsed(!collapsed)}
            sx={{ color: "white", p: 0.5 }}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        ) : (
          <IconButton
            onClick={() => setSidebarOpen(false)}
            sx={{ color: "white", p: 0.5 }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      <List sx={{ flexGrow: 1, overflowY: "auto" }}>
        {[
          { id: "dashboard", icon: <DashboardIcon />, label: "Dashboard" },
          { id: "revenue", icon: <MoneyIcon />, label: "Total Revenue" },
          { id: "gameTransactions", icon: <TransactionsIcon />, label: "Game Transactions" },
          { id: "robotManagement", icon: <PeopleIcon />, label: "Robot Management" },
          { id: "receipt", icon: <PaymentIcon />, label: "Receipts" },
          {
            id: "withdrawals",
            icon: <MoneyIcon />,
            label: "Withdrawal Requests",
          },
          {
            id: "transactions",
            icon: <TransactionsIcon />,
            label: "Transactions",
          },
          {
            id: "AddispayTransactions",
            icon: <PeopleIcon />,
            label: "Addispay Transactions",
          },
          { id: "bonuses", icon: <BonusIcon />, label: "Bonuses" },
          { id: "users", icon: <PeopleIcon />, label: "Users" },
          { id: "walletLogs", icon: <WalletIcon />, label: "Wallet Logs" },
           { id: "leaderboard", icon: <EmojiEventsIcon />, label: "Leaderboard" },
          { id: "gameRooms", icon: <CasinoIcon />, label: "Manage Rooms" },
          { id: "agents", icon: <PeopleIcon />, label: "Agents" },
          {
            id: "commission",
            icon: <MoneyIcon />,
            label: "Commission Settings",
          },
          { id: "adminSettings", icon: <SecurityIcon />, label: "Admin Settings" },
          { id: "settings", icon: <PeopleIcon />, label: "Robot Settings" },
          { id: "cards", icon: <CardsIcon />, label: "Cards" },

          {
            id: "stakeBonus",
            icon: <BonusIcon />,
            label: "Robot & Bonus Settings",
          },
          { id: "config", icon: <DashboardIcon />, label: "Config" },
          {
            id: "notifications",
            icon: <NotificationsIcon />,
            label: "Send Notifications",
          },
          ...(isAdmin
            ? [
                {
                  id: "gameManagers",
                  icon: <SecurityIcon />,
                  label: "Game Managers",
                },
              ]
            : []),
        ].map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) setSidebarOpen(false);
              }}
              selected={activeTab === item.id}
              sx={{
                "&:hover": { bgcolor: "#3E4A89", color: "white" },
                bgcolor: activeTab === item.id ? "#4B75F2" : "inherit",
                color: activeTab === item.id ? "white" : "inherit",
                justifyContent: collapsed ? "center" : "initial",
              }}
            >
              <ListItemIcon
                sx={{
                  color: "inherit",
                  minWidth: 0,
                  mr: collapsed ? 0 : 2,
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.label} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box
        sx={{
          p: 2,
          bgcolor: "#20232A",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <ListItemButton
          onClick={() => setProfileOpen(true)}
          sx={{
            color: "white",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <ListItemIcon
            sx={{
              color: "inherit",
              minWidth: 0,
              mr: collapsed ? 0 : 1,
              justifyContent: "center",
            }}
          >
            <PersonIcon />
          </ListItemIcon>
          {!collapsed && <ListItemText primary="Profile" />}
        </ListItemButton>
      </Box>
    </Box>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <BingoDashboard />;
      case "revenue":
        return <AdminRevenueBreakdown />;
      case "gameTransactions":
        return <AdminGameTransactions />;
      case "robotManagement":
        return <AdminRobotManagement />;
      case "receipt":
        return <AdminReceipts onSelectReceipt={setSelectedReceipt} />;
      case "withdrawals":
        return <AdminWithdrawals onSelectWithdrawal={setSelectedWithdrawal} />;
      case "transactions":
        return <AdminTransactions />;
      case "AddispayTransactions":
        return <AdminAddispayTransactions />;
      case "bonuses":
        return <AdminBonuses />;
      case "users":
        return <AdminUsers />;
      case "walletLogs":
        return <AdminWalletLogs />;
      case "leaderboard":
        return <AdminLeaderboard />;
      case "gameRooms":
        return <GameRoomManagement />;
      case "cards":
        return <AdminCardsManagement />;
      case "agents":
        return <AdminAgents />;
      case "stakeBonus":
        return <StakeBonusSettings />;
      case "adminSettings":
        return <AdminSettings />;
      case "settings":
        return <AdminRobotSettings />;
      case "commission":
        return <CommissionSettings />;
      case "notifications":
        return <AdminNotifications />;
      case "gameManagers":
        return <GameManagerManagement />;
      case "config":
        return <AdminConfig />;

      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={updatedTheme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          bgcolor: "background.default",
          overflowX: "auto",
        }}
      >
        {isMobile ? (
          <Drawer
            anchor="left"
            open={sidebarOpen}
            onClose={toggleSidebar}
            sx={{
              "& .MuiDrawer-paper": {
                width: 250,
                boxSizing: "border-box",
                bgcolor: "primary.dark",
                color: "white",
              },
            }}
            variant="temporary"
          >
            {sidebarContent}
          </Drawer>
        ) : (
          <Drawer
            anchor="left"
            open={true}
            variant="permanent"
            sx={{
              "& .MuiDrawer-paper": {
                width: collapsed ? 60 : 250,
                boxSizing: "border-box",
                bgcolor: "primary.dark",
                color: "white",
                transition: "width 0.3s",
                overflowX: "hidden",
              },
            }}
          >
            {sidebarContent}
          </Drawer>
        )}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            // push content right when permanent drawer is open (>=md)
            ml: { xs: 0, md: collapsed ? "60px" : "250px" },
            width: "100%",
            //  { xs: "100%", md: "auto" },
            transition: "margin-left 0.3s",
            bgcolor: "background.default",
            overflowX: "auto",
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap", // allow wrapping on small devices
                mb: 3,
                px: { xs: 1, sm: 2 },
                py: 1,
                bgcolor: "background.paper",
                borderRadius: 1,
                boxShadow: 1,
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  background: "linear-gradient(90deg, #3f51b5, #9c27b0)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" }, // responsive size
                }}
              >
                Admin Dashboard
              </Typography>
              {(isAdmin || gamePermissions?.keshkesh) && (
                <Button
                  component={Link}
                  to="/kesh-admin-dash"
                  variant="contained"
                  sx={{ mt: { xs: 1, sm: 0 }, mr: 1 }}
                >
                  Go to Kesh Kesh Dashboard
                </Button>
              )}
               {(isAdmin || gamePermissions?.material_lottery) && (
                <Button
                  component={Link}
                  to="/material-lottery-admin-dash"
                  variant="contained"
                  sx={{ mt: { xs: 1, sm: 0 } }}
                >
                  Go to Material Lottery Dashboard
                </Button>
              )}
               
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mt: { xs: 1, sm: 0 },
                }} // add top margin on wrap
              >
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {new Date().toLocaleString("en-US", {
                    timeZone: "Africa/Nairobi",
                    hour12: true,
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={darkMode}
                      onChange={() => setDarkMode(!darkMode)}
                      icon={<Brightness7 />}
                      checkedIcon={<Brightness4 />}
                    />
                  }
                  label={darkMode ? "Dark Mode" : "Light Mode"}
                  sx={{ ml: 1 }}
                />
                {isMobile && (
                  <IconButton
                    onClick={toggleSidebar}
                    sx={{
                      color: "primary.main",
                      bgcolor: "background.paper",
                      borderRadius: "50%",
                    }}
                  >
                    <MenuIcon />
                  </IconButton>
                )}
              </Box>
            </Box>
            <Box
              sx={{
                maxWidth: `calc(100% - ${collapsed ? "10px" : "60px"})`,
                margin: "0 auto",
              }}
            >
              {renderContent()}
            </Box>
          </motion.div>
          {selectedReceipt && (
            <AdminDeposit
              open={!!selectedReceipt}
              onClose={() => setSelectedReceipt(null)}
              telegramId={selectedReceipt.userId.telegramId}
              receiptId={selectedReceipt._id}
              onSuccess={selectedReceipt.onSuccess}
              sx={{ bgcolor: "background.paper" }}
            />
          )}
          {selectedWithdrawal && (
            <AdminWithdrawalApproval
              open={!!selectedWithdrawal}
              onClose={() => setSelectedWithdrawal(null)}
              telegramId={selectedWithdrawal.userId.telegramId}
              withdrawalId={selectedWithdrawal._id}
              amount={selectedWithdrawal.amount}
              onSuccess={selectedWithdrawal.onSuccess}
              sx={{ bgcolor: "background.paper" }}
            />
          )}
          <AdminProfileModal
            open={profileOpen}
            onOpenChange={setProfileOpen}
            sx={{ bgcolor: "background.paper" }}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AdminDashboard;
