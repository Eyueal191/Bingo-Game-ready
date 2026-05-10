import React from "react";
import { Box, Typography, Grid, Avatar, CircularProgress } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { AccountBalanceWallet as WalletIcon } from "@mui/icons-material";
import { motion } from "framer-motion";

const ActivityTab = ({ loading, stats, adjustments, wallet }) => {
    const theme = useTheme();
    return (
        <Box component={motion.div} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                    <CircularProgress sx={{ color: theme.palette.primary.main }} />
                </Box>
            ) : stats ? (
                <Grid container spacing={1.5}>
                    <Grid item xs={12}>
                        <Box sx={{ p: { xs: 1.5, md: 2 }, borderRadius: "16px", bgcolor: alpha(theme.palette.primary.main, 0.05), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), color: theme.palette.primary.main }}>
                                    <WalletIcon />
                                </Avatar>
                                <Box>
                                    <Typography sx={{ color: alpha(theme.palette.text.primary, 0.5), fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>Current Balance</Typography>
                                    <Typography sx={{ color: theme.palette.primary.main, fontSize: { xs: "1.1rem", md: "1.25rem" }, fontWeight: 800 }}>{wallet?.toLocaleString()} coins</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                    {[
                        { label: "Total Deposits", value: `${stats.totalDeposit?.toLocaleString()} coins`, color: theme.palette.primary.main },
                        { label: "Total Withdrawals", value: `${stats.totalWithdraw?.toLocaleString()} coins`, color: theme.palette.secondary.main },
                        { label: "Adjustments", value: `${stats.totalAdjustments > 0 ? "+" : ""}${stats.totalAdjustments?.toLocaleString()} coins`, color: stats.totalAdjustments >= 0 ? theme.palette.primary.main : theme.palette.secondary.main },
                        { label: "Wins", value: stats.wins || 0, color: theme.palette.primary.main },
                    ].map((item, idx) => (
                        <Grid item xs={6} key={idx}>
                            <Box sx={{ p: { xs: 1.5, md: 2 }, borderRadius: "16px", bgcolor: alpha(theme.palette.text.primary, 0.03), border: `1px solid ${alpha(theme.palette.text.primary, 0.05)}` }}>
                                <Typography sx={{ color: alpha(theme.palette.text.primary, 0.5), fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", mb: 0.5 }}>{item.label}</Typography>
                                <Typography sx={{ color: item.color, fontSize: { xs: "0.95rem", md: "1.1rem" }, fontWeight: 700 }}>{item.value}</Typography>
                            </Box>
                        </Grid>
                    ))}

                    {stats.adjustments?.length > 0 && (
                        <Grid item xs={12}>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.5), fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, mb: 1, display: "block" }}>
                                    Recent Adjustments
                                </Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                    {stats.adjustments.map((log, i) => (
                                        <Box key={i} sx={{ p: 1.5, borderRadius: "12px", bgcolor: alpha(theme.palette.text.primary, 0.02), border: `1px solid ${alpha(theme.palette.text.primary, 0.04)}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <Box>
                                                <Typography sx={{ color: "text.primary", fontSize: "0.85rem", fontWeight: 600 }}>{log.reason || "Manual Adjustment"}</Typography>
                                                <Typography sx={{ color: alpha(theme.palette.text.primary, 0.4), fontSize: "0.7rem" }}>{new Date(log.createdAt).toLocaleDateString()}</Typography>
                                            </Box>
                                            <Typography sx={{ color: log.amount >= 0 ? theme.palette.primary.main : theme.palette.secondary.main, fontWeight: 700, fontSize: "0.9rem" }}>
                                                {log.amount >= 0 ? "+" : ""}{log.amount} coins
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            ) : (
                <Typography sx={{ color: alpha(theme.palette.text.primary, 0.5), textAlign: "center", py: 4 }}>No activity data found.</Typography>
            )}
        </Box>
    );
};

export default ActivityTab;
