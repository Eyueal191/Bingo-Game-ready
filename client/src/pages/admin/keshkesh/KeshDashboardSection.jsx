import React from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import { Line, Bar, Pie } from "react-chartjs-2";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

// Consistent color palette
const colors = {
  deposits: { bg: "rgba(59, 130, 246, 0.5)", border: "rgb(59, 130, 246)" },
  withdrawals: { bg: "rgba(239, 68, 68, 0.5)", border: "rgb(239, 68, 68)" },
  bets: { bg: "rgba(249, 115, 22, 0.5)", border: "rgb(249, 115, 22)" },
  rewards: { bg: "rgba(16, 185, 129, 0.5)", border: "rgb(16, 185, 129)" },
  systemEarnings: {
    bg: "rgba(147, 51, 234, 0.5)",
    border: "rgb(147, 51, 234)",
  },
  fallback: { bg: "rgba(200, 200, 200, 0.5)", border: "rgb(200, 200, 200)" },
  games: { bg: "rgba(16, 185, 129, 0.5)", border: "rgb(16, 185, 129)" },
};

const KeshDashboardSection = ({ analytics, stats }) => {
  const fallbackChartData = {
    labels: ["No Data"],
    datasets: [
      {
        label: "No Data Available",
        data: [0],
        backgroundColor: colors.fallback.bg,
        borderColor: colors.fallback.border,
        borderWidth: 1,
      },
    ],
  };

  // Normalize month to YYYY-MM-01 format
  const normalizeMonth = (month) => {
    try {
      const date = new Date(month);
      if (isNaN(date.getTime())) return "1970-01-01";
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-01`;
    } catch {
      return "1970-01-01";
    }
  };

  // Generate unique months across all datasets
  const allMonths = Array.from(
    new Set([
      ...(stats?.deposits?.map((d) => normalizeMonth(d.month)) || []),
      ...(stats?.withdrawals?.map((w) => normalizeMonth(w.month)) || []),
      ...(stats?.bets?.map((b) => normalizeMonth(b.month)) || []),
      ...(stats?.rewards?.map((r) => normalizeMonth(r.month)) || []),
      ...(stats?.systemEarnings?.map((s) => normalizeMonth(s.month)) || []),
      ...(stats?.gameStats?.map((g) => normalizeMonth(g.month)) || []),
    ])
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const revenueChartData = allMonths.length
    ? {
        labels: allMonths.map((month) =>
          new Date(month).toLocaleString("en-US", {
            month: "short",
            year: "numeric",
          })
        ),
        datasets: [
          {
            label: "Deposits (ETB)",
            data: allMonths.map(
              (month) =>
                stats?.deposits.find((d) => normalizeMonth(d.month) === month)
                  ?.total || 0
            ),
            backgroundColor: colors.deposits.bg,
            borderColor: colors.deposits.border,
            borderWidth: 1,
            fill: false,
          },
          {
            label: "Withdrawals (ETB)",
            data: allMonths.map(
              (month) =>
                stats?.withdrawals.find(
                  (w) => normalizeMonth(w.month) === month
                )?.total || 0
            ),
            backgroundColor: colors.withdrawals.bg,
            borderColor: colors.withdrawals.border,
            borderWidth: 1,
            fill: false,
          },
          {
            label: "Bets (ETB)",
            data: allMonths.map(
              (month) =>
                stats?.bets.find((b) => normalizeMonth(b.month) === month)
                  ?.total || 0
            ),
            backgroundColor: colors.bets.bg,
            borderColor: colors.bets.border,
            borderWidth: 1,
            fill: false,
          },
          {
            label: "Rewards (ETB)",
            data: allMonths.map(
              (month) =>
                stats?.rewards.find((r) => normalizeMonth(r.month) === month)
                  ?.total || 0
            ),
            backgroundColor: colors.rewards.bg,
            borderColor: colors.rewards.border,
            borderWidth: 1,
            fill: false,
          },
          {
            label: "System Earnings (ETB)",
            data: allMonths.map(
              (month) =>
                stats?.systemEarnings.find(
                  (s) => normalizeMonth(s.month) === month
                )?.total || 0
            ),
            backgroundColor: colors.systemEarnings.bg,
            borderColor: colors.systemEarnings.border,
            borderWidth: 1,
            fill: false,
          },
        ],
      }
    : fallbackChartData;

  const userGrowthChartData = stats?.userGrowth.length
    ? {
        labels: stats.userGrowth.map((u) =>
          new Date(u.month).toLocaleString("en-US", {
            month: "short",
            year: "numeric",
          })
        ),
        datasets: [
          {
            label: "New Users",
            data: stats.userGrowth.map((u) => u.count),
            backgroundColor: colors.rewards.bg,
            borderColor: colors.rewards.border,
            borderWidth: 1,
          },
        ],
      }
    : fallbackChartData;

  const transactionPieData = analytics?.transactionDistribution
    ? {
        labels: ["Deposits", "Withdrawals", "Bets", "Rewards"],
        datasets: [
          {
            label: "Transaction Types (Amount)",
            data: [
              analytics.transactionDistribution?.deposit?.total || 0,
              analytics.transactionDistribution?.withdrawal?.total || 0,
              analytics.transactionDistribution?.bet?.total || 0,
              analytics.transactionDistribution?.reward?.total || 0,
            ],
            backgroundColor: [
              colors.deposits.bg,
              colors.withdrawals.bg,
              colors.bets.bg,
              colors.rewards.bg,
            ],
            borderColor: [
              colors.deposits.border,
              colors.withdrawals.border,
              colors.bets.border,
              colors.rewards.border,
            ],
            borderWidth: 1,
          },
        ],
      }
    : fallbackChartData;

  const gameStatsChartData =
    stats?.gameStats && stats.gameStats.length
      ? {
          labels: stats.gameStats.map((g) =>
            new Date(g.month).toLocaleString("en-US", {
              month: "short",
              year: "numeric",
            })
          ),
          datasets: [
            {
              label: "Games Played",
              data: stats.gameStats.map((g) => g.count),
              backgroundColor: colors.games.bg,
              borderColor: colors.games.border,
              borderWidth: 1,
            },
          ],
        }
      : fallbackChartData;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${context.dataset.label}: ${
              context.parsed.y?.toFixed(2) || 0
            } ETB`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Amount (ETB)" },
      },
    },
  };

  const gameChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${context.dataset.label}: ${context.parsed.y} Games`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Number of Games" },
      },
    },
  };

  const countChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Count" },
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${context.label}: ${context.parsed?.toFixed(2) || 0} ETB`,
        },
      },
    },
  };

  const hasPieData = transactionPieData.datasets[0].data.some(
    (value) => value > 0
  );

  return (
    <Box sx={{ py: 4 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: "bold", color: "text.primary" }}
      >
        Kesh-Kesh Dashboard
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { title: "Total Users", value: analytics?.totalUsers || 0, unit: "" },
          {
            title: "Active Users",
            value: analytics?.activeUsers || 0,
            unit: "",
          },
          { title: "Total Games", value: analytics?.totalGames || 0, unit: "" },
          {
            title: "Total Deposits",
            value: analytics?.totalDeposits || 0,
            unit: "ETB",
          },
          {
            title: "Total Withdrawals",
            value: analytics?.totalWithdrawals || 0,
            unit: "ETB",
          },
          {
            title: "Total Bets",
            value: analytics?.totalBets || 0,
            unit: "ETB",
          },
          {
            title: "Total Rewards",
            value: analytics?.totalRewards || 0,
            unit: "ETB",
          },
          {
            title: "System Earnings",
            value: analytics?.totalSystemEarnings || 0,
            unit: "ETB",
          },
          {
            title: "Total Payouts",
            value: analytics?.totalPayouts || 0,
            unit: "ETB",
          },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card
                sx={{
                  bgcolor: "#ffffff",
                  borderRadius: 2,
                  boxShadow: 3,
                  textAlign: "center",
                  p: 3,
                  transition: "transform 0.2s",
                  "&:hover": { transform: "scale(1.02)" },
                }}
              >
                <CardContent>
                  <Typography variant="h6" color="text.secondary">
                    {stat.title}
                  </Typography>
                  <Typography
                    variant="h4"
                    color="text.primary"
                    sx={{ fontWeight: "bold" }}
                  >
                    {stat.unit === "ETB"
                      ? `ETB ${stat.value.toFixed(2)}`
                      : stat.value}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: "white", borderRadius: 2, boxShadow: 3, p: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Financial Trends
              </Typography>
              {stats &&
              allMonths.length &&
              revenueChartData.datasets.some((d) =>
                d.data.some((v) => v > 0)
              ) ? (
                <Line data={revenueChartData} options={chartOptions} />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 200,
                  }}
                >
                  <Typography>No Financial Data Available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: "white", borderRadius: 2, boxShadow: 3, p: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Growth
              </Typography>
              {stats && stats.userGrowth.length ? (
                <Bar data={userGrowthChartData} options={countChartOptions} />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 200,
                  }}
                >
                  <CircularProgress />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: "white", borderRadius: 2, boxShadow: 3, p: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Transaction Type Distribution
              </Typography>
              {analytics &&
              analytics.recentTransactions.length &&
              hasPieData ? (
                <Pie data={transactionPieData} options={pieChartOptions} />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 200,
                  }}
                >
                  <Typography>No Transaction Data Available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: "white", borderRadius: 2, boxShadow: 3, p: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Game Stats
              </Typography>
              {stats && stats.gameStats && stats.gameStats.length ? (
                <Bar data={gameStatsChartData} options={gameChartOptions} />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 200,
                  }}
                >
                  <Typography>No Game Data Available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default KeshDashboardSection;
