import React from 'react';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PaymentsIcon from '@mui/icons-material/Payments';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import EngineeringIcon from '@mui/icons-material/Engineering';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ShieldIcon from '@mui/icons-material/Shield';

export const getRoleConfig = (role, theme) => {
    const configs = {
        admin: {
            color: theme.palette.error.main,
            icon: <AdminPanelSettingsIcon sx={{ fontSize: 16 }} />,
            label: "Admin"
        },
        manager: {
            color: theme.palette.secondary.main,
            icon: <EngineeringIcon sx={{ fontSize: 16 }} />,
            label: "Manager"
        },
        finance: {
            color: theme.palette.info.main,
            icon: <PaymentsIcon sx={{ fontSize: 16 }} />,
            label: "Finance"
        },
        secretary: {
            color: theme.palette.warning.main,
            icon: <SupportAgentIcon sx={{ fontSize: 16 }} />,
            label: "Secretary"
        },
        game_manager: {
            color: theme.palette.success.main,
            icon: <SettingsSuggestIcon sx={{ fontSize: 16 }} />,
            label: "Game Manager"
        },
        agent: {
            color: "#116f4d",
            icon: <PersonSearchIcon sx={{ fontSize: 16 }} />,
            label: "Agent"
        },
        user: {
            color: theme.palette.primary.main,
            icon: <AccountCircleIcon sx={{ fontSize: 16 }} />,
            label: "User"
        },
        guest: {
            color: theme.palette.grey[600],
            icon: <SmartToyIcon sx={{ fontSize: 16 }} />,
            label: "Guest"
        },
        robot: {
            color: theme.palette.grey[800],
            icon: <ShieldIcon sx={{ fontSize: 16 }} />,
            label: "Robot"
        }
    };
    return configs[role] || configs.user;
};

export const ROLES = [
    { value: "user", label: "User" },
    { value: "agent", label: "Agent" },
    { value: "game_manager", label: "Game Manager" },
    { value: "secretary", label: "Secretary" },
    { value: "finance", label: "Finance" },
    { value: "manager", label: "Manager" },
    { value: "admin", label: "Admin" },
    { value: "guest", label: "Guest" },
];
