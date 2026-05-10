import React from "react";
import { Box, Grid, CircularProgress, Alert } from "@mui/material";
import useBingoDashboardData from "./hooks/useBingoDashboardData";
import DashboardHeader from "./components/DashboardHeader";
import DashboardFilters from "./components/DashboardFilters";
import DashboardCharts from "./components/DashboardCharts";
import DetailedMetrics from "./components/DetailedMetrics";
import DashboardFooter from "./components/DashboardFooter";

const BingoDashboard = () => {
  const {
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
  } = useBingoDashboardData();

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, bgcolor: "background.default" }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 4, bgcolor: "background.default" }}>
        <Alert severity="info">No data available</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        bgcolor: "background.default",
        minHeight: "100vh",
      }}
    >
      {/* Header with Quick Stats */}
      <DashboardHeader data={data} />

      {/* Date Filters */}
      <DashboardFilters
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      {/* Main Dashboard Content */}
      <Grid container spacing={3}>
        {/* Charts Column */}
        <DashboardCharts
          revenueData={revenueChartData}
          transactionData={transactionChartData}
          chartOptions={chartOptions}
          doughnutChartOptions={doughnutChartOptions}
        />

        {/* Metrics Column */}
        <Grid item xs={12} md={6}>
          <DetailedMetrics
            data={data}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
          />
        </Grid>
      </Grid>


      {/* Sticky Footer with Summary */}
      <DashboardFooter systemEarnings={data.systemEarnings} />
    </Box>
  );
};

export default BingoDashboard;