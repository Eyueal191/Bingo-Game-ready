import React from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Divider,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import SportsEsportsOutlinedIcon from "@mui/icons-material/SportsEsportsOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";

const SpinAdminSidebar = ({
  activeSection,
  setActiveSection,
  collapsed = false,
  onToggle,
}) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const items = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <DashboardOutlinedIcon fontSize="small" />,
    },
    {
      key: "users",
      label: "Users",
      icon: <GroupOutlinedIcon fontSize="small" />,
    },
    {
      key: "games",
      label: "Spin-Spin Rooms",
      icon: <SportsEsportsOutlinedIcon fontSize="small" />,
    },
    {
      key: "game_history",
      label: "Game History",
      icon: <HistoryOutlinedIcon fontSize="small" />,
    },
    {
      key: "transactions",
      label: "Transactions",
      icon: <ReceiptLongOutlinedIcon fontSize="small" />,
    },
    {
      key: "payouts",
      label: "Payouts",
      icon: <PaidOutlinedIcon fontSize="small" />,
    },
  ];

  return (
    <Box
      sx={{
        width: { xs: collapsed ? 64 : "100%", sm: collapsed ? 64 : 240 },
        bgcolor: "grey.800",
        color: "white",
        p: 1.5,
        position: { xs: "static", sm: "fixed" },
        height: { sm: "calc(100vh - 64px)" },
        overflowY: "auto",
        zIndex: (theme) => theme.zIndex.appBar - 1,
        transition: (theme) =>
          theme.transitions.create("width", {
            duration: theme.transitions.duration.shorter,
          }),
        boxShadow: 1,
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          mb: 1,
        }}
      >
        {!collapsed && (
          <Typography variant="h6" noWrap>
            Spin-Spin Admin
          </Typography>
        )}
        <Tooltip title={collapsed ? "Expand" : "Collapse"}>
          <IconButton
            size="small"
            color="inherit"
            onClick={onToggle}
            sx={{ ml: collapsed ? 0 : 1 }}
          >
            {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)", mb: 1 }} />
      {items.map((it) => (
        <Tooltip
          key={it.key}
          title={collapsed ? it.label : ""}
          placement="right"
          arrow
          disableHoverListener={!collapsed}
        >
          <Button
            fullWidth
            sx={{
              justifyContent: collapsed
                ? isXs
                  ? "flex-start"
                  : "center"
                : "flex-start",
              color: "inherit",
              textTransform: "none",
              py: 1,
              px: collapsed ? (isXs ? 0.5 : 0) : 1,
              minHeight: 40,
              bgcolor:
                activeSection === it.key
                  ? "rgba(255, 255, 255, 0.1)"
                  : "transparent",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
              borderRadius: 1,
              minWidth: 0,
            }}
            onClick={() => {
              setActiveSection(it.key);
              // Auto-collapse on small screens after selecting
              if (!collapsed && isXs) onToggle?.();
            }}
            startIcon={!collapsed ? it.icon : undefined}
            aria-label={it.label}
          >
            {collapsed ? it.icon : it.label}
          </Button>
        </Tooltip>
      ))}
    </Box>
  );
};

export default SpinAdminSidebar;
