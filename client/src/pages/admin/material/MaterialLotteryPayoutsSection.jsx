import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
  useTheme,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { motion } from "framer-motion";
import { useApi } from "../../../contexts/ApiContext";
import { toast } from "sonner";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";
import debounce from "lodash.debounce";

const MaterialLotteryPayoutsSection = ({ setError }) => {
    const api = useApi();
  const theme = useTheme();
  const refreshRef = useRef(() => {});
  const [search, setSearch] = useState("");
  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        setSearch(value);
        setTimeout(() => refreshRef.current?.(), 0);
      }, 400),
    []
  );
  // cancel debounce on unmount
  React.useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const formatCurrency = (value) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? "N/A" : num.toFixed(2);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = useCallback(
    (status) => {
      switch (status) {
        case "pending":
          return theme.palette.warning.main;
        case "paid":
          return theme.palette.success.main;
        default:
          return "#fff";
      }
    },
    [theme.palette.success.main, theme.palette.warning.main]
  );

  const handleUpdatePayout = useCallback(
    async (payoutId, status) => {
      try {
        await api.put(`/api/v1/material-lottery/payouts/${payoutId}`, {
          status,
        });
        // refresh grid after update
        setTimeout(() => refreshRef.current?.(), 0);
        setSnackbar({
          open: true,
          message: `Payout ${status} successfully`,
          severity: "success",
        });
        toast.success(`Payout ${status} successfully`);
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || `Failed to update payout to ${status}`;
        setSnackbar({ open: true, message: errorMessage, severity: "error" });
        setError(errorMessage);
        toast.error(errorMessage);
      }
    },
    [setError]
  );

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // tableSx removed; using SmartDataGrid styles
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{ p: 2 }}
    >
      <Typography variant="h4" gutterBottom>
        Material Lottery Payouts
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          label="Search by ID, Game ID or Description"
          size="small"
          value={search}
          onChange={(e) => debouncedSearch(e.target.value)}
          sx={{ minWidth: 260 }}
        />
      </Box>

      <SmartDataGrid
        columns={useMemo(
          () => [
            {
              field: "_id",
              headerName: "Payout ID",
              valueGetter: (_, r) => r?._id?.slice(0, 8) || "",
              width: 120,
            },
            {
              field: "user",
              headerName: "User",
              valueGetter: (_, r) => r.user_id?.fullName || "Unknown",
              width: 160,
            },
            {
              field: "game_id",
              headerName: "Game ID",
              valueGetter: (_, r) => r.game_id?.slice(0, 8) || "",
              width: 120,
            },
            { field: "type", headerName: "Type", width: 100 },
            {
              field: "amount",
              headerName: "Amount (ETB)",
              valueGetter: (_, r) =>
                r.type === "monetary" ? formatCurrency(r.amount) : "N/A",
              width: 140,
            },
            {
              field: "description",
              headerName: "Description",
              flex: 1,
              minWidth: 180,
            },
            { field: "rank", headerName: "Rank", width: 100 },
            {
              field: "status",
              headerName: "Status",
              width: 130,
              renderCell: (p) => (
                <span
                  style={{
                    color: getStatusColor(p.row.status),
                    fontWeight: 600,
                  }}
                >
                  {String(p.row.status || "").replace(/_/g, " ")}
                </span>
              ),
            },
            {
              field: "createdAt",
              headerName: "Created At",
              valueGetter: (_, r) =>
                r.createdAt ? formatDate(r.createdAt) : "N/A",
              width: 200,
            },
            {
              field: "actions",
              headerName: "Actions",
              width: 160,
              sortable: false,
              renderCell: (p) =>
                p.row.status === "pending" ? (
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => handleUpdatePayout(p.row._id, "paid")}
                  >
                    Mark as Paid
                  </Button>
                ) : null,
            },
          ],
          [getStatusColor, handleUpdatePayout]
        )}
        fetchRows={useCallback(
          async ({ page, pageSize, sortModel, extraFilters }) => {
            const sortField = sortModel?.[0]?.field || "createdAt";
            const sortOrder = sortModel?.[0]?.sort || "desc";
            const params = new URLSearchParams();
            params.set("page", String(page + 1));
            params.set("limit", String(pageSize));
            if (search) params.set("search", search);
            const {
              status = "all",
              startDate = "",
              endDate = "",
            } = extraFilters || {};
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);
            if (status && status !== "all") params.set("status", status);
            params.set("sortField", sortField);
            params.set("sortOrder", sortOrder);
            const res = await api.get(
              `/api/v1/material-lottery/payouts?${params.toString()}`
            );
            if (res.data?.success) {
              return {
                rows: res.data.payouts || [],
                rowCount: res.data.totalPayouts || 0,
              };
            }
            return { rows: [], rowCount: 0 };
          },
          [search]
        )}
        getRowId={(r) => r._id}
        initialPageSize={10}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        density="compact"
        initialSortModel={[{ field: "createdAt", sort: "desc" }]}
        initialExtraFilters={{ status: "all", startDate: "", endDate: "" }}
        showToolbar={true}
        onReady={({ refresh }) => {
          refreshRef.current = refresh;
        }}
        renderFilters={({ filters: f, setFilters: setF, refresh }) => (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", p: 1 }}>
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
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
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
            <Button variant="outlined" onClick={() => refresh()}>
              Apply
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setF({ status: "all", startDate: "", endDate: "" });
                setSearch("");
                refresh();
              }}
            >
              Clear
            </Button>
          </Box>
        )}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </motion.div>
  );
};

export default MaterialLotteryPayoutsSection;