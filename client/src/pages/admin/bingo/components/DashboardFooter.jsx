import React from "react";
import { Box, Typography } from "@mui/material";

const DashboardFooter = ({ systemEarnings }) => {
    return (
        <Box
            sx={{
                position: "sticky",
                bottom: 0,
                bgcolor: "background.paper",
                p: 2,
                mt: 4,
                boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
                borderRadius: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
                zIndex: 10,
            }}
        >
            <Typography variant="body1" sx={{ color: "text.primary", fontWeight: "bold" }}>
                System Earnings: ETB {systemEarnings.toFixed(2)} (deposits - withdrawals)
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Last Updated: {new Date().toLocaleTimeString("en-US", {
                    timeZone: "Africa/Nairobi",
                    hour12: true,
                })}
            </Typography>
        </Box>
    );
};

export default DashboardFooter;
