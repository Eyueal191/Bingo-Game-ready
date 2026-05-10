import { useState, useEffect } from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress,
    Chip,
    Stack,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    InputAdornment,
    MenuItem
} from "@mui/material";
import { SmartToy, TrendingUp, TrendingDown, Games, Add, Delete, AccountBalanceWallet } from "@mui/icons-material";
import { motion } from "framer-motion";
import { revenueService } from "../../../services/revenueService";
import { toast } from "sonner";
import ConfirmDialog from "../../../components/common/ConfirmDialog";

const AdminRobotManagement = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);

    // Dialog states
    const [createOpen, setCreateOpen] = useState(false);
    const [walletOpen, setWalletOpen] = useState(false);
    const [selectedRobot, setSelectedRobot] = useState(null);

    // Form states
    const [robotName, setRobotName] = useState("");
    const [robotStake, setRobotStake] = useState(0);
    const [walletAmount, setWalletAmount] = useState("");
    const [walletAction, setWalletAction] = useState("credit");
    const [walletReason, setWalletReason] = useState("");
    const [deleteDialog, setDeleteDialog] = useState({ open: false, robot: null, loading: false });

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await revenueService.getRobots();
            setData(res);
        } catch (error) {
            toast.error("Failed to load robot data");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateRobot = async () => {
        try {
            await revenueService.createRobot({ name: robotName, stakeAmount: Number(robotStake) });
            toast.success("Robot created successfully");
            setCreateOpen(false);
            fetchData();
            setRobotName("");
            setRobotStake(0);
        } catch (error) {
            console.error("Create robot error:", error);
            toast.error("Failed to create robot");
        }
    };

    const handleDeleteRobot = (robot) => {
        setDeleteDialog({ open: true, robot, loading: false });
    };

    const confirmDeleteRobot = async () => {
        if (!deleteDialog.robot?._id) return;
        try {
            setDeleteDialog((d) => ({ ...d, loading: true }));
            await revenueService.deleteRobot(deleteDialog.robot._id);
            toast.success("Robot deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Delete robot error:", error);
            toast.error("Failed to delete robot");
        } finally {
            setDeleteDialog({ open: false, robot: null, loading: false });
        }
    };

    const handleWalletAdjust = async () => {
        try {
            if (!walletAmount || Number(walletAmount) <= 0) {
                toast.error("Please enter a valid amount");
                return;
            }
            await revenueService.adjustRobotWallet(selectedRobot._id, {
                amount: Number(walletAmount),
                action: walletAction,
                reason: walletReason
            });
            toast.success("Wallet adjusted successfully");
            setWalletOpen(false);
            fetchData();
            setWalletReason("");
        } catch (error) {
            console.error("Adjust wallet error:", error);
            toast.error("Failed to adjust wallet");
        }
    };

    const openWalletDialog = (robot) => {
        setSelectedRobot(robot);
        setWalletOpen(true);
    };

    // Name Management States
    const [nameOpen, setNameOpen] = useState(false);
    const [robotNames, setRobotNames] = useState([]);
    const [newName, setNewName] = useState("");
    const [savingNames, setSavingNames] = useState(false);

    const handleManageNames = async (robot) => {
        try {
            setSelectedRobot(robot);
            const res = await revenueService.getRobotNames(robot._id);
            setRobotNames(res.names || []);
            setNameOpen(true);
        } catch (error) {
            console.error("Failed to fetch names:", error);
            toast.error("Failed to fetch robot names");
        }
    };

    const handleAddName = () => {
        if (!newName.trim()) return;
        if (robotNames.includes(newName.trim())) {
            toast.error("Name already exists");
            return;
        }
        setRobotNames([...robotNames, newName.trim()]);
        setNewName("");
    };

    const handleRemoveName = (index) => {
        const newNames = [...robotNames];
        newNames.splice(index, 1);
        setRobotNames(newNames);
    };

    const handleSaveNames = async () => {
        if (!selectedRobot) return;
        try {
            setSavingNames(true);
            await revenueService.updateRobotNames(selectedRobot._id, robotNames);
            toast.success("Robot names updated successfully");
            setNameOpen(false);
        } catch (error) {
            console.error("Failed to update names:", error);
            toast.error("Failed to update robot names");
        } finally {
            setSavingNames(false);
        }
    };

    const StatCard = ({ title, value, icon, color = "primary" }) => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
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
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                {title}
                            </Typography>
                            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                                {value}
                            </Typography>
                        </Box>
                        <Box sx={{ p: 1, borderRadius: 1, bgcolor: `${color}.main`, color: "white" }}>
                            {icon}
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </motion.div>
    );

    if (loading && !data) {
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

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 4 }} spacing={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700} color="text.primary">
                        Robot Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Monitor system robots performance and financial impact
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateOpen(true)}
                    sx={{ borderRadius: 2 }}
                >
                    Create Robot
                </Button>
            </Stack>

            {/* Summary Cards */}
            {data && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, 1fr)",
                                md: "repeat(4, 1fr)",
                            },
                            gap: 3,
                            mb: 4,
                        }}
                    >
                        <StatCard
                            title="Total Robots"
                            value={data.summary?.totalRobots || 0}
                            icon={<SmartToy />}
                            color="primary"
                        />
                        <StatCard
                            title="Total Staked"
                            value={`${(data.summary?.totalStaked || 0).toLocaleString()} ETB`}
                            icon={<TrendingDown />}
                            color="error"
                        />
                        <StatCard
                            title="Total Won"
                            value={`${(data.summary?.totalWon || 0).toLocaleString()} ETB`}
                            icon={<TrendingUp />}
                            color="success"
                        />
                        <StatCard
                            title="Net System Profit"
                            value={`${Math.abs(data.summary?.totalBalance || 0).toLocaleString()} ETB`}
                            icon={<Games />}
                            color={(data.summary?.totalBalance || 0) < 0 ? "success" : "error"}
                        />
                    </Box>
                </motion.div>
            )}

            {/* Robots Table */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <TableContainer component={Paper} sx={{ bgcolor: "background.paper" }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: "action.hover" }}>
                                <TableCell sx={{ fontWeight: 600 }}>Robot Name</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Telegram ID</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Wallet Balance</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Total Staked</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Total Won</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Net Result</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Win Rate</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(!data || !data.robots || data.robots.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                        <Typography color="text.secondary">No robots found</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.robots.map((robot) => (
                                    <TableRow
                                        key={robot._id}
                                        hover
                                        sx={{ "&:hover": { bgcolor: "action.hover" } }}
                                    >
                                        <TableCell>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <SmartToy fontSize="small" color="secondary" />
                                                <Typography variant="body2" fontWeight={500}>
                                                    {robot.fullName || "Unknown"}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {robot.telegramId || "-"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                fontWeight={600}
                                                color={(robot.wallet || 0) < 0 ? "success.main" : "error.main"}
                                            >
                                                {(robot.wallet || 0).toLocaleString()} ETB
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {(robot.totalStaked || 0).toLocaleString()} ETB
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {(robot.totalWon || 0).toLocaleString()} ETB
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${Math.abs(robot.netResult || 0).toLocaleString()} ETB ${(robot.netResult || 0) <= 0 ? "(Profit)" : "(Loss)"
                                                    }`}
                                                color={(robot.netResult || 0) <= 0 ? "success" : "error"}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${robot.winRate || 0}%`}
                                                size="small"
                                                color={
                                                    (robot.winRate || 0) >= 50
                                                        ? "warning"
                                                        : (robot.winRate || 0) >= 30
                                                            ? "info"
                                                            : "success"
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => handleManageNames(robot)}
                                                >
                                                    Names
                                                </Button>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => openWalletDialog(robot)}
                                                    title="Adjust Wallet"
                                                >
                                                    <AccountBalanceWallet fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteRobot(robot)}
                                                    title="Delete Robot"
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </motion.div>

            {/* Create Robot Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
                <DialogTitle>Create New Robot</DialogTitle>
                <DialogContent sx={{ minWidth: 350, pt: 2 }}>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Robot Name"
                            fullWidth
                            value={robotName}
                            onChange={(e) => setRobotName(e.target.value)}
                            placeholder="e.g. System Bot 1"
                        />
                        <TextField
                            label="Target Stake Amount (Optional)"
                            fullWidth
                            type="number"
                            value={robotStake}
                            onChange={(e) => setRobotStake(e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">ETB</InputAdornment>,
                            }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateRobot} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Manage Names Dialog */}
            <Dialog open={nameOpen} onClose={() => setNameOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Manage Names - {selectedRobot?.fullName}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        These names will be randomly assigned to the robot when it wins.
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <TextField
                            label="Add Name"
                            fullWidth
                            size="small"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddName();
                                }
                            }}
                        />
                        <Button variant="contained" onClick={handleAddName} disabled={!newName.trim()}>
                            Add
                        </Button>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            {robotNames.length} names configured
                        </Typography>
                        {robotNames.length > 0 && (
                            <Button
                                size="small"
                                color="error"
                                onClick={() => setRobotNames([])}
                            >
                                Clear All
                            </Button>
                        )}
                    </Stack>

                    <Paper variant="outlined" sx={{ p: 2, minHeight: 200, maxHeight: 400, overflowY: 'auto' }}>
                        {robotNames.length === 0 ? (
                            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                No custom names set.
                            </Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {robotNames.map((name, index) => (
                                    <Chip
                                        key={index}
                                        label={name}
                                        onDelete={() => handleRemoveName(index)}
                                    />
                                ))}
                            </Box>
                        )}
                    </Paper>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNameOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleSaveNames}
                        variant="contained"
                        disabled={savingNames}
                    >
                        {savingNames ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Wallet Adjust Dialog */}
            <Dialog open={walletOpen} onClose={() => setWalletOpen(false)}>
                <DialogTitle>Adjust Wallet Balance</DialogTitle>
                <DialogContent sx={{ minWidth: 350, pt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Updating wallet for <b>{selectedRobot?.fullName}</b>
                    </Typography>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            select
                            label="Action"
                            fullWidth
                            value={walletAction}
                            onChange={(e) => setWalletAction(e.target.value)}
                        >
                            <MenuItem value="credit">Credit (Add Money)</MenuItem>
                            <MenuItem value="debit">Debit (Remove Money)</MenuItem>
                        </TextField>
                        <TextField
                            label="Amount"
                            fullWidth
                            type="number"
                            value={walletAmount}
                            onChange={(e) => setWalletAmount(e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">ETB</InputAdornment>,
                            }}
                        />
                        <TextField
                            label="Reason"
                            fullWidth
                            value={walletReason}
                            onChange={(e) => setWalletReason(e.target.value)}
                            placeholder="e.g. Correction"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setWalletOpen(false)}>Cancel</Button>
                    <Button onClick={handleWalletAdjust} variant="contained" color={walletAction === "credit" ? "success" : "error"}>
                        {walletAction === "credit" ? "Credit" : "Debit"} Rules
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, robot: null, loading: false })}
                onConfirm={confirmDeleteRobot}
                title="Delete robot?"
                description={`Delete ${deleteDialog.robot?.fullName || "this robot"} permanently? This action cannot be undone.`}
                confirmLabel="Delete"
                confirmColor="error"
                loading={deleteDialog.loading}
            />
        </Box>
    );
};

export default AdminRobotManagement;
