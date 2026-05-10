import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { getRoleConfig } from "./constants";
import { toNumber } from "./utils";

export const getColumns = ({
    theme,
    isMobile,
    onWalletClick,
    onBonusClick,
    onSummaryClick,
    onRoleClick,
    onBanClick,
    onDeleteClick,
}) => [
        {
            field: "index",
            headerName: "#",
            width: 70,
            sortable: false,
            renderCell: (params) => {
                const api = params?.api;
                const pos = api?.getRowIndexRelativeToVisibleRows?.(params?.id);
                return typeof pos === "number" ? pos + 1 : "";
            },
        },
        {
            field: "fullName",
            headerName: "Name",
            flex: 1,
            minWidth: 120,
            renderCell: (params) => params?.row?.fullName || "Unknown",
        },
        {
            field: "phone",
            headerName: "Phone",
            flex: 1,
            minWidth: 120,
            renderCell: (params) => params?.row?.phone || "N/A",
        },
        {
            field: "referralCode",
            headerName: "Referral",
            flex: 1,
            minWidth: 110,
            renderCell: (params) => params?.row?.referralCode || "N/A",
        },
        {
            field: "invitedBy",
            headerName: "Invited By",
            flex: 1,
            minWidth: 120,
            renderCell: (params) => params?.row?.invitedBy || "None",
        },
        {
            field: "email",
            headerName: "Email",
            flex: 1,
            minWidth: 150,
            renderCell: (params) => {
                const email = params?.row?.email;
                const verified = params?.row?.isEmailVerified;
                return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="body2">{email || "N/A"}</Typography>
                        {email && (
                            <span title={verified ? "Verified" : "Unverified"}>
                                {verified ? "✅" : "❌"}
                            </span>
                        )}
                    </Box>
                );
            },
        },
        {
            field: "role",
            headerName: "Role",
            minWidth: 150,
            renderCell: (params) => {
                const role = params?.row?.role || "user";
                const config = getRoleConfig(role, theme);

                return (
                    <Box
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 1.25,
                            color: config.color,
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.025em",
                            transition: "all 0.2s ease",
                            "&:hover": {
                                filter: "brightness(1.2)",
                                transform: "translateX(2px)"
                            }
                        }}
                    >
                        <Box sx={{ display: 'flex', opacity: 0.9 }}>
                            {config.icon}
                        </Box>
                        {config.label}
                    </Box>
                );
            },
        },
        {
            field: "isBanned",
            headerName: "Status",
            minWidth: 110,
            renderCell: (p) => (
                <span
                    style={{ color: p?.row?.isBanned ? "#ff3b30" : "#116f4d" }}
                >
                    {p?.row?.isBanned ? "Banned" : "Active"}
                </span>
            ),
        },
        {
            field: "wallet",
            headerName: "Wallet",
            minWidth: 110,
            renderCell: (params) => {
                const value = toNumber(params?.row?.wallet);
                return `${value.toLocaleString()} coins`;
            },
        },
        {
            field: "bonus",
            headerName: "Bonus",
            minWidth: 110,
            renderCell: (params) => {
                const value = toNumber(params?.row?.bonus);
                return `${value.toLocaleString()} coins`;
            },
        },
        {
            field: "walletAction",
            headerName: "Wallet Act",
            sortable: false,
            minWidth: 90,
            renderCell: (params) => (
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<AccountBalanceWalletIcon />}
                    onClick={() => onWalletClick(params.row)}
                    sx={{
                        bgcolor: "success.main",
                        "&:hover": { bgcolor: "success.dark" },
                        fontSize: { xs: "0.625rem", sm: "0.75rem" },
                        py: { xs: 0.25, sm: 0.5 },
                        px: { xs: 0.5, sm: 1 },
                        minWidth: 70,
                    }}
                >
                    Wallet
                </Button>
            ),
        },
        {
            field: "bonusAction",
            headerName: "Bonus Act",
            sortable: false,
            minWidth: 90,
            renderCell: (params) => (
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<CardGiftcardIcon />}
                    onClick={() => onBonusClick(params.row)}
                    sx={{
                        bgcolor: "secondary.main",
                        "&:hover": { bgcolor: "secondary.dark" },
                        fontSize: { xs: "0.625rem", sm: "0.75rem" },
                        py: { xs: 0.25, sm: 0.5 },
                        px: { xs: 0.5, sm: 1 },
                        minWidth: 70,
                    }}
                >
                    Bonus
                </Button>
            ),
        },
        {
            field: "summaryAction",
            headerName: "Summary",
            sortable: false,
            minWidth: 130,
            renderCell: (params) => (
                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onSummaryClick(params.row)}
                    sx={{
                        fontSize: { xs: "0.625rem", sm: "0.75rem" },
                        py: { xs: 0.25, sm: 0.5 },
                        px: { xs: 0.5, sm: 1 },
                        minWidth: 80,
                    }}
                >
                    Summary
                </Button>
            ),
        },
        {
            field: "roleAction",
            headerName: "Role Action",
            sortable: false,
            minWidth: 140,
            renderCell: (params) => (
                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onRoleClick(params.row)}
                    sx={{
                        fontSize: { xs: "0.625rem", sm: "0.75rem" },
                        py: { xs: 0.25, sm: 0.5 },
                        px: { xs: 0.5, sm: 1 },
                        minWidth: 80,
                    }}
                >
                    Change Role
                </Button>
            ),
        },
        {
            field: "banAction",
            headerName: "Ban/Unban",
            sortable: false,
            minWidth: 130,
            renderCell: (params) => {
                const banned = !!params?.row?.isBanned;
                return (
                    <Button
                        variant={banned ? "outlined" : "contained"}
                        color={banned ? "warning" : "error"}
                        size="small"
                        onClick={() => onBanClick(params.row, banned)}
                        sx={{
                            fontSize: { xs: "0.625rem", sm: "0.75rem" },
                            py: { xs: 0.25, sm: 0.5 },
                            px: { xs: 0.5, sm: 1 },
                            minWidth: 90,
                        }}
                    >
                        {banned ? "Unban" : "Ban"}
                    </Button>
                );
            },
        },
        {
            field: "deleteAction",
            headerName: "Delete",
            sortable: false,
            minWidth: 120,
            renderCell: (params) => (
                <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => onDeleteClick(params.row)}
                    sx={{
                        fontSize: { xs: "0.625rem", sm: "0.75rem" },
                        py: { xs: 0.25, sm: 0.5 },
                        px: { xs: 0.5, sm: 1 },
                        minWidth: 80,
                    }}
                >
                    Delete
                </Button>
            ),
        },
    ];
