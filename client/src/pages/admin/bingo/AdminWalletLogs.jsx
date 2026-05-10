import React, { useMemo, useRef, useState, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";
import { useApi } from "../../../contexts/ApiContext";
const AdminWalletLogs = () => {
    const api = useApi();

  const refreshRef = useRef(() => {});
  const [filters] = useState({
    startDate: "",
    endDate: "",
    source: "",
    target: "",
    admin: "",
    minAmount: "",
    maxAmount: "",
  });

  const columns = useMemo(
    () => [
      {
        field: "_id",
        headerName: "ID",
        valueGetter: (v, r) => r._id.slice(0, 8),
        width: 110,
      },
      {
        field: "createdAt",
        headerName: "Date",
        valueGetter: (v, r) => new Date(r.createdAt).toLocaleString(),
        width: 180,
      },
      {
        field: "targetUser",
        headerName: "Target User",
        valueGetter: (v, r) =>
          r.targetUser?.fullName ||
          r.targetUser?.phone ||
          r.targetUser?.telegramId ||
          "",
        flex: 1,
        minWidth: 180,
      },
      {
        field: "performedBy",
        headerName: "Performed By",
        valueGetter: (v, r) =>
          r.performedBy?.fullName ||
          r.performedBy?.phone ||
          r.performedBy?.telegramId ||
          "",
        minWidth: 160,
        flex: 1,
      },
      {
        field: "amount",
        headerName: "Amount",
        valueGetter: (v, r) => r.amount?.toFixed(2),
        width: 120,
      },
      {
        field: "balanceBefore",
        headerName: "Before",
        valueGetter: (v, r) => r.balanceBefore?.toFixed(2),
        width: 120,
      },
      {
        field: "balanceAfter",
        headerName: "After",
        valueGetter: (v, r) => r.balanceAfter?.toFixed(2),
        width: 120,
      },
      { field: "source", headerName: "Source", width: 140 },
      { field: "reason", headerName: "Reason", flex: 1.5, minWidth: 220 },
    ],
    []
  );

  const fetchRows = useCallback(
    async ({ page, pageSize, sortModel, quickFilter, extraFilters }) => {
      const sortField = sortModel?.[0]?.field || "createdAt";
      const sortOrder = sortModel?.[0]?.sort || "desc";
      const {
        startDate = "",
        endDate = "",
        source = "",
        target = "",
        admin = "",
        minAmount = "",
        maxAmount = "",
      } = extraFilters || {};
      const params = new URLSearchParams();
      params.set("page", String(page + 1));
      params.set("limit", String(pageSize));
      if (quickFilter) params.set("q", quickFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (source) params.set("source", source);
      if (target) params.set("target", target);
      if (admin) params.set("admin", admin);
      if (minAmount !== "") params.set("minAmount", String(minAmount));
      if (maxAmount !== "") params.set("maxAmount", String(maxAmount));
      params.set("sortField", sortField);
      params.set("sortOrder", sortOrder);
      const res = await api.get(`/api/v1/wallet-logs?${params.toString()}`);
      if (res.data?.success) {
        const rows = res.data.rows || [];
        const rowCount = res.data.total || rows.length;
        return { rows, rowCount };
      }
      return { rows: [], rowCount: 0 };
    },
    [api]
  );

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 3 },
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Wallet Audit Logs
      </Typography>
      <SmartDataGrid
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(r) => r._id}
        initialPageSize={10}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        density="compact"
        initialSortModel={[{ field: "createdAt", sort: "desc" }]}
        initialExtraFilters={filters}
        onReady={({ refresh }) => (refreshRef.current = refresh)}
        renderFilters={({ filters: f, setFilters: setF, refresh }) => (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", p: 1 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Source</InputLabel>
              <Select
                label="Source"
                value={f.source || ""}
                onChange={(e) => setF((p) => ({ ...p, source: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
                <MenuItem value="receipt_approval">Receipt Approval</MenuItem>
                <MenuItem value="withdrawal_adjustment">Withdrawal Adjustment</MenuItem>
                <MenuItem value="system">System</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              value={f.startDate || ""}
              onChange={(e) =>
                setF((p) => ({ ...p, startDate: e.target.value }))
              }
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
            <TextField
              label="Target (name/phone/telegramId)"
              size="small"
              value={f.target || ""}
              onChange={(e) => setF((p) => ({ ...p, target: e.target.value }))}
              sx={{ minWidth: 220 }}
            />
            <TextField
              label="Admin (name/phone/telegramId)"
              size="small"
              value={f.admin || ""}
              onChange={(e) => setF((p) => ({ ...p, admin: e.target.value }))}
              sx={{ minWidth: 220 }}
            />
            <TextField
              label="Min Amount"
              size="small"
              type="number"
              value={f.minAmount || ""}
              onChange={(e) => setF((p) => ({ ...p, minAmount: e.target.value }))}
              sx={{ width: 140 }}
            />
            <TextField
              label="Max Amount"
              size="small"
              type="number"
              value={f.maxAmount || ""}
              onChange={(e) => setF((p) => ({ ...p, maxAmount: e.target.value }))}
              sx={{ width: 140 }}
            />
            <Button variant="outlined" onClick={() => refresh()}>
              Apply
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setF({
                  startDate: "",
                  endDate: "",
                  source: "",
                  target: "",
                  admin: "",
                  minAmount: "",
                  maxAmount: "",
                });
                refresh();
              }}
            >
              Clear
            </Button>
          </Box>
        )}
      />
    </Box>
  );
};

export default AdminWalletLogs;