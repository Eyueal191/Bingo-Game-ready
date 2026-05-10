import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  useTheme,
} from "@mui/material";
import { motion } from "framer-motion";

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

const MaterialLotteryDashboardSection = ({
  analytics,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApplyFilters,
  onClearFilters,
}) => {
  const theme = useTheme();
  const [localStartDate, setLocalStartDate] = useState(startDate || "");
  const [localEndDate, setLocalEndDate] = useState(endDate || "");

  const handleApplyFilters = () => {
    if (onApplyFilters) {
      onApplyFilters(localStartDate, localEndDate);
    }
  };

  const handleClearFilters = () => {
    setLocalStartDate("");
    setLocalEndDate("");
    if (onClearFilters) {
      onClearFilters();
    }
  };

  const handleStartDateChange = (value) => {
    setLocalStartDate(value);
    if (onStartDateChange) {
      onStartDateChange(value);
    }
  };

  const handleEndDateChange = (value) => {
    setLocalEndDate(value);
    if (onEndDateChange) {
      onEndDateChange(value);
    }
  };

  return (
    <Box sx={{ py: 4 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: "bold",
          color:
            theme.palette.mode === "dark" ? "success.main" : "success.dark",
        }}
      >
        Material Lottery Dashboard
      </Typography>

      {/* Date Filters */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 4,
          alignItems: "center",
          p: 3,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 2,
        }}
      >
        <TextField
          label="Start Date"
          type="date"
          value={localStartDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{
            bgcolor: "background.default",
            "& .MuiInputBase-root": {
              fontSize: { xs: "0.875rem", sm: "1rem" },
              borderRadius: 1,
            },
            "& input[type='date']::-webkit-calendar-picker-indicator": {
              filter:
                theme.palette.mode === "dark"
                  ? "invert(40%) sepia(100%) saturate(2000%) hue-rotate(200deg)"
                  : "invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg)",
            },
          }}
        />
        <TextField
          label="End Date"
          type="date"
          value={localEndDate}
          onChange={(e) => handleEndDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{
            bgcolor: "background.default",
            "& .MuiInputBase-root": {
              fontSize: { xs: "0.875rem", sm: "1rem" },
              borderRadius: 1,
            },
            "& input[type='date']::-webkit-calendar-picker-indicator": {
              filter:
                theme.palette.mode === "dark"
                  ? "invert(40%) sepia(100%) saturate(2000%) hue-rotate(200deg)"
                  : "invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg)",
            },
          }}
        />
        <Button
          variant="contained"
          onClick={handleApplyFilters}
          sx={{
            bgcolor: "primary.main",
            color: "primary.contrastText",
            "&:hover": { bgcolor: "primary.dark" },
            fontSize: { xs: "0.875rem", sm: "1rem" },
            px: { xs: 2, sm: 3 },
            py: 1,
            borderRadius: 1,
          }}
        >
          Apply Filters
        </Button>
        <Button
          variant="outlined"
          onClick={handleClearFilters}
          sx={{
            borderColor: "primary.main",
            color: "primary.main",
            "&:hover": {
              borderColor: "primary.dark",
              bgcolor: "primary.main",
              color: "primary.contrastText",
            },
            fontSize: { xs: "0.875rem", sm: "1rem" },
            px: { xs: 2, sm: 3 },
            py: 1,
            borderRadius: 1,
          }}
        >
          Clear
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3}>
        {[
          {
            title: "Total Games",
            value: analytics?.totalGames || 0,
            unit: "",
            color: colors.games,
            icon: "🎮",
          },
          {
            title: "Active Games",
            value: analytics?.activeGames || 0,
            unit: "",
            color: { bg: "rgba(34, 197, 94, 0.5)", border: "rgb(34, 197, 94)" },
            icon: "⚡",
          },
          {
            title: "Completed Games",
            value: analytics?.completedGames || 0,
            unit: "",
            color: {
              bg: "rgba(59, 130, 246, 0.5)",
              border: "rgb(59, 130, 246)",
            },
            icon: "✅",
          },
          {
            title: "Total Participants",
            value: analytics?.totalParticipants || 0,
            unit: "",
            color: {
              bg: "rgba(168, 85, 247, 0.5)",
              border: "rgb(168, 85, 247)",
            },
            icon: "👥",
          },
          {
            title: "Total Bet Amount",
            value: analytics?.totalBetAmount || 0,
            unit: "ETB",
            color: colors.bets,
            icon: "💰",
          },
          {
            title: "Monetary Payouts",
            value: analytics?.monetaryPayouts || 0,
            unit: "ETB",
            color: colors.withdrawals,
            icon: "💸",
          },
          {
            title: "Material Rewards",
            value: analytics?.materialRewards || 0,
            unit: "",
            color: colors.rewards,
            icon: "🏆",
          },
          {
            title: "Pending Material Payouts",
            value: analytics?.pendingMaterialPayouts || 0,
            unit: "",
            color: {
              bg: "rgba(245, 158, 11, 0.5)",
              border: "rgb(245, 158, 11)",
            },
            icon: "⏳",
          },
          {
            title: "Total Revenue",
            value: analytics?.totalRevenue || 0,
            unit: "ETB",
            color: colors.systemEarnings,
            icon: "📊",
          },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={stat.title}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card
                sx={{
                  height: "100%",
                  background: `linear-gradient(135deg, ${stat.color.bg}, rgba(255, 255, 255, 0.1))`,
                  border: `2px solid ${stat.color.border}`,
                  borderRadius: 3,
                  boxShadow: 3,
                  transition: "transform 0.3s ease-in-out",
                  "&:hover": { transform: "translateY(-5px)", boxShadow: 6 },
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: "bold",
                        color:
                          theme.palette.mode === "dark"
                            ? "common.white"
                            : "text.primary",
                        fontSize: { xs: "1rem", sm: "1.25rem" },
                      }}
                    >
                      {stat.title}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontSize: { xs: "1.5rem", sm: "2rem" },
                        color:
                          theme.palette.mode === "dark"
                            ? "common.white"
                            : "text.primary",
                      }}
                    >
                      {stat.icon}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: "bold",
                      color:
                        theme.palette.mode === "dark"
                          ? "common.white"
                          : "text.primary",
                      fontSize: { xs: "1.5rem", sm: "2rem" },
                      textAlign: "center",
                    }}
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

      {/* Add charts similar to Kesh-Kesh if needed */}
    </Box>
  );
};

export default MaterialLotteryDashboardSection;