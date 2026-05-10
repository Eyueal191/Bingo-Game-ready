import React, { useMemo, useCallback, useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import toast, { Toaster } from "react-hot-toast";
import { useApi } from "../../../contexts/ApiContext";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";
import { format } from "date-fns";

const AdminAddispayTransactions = () => {
  const refreshRef = useRef(null);
  const [pageRows, setPageRows] = useState([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaRow, setMetaRow] = useState(null);
  const api = useApi();

  const toNumber = useCallback((v) => {
    if (v == null) return 0;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const str = String(v)
      .replace(/[^0-9.,-]/g, "")
      .replace(/,(?=\d{3}(\D|$))/g, "");
    const normalized = str.replace(/,(?=\d{1,2}$)/, ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const typeLabel = useCallback((t) => {
    if (!t) return "Unknown";
    return t
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }, []);

  const totals = useMemo(() => {
    const amount = pageRows.reduce((s, r) => s + toNumber(r.amount), 0);
    const bonus = pageRows.reduce((s, r) => s + toNumber(r.bonusAmount), 0);
    const credited = pageRows.reduce((s, r) => s + toNumber(r.creditedAmount), 0);
    return { amount, bonus, credited, count: pageRows.length };
  }, [pageRows, toNumber]);

  const totalsByStatus = useMemo(() => {
    const map = {};
    for (const r of pageRows) {
      const key = r?.status || "UNKNOWN";
      const amt = toNumber(r?.amount);
      if (!map[key]) map[key] = { count: 0, amount: 0 };
      map[key].count += 1;
      map[key].amount += amt;
    }
    return map;
  }, [pageRows, toNumber]);

  const totalsByType = useMemo(() => {
    const map = {};
    for (const r of pageRows) {
      const key = r?.type || "unknown";
      const amt = toNumber(r?.amount);
      if (!map[key]) map[key] = { count: 0, amount: 0 };
      map[key].count += 1;
      map[key].amount += amt;
    }
    return map;
  }, [pageRows, toNumber]);

  const handleOpenMeta = useCallback((row) => {
    setMetaRow(row || null);
    setMetaOpen(true);
  }, []);
  const handleCloseMeta = useCallback(() => setMetaOpen(false), []);
  const handleCopyMeta = useCallback(() => {
    try {
      const text = metaRow?.metadata
        ? typeof metaRow.metadata === "string"
          ? metaRow.metadata
          : JSON.stringify(metaRow.metadata, null, 2)
        : "";
      navigator.clipboard?.writeText(text);
      toast.success("Metadata copied");
    } catch (e) {
      console.error(e);
      toast.error("Copy failed");
    }
  }, [metaRow]);

  const fetchRows = useCallback(
    async ({ page, pageSize, extraFilters }) => {
      try {
        const params = new URLSearchParams();
        if (extraFilters?.type) params.append("type", extraFilters.type);
        if (extraFilters?.status) params.append("status", extraFilters.status);
        if (extraFilters?.startDate)
          params.append("startDate", extraFilters.startDate);
        if (extraFilters?.endDate)
          params.append("endDate", extraFilters.endDate);
        params.append("page", page + 1);
        params.append("limit", pageSize);
        const res = await api.get(
          `/api/v1/transactions/all?${params.toString()}`
        );
        const data = res.data;
        if (!data?.success)
          throw new Error("Failed to fetch Addispay transactions");
        const rows = (data.transactions || []).map((tx) => ({
          ...tx,
          id: tx.id || tx._id,
          amount: toNumber(tx.amount),
        }));
        setPageRows(rows);
        setFilteredTotal(Number(data.totalTransactions) || rows.length);
        const rowCount = Number(data.totalTransactions) || rows.length;
        return { rows, rowCount };
      } catch (e) {
        toast.error("Failed to fetch Addispay transactions");
        console.error(e);
        return { rows: [], rowCount: 0 };
      }
    },
    [toNumber, api]
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
          return typeof pos === "number" ? pos + 1 : "";
        },
      },
      {
        field: "userFullName",
        headerName: "User",
        flex: 1,
        minWidth: 140,
        renderCell: (p) => p?.row?.user?.fullName || "Unknown",
      },
      {
        field: "phone",
        headerName: "Phone",
        minWidth: 140,
        renderCell: (p) => p?.row?.user?.phone || "—",
      },
      {
        field: "type",
        headerName: "Type",
        minWidth: 150,
        renderCell: (p) => typeLabel(p?.row?.type),
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 140,
        renderCell: (p) => p?.row?.status || "—",
      },
      {
        field: "amount",
        headerName: "Amount (ETB)",
        minWidth: 160,
        renderCell: (p) => toNumber(p?.row?.amount).toLocaleString(),
      },
      {
        field: "creditedAmount",
        headerName: "Credited",
        minWidth: 120,
        renderCell: (p) => toNumber(p?.row?.creditedAmount).toLocaleString(),
      },
      {
        field: "bonusAmount",
        headerName: "Bonus",
        minWidth: 120,
        renderCell: (p) => toNumber(p?.row?.bonusAmount).toLocaleString(),
      },
      {
        field: "bonusPercent",
        headerName: "Bonus %",
        minWidth: 100,
        renderCell: (p) => (p?.row?.bonusPercent ? `${p.row.bonusPercent}%` : "—"),
      },
      {
        field: "reference",
        headerName: "Reference",
        minWidth: 180,
        renderCell: (p) => p?.row?.reference || "—",
      },
      {
        field: "metadata",
        headerName: "Metadata",
        minWidth: 140,
        sortable: false,
        renderCell: (p) => {
          const row = p?.row;
          const hasMeta = !!row?.metadata;
          const isDepositOrWithdrawal =
            row?.type === "deposit" || row?.type === "withdrawal";
          if (!hasMeta || !isDepositOrWithdrawal) return "—";
          return (
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleOpenMeta(row)}
            >
              View
            </Button>
          );
        },
      },
      {
        field: "createdAt",
        headerName: "Date",
        minWidth: 180,
        renderCell: (p) => {
          try {
            const v = p?.row?.createdAt;
            return v ? format(new Date(v), "yyyy-MM-dd HH:mm") : "—";
          } catch {
            return "—";
          }
        },
      },
    ],
    [toNumber, typeLabel, handleOpenMeta]
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
      <Toaster />
      <Typography
        variant="h5"
        sx={{ color: "text.primary", mb: 2, fontWeight: "bold" }}
      >
        AddisPay Transactions
      </Typography>

      <SmartDataGrid
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(r) => r.id}
        initialPageSize={5}
        pageSizeOptions={[5, 10, 15, 25, 50, 100]}
        dynamicHeight
        onReady={({ refresh }) => {
          refreshRef.current = refresh;
          // optional: expose setFilters if needed later
        }}
        renderFilters={({ filters, setFilters, refresh }) => (
          <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
            <TextField
              name="startDate"
              label="Start Date"
              type="date"
              value={filters?.startDate || ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, startDate: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: { xs: "100%", sm: 160 },
                bgcolor: "background.default",
              }}
            />
            <TextField
              name="endDate"
              label="End Date"
              type="date"
              value={filters?.endDate || ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, endDate: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: { xs: "100%", sm: 160 },
                bgcolor: "background.default",
              }}
            />
            <Select
              value={filters?.type || ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, type: e.target.value }))
              }
              displayEmpty
              sx={{
                minWidth: { xs: "100%", sm: 160 },
                bgcolor: "background.default",
              }}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="deposit">Deposit</MenuItem>
              <MenuItem value="withdrawal">Withdrawal</MenuItem>
              <MenuItem value="transfer">Transfer</MenuItem>
              <MenuItem value="receive">Receive</MenuItem>
              <MenuItem value="registration_bonus">Registration Bonus</MenuItem>
              <MenuItem value="referral_bonus">Referral Bonus</MenuItem>
            </Select>
            <Select
              value={filters?.status || ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
              displayEmpty
              sx={{
                minWidth: { xs: "100%", sm: 160 },
                bgcolor: "background.default",
              }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="FAILED">Failed</MenuItem>
              <MenuItem value="CANCELED">Canceled</MenuItem>
            </Select>
            <Button
              variant="contained"
              onClick={refresh}
              sx={{ minWidth: { xs: "100%", sm: 120 } }}
            >
              Apply
            </Button>
            <Button
              variant="outlined"
              onClick={() =>
                setFilters({ startDate: "", endDate: "", type: "", status: "" })
              }
              sx={{ minWidth: { xs: "100%", sm: 120 } }}
            >
              Clear
            </Button>
          </Box>
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
            <Box>Filtered: {filteredTotal.toLocaleString()} transactions</Box>
            <Box>Page total: {totals.amount.toLocaleString()} ETB</Box>
            {Object.keys(totalsByStatus).length > 0 && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {Object.entries(totalsByStatus).map(([s, v]) => (
                  <Box key={s}>
                    {s}: {v.count} / {v.amount.toLocaleString()} ETB
                  </Box>
                ))}
              </Box>
            )}
            {Object.keys(totalsByType).length > 0 && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {Object.entries(totalsByType).map(([t, v]) => (
                  <Box key={t}>
                    {typeLabel(t)}: {v.count} / {v.amount.toLocaleString()} ETB
                  </Box>
                ))}
              </Box>
            )}
            <Box>Page credited: {totals.credited.toLocaleString()} ETB</Box>
            <Box>Page bonus: {totals.bonus.toLocaleString()} ETB</Box>
          </Box>
        }
      />
      <Dialog open={metaOpen} onClose={handleCloseMeta} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 600 }}>Transaction Metadata</DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "background.default" }}>
          <Box
            component="pre"
            sx={{
              m: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "monospace",
              fontSize: 12,
              maxHeight: "70vh",
              overflow: "auto",
              p: 1,
              borderRadius: 1,
              bgcolor: "background.paper",
            }}
          >
            {(() => {
              const m = metaRow?.metadata;
              if (!m) return "No metadata";
              try {
                return typeof m === "string" ? m : JSON.stringify(m, null, 2);
              } catch {
                return String(m);
              }
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyMeta}>Copy</Button>
          <Button onClick={handleCloseMeta} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminAddispayTransactions;