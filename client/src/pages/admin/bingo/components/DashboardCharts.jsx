import React from "react";
import { Grid, Card, CardContent, Typography, Box, Alert } from "@mui/material";
import { Line, Doughnut } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement,
} from "chart.js";
import { motion } from "framer-motion";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);

// Simple Error Boundary for Charts
class ChartErrorBoundary extends React.Component {
    state = { hasError: false, error: null };
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{ p: 2 }}>
                    <Alert severity="error">
                        Chart rendering failed: {this.state.error?.message || "Unknown error"}
                    </Alert>
                </Box>
            );
        }
        return this.props.children;
    }
}

const DashboardCharts = ({
    revenueData,
    transactionData,
    chartOptions,
    doughnutChartOptions,
}) => {
    const cardVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.6, ease: "easeOut" },
        },
    };

    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <motion.div variants={cardVariants} initial="hidden" animate="visible">
                    <Card
                        sx={{
                            bgcolor: "background.paper",
                            height: "100%",
                            borderRadius: 4,
                            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.1)",
                            border: "1px solid",
                            borderColor: "divider",
                            overflow: "hidden",
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: "bold",
                                    mb: 3,
                                    color: "text.primary",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 4,
                                        height: 24,
                                        bgcolor: "primary.main",
                                        borderRadius: 2,
                                    }}
                                />
                                Revenue Trends
                            </Typography>
                            <Box sx={{ height: 350, width: "100%" }}>
                                <ChartErrorBoundary>
                                    <Line data={revenueData} options={chartOptions} />
                                </ChartErrorBoundary>
                            </Box>
                        </CardContent>
                    </Card>
                </motion.div>

                <Box sx={{ mt: 3 }} />

                <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
                    <Card
                        sx={{
                            bgcolor: "background.paper",
                            height: "100%",
                            borderRadius: 4,
                            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.1)",
                            border: "1px solid",
                            borderColor: "divider",
                            overflow: "hidden",
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: "bold",
                                    mb: 3,
                                    color: "text.primary",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 4,
                                        height: 24,
                                        bgcolor: "secondary.main",
                                        borderRadius: 2,
                                    }}
                                />
                                Transaction Breakdown
                            </Typography>
                            <Box
                                sx={{
                                    height: 350,
                                    position: "relative",
                                    display: "flex",
                                    justifyContent: "center",
                                }}
                            >
                                <ChartErrorBoundary>
                                    <Doughnut data={transactionData} options={doughnutChartOptions} />
                                </ChartErrorBoundary>
                                <Box
                                    sx={{
                                        position: "absolute",
                                        top: "50%",
                                        left: "50%",
                                        transform: "translate(-50%, -50%)",
                                        textAlign: "center",
                                        pointerEvents: "none",
                                        // Hide for better doughnut visibility if content is too centered
                                        display: { xs: "none", sm: "block" }
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                        Total
                                    </Typography>
                                    <Typography variant="h6" fontWeight="bold">
                                        Split
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </motion.div>
            </Grid>
        </Grid>
    );
};

export default DashboardCharts;
