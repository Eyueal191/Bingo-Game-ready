import { useState, useEffect, useMemo } from "react";
import { useApi } from "../../../../contexts/ApiContext";
import { useTheme } from "@mui/material/styles";

const useBingoDashboardData = () => {
    const api = useApi();
    const theme = useTheme();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [expandedSection, setExpandedSection] = useState(null);

    // Fetch dashboard data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = {};
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;
                const response = await api.get(`/api/v1/dashboard/reports`, {
                    params,
                });

                if (!response.data.success || !response.data.data) {
                    throw new Error("Invalid API response format");
                }

                const rawData = response.data.data;

                // Process and normalize data
                const processedData = {
                    ...rawData,
                    systemRevenue: {
                        ...rawData.systemRevenue,
                        total: parseFloat(rawData.systemRevenue.total) || 0,
                        avgStake: parseFloat(rawData.systemRevenue.avgStake) || 0,
                        winRate: parseFloat(rawData.systemRevenue.winRate) || 0,
                        gameCount: rawData.systemRevenue.gameCount || 0,
                        uniquePlayerCount: rawData.systemRevenue.uniquePlayerCount || 0,
                    },
                    userStats: {
                        ...rawData.userStats,
                        totalUserWallets: parseFloat(rawData.userStats.totalUserWallets) || 0,
                        totalRobotWallets: parseFloat(rawData.userStats.totalRobotWallets) || 0,
                        totalUsers: rawData.userStats.totalUsers || 0,
                        totalRobots: rawData.userStats.totalRobots || 0,
                    },
                    todayStats: {
                        ...rawData.todayStats,
                        deposits: {
                            Addispay: parseFloat(rawData.todayStats.deposits.Addispay) || 0,
                            manual: parseFloat(rawData.todayStats.deposits.manual) || 0,
                            total: parseFloat(rawData.todayStats.deposits.total) || 0,
                        },
                        bonuses: {
                            registration: parseFloat(rawData.todayStats.bonuses?.registration) || 0,
                            referral: parseFloat(rawData.todayStats.bonuses?.referral) || 0,
                            deposit: parseFloat(rawData.todayStats.bonuses?.deposit) || 0,
                            total: parseFloat(rawData.todayStats.bonuses?.total) || 0,
                        },
                        withdrawals: {
                            Addispay: parseFloat(rawData.todayStats.withdrawals.Addispay) || 0,
                            manual: parseFloat(rawData.todayStats.withdrawals.manual) || 0,
                            total: parseFloat(rawData.todayStats.withdrawals.total) || 0,
                        },
                        systemRevenue: parseFloat(rawData.todayStats.systemRevenue) || 0,
                        gamesPlayed: rawData.todayStats.gamesPlayed || 0,
                    },
                    deposits: {
                        ...rawData.deposits,
                        Addispay: {
                            total: parseFloat(rawData.deposits.Addispay.total) || 0,
                            count: rawData.deposits.Addispay.count || 0,
                        },
                        manual: {
                            total: parseFloat(rawData.deposits.manual.total) || 0,
                            count: rawData.deposits.manual.count || 0,
                        },
                        sms: {
                            total: parseFloat(rawData.deposits.sms?.total) || 0,
                            count: rawData.deposits.sms?.count || 0,
                        },
                        total: parseFloat(rawData.deposits.total) || 0,
                    },
                    bonuses: {
                        registration: {
                            total: parseFloat(rawData.bonuses?.registration.total) || 0,
                            count: rawData.bonuses?.registration.count || 0,
                        },
                        referral: {
                            total: parseFloat(rawData.bonuses?.referral.total) || 0,
                            count: rawData.bonuses?.referral.count || 0,
                        },
                        deposit: {
                            total: parseFloat(rawData.bonuses?.deposit?.total) || 0,
                            count: rawData.bonuses?.deposit?.count || 0,
                        },
                        total: parseFloat(rawData.bonuses?.total) || 0,
                    },
                    withdrawals: {
                        ...rawData.withdrawals,
                        Addispay: {
                            total: parseFloat(rawData.withdrawals.Addispay.total) || 0,
                            count: rawData.withdrawals.Addispay.count || 0,
                        },
                        manual: {
                            total: parseFloat(rawData.withdrawals.manual.total) || 0,
                            count: rawData.withdrawals.manual.count || 0,
                        },
                        total: parseFloat(rawData.withdrawals.total) || 0,
                    },
                    transfers: {
                        ...rawData.transfers,
                        sent: {
                            total: parseFloat(rawData.transfers.sent.total) || 0,
                            count: rawData.transfers.sent.count || 0,
                        },
                        received: {
                            total: parseFloat(rawData.transfers.received.total) || 0,
                            count: rawData.transfers.received.count || 0,
                        },
                        total: parseFloat(rawData.transfers.total) || 0,
                    },
                    systemEarnings: parseFloat(rawData.systemEarnings) || 0,
                    monthOverMonth: Object.keys(rawData.monthOverMonth || {}).reduce((acc, key) => {
                        acc[key] = {
                            current: parseFloat(rawData.monthOverMonth[key].current) || 0,
                            previous: parseFloat(rawData.monthOverMonth[key].previous) || 0,
                            difference: parseFloat(rawData.monthOverMonth[key].difference) || 0,
                            percentageChange: parseFloat(rawData.monthOverMonth[key].percentageChange) || 0,
                        };
                        return acc;
                    }, {}),
                    chartData: {
                        ...rawData.chartData,
                        revenueTrends: (rawData.chartData.revenueTrends || []).map((trend) => ({
                            ...trend,
                            revenue: parseFloat(trend.revenue) || 0,
                        })),
                        retentionRatio: parseFloat(rawData.chartData.retentionRatio) || 0,
                        retentionRate: parseFloat(rawData.chartData.retentionRate) || 0,
                        winRate: parseFloat(rawData.chartData.winRate) || 0,
                        transactionBreakdown: Object.keys(rawData.chartData.transactionBreakdown || {}).reduce((acc, key) => {
                            acc[key] = parseFloat(rawData.chartData.transactionBreakdown[key]) || 0;
                            return acc;
                        }, {}),
                    },
                };
                setData(processedData);
                setError(null);
            } catch (err) {
                console.error("API Error:", err);
                setError(err.response?.data?.message || err.message || "Failed to fetch dashboard data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate, api, refreshCounter]);

    // Prepared Chart Data
    const revenueChartData = useMemo(() => {
        if (!data?.chartData?.revenueTrends) return { labels: [], datasets: [] };
        return {
            labels: data.chartData.revenueTrends.map((trend) => trend.date || ""),
            datasets: [
                {
                    label: "Total Revenue",
                    data: data.chartData.revenueTrends.map((trend) => trend.revenue || 0),
                    fill: {
                        target: "origin",
                        above: (context) => {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return null;
                            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                            gradient.addColorStop(0, `${theme.palette.primary.main}00`);
                            gradient.addColorStop(1, `${theme.palette.primary.main}44`);
                            return gradient;
                        },
                    },
                    borderColor: theme.palette.primary.main,
                    borderWidth: 3,
                    tension: 0.4,
                    pointBackgroundColor: theme.palette.primary.main,
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: theme.palette.primary.main,
                    pointHoverBorderColor: "#fff",
                    pointHoverBorderWidth: 2,
                },
            ],
        };
    }, [data, theme]);

    const transactionChartData = useMemo(() => {
        if (!data?.chartData?.transactionBreakdown) return { labels: [], datasets: [] };
        return {
            labels: [
                "Addispay Deposits",
                "Manual Deposits",
                "SMS Deposits",
                "Registration Bonus",
                "Referral Bonus",
                "Deposit Bonus",
                "Addispay Withdrawals",
                "Manual Withdrawals",
                "Transfers Sent",
                "Transfers Received",
            ],
            datasets: [
                {
                    data: [
                        data.chartData.transactionBreakdown.AddispayDeposits || 0,
                        data.chartData.transactionBreakdown.manualDeposits || 0,
                        data.chartData.transactionBreakdown.smsDeposits || 0,
                        data.chartData.transactionBreakdown.registrationBonus || 0,
                        data.chartData.transactionBreakdown.referralBonus || 0,
                        data.chartData.transactionBreakdown.depositBonus || 0,
                        data.chartData.transactionBreakdown.AddispayWithdrawals || 0,
                        data.chartData.transactionBreakdown.manualWithdrawals || 0,
                        data.chartData.transactionBreakdown.transfersSent || 0,
                        data.chartData.transactionBreakdown.transfersReceived || 0,
                    ],
                    backgroundColor: [
                        "#3f51b5", "#4caf50", "#ffc107", "#e91e63", "#f44336",
                        "#8e24aa", "#ff9800", "#2196f3", "#9c27b0", "#00bcd4"
                    ],
                    borderColor: theme.palette.background.paper,
                    borderWidth: 2,
                    hoverOffset: 15,
                },
            ],
        };
    }, [data, theme]);

    const handleApplyFilters = () => setRefreshCounter((c) => c + 1);
    const handleClearFilters = () => {
        setStartDate("");
        setEndDate("");
        setRefreshCounter((c) => c + 1);
    };

    // Chart options
    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: "index",
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: theme.palette.background.paper,
                titleColor: theme.palette.text.primary,
                bodyColor: theme.palette.text.secondary,
                borderColor: theme.palette.divider,
                borderWidth: 1,
                padding: 12,
                boxPadding: 4,
                usePointStyle: true,
                callbacks: {
                    label: (context) =>
                        `${context.dataset.label || context.label}: ETB ${parseFloat(context.parsed.y || context.parsed || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: theme.palette.text.secondary,
                    font: { size: 10 },
                },
            },
            y: {
                grid: {
                    color: theme.palette.divider,
                    drawBorder: false,
                },
                ticks: {
                    color: theme.palette.text.secondary,
                    font: { size: 10 },
                    callback: (value) => `ETB ${value.toLocaleString()}`,
                },
                beginAtZero: true,
            },
        },
    }), [theme]);

    const doughnutChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        cutout: "75%",
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    color: theme.palette.text.primary,
                    usePointStyle: true,
                    padding: 20,
                    font: { size: 11 },
                },
            },
            tooltip: {
                backgroundColor: theme.palette.background.paper,
                titleColor: theme.palette.text.primary,
                bodyColor: theme.palette.text.secondary,
                borderColor: theme.palette.divider,
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: (context) => `${context.label}: ETB ${parseFloat(context.parsed || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                },
            },
        },
    }), [theme]);

    return {
        data,
        loading,
        error,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        expandedSection,
        setExpandedSection,
        revenueChartData,
        transactionChartData,
        handleApplyFilters,
        handleClearFilters,
        chartOptions,
        doughnutChartOptions,
    };
};

export default useBingoDashboardData;
