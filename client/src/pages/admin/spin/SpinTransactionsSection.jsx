import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { motion } from "framer-motion";
import { useCallback } from "react";
import { toast } from "sonner";
import { useApi } from "../../../contexts/ApiContext";
import SmartDataGrid from "../../../components/SmartDataGrid";

const SpinTransactionsSection = () => {
  const theme = useTheme();
  const api = useApi();
  const isXS = useMediaQuery(theme.breakpoints.down("sm"));
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    fromDate: "",
    toDate: "",
  });

  // Fixed filter options for performance and consistency with server
  const typeOptions = useMemo(
    () => [
      "deposit",
      "withdrawal",
      "bet",
      "reward",
      "registration_bonus",
      "referral_bonus",
      "transfer",
      "receive",
    ],
    []
  );
  const statusOptions = useMemo(
    () => ["PENDING", "COMPLETED", "FAILED", "CANCELED"],
    []
  );

  const formatCurrency = (value) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? "N/A" : num.toFixed(2);
  };

  // Status color mapping
  const getStatusColor = useCallback(
    (status) => {
      switch (String(status || "").toUpperCase()) {
        case "PENDING":
          return theme.palette.primary.main;
        case "COMPLETED":
        case "SUCCESS":
          return theme.palette.success.main;
        case "FAILED":
        case "CANCELED":
          return theme.palette.error.main;
        default:
          return theme.palette.text.secondary;
      }
    },
    [
      theme.palette.primary.main,
      theme.palette.success.main,
      theme.palette.error.main,
      theme.palette.text.secondary,
    ]
  );

  const handleClearFilters = (refresh) => {
    setFilters({ type: "all", status: "all", fromDate: "", toDate: "" });
    refresh?.();
    toast.info("Filters cleared");
  };

  // DataGrid columns
  const columns = useMemo(() => {
    const typeLabel = (t) => {
      if (!t) return "";
      const map = {
        registration_bonus: "Registration Bonus",
        referral_bonus: "Referral Bonus",
        deposit: "Deposit",
        withdrawal: "Withdrawal",
        bet: "Bet",
        reward: "Reward",
        transfer: "Transfer",
        receive: "Receive",
      };
      return (
        map[t] || t.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())
      );
    };
    return [
      {
        field: "_id",
        headerName: "ID",
        valueGetter: (_, row) => row?._id?.slice(0, 8) || "",
        width: 120,
        sortable: false,
      },
      {
        field: "user",
        headerName: "User",
        valueGetter: (_, row) => row?.userId?.fullName || "—",
        flex: 1,
        minWidth: 150,
      },
      {
        field: "type",
        headerName: "Type",
        valueGetter: (_, row) => typeLabel(row?.type),
        width: 160,
      },
      {
        field: "amount",
        headerName: "Amount (coins)",
        valueGetter: (_, row) => formatCurrency(row?.amount),
        width: 150,
      },
      {
        field: "status",
        headerName: "Status",
        renderCell: (p) => (
          <span
            style={{
              color: getStatusColor(p?.row?.status),
              fontWeight: 600,
              fontSize: isXS ? "0.75rem" : "0.85rem",
            }}
          >
            {String(p?.row?.status || "").toUpperCase()}
          </span>
        ),
        width: 140,
      },
      {
        field: "reference",
        headerName: "Reference",
        valueGetter: (_, row) => row?.reference || "—",
        flex: 1,
        minWidth: 180,
      },
      {
        field: "createdAt",
        headerName: "Date",
        valueGetter: (_, row) =>
          row?.createdAt ? new Date(row.createdAt).toLocaleString() : "N/A",
        width: 190,
      },
    ];
  }, [isXS, getStatusColor]);

  const fetchRows = async ({
    page,
    pageSize,
    sortModel,
    quickFilter,
    extraFilters,
  }) => {
    const {
      type = "all",
      status = "all",
      fromDate = "",
      toDate = "",
    } = extraFilters || {};
    const sortField = sortModel?.[0]?.field || "createdAt";
    const sortOrder = sortModel?.[0]?.sort || "desc";
    const params = {
      paged: true,
      page,
      pageSize,
      q: quickFilter || "",
      type: type === "all" ? undefined : type,
      status: status === "all" ? undefined : status,
      from: fromDate || undefined,
      to: toDate || undefined,
      sortField,
      sortOrder,
    };
    const res = await api.get("/api/v1/admin/transactions", { params });
    const rows = res.data?.rows || res.data || [];
    const rowCount = res.data?.rowCount ?? rows.length;
    return { rows, rowCount };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{ p: 2 }}
    >
      <Typography variant="h4" gutterBottom>
        Spin-Spin Transaction History
      </Typography>
      <SmartDataGrid
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(r) => r._id}
        initialPageSize={10}
        pageSizeOptions={[5, 10, 25, 50]}
        density="compact"
        initialSortModel={[{ field: "createdAt", sort: "desc" }]}
        initialExtraFilters={filters}
        renderFilters={({ filters: f, setFilters: setF, refresh }) => (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", p: 1 }}>
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                value={f.type || "all"}
                onChange={(e) => setF((p) => ({ ...p, type: e.target.value }))}
              >
                <MenuItem value="all">All</MenuItem>
                {typeOptions.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={f.status || "all"}
                onChange={(e) =>
                  setF((p) => ({ ...p, status: e.target.value }))
                }
              >
                <MenuItem value="all">All</MenuItem>
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="From"
              type="date"
              size="small"
              value={f.fromDate || ""}
              onChange={(e) =>
                setF((p) => ({ ...p, fromDate: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              value={f.toDate || ""}
              onChange={(e) => setF((p) => ({ ...p, toDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <Button
              variant="outlined"
              onClick={() => handleClearFilters(() => refresh())}
            >
              Clear Filters
            </Button>
          </Box>
        )}
      />
    </motion.div>
  );
};

export default SpinTransactionsSection;
