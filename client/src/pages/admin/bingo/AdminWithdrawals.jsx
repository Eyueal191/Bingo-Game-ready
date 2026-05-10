import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  MenuItem,
  Tooltip,
  Paper,
  Chip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useApi } from "../../../contexts/ApiContext";
import toast, { Toaster } from "react-hot-toast";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";

const AdminWithdrawals = ({ onSelectWithdrawal }) => {
  const api = useApi();
  const [pageRows, setPageRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    method: "",
    minAmount: "",
    maxAmount: "",
  });
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectMessage, setRejectMessage] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const gridApiRef = useRef(null);

  const validateDates = useCallback((startDate, endDate) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        toast.error("Invalid date format");
        return false;
      }
      if (start > end) {
        toast.error("Start Date cannot be greater than End Date");
        return false;
      }
    }
    return true;
  }, []);

  const handleProcess = useCallback(
    (withdrawal) => {
      const amt = Number(withdrawal?.amount ?? 0);
      const wallet = Number(withdrawal?.userId?.wallet ?? withdrawal?.userWallet ?? 0);
      if (wallet < amt) {
        toast.error("User wallet is insufficient for this withdrawal");
        return;
      }
      onSelectWithdrawal({
        ...withdrawal,
        onSuccess: () => gridApiRef.current?.refresh?.(),
      });
    },
    [onSelectWithdrawal]
  );

  const fetchRows = useCallback(
    async ({ page, pageSize, quickFilter, extraFilters, sortModel }) => {
      const { startDate, endDate, status, method, minAmount, maxAmount } =
        extraFilters || {};

      if (!validateDates(startDate, endDate)) {
        return { rows: [], rowCount: 0 };
      }

      const params = {
        page,
        pageSize,
        q: quickFilter,
        startDate,
        endDate,
        status,
        method,
        minAmount,
        maxAmount,
      };

      if (Array.isArray(sortModel) && sortModel.length > 0) {
        params.sortField = sortModel[0].field;
        params.sortOrder = sortModel[0].sort;
      }

      try {
        const res = await api.get("/api/v1/withdrawal/requests", {
          params,
        });
        const rowsRaw = Array.isArray(res.data?.rows)
          ? res.data.rows
          : Array.isArray(res.data)
          ? res.data
          : [];
        const rowCount = Number(res.data?.rowCount) || rowsRaw.length;
        const rows = rowsRaw.map((w, idx) => ({
          ...w,
          id: w._id,
          index: page * pageSize + idx + 1,
          userWallet: w?.userId?.wallet ?? 0,
        }));
        setFilters({
          startDate: startDate || "",
          endDate: endDate || "",
          status: status || "",
          method: method || "",
          minAmount: minAmount || "",
          maxAmount: maxAmount || "",
        });
        setPageRows(rows);
        setTotalRows(rowCount);
        return { rows, rowCount };
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Failed to fetch withdrawals"
        );
        return { rows: [], rowCount: 0 };
      }
    },
    [api, validateDates]
  );

  const formatLabel = useCallback((value = "") => {
    return value
      .toString()
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, []);

  const summaryStats = useMemo(() => {
    const statusTotals = {};
    const methodTotals = {};
    let insufficientCount = 0;
    let insufficientAmount = 0;

    pageRows.forEach((row) => {
      const amount = Number(row?.amount) || 0;
      const statusKey = (row?.status || "unknown").toLowerCase();
      const methodKey = (row?.method || "other").toLowerCase();

      if (!statusTotals[statusKey]) {
        statusTotals[statusKey] = { count: 0, amount: 0 };
      }
      statusTotals[statusKey].count += 1;
      statusTotals[statusKey].amount += amount;

      if (!methodTotals[methodKey]) {
        methodTotals[methodKey] = { count: 0, amount: 0 };
      }
      methodTotals[methodKey].count += 1;
      methodTotals[methodKey].amount += amount;

      const wallet = Number(row?.userWallet ?? row?.userId?.wallet ?? 0);
      if (statusKey === "pending" && wallet < amount) {
        insufficientCount += 1;
        insufficientAmount += amount;
      }
    });

    return { statusTotals, methodTotals, insufficientCount, insufficientAmount };
  }, [pageRows]);

  const columns = useMemo(
    () => [
      { field: "index", headerName: "#", width: 70 },
      {
        field: "user",
        headerName: "User",
        flex: 1,
        minWidth: 160,
        renderCell: (p) =>
          p?.row?.userId?.fullName || p?.row?.userId?.telegramId || "N/A",
      },
      {
        field: "phone",
        headerName: "Phone",
        minWidth: 140,
        renderCell: (p) => p?.row?.userId?.phone || "N/A",
      },
      {
        field: "amount",
        headerName: "Amount",
        minWidth: 120,
        renderCell: (p) =>
          `${Number(p?.row?.amount ?? 0).toLocaleString()} Birr`,
      },
      {
        field: "userWallet",
        headerName: "Wallet",
        minWidth: 120,
        renderCell: (p) =>
          `${Number(p?.row?.userWallet ?? 0).toLocaleString()} Birr`,
      },
      {
        field: "balance",
        headerName: "Balance Check",
        minWidth: 140,
        sortable: false,
        filterable: false,
        renderCell: (p) => {
          const amt = Number(p?.row?.amount ?? 0);
          const wallet = Number(p?.row?.userWallet ?? 0);
          const statusValue = (p?.row?.status || "").toLowerCase();

          if (statusValue && statusValue !== "pending") {
            const label = statusValue === "approved" ? "Approved" : statusValue === "rejected" ? "Rejected" : "Processed";
            const color = statusValue === "approved" ? "success" : statusValue === "rejected" ? "warning" : "default";
            return (
              <Chip
                size="small"
                label={label}
                color={color === "default" ? undefined : color}
                variant="outlined"
              />
            );
          }

          const ok = wallet >= amt;
          return ok ? (
            <Chip
              size="small"
              label="Sufficient"
              color="success"
              variant="outlined"
            />
          ) : (
            <Chip
              size="small"
              label="Insufficient"
              color="error"
              variant="outlined"
            />
          );
        },
      },
      {
        field: "method",
        headerName: "Method",
        minWidth: 120,
        renderCell: (p) => String(p?.row?.method || "").replace("_", " "),
      },
      {
        field: "accountNumber",
        headerName: "Account",
        minWidth: 140,
        renderCell: (p) => p?.row?.accountNumber || "N/A",
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 120,
        renderCell: (p) => (
          <span
            style={{
              color:
                p?.row?.status === "pending"
                  ? "#d32f2f"
                  : p?.row?.status === "rejected"
                  ? "#f57c00"
                  : "#2e7d32",
              textTransform: "capitalize",
            }}
          >
            {p?.row?.status || ""}
          </span>
        ),
      },
      {
        field: "action",
        headerName: "Action",
        sortable: false,
        filterable: false,
        minWidth: 300,
        renderCell: (p) => {
          const statusValue = (p?.row?.status || "").toLowerCase();
          const isPending = statusValue === "pending";
          const isApproved = statusValue === "approved";
          const wallet = Number(p?.row?.userWallet ?? 0);
          const amount = Number(p?.row?.amount ?? 0);
          const insufficient = wallet < amount;
          const buttonSx = { textTransform: "none", flex: 1, minWidth: 0 };
          return (
            <Stack spacing={0.5} sx={{ width: "100%" }}>
              <Stack direction="row" spacing={0.5} sx={{ width: "100%" }}>
                <Tooltip title={insufficient ? "User balance is lower than requested amount" : "Approve withdrawal"}>
                  <Box component="span" sx={{ flex: 1, display: "flex" }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<CheckCircleIcon fontSize="small" />}
                      onClick={() => p?.row && handleProcess(p.row)}
                      disabled={!isPending || insufficient}
                      sx={{
                        ...buttonSx,
                        bgcolor: "success.main",
                        "&:hover": { bgcolor: "success.dark" },
                        color: "white",
                      }}
                    >
                      Approve
                    </Button>
                  </Box>
                </Tooltip>
                <Tooltip title={isPending ? "Reject withdrawal" : "Only pending withdrawals can be rejected"}>
                  <Box component="span" sx={{ flex: 1, display: "flex" }}>
                    <Button
                      fullWidth
                      startIcon={<CancelIcon fontSize="small" />}
                      color="warning"
                      onClick={() => setRejectTarget(p?.row)}
                      disabled={!isPending}
                      sx={{ ...buttonSx }}
                    >
                      Reject
                    </Button>
                  </Box>
                </Tooltip>
                <Tooltip title={isApproved ? "Approved withdrawals cannot be deleted" : "Delete withdrawal"}>
                  <Box component="span" sx={{ flex: 1, display: "flex" }}>
                    <Button
                      fullWidth
                      startIcon={<DeleteOutlineIcon fontSize="small" />}
                      color="error"
                      onClick={async () => {
                        if (!p?.row?._id) return;
                        try {
                          await api.delete(
                            `/api/v1/withdrawal/requests/${p.row._id}`
                          );
                          toast.success("Withdrawal deleted");
                          gridApiRef.current?.refresh?.();
                        } catch (error) {
                          toast.error(
                            error?.response?.data?.message || "Delete failed"
                          );
                        }
                      }}
                      disabled={isApproved}
                      sx={{ ...buttonSx, color: "error.main" }}
                    >
                      Delete
                    </Button>
                  </Box>
                </Tooltip>
              </Stack>
             
            </Stack>
          );
        },
      },
    ],
    [handleProcess, api]
  );

  const pageTotal = useMemo(
    () => pageRows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [pageRows]
  );
  const { statusTotals, methodTotals, insufficientCount, insufficientAmount } = summaryStats;

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
        sx={{
          color: "text.primary",
          mb: 2,
          fontWeight: "bold",
          background: "linear-gradient(90deg, #3f51b5, #9c27b0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: { xs: "1.25rem", sm: "1.5rem" },
        }}
      >
        Withdrawal Requests
      </Typography>

      <SmartDataGrid
        columns={columns}
        fetchRows={fetchRows}
        initialPageSize={10}
        pageSizeOptions={[5, 10, 15, 25, 50, 100]}
        dynamicHeight
        initialExtraFilters={filters}
        onReady={(apiHelpers) => {
          gridApiRef.current = apiHelpers;
        }}
        renderFilters={({ filters: ef, setFilters: setEf, refresh }) => (
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
              value={ef.startDate || ""}
              onChange={(e) =>
                setEf((prev) => ({ ...prev, startDate: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { xs: "100%", sm: 170 } }}
            />
            <TextField
              size="small"
              name="endDate"
              label="End Date"
              type="date"
              value={ef.endDate || ""}
              onChange={(e) =>
                setEf((prev) => ({ ...prev, endDate: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { xs: "100%", sm: 170 } }}
            />
            <TextField
              size="small"
              select
              name="status"
              label="Status"
              value={ef.status || ""}
              onChange={(e) =>
                setEf((prev) => ({ ...prev, status: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { xs: "100%", sm: 150 } }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </TextField>
            <TextField
              size="small"
              name="method"
              label="Method"
              value={ef.method || ""}
              onChange={(e) =>
                setEf((prev) => ({ ...prev, method: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { xs: "100%", sm: 160 } }}
              placeholder="telebirr, bank"
            />
            <TextField
              size="small"
              name="minAmount"
              label="Min Amount"
              type="number"
              value={ef.minAmount || ""}
              onChange={(e) =>
                setEf((prev) => ({ ...prev, minAmount: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { xs: "100%", sm: 130 } }}
            />
            <TextField
              size="small"
              name="maxAmount"
              label="Max Amount"
              type="number"
              value={ef.maxAmount || ""}
              onChange={(e) =>
                setEf((prev) => ({ ...prev, maxAmount: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { xs: "100%", sm: 130 } }}
            />
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
                  setEf({
                    startDate: "",
                    endDate: "",
                    status: "",
                    method: "",
                    minAmount: "",
                    maxAmount: "",
                  });
                  setTimeout(() => refresh(), 0);
                }}
                sx={{ minWidth: { xs: 140, sm: 140 } }}
              >
                Clear Filters
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
            <Box>Filtered: {totalRows.toLocaleString()} requests</Box>
            <Box>Page: {pageRows.length} items</Box>
            <Box>Page total: {pageTotal.toLocaleString()} Birr</Box>
            {Object.keys(statusTotals).length > 0 && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {Object.entries(statusTotals).map(([status, data]) => (
                  <Box key={status}>
                    {formatLabel(status)}: {data.count} / {data.amount.toLocaleString()} Birr
                  </Box>
                ))}
              </Box>
            )}
            {Object.keys(methodTotals).length > 0 && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {Object.entries(methodTotals).map(([method, data]) => (
                  <Box key={method}>
                    {formatLabel(method)}: {data.count} / {data.amount.toLocaleString()} Birr
                  </Box>
                ))}
              </Box>
            )}
            {insufficientCount > 0 && (
              <Box sx={{ color: "error.main", fontWeight: 500 }}>
                Pending insufficient: {insufficientCount} ({insufficientAmount.toLocaleString()} Birr)
              </Box>
            )}
          </Box>
        }
        sx={{
          "& .MuiDataGrid-overlayWrapperInner": {
            alignItems: "flex-start",
            mt: 4,
          },
        }}
        slots={{
          noRowsOverlay: () => (
            <Stack alignItems="center" justifyContent="center" sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No withdrawals found. Adjust filters.
              </Typography>
            </Stack>
          ),
        }}
      />

      <Dialog
        open={!!rejectTarget}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason("");
          setRejectMessage("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Withdrawal</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {rejectMessage && (
            <Alert
              severity={rejectMessage.toLowerCase().includes("success") ? "success" : "error"}
              sx={{ mb: 2 }}
            >
              {rejectMessage}
            </Alert>
          )}
          <Typography sx={{ mb: 2 }}>
            Reject withdrawal of {rejectTarget?.amount} Birr for user {rejectTarget?.userId?.telegramId}?
          </Typography>
          <TextField
            label="Reason (optional)"
            multiline
            minRows={2}
            fullWidth
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setRejectTarget(null);
              setRejectReason("");
              setRejectMessage("");
            }}
            sx={{ color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={rejectLoading}
            onClick={async () => {
              if (!rejectTarget?._id) return;
              setRejectLoading(true);
              try {
                const res = await api.post("/api/v1/withdrawal/reject", {
                  withdrawalId: rejectTarget._id,
                  reason: rejectReason,
                });
                setRejectMessage(res.data?.message || "Rejected successfully");
                toast.success("Withdrawal rejected");
                gridApiRef.current?.refresh?.();
                setTimeout(() => {
                  setRejectTarget(null);
                  setRejectReason("");
                  setRejectMessage("");
                }, 1000);
              } catch (error) {
                setRejectMessage(
                  error?.response?.data?.message || "Failed to reject"
                );
              } finally {
                setRejectLoading(false);
              }
            }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminWithdrawals;
