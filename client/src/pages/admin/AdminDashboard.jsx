import React, { useState, useEffect, useMemo } from "react";
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
  Collapse,
  Divider,
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
  ExpandLess,
  ExpandMore,
  AdminPanelSettings as AdminIcon,
  ReceiptLong as ReceiptIcon,
  ManageAccounts as UsersIcon,
  Settings as ConfigIcon,
  Logout as LogoutIcon,
  Public as PublicIcon,
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../contexts/ThemeContext";

// Components
import AdminReceipts from "./bingo/AdminReceipts";
import AdminDeposit from "./bingo/AdminDeposit";
import AdminWithdrawals from "./bingo/AdminWithdrawals";
import AdminWithdrawalApproval from "./bingo/AdminWithdrawalApproval";
import AdminTransactions from "./bingo/AdminTransactions";
import AdminUsers from "./bingo/AdminUsers";
import AdminAddispayTransactions from "./bingo/AdminAddispayTransactions";
import GameRoomManagement from "./bingo/GameRoomManagement";
import BingoDashboard from "./bingo/BingoDashboard";
import AdminBonuses from "./bingo/AdminBonuses";
import AdminAgents from "./bingo/AdminAgents";
import StakeBonusSettings from "./bingo/StakeBonusSettings";
import CommissionSettings from "./bingo/CommissionSettings";
import AdminNotifications from "./bingo/AdminNotifications";
import AdminProfileModal from "./bingo/AdminProfile";
import GameManagerManagement from "./bingo/GameManagerManagement";
import AdminRobotSettings from "./bingo/AdminRobotSettings";
import AdminSettings from "./bingo/AdminSettings";
import AdminCardsManagement from "./bingo/AdminCardsManagement";
import AdminConfig from "./bingo/AdminConfig";
import AdminWalletLogs from "./bingo/AdminWalletLogs";
import AdminRevenueBreakdown from "./bingo/AdminRevenueBreakdown";
import AdminRobotManagement from "./bingo/AdminRobotManagement";
import AdminGameTransactions from "./bingo/AdminGameTransactions";
import AdminLeaderboard from "./bingo/AdminLeaderboard";
import AdminJackpotSettings from "./bingo/AdminJackpotSettings";
import StaffRegistration from "./bingo/StaffRegistration";
import AdminPaymentMethods from "./bingo/AdminPaymentMethods";
import AdminCountries from "./bingo/AdminCountries";
import LudoAdminDashboard from "./ludo/LudoAdminDashboard";

// Role-level mapping
// Role-level mapping matching AuthContext hierarchy
const ROLE_LEVEL = {
  guest: 0,
  user: 1,
  agent: 2,
  game_manager: 3,
  secretary: 4,
  finance: 5,
  manager: 6,
  admin: 7
};

// Tab definitions grouped by category
const TAB_GROUPS = [
  {
    id: "overview",
    label: "Overview",
    icon: <DashboardIcon />,
    minRole: "secretary",
    tabs: [
      { id: "dashboard", icon: <DashboardIcon />, label: "Stats Dashboard", minRole: "secretary" },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    icon: <ReceiptIcon />,
    minRole: "secretary",
    tabs: [
      { id: "receipt", icon: <PaymentIcon />, label: "Receipts", minRole: "secretary" },
      { id: "withdrawals", icon: <MoneyIcon />, label: "Withdrawals", minRole: "secretary" },
      { id: "notifications", icon: <NotificationsIcon />, label: "Notifications", minRole: "secretary" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: <WalletIcon />,
    minRole: "finance",
    tabs: [
      { id: "revenue", icon: <MoneyIcon />, label: "Revenue", minRole: "finance" },
      { id: "gameTransactions", icon: <TransactionsIcon />, label: "Game Tx", minRole: "finance" },
      { id: "transactions", icon: <TransactionsIcon />, label: "System Tx", minRole: "finance" },
      { id: "AddispayTransactions", icon: <PeopleIcon />, label: "AddisPay Tx", minRole: "finance" },
      { id: "bonuses", icon: <BonusIcon />, label: "Bonuses", minRole: "finance" },
      { id: "walletLogs", icon: <WalletIcon />, label: "Wallet Logs", minRole: "finance" },
    ],
  },
  {
    id: "game",
    label: "Game Admin",
    icon: <CasinoIcon />,
    minRole: "manager",
    tabs: [
      { id: "gameRooms", icon: <CasinoIcon />, label: "Manage Rooms", minRole: "manager" },
      { id: "robotManagement", icon: <PeopleIcon />, label: "Robots", minRole: "manager" },
      { id: "jackpot", icon: <EmojiEventsIcon />, label: "Jackpot Settings", minRole: "manager" },
      { id: "ludoRooms", icon: <CasinoIcon />, label: "Ludo Rooms", minRole: "manager" },
      { id: "leaderboard", icon: <EmojiEventsIcon />, label: "Leaderboard", minRole: "manager" },
    ],
  },
  {
    id: "users",
    label: "User Management",
    icon: <UsersIcon />,
    minRole: "manager",
    tabs: [
      { id: "users", icon: <PeopleIcon />, label: "All Users", minRole: "manager" },
      { id: "agents", icon: <PeopleIcon />, label: "Agents", minRole: "manager" },
      { id: "staff-reg", icon: <PersonIcon />, label: "Register Staff", minRole: "manager" },
    ],
  },
  {
    id: "config",
    label: "Configuration",
    icon: <ConfigIcon />,
    minRole: "admin",
    tabs: [
      { id: "commission", icon: <MoneyIcon />, label: "Commissions", minRole: "admin" },
      { id: "adminSettings", icon: <SecurityIcon />, label: "Admin Settings", minRole: "admin" },
      { id: "settings", icon: <PeopleIcon />, label: "Robot Settings", minRole: "admin" },
      { id: "cards", icon: <CardsIcon />, label: "Cards", minRole: "admin" },
      { id: "stakeBonus", icon: <BonusIcon />, label: "Bonus Settings", minRole: "admin" },
      { id: "config", icon: <DashboardIcon />, label: "System Config", minRole: "admin" },
      { id: "gameManagers", icon: <SecurityIcon />, label: "Game Managers", minRole: "admin" },
      { id: "paymentMethods", icon: <PaymentIcon />, label: "Payment Methods", minRole: "admin" },
      { id: "countries", icon: <PublicIcon />, label: "Countries", minRole: "admin" },
    ],
  },
];

const AdminDashboard = () => {
  const { isAdmin, gamePermissions, role, logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const userLevel = ROLE_LEVEL[role] || 0;

  // State
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isDark: globalDark, setThemeMode } = useAppTheme();
  const [darkMode, setDarkMode] = useState(() => {
    // Sync initial state from global theme
    const stored = localStorage.getItem("adminDarkMode");
    return stored !== null ? stored === "true" : globalDark;
  });

  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const stored = localStorage.getItem("adminOpenGroups");
      return stored ? JSON.parse(stored) : { overview: true, ops: true };
    } catch {
      return { overview: true, ops: true };
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || localStorage.getItem("adminActiveTab") || "dashboard";
  });

  // Theme
  const updatedTheme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: { main: "#116e51" },
      secondary: { main: "#ff3b30" },
      background: {
        default: darkMode ? "#0f1221" : "#ffffff",
        paper: darkMode ? "#0f1221" : "#ffffff",
      },
      text: {
        primary: darkMode ? "#ffffff" : "#0f1221",
        secondary: darkMode ? "#55ff77" : "#116e51",
      },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 800 },
      h6: { fontWeight: 700 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
            textTransform: "none",
            fontWeight: 700,
            padding: "8px 20px",
            transition: "all 0.2s ease",
          },
          containedPrimary: {
            background: "linear-gradient(135deg, #116e51 0%, #116f4d 100%)",
            boxShadow: "0 4px 12px rgba(17, 110, 81, 0.25)",
            "&:hover": {
              background: "linear-gradient(135deg, #55ff77 0%, #116e51 100%)",
              transform: "translateY(-1px)",
              boxShadow: "0 6px 16px rgba(17, 110, 81, 0.35)",
            },
          },
          outlinedPrimary: {
            borderColor: "rgba(17, 110, 81, 0.4)",
            color: "#116e51",
            "&:hover": {
              borderColor: "#116e51",
              backgroundColor: "rgba(17, 110, 81, 0.05)",
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            margin: "4px 8px",
            borderRadius: "8px",
            "&.Mui-selected": {
              backgroundColor: "rgba(17, 110, 81, 0.15)",
              color: "#116e51",
              "& .MuiListItemIcon-root": { color: "#116e51" },
            },
          },
        },
      },
    },
  }), [darkMode]);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem("adminDarkMode", darkMode);
    // Sync global theme
    setThemeMode(darkMode ? "dark" : "light");
  }, [darkMode, setThemeMode]);

  useEffect(() => {
    localStorage.setItem("adminOpenGroups", JSON.stringify(openGroups));
  }, [openGroups]);

  useEffect(() => {
    localStorage.setItem("adminActiveTab", activeTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, "", url.toString());
  }, [activeTab]);

  // Filter visible groups and tabs
  const visibleGroups = useMemo(() => {
    return TAB_GROUPS.filter(group => {
      const groupLevel = ROLE_LEVEL[group.minRole] || 999;
      if (!isAdmin && userLevel < groupLevel) return false;

      const filteredTabs = group.tabs.filter(tab => {
        const tabLevel = ROLE_LEVEL[tab.minRole] || 999;
        return isAdmin || userLevel >= tabLevel;
      });

      return filteredTabs.length > 0;
    }).map(group => ({
      ...group,
      tabs: group.tabs.filter(tab => {
        const tabLevel = ROLE_LEVEL[tab.minRole] || 999;
        return isAdmin || userLevel >= tabLevel;
      })
    }));
  }, [isAdmin, userLevel]);

  // Ensure active tab is valid
  useEffect(() => {
    const allVisibleTabIds = visibleGroups.flatMap(g => g.tabs.map(t => t.id));
    if (allVisibleTabIds.length > 0 && !allVisibleTabIds.includes(activeTab)) {
      setActiveTab(allVisibleTabIds[0]);
    }
  }, [visibleGroups, activeTab]);

  const toggleGroup = (groupId) => {
    if (collapsed && !isMobile) {
      setCollapsed(false);
      setOpenGroups({ ...openGroups, [groupId]: true });
      return;
    }
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const Sidebar = () => (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: darkMode ? "#0f1221" : "#0f1221", color: "white" }}>
      <Box sx={{ p: 2.5, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
        {!collapsed && (
          <Typography variant="h6" sx={{ fontWeight: 800, background: "linear-gradient(90deg, #55ff77, #55ff77)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            LUDO BINGO
          </Typography>
        )}
        <IconButton onClick={() => isMobile ? setSidebarOpen(false) : setCollapsed(!collapsed)} sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
          {isMobile ? <CloseIcon /> : (collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />)}
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", mx: 2 }} />

      <List sx={{ flexGrow: 1, overflowY: "auto", py: 2, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255, 255, 255, 0.1)", borderRadius: 4 } }}>
        {visibleGroups.map((group) => (
          <React.Fragment key={group.id}>
            <ListItemButton
              onClick={() => toggleGroup(group.id)}
              sx={{
                py: 1.5,
                justifyContent: collapsed ? "center" : "initial",
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" },
                color: "rgba(255, 255, 255, 0.7)",
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 0, mr: collapsed ? 0 : 2 }}>
                {group.icon}
              </ListItemIcon>
              {!collapsed && (
                <>
                  <ListItemText primary={group.label} primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                  {openGroups[group.id] ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                </>
              )}
            </ListItemButton>

            <Collapse in={!collapsed && openGroups[group.id]} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {group.tabs.map((tab) => (
                  <ListItemButton
                    key={tab.id}
                    selected={activeTab === tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (isMobile) setSidebarOpen(false);
                    }}
                    sx={{
                      pl: 4,
                      py: 1,
                      "&.Mui-selected": {
                        bgcolor: "rgba(85, 255, 119, 0.2)",
                        color: "#55ff77",
                        "& .MuiListItemIcon-root": { color: "#55ff77" },
                        "&:hover": { bgcolor: "rgba(85, 255, 119, 0.25)" },
                      },
                      "&:hover": { bgcolor: "rgba(255, 255, 255, 0.03)" },
                      color: "rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    <ListItemIcon sx={{ color: "inherit", minWidth: 0, mr: 2 }}>
                      {React.cloneElement(tab.icon, { sx: { fontSize: 20 } })}
                    </ListItemIcon>
                    <ListItemText primary={tab.label} primaryTypographyProps={{ fontSize: "0.825rem" }} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </List>

      <Box sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.2)" }}>
        <ListItemButton
          onClick={() => setProfileOpen(true)}
          sx={{
            py: 1.5,
            color: "rgba(255, 255, 255, 0.7)",
            justifyContent: collapsed ? "center" : "initial",
          }}
        >
          <ListItemIcon sx={{ color: "inherit", minWidth: 0, mr: collapsed ? 0 : 2 }}>
            <PersonIcon />
          </ListItemIcon>
          {!collapsed && <ListItemText primary="Admin Profile" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />}
        </ListItemButton>

        <ListItemButton
          onClick={() => {
            logout();
            navigate("/login");
          }}
          sx={{
            py: 1.5,
            color: "secondary.main",
            justifyContent: collapsed ? "center" : "initial",
          }}
        >
          <ListItemIcon sx={{ color: "inherit", minWidth: 0, mr: collapsed ? 0 : 2 }}>
            <LogoutIcon />
          </ListItemIcon>
          {!collapsed && <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />}
        </ListItemButton>
      </Box>
    </Box>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <BingoDashboard />;
      case "revenue": return <AdminRevenueBreakdown />;
      case "gameTransactions": return <AdminGameTransactions />;
      case "robotManagement": return <AdminRobotManagement />;
      case "receipt": return <AdminReceipts onSelectReceipt={setSelectedReceipt} />;
      case "withdrawals": return <AdminWithdrawals onSelectWithdrawal={setSelectedWithdrawal} />;
      case "transactions": return <AdminTransactions />;
      case "AddispayTransactions": return <AdminAddispayTransactions />;
      case "bonuses": return <AdminBonuses />;
      case "users": return <AdminUsers />;
      case "walletLogs": return <AdminWalletLogs />;
      case "leaderboard": return <AdminLeaderboard />;
      case "gameRooms": return <GameRoomManagement />;
      case "jackpot": return <AdminJackpotSettings />;
      case "ludoRooms": return <LudoAdminDashboard />;
      case "cards": return <AdminCardsManagement />;
      case "agents": return <AdminAgents />;
      case "stakeBonus": return <StakeBonusSettings />;
      case "adminSettings": return <AdminSettings />;
      case "settings": return <AdminRobotSettings />;
      case "commission": return <CommissionSettings />;
      case "notifications": return <AdminNotifications />;
      case "gameManagers": return <GameManagerManagement />;
      case "config": return <AdminConfig />;
      case "paymentMethods": return <AdminPaymentMethods />;
      case "countries": return <AdminCountries />;
      case "staff-reg": return <StaffRegistration />;
      default: return null;
    }
  };

  return (
    <ThemeProvider theme={updatedTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>

        {/* Sidebar Drawer */}
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? sidebarOpen : true}
          onClose={() => setSidebarOpen(false)}
          sx={{
            width: collapsed && !isMobile ? 80 : 260,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: collapsed && !isMobile ? 80 : 260,
              boxSizing: "border-box",
              border: "none",
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          <Sidebar />
        </Drawer>

        {/* Main Content Area */}
        <Box component="main" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Top Navbar */}
          <Box sx={{
            height: 70,
            display: "flex",
            alignItems: "center",
            px: 3,
            justifyContent: "space-between",
            bgcolor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {isMobile && (
                <IconButton onClick={() => setSidebarOpen(true)} color="primary">
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h6" sx={{ color: "text.primary" }}>
                {visibleGroups.flatMap(g => g.tabs).find(t => t.id === activeTab)?.label || "Admin Panel"}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {!isMobile && (
                <Typography variant="caption" sx={{ color: "text.secondary", bgcolor: "rgba(0, 0, 0, 0.03)", px: 1.5, py: 0.5, borderRadius: 10 }}>
                  {new Date().toLocaleString("en-US", { hour12: true, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Typography>
              )}
              <FormControlLabel
                control={<Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} size="small" />}
                label={darkMode ? <Brightness4 fontSize="small" /> : <Brightness7 fontSize="small" />}
              />
              <Divider orientation="vertical" flexItem sx={{ my: 2 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: 1 }}>
                Role: {role}
              </Typography>
            </Box>
          </Box>

          {/* Content Wrapper */}
          <Box sx={{ p: { xs: 2, sm: 4 }, flexGrow: 1, overflowY: "auto" }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <Box sx={{ mb: 4, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {(isAdmin || gamePermissions?.keshkesh) && (
                  <Button component={Link} to="/kesh-admin-dash" variant="outlined" size="small" sx={{ borderRadius: 2 }}>Kesh Kesh Dashboard</Button>
                )}
                {(isAdmin || gamePermissions?.spin) && (
                  <Button component={Link} to="/spin-admin-dash" variant="outlined" size="small" sx={{ borderRadius: 2 }}>Spin Dashboard</Button>
                )}
                {(isAdmin || gamePermissions?.material_lottery) && (
                  <Button component={Link} to="/material-lottery-admin-dash" variant="outlined" size="small" sx={{ borderRadius: 2 }}>Material Lottery Dash</Button>
                )}
              </Box>

              <Box sx={{ maxWidth: 1400, mx: "auto" }}>
                {renderContent()}
              </Box>
            </motion.div>
          </Box>
        </Box>

        {/* Modals */}
        {selectedReceipt && (
          <AdminDeposit
            open={!!selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
            userId={selectedReceipt.userId._id}
            telegramId={selectedReceipt.userId.telegramId}
            receiptId={selectedReceipt._id}
            initialAmount={selectedReceipt.amount}
            onSuccess={selectedReceipt.onSuccess}
          />
        )}
        {selectedWithdrawal && (
          <AdminWithdrawalApproval
            open={!!selectedWithdrawal}
            onClose={() => setSelectedWithdrawal(null)}
            userId={selectedWithdrawal.userId._id}
            telegramId={selectedWithdrawal.userId.telegramId}
            withdrawalId={selectedWithdrawal._id}
            amount={selectedWithdrawal.amount}
            onSuccess={selectedWithdrawal.onSuccess}
          />
        )}
        <AdminProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      </Box>
    </ThemeProvider>
  );
};

export default AdminDashboard;
