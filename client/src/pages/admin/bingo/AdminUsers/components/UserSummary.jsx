import React, { useState, useCallback, useMemo, useRef } from "react";
import {
    Box, Typography, Button, CircularProgress,
    FormControl, InputLabel, Select, MenuItem, TextField,
    useMediaQuery, useTheme
} from "@mui/material";
import toast from "react-hot-toast";
import SmartDataGrid from "../../../../../components/SmartDataGrid";
import { inRange } from "../utils";

const UserSummary = ({ user, api, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [summaryData, setSummaryData] = useState(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const fetchSummary = useCallback(async () => {
        if (!user?._id) return;
        toast.loading("Fetching user summary…", { id: "user-summary" });
        setLoading(true);
        setSummaryData(null);
        try {
            const res = await api.get(`/api/v1/users/${user._id}/summary`);
            if (!res.data?.success) throw new Error("Failed to fetch summary");
            setSummaryData(res.data);
            toast.success("User summary loaded", { id: "user-summary" });
        } catch (e) {
            console.error(e);
            toast.error("Failed to fetch user summary", { id: "user-summary" });
        } finally {
            setLoading(false);
        }
    }, [user, api]);

    React.useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const summaryTimelineRows = useMemo(() => {
        if (!summaryData) return [];
        const rows = [];

        const pushRow = (row) => rows.push(row);

        // Deposits
        (summaryData.deposits?.sms || []).forEach((d) => {
            pushRow({
                id: `dep_sms_${d._id || d.transactionId}`,
                category: "Deposit",
                method: "SMS",
                amount: Number(d.amount || 0),
                status: d.status || "",
                reference: d.transactionId || "",
                date: d.timestamp || d.createdAt || d.date || null,
                note: d.sender ? `Sender: ${d.sender}` : "",
                user: summaryData.user?.fullName || "",
            });
        });
        (summaryData.deposits?.manual || []).forEach((d) => {
            pushRow({
                id: `dep_manual_${d._id}`,
                category: "Deposit",
                method: "Manual",
                amount: Number(d.amount || 0),
                status: "COMPLETED",
                reference: d.transactionId || d._id,
                date: d.createdAt || d.date || null,
                note: d.description || "",
                user: summaryData.user?.fullName || "",
            });
        });
        (summaryData.deposits?.addispay || []).forEach((d) => {
            pushRow({
                id: `dep_addispay_${d._id}`,
                category: "Deposit",
                method: "AddisPay",
                amount: Number(d.amount || 0),
                status: d.status || "",
                reference: d.reference || d.addispayTransactionId || d._id,
                date: d.createdAt || null,
                note: d.description || "",
                user: summaryData.user?.fullName || "",
            });
        });

        // Withdrawals
        (summaryData.withdrawals?.manual || []).forEach((w) => {
            pushRow({
                id: `wd_manual_${w._id}`,
                category: "Withdraw",
                method: "Manual",
                amount: Number(w.amount || 0),
                status: "COMPLETED",
                reference: w.transactionId || w._id,
                date: w.createdAt || w.date || null,
                note: w.description || "",
                user: summaryData.user?.fullName || "",
            });
        });
        (summaryData.withdrawals?.addispay || []).forEach((w) => {
            pushRow({
                id: `wd_addispay_${w._id}`,
                category: "Withdraw",
                method: "AddisPay",
                amount: Number(w.amount || 0),
                status: w.status || "",
                reference: w.reference || w.addispayTransactionId || w._id,
                date: w.createdAt || null,
                note: w.description || "",
                user: summaryData.user?.fullName || "",
            });
        });

        // Games
        (summaryData.games?.history || []).forEach((g) => {
            const stake = g.roomId?.stakeAmount;
            const win = g.roomId?.winAmount;
            pushRow({
                id: `game_${g._id}`,
                category: "Game",
                method: "Bingo",
                amount: 0,
                status: g.gameStatus || "",
                reference: g.roomId?._id || g.roomId || "",
                date: g.createdAt || null,
                note: stake != null || win != null
                    ? `Stake: ${Number(stake || 0).toLocaleString()} / Win: ${Number(win || 0).toLocaleString()} / Cards: ${(g.cardIds || []).length}`
                    : `Cards: ${(g.cardIds || []).length}`,
                user: summaryData.user?.fullName || "",
            });
        });

        return rows
            .map((r) => ({ ...r, _ts: r.date ? new Date(r.date).getTime() : 0 }))
            .sort((a, b) => (b._ts || 0) - (a._ts || 0));
    }, [summaryData]);

    const fetchSummaryRows = useCallback(
        async ({ page, pageSize, sortModel, quickFilter, extraFilters }) => {
            const f = extraFilters || {};
            const q = (quickFilter || "").trim().toLowerCase();

            let filtered = summaryTimelineRows;
            if (f.category) filtered = filtered.filter((r) => r.category === f.category);
            if (f.method) filtered = filtered.filter((r) => r.method === f.method);
            if (f.startDate || f.endDate) {
                filtered = filtered.filter((r) => inRange(r.date, f.startDate, f.endDate));
            }

            if (q) {
                filtered = filtered.filter((r) => {
                    const hay = [
                        r.category, r.method, r.status,
                        r.reference, r.note, String(r.amount ?? ""),
                    ].join(" ").toLowerCase();
                    return hay.includes(q);
                });
            }

            const sortField = sortModel?.[0]?.field;
            const sortDir = sortModel?.[0]?.sort === "asc" ? 1 : -1;
            if (sortField) {
                filtered = [...filtered].sort((a, b) => {
                    const av = a?.[sortField];
                    const bv = b?.[sortField];
                    if (sortField === "date") {
                        const at = av ? new Date(av).getTime() : 0;
                        const bt = bv ? new Date(bv).getTime() : 0;
                        return (at - bt) * sortDir;
                    }
                    if (typeof av === "number" && typeof bv === "number")
                        return (av - bv) * sortDir;
                    return String(av ?? "").localeCompare(String(bv ?? "")) * sortDir;
                });
            }

            const start = page * pageSize;
            const paged = filtered.slice(start, start + pageSize);
            return { rows: paged, rowCount: filtered.length };
        },
        [summaryTimelineRows]
    );

    return (
        <Box
            sx={{
                mt: 2, p: 2, border: "1px solid", borderColor: "divider",
                borderRadius: 2, bgcolor: "background.default",
            }}
        >
            <Box
                sx={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexWrap: "wrap", gap: 1, mb: 1,
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    User Summary: {user?.fullName || ""}
                </Typography>
                <Button variant="text" onClick={onClose}>
                    Close
                </Button>
            </Box>

            {loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2">Loading summary…</Typography>
                </Box>
            ) : summaryData ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box
                        sx={{
                            display: "flex", gap: 2, flexWrap: "wrap",
                            color: "text.secondary", fontSize: 13,
                        }}
                    >
                        <Box>Wallet: {Number(summaryData.user?.wallet || 0).toLocaleString()} coins</Box>
                        <Box>Bonus: {Number(summaryData.user?.bonus || 0).toLocaleString()} coins</Box>
                        <Box>Deposits: {Number(summaryData.stats?.totalDeposit || 0).toLocaleString()} coins</Box>
                        <Box>Withdrawals: {Number(summaryData.stats?.totalWithdraw || 0).toLocaleString()} coins</Box>
                        <Box>
                            Games: {Number(summaryData.stats?.totalGames || 0).toLocaleString()} (W:{" "}
                            {Number(summaryData.stats?.wins || 0).toLocaleString()} / L:{" "}
                            {Number(summaryData.stats?.losses || 0).toLocaleString()})
                        </Box>
                    </Box>

                    <SmartDataGrid
                        columns={[
                            { field: "date", headerName: "Date", flex: 1, minWidth: 180, valueGetter: (v, r) => (r.date ? new Date(r.date).toLocaleString() : "") },
                            { field: "category", headerName: "Category", minWidth: 110 },
                            { field: "method", headerName: "Method", minWidth: 110 },
                            { field: "amount", headerName: "Amount", minWidth: 110, valueGetter: (v, r) => Number(r.amount || 0).toLocaleString() },
                            { field: "status", headerName: "Status", minWidth: 120 },
                            { field: "reference", headerName: "Ref", flex: 1, minWidth: 160 },
                            { field: "note", headerName: "Note", flex: 2, minWidth: 240 },
                        ]}
                        fetchRows={fetchSummaryRows}
                        getRowId={(r) => r.id}
                        initialPageSize={10}
                        pageSizeOptions={[5, 10, 25, 50, 100]}
                        density={isMobile ? "compact" : "standard"}
                        initialSortModel={[{ field: "date", sort: "desc" }]}
                        initialExtraFilters={{ category: "", method: "", startDate: "", endDate: "" }}
                        renderFilters={({ filters: f, setFilters: setF, refresh }) => (
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", p: 1 }}>
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                    <InputLabel>Category</InputLabel>
                                    <Select
                                        label="Category"
                                        value={f.category || ""}
                                        onChange={(e) => setF((p) => ({ ...p, category: e.target.value }))}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        <MenuItem value="Deposit">Deposit</MenuItem>
                                        <MenuItem value="Withdraw">Withdraw</MenuItem>
                                        <MenuItem value="Game">Game</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                    <InputLabel>Method</InputLabel>
                                    <Select
                                        label="Method"
                                        value={f.method || ""}
                                        onChange={(e) => setF((p) => ({ ...p, method: e.target.value }))}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        <MenuItem value="SMS">SMS</MenuItem>
                                        <MenuItem value="Manual">Manual</MenuItem>
                                        <MenuItem value="AddisPay">AddisPay</MenuItem>
                                        <MenuItem value="Bingo">Bingo</MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="Start Date"
                                    type="date"
                                    size="small"
                                    value={f.startDate || ""}
                                    onChange={(e) => setF((p) => ({ ...p, startDate: e.target.value }))}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    label="End Date"
                                    type="date"
                                    size="small"
                                    value={f.endDate || ""}
                                    onChange={(e) => setF((p) => ({ ...p, endDate: e.target.value }))}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <Button variant="outlined" onClick={() => refresh()}>
                                    Apply
                                </Button>
                                <Button
                                    variant="text"
                                    onClick={() => {
                                        setF({ category: "", method: "", startDate: "", endDate: "" });
                                        refresh();
                                    }}
                                >
                                    Clear
                                </Button>
                            </Box>
                        )}
                    />
                </Box>
            ) : (
                <Typography variant="body2" sx={{ p: 1, color: "text.secondary" }}>
                    No summary data.
                </Typography>
            )}
        </Box>
    );
};

export default UserSummary;
