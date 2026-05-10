import React from "react";
import { Grid } from "@mui/material";
import { motion } from "framer-motion";
import {
    MonetizationOn,
    Gamepad,
    People,
    Group,
    Brightness7,
    AccountBalanceWallet,
    AccountBalanceWalletTwoTone,
    TrendingUp,
} from "@mui/icons-material";
import StatCard from "./StatCard";

const DashboardHeader = ({ data }) => {
    if (!data) return null;

    const stats = [
        {
            title: "Net Revenue",
            value: `ETB ${data.systemRevenue.total.toFixed(2)}`,
            icon: MonetizationOn,
            background: "linear-gradient(135deg, #3f51b5 0%, #2196f3 100%)",
            color: "white",
        },
        {
            title: "Today's Revenue",
            value: `ETB ${data.todayStats.systemRevenue.toFixed(2)}`,
            icon: MonetizationOn,
            background: "linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)",
            color: "white",
        },
        {
            title: "Today's Games Played",
            value: data.todayStats.gamesPlayed,
            icon: Gamepad,
            background: "linear-gradient(135deg, #03A9F4 0%, #4FC3F7 100%)",
            color: "white",
        },
        {
            title: "Games Played",
            value: data.systemRevenue.gameCount,
            icon: Gamepad,
            background: "linear-gradient(135deg, #e91e63 0%, #f06292 100%)",
            color: "white",
        },
        {
            title: "Unique Players",
            value: data.systemRevenue.uniquePlayerCount,
            icon: People,
            background: "linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)",
            color: "white",
        },
        {
            title: "Active Users",
            value: data.userStats.totalUsers,
            icon: Group,
            background: "linear-gradient(135deg, #009688 0%, #4db6ac 100%)",
            color: "white",
        },
        {
            title: "Robot Agents",
            value: data.userStats.totalRobots,
            icon: Brightness7,
            background: "linear-gradient(135deg, #607d8b 0%, #90a4ae 100%)",
            color: "white",
        },
        {
            title: "User Balance",
            value: `ETB ${data.userStats.totalUserWallets.toFixed(2)}`,
            icon: AccountBalanceWallet,
            background: "linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)",
            color: "white",
        },
        {
            title: "Robot Balance",
            value: `ETB ${data.userStats.totalRobotWallets.toFixed(2)}`,
            icon: AccountBalanceWalletTwoTone,
            background: "linear-gradient(135deg, #795548 0%, #a1887f 100%)",
            color: "white",
        },
        {
            title: "Avg Stake",
            value: `ETB ${data.systemRevenue.avgStake.toFixed(2)}`,
            icon: TrendingUp,
            background: "linear-gradient(135deg, #ff9800 0%, #ffc107 100%)",
            color: "white",
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {stats.map((stat, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <StatCard {...stat} />
                    </Grid>
                ))}
            </Grid>
        </motion.div>
    );
};

export default DashboardHeader;
