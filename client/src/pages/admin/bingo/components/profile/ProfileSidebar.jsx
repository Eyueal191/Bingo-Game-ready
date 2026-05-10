import React from "react";
import {
    Box,
    Typography,
    Avatar,
    Chip,
    Button,
    Divider,
    IconButton,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { Logout as LogoutIcon, Close as CloseIcon } from "@mui/icons-material";

const ProfileSidebar = ({ user, role, activeTab, onTabChange, onLogout, tabs, getInitials, isMobile, onClose }) => {
    const theme = useTheme();
    return (
        <Box
            sx={{
                width: { xs: "100%", md: 240 },
                bgcolor: { xs: "background.paper", md: alpha(theme.palette.text.primary, 0.05) },
                p: { xs: 2, md: 3 },
                display: "flex",
                flexDirection: "column",
                borderRight: { md: `1px solid ${alpha(theme.palette.divider, 0.1)}` },
                borderBottom: { xs: `1px solid ${alpha(theme.palette.divider, 0.1)}`, md: "none" },
                position: "relative",
            }}
        >
            {isMobile && (
                <IconButton
                    onClick={onClose}
                    sx={{ position: "absolute", top: 12, right: 12, color: "text.secondary" }}
                >
                    <CloseIcon />
                </IconButton>
            )}
            <Box sx={{
                mb: { xs: 2, md: 4 },
                mt: { xs: 1, md: 0 },
                display: "flex",
                flexDirection: { xs: "row", md: "column" },
                alignItems: "center",
                gap: { xs: 2, md: 0 },
                textAlign: { xs: "left", md: "center" }
            }}>
                <Box sx={{ position: "relative", mb: { xs: 0, md: 2 } }}>
                    <Avatar
                        sx={{
                            width: { xs: 60, md: 80 },
                            height: { xs: 60, md: 80 },
                            fontSize: { xs: "1.4rem", md: "1.8rem" },
                            fontWeight: 800,
                            background: "linear-gradient(135deg, #116e51 0%, #55ff77 100%)",
                            color: "#0f1221",
                            boxShadow: "0 8px 20px rgba(17, 110, 81, 0.4)",
                        }}
                    >
                        {getInitials(user?.fullName || user?.telegramId || "Admin")}
                    </Avatar>
                    <Box
                        sx={{
                            position: "absolute",
                            bottom: 4,
                            right: 4,
                            width: 14,
                            height: 14,
                            bgcolor: "#55ff77",
                            borderRadius: "50%",
                            border: "3px solid #0f1221",
                            boxShadow: "0 0 10px rgba(85, 255, 119, 0.5)",
                        }}
                    />
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 800, fontSize: "1.1rem" }}>
                        {user?.fullName || user?.telegramId || "Admin User"}
                    </Typography>
                    <Chip
                        label={role?.toUpperCase() || "ADMIN"}
                        size="small"
                        sx={{
                            mt: 0.5,
                            height: 20,
                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                            color: theme.palette.primary.main,
                            fontWeight: 800,
                            fontSize: "0.65rem",
                            letterSpacing: 1,
                            borderRadius: "4px",
                            "& .MuiChip-label": { px: 1 },
                        }}
                    />
                </Box>
            </Box>

            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "row", md: "column" },
                    gap: 1,
                    flexGrow: 0,
                    overflowX: { xs: "auto", md: "visible" },
                    pb: { xs: 1, md: 0 },
                    "&::-webkit-scrollbar": { display: "none" },
                    msOverflowStyle: "none",
                    scrollbarWidth: "none",
                }}
            >
                {tabs.map((tab) => (
                    <Button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        sx={{
                            justifyContent: "flex-start",
                            py: 1,
                            px: 2,
                            borderRadius: "12px",
                            whiteSpace: "nowrap",
                            color: activeTab === tab.id ? theme.palette.primary.main : alpha(theme.palette.text.primary, 0.6),
                            bgcolor: activeTab === tab.id ? alpha(theme.palette.primary.main, 0.15) : "transparent",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            minWidth: "fit-content",
                            "&:hover": {
                                bgcolor: activeTab === tab.id ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.text.primary, 0.05),
                                transform: { md: "translateX(4px)", xs: "none" },
                            },
                            "& .MuiButton-startIcon": { mr: 1.5 },
                        }}
                        startIcon={isMobile ? null : tab.icon}
                    >
                        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{tab.label}</Typography>
                    </Button>
                ))}
            </Box>

            <Divider sx={{ my: 2, borderColor: alpha(theme.palette.divider, 0.05) }} />
            <Button
                onClick={onLogout}
                fullWidth
                sx={{
                    justifyContent: "flex-start",
                    py: { xs: 1, md: 1.5 },
                    px: 2,
                    borderRadius: "12px",
                    color: theme.palette.secondary.main,
                    transition: "all 0.3s ease",
                    "&:hover": {
                        bgcolor: alpha(theme.palette.secondary.main, 0.1),
                        transform: { md: "translateX(4px)", xs: "none" },
                    },
                }}
                startIcon={<LogoutIcon sx={{ fontSize: { xs: 18, md: 20 } }} />}
            >
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>Log Out</Typography>
            </Button>
        </Box>
    );
};

export default ProfileSidebar;
