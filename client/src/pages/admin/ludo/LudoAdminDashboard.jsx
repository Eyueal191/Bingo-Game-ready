import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Box,
    Typography,
    Alert,
    CircularProgress,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Tooltip,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Pagination,
} from "@mui/material";
import { useAuth } from "../../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { useApi } from "../../../contexts/ApiContext";
import { toast } from "sonner";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import ConfirmDialog from "../../../components/common/ConfirmDialog";

const STATUS_COLORS = {
    waiting: "info",
    full: "warning",
    playing: "primary",
    ended: "success",
    cancelled: "error",
};

const MODE_LABELS = {
    classic: "♟️ Classic",
    quick: "⚡ Quick",
};

const LudoAdminDashboard = () => {
    const { isAdmin, gamePermissions } = useAuth();
    const api = useApi();
    const [activeSection, setActiveSection] = useState("dashboard");
    const [stats, setStats] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [cancelRoomId, setCancelRoomId] = useState(null);

    const fetchStats = async () => {
        try {
            const res = await api.get("/api/v1/ludo/admin/stats");
            setStats(res.data.stats);
        } catch (err) {
            console.error("Failed to fetch Ludo stats", err);
        }
    };

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const params = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const res = await api.get("/api/v1/ludo/admin/rooms", { params });
            setRooms(res.data.rooms || []);
            setTotalPages(res.data.totalPages || 1);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to fetch rooms");
            toast.error("Failed to fetch Ludo rooms");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchRooms();
    }, [page, statusFilter]);

    const requestCancelRoom = (roomId) => {
        setCancelRoomId(roomId);
    };

    const confirmCancelRoom = async () => {
        if (!cancelRoomId) return;
        try {
            await api.post(`/api/v1/ludo/rooms/${cancelRoomId}/cancel`);
            toast.success("Room cancelled successfully");
            fetchRooms();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to cancel room");
        } finally {
            setCancelRoomId(null);
        }
    };

    const formatDate = (d) => {
        if (!d) return "—";
        return new Date(d).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const maskPhone = (phone) => {
        if (!phone || phone.length < 4) return phone || "—";
        return phone.slice(0, 4) + "****";
    };

    if (loading && !rooms.length) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{ padding: "8px 0" }}
        >
            <Box sx={{ maxWidth: "100%", mx: "auto" }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* Stats Cards */}
                {stats && (
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
                        <StatCard label="Total Rooms" value={stats.totalRooms} icon="🏠" color="#55ff77" />
                        <StatCard label="Active Now" value={stats.activeRooms} icon="🟢" color="#55ff77" />
                        <StatCard label="Completed" value={stats.completedGames} icon="✅" color="#ff9f1c" />
                        <StatCard label="Cancelled" value={stats.cancelledGames} icon="❌" color="#ff3b30" />
                        <StatCard label="Total Staked" value={`${(stats.totalStaked || 0).toLocaleString()} coins`} icon="💰" color="#ff9f1c" />
                        <StatCard label="Total Won" value={`${(stats.totalWon || 0).toLocaleString()} coins`} icon="🏆" color="#55ff77" />
                        <StatCard label="Commission" value={`${(stats.totalCommission || 0).toLocaleString()} coins`} icon="📊" color="#55ff77" />
                        <StatCard label="Avg per Game" value={stats.completedGames ? `${Math.round(stats.totalCommission / stats.completedGames)} coins` : "—"} icon="📈" color="#55ff77" />
                    </Box>
                )}

                {/* Section Tabs */}
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    {["dashboard", "rooms"].map((s) => (
                        <Button
                            key={s}
                            variant={activeSection === s ? "contained" : "outlined"}
                            size="small"
                            onClick={() => setActiveSection(s)}
                            sx={{ textTransform: "capitalize" }}
                        >
                            {s}
                        </Button>
                    ))}
                </Box>

                {/* Rooms Table */}
                {activeSection === "rooms" && (
                    <>
                        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                    label="Status"
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="waiting">Waiting</MenuItem>
                                    <MenuItem value="playing">Playing</MenuItem>
                                    <MenuItem value="ended">Ended</MenuItem>
                                    <MenuItem value="cancelled">Cancelled</MenuItem>
                                </Select>
                            </FormControl>
                            <Typography variant="body2" color="text.secondary">
                                {rooms.length} rooms shown
                            </Typography>
                        </Box>

                        <TableContainer component={Paper} sx={{ bgcolor: "rgba(255, 255, 255, 0.03)", borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Room ID</TableCell>
                                        <TableCell>Stake</TableCell>
                                        <TableCell>Mode</TableCell>
                                        <TableCell>Players</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Winner</TableCell>
                                        <TableCell>Win Amount</TableCell>
                                        <TableCell>Created</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rooms.map((room) => (
                                        <TableRow key={room._id} hover>
                                            <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                                {room._id?.slice(-8)}
                                            </TableCell>
                                            <TableCell>{room.stakeAmount} coins</TableCell>
                                            <TableCell>{MODE_LABELS[room.mode] || room.mode}</TableCell>
                                            <TableCell>
                                                {room.players?.length || 0}/{room.playerCount}
                                                <Box sx={{ fontSize: "0.65rem", color: "text.secondary" }}>
                                                    {room.players?.map((p) => maskPhone(p.userId?.phone)).join(", ")}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={room.status}
                                                    color={STATUS_COLORS[room.status] || "default"}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {room.winnerUserId?.fullName || "—"}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: room.winAmount ? "#55ff77" : "inherit" }}>
                                                {room.winAmount ? `${room.winAmount.toFixed(2)} coins` : "—"}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: "0.75rem" }}>
                                                {formatDate(room.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                {["waiting", "playing"].includes(room.status) && (
                                                    <Tooltip title="Cancel & Refund">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => requestCancelRoom(room._id)}
                                                        >
                                                            <CancelIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {rooms.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                                No Ludo rooms found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {totalPages > 1 && (
                            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                                <Pagination
                                    count={totalPages}
                                    page={page}
                                    onChange={(_, v) => setPage(v)}
                                    color="primary"
                                />
                            </Box>
                        )}
                    </>
                )}

                {/* Dashboard Overview */}
                {activeSection === "dashboard" && stats && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>📊 Overview</Typography>
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                            <Paper sx={{ p: 3, bgcolor: "rgba(255, 255, 255, 0.03)", borderRadius: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Revenue Breakdown
                                </Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                    <RevenueLine label="Total Staked" value={stats.totalStaked} />
                                    <RevenueLine label="Total Won by Players" value={stats.totalWon} />
                                    <RevenueLine label="Platform Commission" value={stats.totalCommission} highlight />
                                    <RevenueLine label="Commission Rate" value="20%" isRate />
                                </Box>
                            </Paper>
                            <Paper sx={{ p: 3, bgcolor: "rgba(255, 255, 255, 0.03)", borderRadius: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Game Statistics
                                </Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                    <RevenueLine label="Total Rooms Created" value={stats.totalRooms} isCount />
                                    <RevenueLine label="Currently Active" value={stats.activeRooms} isCount />
                                    <RevenueLine label="Completed Games" value={stats.completedGames} isCount />
                                    <RevenueLine label="Cancelled Games" value={stats.cancelledGames} isCount />
                                </Box>
                            </Paper>
                        </Box>
                    </Box>
                )}
            </Box>

            <ConfirmDialog 
                open={!!cancelRoomId}
                title="Cancel Room"
                message="Are you sure you want to cancel this room? Players will be refunded."
                onConfirm={confirmCancelRoom}
                onCancel={() => setCancelRoomId(null)}
                confirmText="Cancel Room"
                confirmColor="error"
            />
        </motion.div>
    );
};

// ─── Sub Components ──────────────────────────────
const StatCard = ({ label, value, icon, color }) => (
    <Paper
        sx={{
            p: 2,
            bgcolor: "rgba(255, 255, 255, 0.03)",
            borderRadius: 2,
            borderLeft: `3px solid ${color}`,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
        }}
    >
        <span style={{ fontSize: "1.5rem" }}>{icon}</span>
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                {label}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.3 }}>
                {value}
            </Typography>
        </Box>
    </Paper>
);

const RevenueLine = ({ label, value, highlight, isRate, isCount }) => (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography
            variant="body2"
            sx={{
                fontWeight: highlight ? 800 : 600,
                color: highlight ? "#55ff77" : "text.primary",
            }}
        >
            {isRate ? value : isCount ? value : `${(value || 0).toLocaleString()} coins`}
        </Typography>
    </Box>
);

export default LudoAdminDashboard;
