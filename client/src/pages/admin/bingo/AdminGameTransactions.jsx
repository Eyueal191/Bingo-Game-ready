import  { useCallback, useMemo, useRef, useState } from "react";
import {
    Box,
    Typography,
    TextField,
    MenuItem,
    Button,
    Stack,
    Chip,
    Paper,
} from "@mui/material";
import { format } from "date-fns";
import { toast } from "sonner";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";
import { revenueService } from "../../../services/revenueService";

const typeChipColor = (type) => {
    if (type === "win") return "success";
    if (type === "stake") return "error";
    if (type === "refund") return "warning";
    return "default";
};

const gameLabel = (gameType) => {
    const map = {
        bingo: "Bingo",
        keshkesh: "Keshkesh",
        material_lottery: "Material Lottery",
        spin: "Spin",
    };
    return map[gameType] || "Game";
};

const typeLabel = (type) => {
    if (!type) return "Unknown";
    return type.charAt(0).toUpperCase() + type.slice(1);
};

const userTypeLabel = (userType) => (userType === "robot" ? "Robot" : "User");

const defaultFilters = {
    startDate: "",
    endDate: "",
    type: "",
    userType: "",
    gameType: "",
    userId: "",
    q: "",
};

const AdminGameTransactions = () => {
    const [rowCount, setRowCount] = useState(0);
    const [summary, setSummary] = useState({
        stakes: 0,
        wins: 0,
        refunds: 0,
        profit: 0,
        count: 0,
        byUserType: {
            user: { stakes: 0, wins: 0, refunds: 0 },
            robot: { stakes: 0, wins: 0, refunds: 0 },
        },
        byGameType: {},
    });
    const [userFocus, setUserFocus] = useState({ id: "", name: "" });
    const gridApiRef = useRef(null);

    const formatDate = useCallback((value) => {
        try {
            return value ? format(new Date(value), "yyyy-MM-dd HH:mm") : "—";
        } catch (err) {
            return "—";
        }
    }, []);

    const computeSummary = useCallback((rows) => {
        const acc = {
            stakes: 0,
            wins: 0,
            refunds: 0,
            profit: 0,
            count: rows.length,
            byUserType: {
                user: { stakes: 0, wins: 0, refunds: 0 },
                robot: { stakes: 0, wins: 0, refunds: 0 },
            },
            byGameType: {},
        };

        rows.forEach((row) => {
            const amt = Number(row.amount) || 0;
            const userKey = row.userType === "robot" ? "robot" : "user";
            const gameKey = row.gameType || "unknown";
            if (!acc.byGameType[gameKey]) {
                acc.byGameType[gameKey] = { stakes: 0, wins: 0, refunds: 0 };
            }

            if (row.type === "stake") {
                acc.stakes += amt;
                acc.byUserType[userKey].stakes += amt;
                acc.byGameType[gameKey].stakes += amt;
            } else if (row.type === "win") {
                acc.wins += amt;
                acc.byUserType[userKey].wins += amt;
                acc.byGameType[gameKey].wins += amt;
            } else if (row.type === "refund") {
                acc.refunds += amt;
                acc.byUserType[userKey].refunds += amt;
                acc.byGameType[gameKey].refunds += amt;
            }
        });

        acc.profit = acc.stakes - acc.wins - acc.refunds;
        return acc;
    }, []);

    const mapTransaction = useCallback((tx, indexOffset) => {
        const user = tx?.userId || {};
        const room = tx?.roomId || {};
        const userType = tx?.userType || (user.isRobot || user.role === "robot" ? "robot" : "user");

        return {
            ...tx,
            id: tx?._id || tx?.id || `${user?._id || "user"}-${tx?.createdAt || indexOffset}`,
            index: indexOffset + 1,
            userName: user.fullName || user.telegramId || "Unknown user",
            userPhone: user.phone || "—",
            userType,
            userId: user?._id || tx?.userId || "",
            gameType: tx?.gameType || "bingo",
            amount: Number(tx?.amount) || 0,
            stakeAmount: Number(tx?.stakeAmount ?? tx?.amount) || 0,
            roomStake: Number(room?.stakeAmount) || null,
            roomStatus: room?.status || "",
            completedAt: room?.completedAt || null,
            description: tx?.description || "",
            walletAfter: tx?.walletAfter,
            walletBefore: tx?.walletBefore,
        };
    }, []);

    const fetchRows = useCallback(
        async ({ page, pageSize, extraFilters }) => {
            try {
                const params = {
                    page: page + 1,
                    limit: pageSize,
                    startDate: extraFilters?.startDate || undefined,
                    endDate: extraFilters?.endDate || undefined,
                    type: extraFilters?.type || undefined,
                    userType: extraFilters?.userType || undefined,
                    gameType: extraFilters?.gameType || undefined,
                    userId: extraFilters?.userId || undefined,
                    q: extraFilters?.q || undefined,
                };

                const res = await revenueService.getTransactions(params);
                const baseRows = (res?.transactions || []).map((tx, idx) =>
                    mapTransaction(tx, page * pageSize + idx)
                );

                const total = Number(res?.pagination?.total) || baseRows.length;
                setRowCount(total);
                setSummary(computeSummary(baseRows));

                return { rows: baseRows, rowCount: total };
            } catch (error) {
                console.error(error);
                toast.error("Failed to load transactions");
                return { rows: [], rowCount: 0 };
            }
        },
        [computeSummary, mapTransaction]
    );

    const columns = useMemo(
        () => [
            {
                field: "index",
                headerName: "#",
                width: 70,
                sortable: false,
                renderCell: (params) => {
                    const api = params?.api;
                    const pos = api?.getRowIndexRelativeToVisibleRows?.(params?.id);
                    return typeof pos === "number" ? pos + 1 : params.row.index;
                },
            },
            {
                field: "createdAt",
                headerName: "Date",
                minWidth: 180,
                renderCell: (p) => formatDate(p?.row?.createdAt),
            },
            {
                field: "userName",
                headerName: "User",
                flex: 1,
                minWidth: 180,
                renderCell: (p) => (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {p?.row?.userName}
                        </Typography>
                        {p?.row?.userId && (
                            <Button
                                size="small"
                                variant="text"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setUserFocus({ id: p.row.userId, name: p.row.userName });
                                    gridApiRef.current?.setFilters?.((prev) => ({
                                        ...prev,
                                        userId: p.row.userId,
                                    }));
                                    setTimeout(() => gridApiRef.current?.refresh?.(), 0);
                                }}
                                sx={{
                                    alignSelf: "flex-start",
                                    px: 0.5,
                                    textTransform: "none",
                                    minHeight: 26,
                                    fontSize: 12,
                                }}
                            >
                                View user
                            </Button>
                        )}
                    </Box>
                ),
            },
            {
                field: "userPhone",
                headerName: "Phone",
                minWidth: 150,
                renderCell: (p) => (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontFamily: "monospace" }}
                    >
                        {p?.row?.userPhone || "—"}
                    </Typography>
                ),
            },
            {
                field: "userType",
                headerName: "User Type",
                minWidth: 120,
                renderCell: (p) => (
                    <Chip
                        size="small"
                        variant="outlined"
                        color={p?.row?.userType === "robot" ? "secondary" : "primary"}
                        label={userTypeLabel(p?.row?.userType)}
                        sx={{ fontWeight: 600 }}
                    />
                ),
            },
            {
                field: "type",
                headerName: "Type",
                minWidth: 120,
                renderCell: (p) => (
                    <Chip
                        size="small"
                        color={typeChipColor(p?.row?.type)}
                        label={typeLabel(p?.row?.type)}
                        sx={{ fontWeight: 700 }}
                    />
                ),
            },
            {
                field: "amount",
                headerName: "Amount (ETB)",
                minWidth: 150,
                renderCell: (p) => (
                    <Typography variant="body2" fontWeight={600}>
                        {Number(p?.row?.amount || 0).toLocaleString()}
                    </Typography>
                ),
            },
            {
                field: "walletBefore",
                headerName: "Wallet Before",
                minWidth: 150,
                renderCell: (p) =>
                    p?.row?.walletBefore != null
                        ? Number(p.row.walletBefore).toLocaleString()
                        : "—",
            },
            {
                field: "stakeAmount",
                headerName: "Stake",
                minWidth: 130,
                renderCell: (p) => (
                    <Typography variant="body2" color="text.secondary">
                        {Number(p?.row?.stakeAmount || 0).toLocaleString()} ETB
                    </Typography>
                ),
            },
            {
                field: "gameType",
                headerName: "Game",
                minWidth: 140,
                renderCell: (p) => gameLabel(p?.row?.gameType),
            },
            {
                field: "walletAfter",
                headerName: "Wallet After",
                minWidth: 150,
                renderCell: (p) =>
                    p?.row?.walletAfter != null
                        ? Number(p.row.walletAfter).toLocaleString()
                        : "—",
            },
            {
                field: "description",
                headerName: "Description",
                flex: 1,
                minWidth: 220,
                sortable: false,
                renderCell: (p) => (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "100%",
                        }}
                    >
                        {p?.row?.description || "—"}
                    </Typography>
                ),
            },
        ],
        [formatDate]
    );

    return (
        <Box
            sx={{
                p: { xs: 1, sm: 2, md: 3 },
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: 3,
                minHeight: "calc(100vh - 64px)",
            }}
        >
            <Typography
                variant="h5"
                sx={{ color: "text.primary", mb: 2, fontWeight: "bold" }}
            >
                Game Transactions
            </Typography>

            <SmartDataGrid
                columns={columns}
                fetchRows={fetchRows}
                getRowId={(r) => r.id}
                initialPageSize={25}
                pageSizeOptions={[10, 25, 50, 100]}
                dynamicHeight
                initialExtraFilters={defaultFilters}
                onReady={(apiHelpers) => {
                    gridApiRef.current = apiHelpers;
                }}
                showToolbar={false}
                renderFilters={({ filters, setFilters, refresh }) => (
                    <Paper
                        elevation={0}
                        sx={{
                            mb: 1.5,
                            p: 1.5,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 1,
                            alignItems: "center",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                        }}
                    >
                        <TextField
                            size="small"
                            name="startDate"
                            label="Start Date"
                            type="date"
                            value={filters.startDate || ""}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                            }
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: { xs: "100%", sm: 170 } }}
                        />
                        <TextField
                            size="small"
                            name="endDate"
                            label="End Date"
                            type="date"
                            value={filters.endDate || ""}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                            }
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: { xs: "100%", sm: 170 } }}
                        />
                        <TextField
                            size="small"
                            select
                            name="type"
                            label="Type"
                            value={filters.type || ""}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, type: e.target.value }))
                            }
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: { xs: "100%", sm: 160 } }}
                        >
                            <MenuItem value="">All Types</MenuItem>
                            <MenuItem value="stake">Stake</MenuItem>
                            <MenuItem value="win">Win</MenuItem>
                            <MenuItem value="refund">Refund</MenuItem>
                        </TextField>
                        <TextField
                            size="small"
                            select
                            name="userType"
                            label="User Type"
                            value={filters.userType || ""}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, userType: e.target.value }))
                            }
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: { xs: "100%", sm: 150 } }}
                        >
                            <MenuItem value="">All Users</MenuItem>
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="robot">Robot</MenuItem>
                        </TextField>
                        <TextField
                            size="small"
                            select
                            name="gameType"
                            label="Game"
                            value={filters.gameType || ""}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, gameType: e.target.value }))
                            }
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: { xs: "100%", sm: 170 } }}
                        >
                            <MenuItem value="">All Games</MenuItem>
                            <MenuItem value="bingo">Bingo</MenuItem>
                            <MenuItem value="keshkesh">Keshkesh</MenuItem>
                            <MenuItem value="material_lottery">Material Lottery</MenuItem>
                            <MenuItem value="spin">Spin</MenuItem>
                        </TextField>
                        <TextField
                            size="small"
                            name="q"
                            label="Search user / description"
                            placeholder="Name, phone, notes"
                            value={filters.q || ""}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, q: e.target.value }))
                            }
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: { xs: "100%", sm: 220 } }}
                        />
                        {userFocus.id && (
                            <Chip
                                label={`Viewing ${userFocus.name || userFocus.id}`}
                                onDelete={() => {
                                    setUserFocus({ id: "", name: "" });
                                    setFilters((prev) => ({ ...prev, userId: "" }));
                                    setTimeout(() => refresh(), 0);
                                }}
                                color="info"
                                variant="outlined"
                                sx={{ minHeight: 36 }}
                            />
                        )}
                        <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
                            <Button
                                variant="contained"
                                onClick={() => refresh()}
                                sx={{ minWidth: { xs: 140, sm: 140 } }}
                            >
                                Apply Filters
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setFilters({ ...defaultFilters });
                                    setUserFocus({ id: "", name: "" });
                                    setTimeout(() => refresh(), 0);
                                }}
                                sx={{ minWidth: { xs: 140, sm: 140 } }}
                            >
                                Clear
                            </Button>
                        </Stack>
                    </Paper>
                )}
                footerSummary={
                    <Box
                        sx={{
                            display: "flex",
                            gap: 2,
                            flexWrap: "wrap",
                            alignItems: "center",
                            fontSize: 13,
                            color: "text.secondary",
                        }}
                    >
                        <Box>Filtered: {rowCount.toLocaleString()} transactions</Box>
                        {userFocus.id ? (
                            <Box>Current user rows: {summary.count}</Box>
                        ) : (
                            <Box>Page rows: {summary.count}</Box>
                        )}
                        <Box>Stakes: {summary.stakes.toLocaleString()} ETB</Box>
                        <Box>Wins: {summary.wins.toLocaleString()} ETB</Box>
                        <Box>Refunds: {summary.refunds.toLocaleString()} ETB</Box>
                        <Box sx={{ fontWeight: 600 }}>
                            Page profit: {summary.profit.toLocaleString()} ETB
                        </Box>
                        <Box>
                            User net: {(summary.byUserType.user.stakes - summary.byUserType.user.wins - summary.byUserType.user.refunds).toLocaleString()} ETB
                        </Box>
                        <Box>
                            Robot net: {(summary.byUserType.robot.stakes - summary.byUserType.robot.wins - summary.byUserType.robot.refunds).toLocaleString()} ETB
                        </Box>
                        {Object.keys(summary.byGameType).length > 0 && (
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                {Object.entries(summary.byGameType).map(([game, v]) => (
                                    <Box key={game}>
                                        {gameLabel(game)}: {(v.stakes - v.wins - v.refunds).toLocaleString()} ETB
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Box>
                }
                slots={{
                    noRowsOverlay: () => (
                        <Stack alignItems="center" justifyContent="center" sx={{ p: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                No transactions found. Adjust filters.
                            </Typography>
                        </Stack>
                    ),
                }}
                sx={{
                    "& .MuiDataGrid-overlayWrapperInner": {
                        alignItems: "flex-start",
                        mt: 4,
                    },
                }}
            />
        </Box>
    );
};

export default AdminGameTransactions;
