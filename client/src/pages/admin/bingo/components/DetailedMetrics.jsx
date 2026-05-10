import React from "react";
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Box,
    Stack,
    Chip,
    Grid
} from "@mui/material";
import {
    ExpandMore,
    MonetizationOn,
    Group,
    ArrowUpward,
    ArrowDownward
} from "@mui/icons-material";
import { motion } from "framer-motion";

const DetailedMetrics = ({ data, expandedSection, setExpandedSection }) => {
    if (!data) return null;

    const sections = [
        "Today", "Users", "Deposits", "Bonuses", "Withdrawals", "Transfers", "Retention", "MonthOverMonth"
    ];

    return (
        <Box>
            {sections.map((section) => (
                <Accordion
                    key={section}
                    expanded={expandedSection === section}
                    onChange={() => setExpandedSection(expandedSection === section ? null : section)}
                    sx={{ bgcolor: "background.paper", mb: 2 }}
                >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography sx={{ fontWeight: "medium", color: "text.primary" }}>
                            {section.replace(/([A-Z])/g, " $1")}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {section === "Today" && (
                                <Box>
                                    <Typography variant="body1" sx={{ fontWeight: "bold", color: "text.primary", mb: 1 }}>Deposits</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Addispay: ETB {data.todayStats.deposits.Addispay.toFixed(2)}</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Manual: ETB {data.todayStats.deposits.manual.toFixed(2)}</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: "bold", color: "text.primary", mb: 2 }}>Total Deposits: ETB {data.todayStats.deposits.total.toFixed(2)}</Typography>

                                    <Typography variant="body1" sx={{ fontWeight: "bold", color: "text.primary", mb: 1 }}>Bonuses</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Registration: ETB {data.todayStats.bonuses.registration.toFixed(2)}</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Referral: ETB {data.todayStats.bonuses.referral.toFixed(2)}</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Deposit: ETB {(data.todayStats.bonuses.deposit || 0).toFixed(2)}</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: "bold", color: "text.primary", mb: 2 }}>Total Bonuses: ETB {data.todayStats.bonuses.total.toFixed(2)}</Typography>

                                    <Typography variant="body1" sx={{ fontWeight: "bold", color: "text.primary", mb: 1 }}>Withdrawals</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Addispay: ETB {data.todayStats.withdrawals.Addispay.toFixed(2)}</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Manual: ETB {data.todayStats.withdrawals.manual.toFixed(2)}</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: "bold", color: "text.primary", mb: 2 }}>Total Withdrawals: ETB {data.todayStats.withdrawals.total.toFixed(2)}</Typography>

                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>System Revenue: ETB {data.todayStats.systemRevenue.toFixed(2)}</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary" }}>Games Played: {data.todayStats.gamesPlayed}</Typography>
                                </Box>
                            )}
                            {section === "Users" && (
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Chip icon={<MonetizationOn />} label={`User Wallets: ETB ${data.userStats.totalUserWallets.toFixed(2)}`} color="primary" variant="outlined" />
                                    <Chip icon={<Group />} label={`Total Users: ${data.userStats.totalUsers}`} color="secondary" variant="outlined" />
                                </Stack>
                            )}
                            {section === "Deposits" && (
                                <Box>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Addispay: ETB {data.deposits.Addispay.total.toFixed(2)} ({data.deposits.Addispay.count} transactions)</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Manual: ETB {data.deposits.manual.total.toFixed(2)} ({data.deposits.manual.count} transactions)</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>SMS: ETB {data.deposits.sms.total.toFixed(2)} ({data.deposits.sms.count} transactions)</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: "bold", color: "text.primary" }}>Total: ETB {data.deposits.total.toFixed(2)}</Typography>
                                </Box>
                            )}
                            {section === "Bonuses" && (
                                <Box>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Registration: ETB {data.bonuses.registration.total.toFixed(2)} ({data.bonuses.registration.count} transactions)</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Referral: ETB {data.bonuses.referral.total.toFixed(2)} ({data.bonuses.referral.count} transactions)</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Deposit: ETB {(data.bonuses.deposit?.total || 0).toFixed(2)} ({data.bonuses.deposit?.count || 0} transactions)</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: "bold", color: "text.primary" }}>Total: ETB {data.bonuses.total.toFixed(2)}</Typography>
                                </Box>
                            )}
                            {section === "Withdrawals" && (
                                <Box>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Addispay: ETB {data.withdrawals.Addispay.total.toFixed(2)} ({data.withdrawals.Addispay.count} transactions)</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Manual: ETB {data.withdrawals.manual.total.toFixed(2)} ({data.withdrawals.manual.count} transactions)</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: "bold", color: "text.primary" }}>Total: ETB {data.withdrawals.total.toFixed(2)}</Typography>
                                </Box>
                            )}
                            {section === "Transfers" && (
                                <Box>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Sent: ETB {data.transfers.sent.total.toFixed(2)} ({data.transfers.sent.count} transactions)</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Received: ETB {data.transfers.received.total.toFixed(2)} ({data.transfers.received.count} transactions)</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: "bold", color: "text.primary" }}>Total: ETB {data.transfers.total.toFixed(2)}</Typography>
                                </Box>
                            )}
                            {section === "Retention" && (
                                <Box>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Retention Rate: {data.chartData.retentionRate.toFixed(2)}%</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>Win Rate: {data.chartData.winRate.toFixed(2)}%</Typography>
                                    <Typography variant="body1" sx={{ color: "text.secondary" }}>Retention Ratio: {data.chartData.retentionRatio.toFixed(2)}%</Typography>
                                </Box>
                            )}
                            {section === "MonthOverMonth" && (
                                <Grid container spacing={2}>
                                    {["systemRevenue", "deposits", "withdrawals", "transfers", "systemEarnings"].map((key) => (
                                        <Grid item xs={12} sm={6} md={4} key={key}>
                                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                                {data.monthOverMonth[key].difference >= 0 ? (
                                                    <ArrowUpward sx={{ color: "#4caf50", mr: 2 }} />
                                                ) : (
                                                    <ArrowDownward sx={{ color: "#f44336", mr: 2 }} />
                                                )}
                                                <Box>
                                                    <Typography variant="body1" sx={{ textTransform: "capitalize", color: "text.primary" }}>{key.replace(/([A-Z])/g, " $1")}</Typography>
                                                    <Typography variant="body2" sx={{ color: "text.secondary" }}>Current: ETB {data.monthOverMonth[key].current.toFixed(2)}</Typography>
                                                    <Typography variant="body2" sx={{ color: "text.secondary" }}>Previous: ETB {data.monthOverMonth[key].previous.toFixed(2)}</Typography>
                                                    <Typography variant="body2" sx={{ color: data.monthOverMonth[key].percentageChange >= 0 ? "#4caf50" : "#f44336" }}>
                                                        {data.monthOverMonth[key].percentageChange.toFixed(2)}%
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </motion.div>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Box>
    );
};

export default DetailedMetrics;
