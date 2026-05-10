import React, { useMemo, useRef, useCallback, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Button,
  Chip,
} from "@mui/material";
import toast, { Toaster } from "react-hot-toast";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";
import { useApi } from "../../../contexts/ApiContext";
import { format } from "date-fns";

const statusColors = {
  PENDING: "warning",
  COMPLETED: "success",
  FAILED: "error",
  UNKNOWN: "default",
};

const sourceColors = {
  sms: "info",
  manual: "primary",
  admin: "warning",
  system: "secondary",
};

const AdminTransactions = ({ preset = "all" }) => {
  const refreshRef = useRef(null);
  const api = useApi();
  const [pageRows, setPageRows] = useState([]);
  const [filteredTotal, setFilteredTotal] = useState(0);

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

  const netPageAmount = useMemo(() => {
    const add =
      (totalsByType.deposit?.amount || 0) +
      (totalsByType.game_win?.amount || 0);
    const sub =
      (totalsByType.withdrawal?.amount || 0) +
      (totalsByType.game_stake?.amount || 0);
    return add - sub;
  }, [totalsByType]);

  const fetchRows = useCallback(
    async ({ page, pageSize, sortModel, quickFilter, extraFilters }) => {
      try {
        const params = new URLSearchParams();
        if (extraFilters?.source) params.append("source", extraFilters.source);
        if (extraFilters?.type) params.append("type", extraFilters.type);
        if (extraFilters?.status) params.append("status", extraFilters.status);
        if (extraFilters?.paymentMethod)
          params.append("paymentMethod", extraFilters.paymentMethod);
        if (extraFilters?.startDate) params.append("startDate", extraFilters.startDate);
        if (extraFilters?.endDate) params.append("endDate", extraFilters.endDate);
        if (extraFilters?.minAmount) params.append("minAmount", extraFilters.minAmount);
        if (extraFilters?.maxAmount) params.append("maxAmount", extraFilters.maxAmount);
        const q = String(extraFilters?.q ?? quickFilter ?? "").trim();
        if (q) params.append("q", q);

        const sortField = sortModel?.[0]?.field;
        const sortOrder = sortModel?.[0]?.sort;
        if (sortField && sortOrder) {
          params.append("sortField", sortField);
          params.append("sortOrder", sortOrder);
        }
        params.append("page", page + 1);
        params.append("limit", pageSize);
        const res = await api.get(
          `/api/v1/manual-payment/all-transactions?${params.toString()}`
        );
        const data = res.data;
        if (!data?.success) throw new Error("Failed to fetch transactions");
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
        toast.error("Failed to fetch transactions");
        console.error(e);
        return { rows: [], rowCount: 0 };
      }
    },
    [toNumber, api]
  );

  const columns = useMemo(
    () => [
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
      {
        field: "userFullName",
        headerName: "User",
        flex: 1,
        minWidth: 140,
        renderCell: (p) => p?.row?.user?.fullName || "Unknown",
      },
      {
        field: "userPhone",
        headerName: "Phone",
        minWidth: 140,
        renderCell: (p) => p?.row?.user?.phone || "—",
      },
      {
        field: "type",
        headerName: "Type",
        minWidth: 130,
        renderCell: (p) => typeLabel(p?.row?.type),
      },
      {
        field: "source",
        headerName: "Source",
        minWidth: 110,
        renderCell: (p) => (
          <Chip
            size="small"
            variant="outlined"
            color={sourceColors[p?.row?.source] || "default"}
            label={(p?.row?.source || "manual").toString()}
            sx={{ fontWeight: 700 }}
          />
        ),
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 120,
        renderCell: (p) => (
          <Chip
            size="small"
            color={statusColors[p?.row?.status] || "default"}
            label={p?.row?.status || "UNKNOWN"}
            sx={{ fontWeight: 700 }}
          />
        ),
      },
      {
        field: "amount",
        headerName: "Amount (ETB)",
        minWidth: 140,
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
        field: "paymentMethod",
        headerName: "Method",
        minWidth: 120,
        renderCell: (p) => p?.row?.paymentMethod || "—",
      },
      {
        field: "reference",
        headerName: "Reference",
        minWidth: 160,
        renderCell: (p) => p?.row?.reference || "—",
      },
      {
        field: "description",
        headerName: "Description",
        flex: 1,
        minWidth: 160,
        renderCell: (p) => p?.row?.description || "—",
      },
      {
        field: "userInvitedBy",
        headerName: "Invited By",
        minWidth: 140,
        renderCell: (p) => p?.row?.user?.invitedBy || "None",
      },
      {
        field: "userReferralCode",
        headerName: "Referral Code",
        minWidth: 160,
        renderCell: (p) => p?.row?.user?.referralCode || "No code",
      },
    ],
    [toNumber, typeLabel]
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
        {preset === "sms" ? "SMS Deposit Transactions" : "Manual Transactions"}
      </Typography>

      <SmartDataGrid
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(r) => r.id}
        initialPageSize={5}
        pageSizeOptions={[5, 10, 15, 25, 50, 100]}
        dynamicHeight
        maxAutoHeight={520}
        onReady={({ refresh }) => {
          refreshRef.current = refresh;
        }}
        initialSortModel={[{ field: "createdAt", sort: "desc" }]}
        initialExtraFilters={
          preset === "sms"
            ? {
                source: "sms",
                type: "deposit",
                status: "",
                paymentMethod: "",
                startDate: "",
                endDate: "",
                minAmount: "",
                maxAmount: "",
                q: "",
              }
            : {
                source: "",
                type: "",
                status: "",
                paymentMethod: "",
                startDate: "",
                endDate: "",
                minAmount: "",
                maxAmount: "",
                q: "",
              }
        }
        renderFilters={({ filters, setFilters, refresh }) => (
          <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
            <TextField
              label="Search"
              value={filters?.q || ""}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Name, phone, txn id, method..."
              sx={{ minWidth: { xs: "100%", sm: 220 } }}
              size="small"
            />
            <FormControl sx={{ minWidth: { xs: "100%", sm: 150 } }}>
              <InputLabel>Source</InputLabel>
              <Select
                value={filters?.source || ""}
                label="Source"
                onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
                sx={{ bgcolor: "background.default" }}
                size="small"
                disabled={preset === "sms"}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="system">System</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: { xs: "100%", sm: 150 } }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filters?.type || ""}
                label="Type"
                onChange={(e) =>
                  setFilters((f) => ({ ...f, type: e.target.value }))
                }
                sx={{ bgcolor: "background.default" }}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="deposit">Deposit</MenuItem>
                <MenuItem value="withdrawal">Withdrawal</MenuItem>
                <MenuItem value="transfer">Transfer</MenuItem>
                <MenuItem value="bonus">Bonus</MenuItem>
                <MenuItem value="referral_bonus">Referral Bonus</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: { xs: "100%", sm: 160 } }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters?.status || ""}
                label="Status"
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                sx={{ bgcolor: "background.default" }}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: { xs: "100%", sm: 170 } }}>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={filters?.paymentMethod || ""}
                label="Payment Method"
                onChange={(e) =>
                  setFilters((f) => ({ ...f, paymentMethod: e.target.value }))
                }
                sx={{ bgcolor: "background.default" }}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="CBE">CBE</MenuItem>
                <MenuItem value="Telebirr">Telebirr</MenuItem>
                <MenuItem value="Abyssinia">Abyssinia</MenuItem>
                <MenuItem value="CBEBirr">CBE Birr</MenuItem>
                <MenuItem value="Dashen">Dashen</MenuItem>
              </Select>
            </FormControl>

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
                minWidth: { xs: "100%", sm: 150 },
                bgcolor: "background.default",
              }}
              size="small"
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
                minWidth: { xs: "100%", sm: 150 },
                bgcolor: "background.default",
              }}
              size="small"
            />

            <TextField
              label="Min Amount"
              type="number"
              value={filters?.minAmount || ""}
              onChange={(e) => setFilters((f) => ({ ...f, minAmount: e.target.value }))}
              sx={{ minWidth: { xs: "100%", sm: 140 }, bgcolor: "background.default" }}
              size="small"
            />
            <TextField
              label="Max Amount"
              type="number"
              value={filters?.maxAmount || ""}
              onChange={(e) => setFilters((f) => ({ ...f, maxAmount: e.target.value }))}
              sx={{ minWidth: { xs: "100%", sm: 140 }, bgcolor: "background.default" }}
              size="small"
            />

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
                setFilters(
                  preset === "sms"
                    ? {
                        source: "sms",
                        type: "deposit",
                        status: "",
                        paymentMethod: "",
                        startDate: "",
                        endDate: "",
                        minAmount: "",
                        maxAmount: "",
                        q: "",
                      }
                    : {
                        source: "",
                        type: "",
                        status: "",
                        paymentMethod: "",
                        startDate: "",
                        endDate: "",
                        minAmount: "",
                        maxAmount: "",
                        q: "",
                      }
                )
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
            <Box>Net (page): {netPageAmount.toLocaleString()} ETB</Box>
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
    </Box>
  );
};

export default AdminTransactions;
