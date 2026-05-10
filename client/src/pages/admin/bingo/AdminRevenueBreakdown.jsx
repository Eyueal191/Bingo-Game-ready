import React, { useState, useEffect, useCallback} from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    TextField,
    CircularProgress,
    Alert,
    Chip,
    Stack,
} from "@mui/material";
import {
    TrendingUp,
    TrendingDown,
    MonetizationOn,
    AccountBalance,
    SmartToy,
    Person,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { revenueService } from "../../../services/revenueService";
import { toast } from "sonner";

const AdminRevenueBreakdown = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [period, setPeriod] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30))
            .toISOString()
            .split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
    });

   const fetchData = useCallback(async () => {
    try {
        setLoading(true);
        const res = await revenueService.getBreakdown(period);
        setData(res);
    } catch (error) {
        toast.error("Failed to load revenue data");
        console.error(error);
    } finally {
        setLoading(false);
    }
}, [period]);


   useEffect(() => {
    fetchData();
}, [fetchData]);

    const StatCard = ({
        title,
        value,
        subtext,
        icon,
        color = "primary",
        isNegative = false,
    }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card
                sx={{
                    height: "100%",
                    bgcolor: "background.paper",
                    borderLeft: `4px solid`,
                    borderColor: `${color}.main`,
                }}
            >
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ textTransform: "uppercase", fontWeight: 600 }}
                            >
                                {title}
                            </Typography>
                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 700,
                                    color: isNegative ? "error.main" : `${color}.main`,
                                    mt: 0.5,
                                }}
                            >
                                {typeof value === "number"
                                    ? `${value.toLocaleString()} ETB`
                                    : value}
                            </Typography>
                            {subtext && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {subtext}
                                </Typography>
                            )}
                        </Box>
                        {icon && (
                            <Box
                                sx={{
                                    p: 1,
                                    borderRadius: 1,
                                    bgcolor: `${color}.main`,
                                    color: "white",
                                }}
                            >
                                {icon}
                            </Box>
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </motion.div>
    );

    const ContributionCard = ({ title, staked, won, netResult, icon, isRobot }) => (
        <Card sx={{ height: "100%", bgcolor: "background.paper" }}>
            <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    {icon}
                    <Typography variant="h6" fontWeight={600}>
                        {title}
                    </Typography>
                </Stack>
                <Stack spacing={1.5}>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            p: 1.5,
                            bgcolor: "action.hover",
                            borderRadius: 1,
                        }}
                    >
                        <Typography color="text.secondary">Total Staked</Typography>
                        <Typography fontWeight={500}>{staked.toLocaleString()} ETB</Typography>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            p: 1.5,
                            bgcolor: "action.hover",
                            borderRadius: 1,
                        }}
                    >
                        <Typography color="text.secondary">Total Won</Typography>
                        <Typography fontWeight={500} color="success.main">
                            {won.toLocaleString()} ETB
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            p: 1.5,
                            bgcolor: netResult >= 0 ? "success.light" : "error.light",
                            borderRadius: 1,
                            border: 1,
                            borderColor: netResult >= 0 ? "success.main" : "error.main",
                        }}
                    >
                        <Typography fontWeight={600} color={netResult >= 0 ? "success.dark" : "error.dark"}>
                            {isRobot ? "Net System Gain" : "Net House Profit"}
                        </Typography>
                        <Typography fontWeight={700} color={netResult >= 0 ? "success.dark" : "error.dark"}>
                            {netResult.toLocaleString()} ETB
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 400,
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (!data) {
        return (
            <Alert severity="info" sx={{ m: 2 }}>
                Select a date range to view revenue details
            </Alert>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", md: "center" },
                    mb: 4,
                    gap: 2,
                }}
            >
                <Box>
                    <Typography variant="h5" fontWeight={700} color="text.primary">
                        Revenue Breakdown
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Financial performance and game revenue analysis
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                        type="date"
                        size="small"
                        value={period.startDate}
                        onChange={(e) =>
                            setPeriod((prev) => ({ ...prev, startDate: e.target.value }))
                        }
                        InputLabelProps={{ shrink: true }}
                        label="Start Date"
                    />
                    <Typography color="text.secondary">to</Typography>
                    <TextField
                        type="date"
                        size="small"
                        value={period.endDate}
                        onChange={(e) =>
                            setPeriod((prev) => ({ ...prev, endDate: e.target.value }))
                        }
                        InputLabelProps={{ shrink: true }}
                        label="End Date"
                    />
                </Stack>
            </Box>

            {/* Top Level Summary */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard
                        title="Gross Profit (House Cut)"
                        value={data.summary?.grossGameProfit || 0}
                        subtext="Total Stakes - Total Payouts"
                        icon={<MonetizationOn />}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard
                        title="Net Profit"
                        value={data.summary?.netGameProfit || 0}
                        subtext="After bonus costs"
                        icon={<TrendingUp />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard
                        title="Total Bonus Costs"
                        value={data.summary?.bonusCosts || 0}
                        subtext="Registration, Referral & Deposit"
                        icon={<TrendingDown />}
                        color="error"
                        isNegative
                    />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard
                        title="Net Cash Position"
                        value={data.summary?.netCashPosition || 0}
                        subtext="Deposits - Withdrawals"
                        icon={<AccountBalance />}
                        color="secondary"
                    />
                </Grid>
            </Grid>

            {/* User vs Robot Breakdown */}
            <Card sx={{ mb: 4, bgcolor: "background.paper" }}>
                <CardContent>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        mb={3}
                    >
                        <Typography variant="h6" fontWeight={600}>
                            Revenue Source: Users vs Robots
                        </Typography>
                        <Chip
                            label={data.summary?.interpretation?.robotContribution || "N/A"}
                            color="primary"
                            size="small"
                        />
                    </Stack>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <ContributionCard
                                title="Real Users"
                                staked={data.breakdown?.stakes?.fromUsers || 0}
                                won={data.breakdown?.wins?.toUsers || 0}
                                netResult={data.breakdown?.contribution?.fromUsers || 0}
                                icon={<Person color="primary" />}
                                isRobot={false}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <ContributionCard
                                title="System Robots"
                                staked={data.breakdown?.stakes?.fromRobots || 0}
                                won={data.breakdown?.wins?.toRobots || 0}
                                netResult={data.breakdown?.contribution?.fromRobots || 0}
                                icon={<SmartToy color="secondary" />}
                                isRobot={true}
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Cash Flow & Bonuses */}
            <Grid container spacing={3}>
                <Grid item xs={12} lg={6}>
                    <Card sx={{ height: "100%", bgcolor: "background.paper" }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>
                                Real Money Flow
                            </Typography>
                            <Stack spacing={2}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        pb: 1,
                                        borderBottom: 1,
                                        borderColor: "divider",
                                    }}
                                >
                                    <Typography color="text.secondary">Total Deposits</Typography>
                                    <Typography fontWeight={500} color="success.main">
                                        +{(data.cashFlow?.deposits?.total || 0).toLocaleString()} ETB
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        pb: 1,
                                        borderBottom: 1,
                                        borderColor: "divider",
                                    }}
                                >
                                    <Typography color="text.secondary">Total Withdrawals</Typography>
                                    <Typography fontWeight={500} color="error.main">
                                        -{(data.cashFlow?.withdrawals?.total || 0).toLocaleString()} ETB
                                    </Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1 }}>
                                    <Typography fontWeight={600}>Net Cash Flow</Typography>
                                    <Typography fontWeight={700}>
                                        {(data.cashFlow?.netCashFlow || 0).toLocaleString()} ETB
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} lg={6}>
                    <Card sx={{ height: "100%", bgcolor: "background.paper" }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>
                                Bonus Cost Breakdown
                            </Typography>
                            <Stack spacing={2}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        pb: 1,
                                        borderBottom: 1,
                                        borderColor: "divider",
                                    }}
                                >
                                    <Typography color="text.secondary">Registration Bonuses</Typography>
                                    <Typography fontWeight={500}>
                                        {(data.bonuses?.registration?.amount || 0).toLocaleString()} ETB
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        pb: 1,
                                        borderBottom: 1,
                                        borderColor: "divider",
                                    }}
                                >
                                    <Typography color="text.secondary">Referral Bonuses</Typography>
                                    <Typography fontWeight={500}>
                                        {(data.bonuses?.referral?.amount || 0).toLocaleString()} ETB
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        pb: 1,
                                        borderBottom: 1,
                                        borderColor: "divider",
                                    }}
                                >
                                    <Typography color="text.secondary">Deposit Bonuses</Typography>
                                    <Typography fontWeight={500}>
                                        {(data.bonuses?.deposit?.amount || 0).toLocaleString()} ETB
                                    </Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1 }}>
                                    <Typography fontWeight={600}>Total Bonus Spend</Typography>
                                    <Typography fontWeight={700} color="error.main">
                                        {(data.bonuses?.totalBonusCost || 0).toLocaleString()} ETB
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AdminRevenueBreakdown;
