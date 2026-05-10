import React, { useMemo, useState, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { motion } from "framer-motion";
import { useApi } from "../../../contexts/ApiContext";
import { toast } from "sonner";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";
import debounce from "lodash.debounce";
import ConfirmDialog from "../../../components/common/ConfirmDialog";

// Keep props signature to avoid parent changes; these props are no longer needed
const KeshUsersSection = () => {
  const api = useApi();
  const theme = useTheme();
  const isXS = useMediaQuery(theme.breakpoints.down("sm"));
  const refreshRef = useRef(() => {});
  const [walletDialog, setWalletDialog] = useState({
    open: false,
    user: null,
    amount: "",
  });

  const makeDefaultConfirm = () => ({
    open: false,
    title: "",
    content: "",
    loading: false,
    onConfirm: null,
    showReason: false,
    reason: "",
    confirmLabel: "Confirm",
    confirmColor: "error",
  });

  // NEW: confirmation dialog state
  const [confirm, setConfirm] = useState(() => makeDefaultConfirm());
  const resetConfirm = useCallback(() => setConfirm(makeDefaultConfirm()), []);

  // Helper: role-based protection (lock admins like AdminUsers.jsx)
  const isProtectedUser = useCallback((row) => {
    const role = row?.role?.toLowerCase?.() || "";
    return role === "admin";
  }, []);
  const [filters] = useState({ status: "all", startDate: "", endDate: "" });
  const [search, setSearch] = useState("");
  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        setSearch(value);
        // refresh after state update
        setTimeout(() => refreshRef.current?.(), 0);
      }, 400),
    []
  );

  const typeCurrency = (v) => {
    const n = typeof v === "string" ? parseFloat(v) : v;
    return isNaN(n) ? "0.00" : n.toFixed(2);
  };

  // Status color mapping
  const getStatusColor = useCallback(
    (isBanned) =>
      isBanned ? theme.palette.error.main : theme.palette.success.main,
    [theme.palette.error.main, theme.palette.success.main]
  );
  const handleDeleteUser = useCallback(
    async (userId) => {
      try {
        await api.delete(`/api/v1/users/delete/${userId}`);
        toast.success("User deleted successfully");
        refreshRef.current?.();
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || "Failed to delete user";
        toast.error(errorMessage);
      }
    },
    [api]
  );

  const handleBanUnban = useCallback(
    async (row, reason) => {
      try {
        if (row?.isBanned) {
          await api.put(`/api/v1/users/${row._id}/unban`);
          toast.success("User unbanned");
        } else {
          await api.put(`/api/v1/users/${row._id}/ban`, {
            reason: reason || "Violation of terms",
          });
          toast.success("User banned");
        }
        refreshRef.current?.();
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || "Failed to update user status";
        toast.error(errorMessage);
      }
    },
    [api]
  );

  // NEW: ask for confirmation before destructive actions
  const confirmAction = useCallback((opts) => {
    setConfirm({
      open: true,
      title: opts.title || "Confirm",
      content: opts.content || "Are you sure?",
      loading: false,
      onConfirm: opts.onConfirm || null,
      showReason: !!opts.showReason,
      reason: opts.defaultReason || "",
      confirmLabel: opts.confirmLabel || "Confirm",
      confirmColor: opts.confirmColor || "error",
    });
  }, []);

  const onConfirmProceed = useCallback(async () => {
    if (!confirm.onConfirm) return;
    try {
      setConfirm((c) => ({ ...c, loading: true }));
      await confirm.onConfirm(confirm.reason);
      resetConfirm();
    } catch {
      // keep dialog open but stop loading so user can retry/close
      setConfirm((c) => ({ ...c, loading: false }));
    }
  }, [confirm, resetConfirm]);

  const openWallet = (user) =>
    setWalletDialog({ open: true, user, amount: "" });
  const closeWallet = () =>
    setWalletDialog({ open: false, user: null, amount: "" });
  const submitWallet = async () => {
    const amount = Number(walletDialog.amount);
    if (!amount || isNaN(amount)) return toast.error("Enter a valid amount");
    try {
      await api.put(`/api/v1/users/${walletDialog.user._id}/wallet`, {
        amount,
      });
      toast.success("Wallet updated successfully");
      closeWallet();
      refreshRef.current?.();
    } catch {
      toast.error("Failed to update wallet");
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "_id",
        headerName: "ID",
        valueGetter: (_, row) => row?._id?.slice(0, 8) || "",
        width: 110,
        sortable: false,
      },
      {
        field: "fullName",
        headerName: "Name",
        valueGetter: (v, r) => r?.fullName || "—",
        flex: 1,
        minWidth: 160,
      },
      {
        field: "phone",
        headerName: "Phone",
        valueGetter: (v, r) => r?.phone || "—",
        width: 150,
      },
      {
        field: "role",
        headerName: "Role",
        valueGetter: (v, r) => r?.role || "user",
        width: 120,
      },
      {
        field: "wallet",
        headerName: "Wallet (ETB)",
        valueGetter: (v, r) => typeCurrency(r?.wallet),
        width: 140,
      },
      {
        field: "bonus",
        headerName: "Bonus (ETB)",
        valueGetter: (v, r) => typeCurrency(r?.bonus),
        width: 140,
      },
      {
        field: "referralCode",
        headerName: "Referral",
        valueGetter: (v, r) => r?.referralCode || "—",
        width: 130,
      },
      {
        field: "invitedBy",
        headerName: "Invited By",
        valueGetter: (v, r) => r?.invitedBy || "—",
        width: 130,
      },
      {
        field: "isBanned",
        headerName: "Status",
        renderCell: (p) => (
          <span
            style={{
              color: getStatusColor(!!p?.row?.isBanned),
              fontWeight: 600,
              fontSize: isXS ? "0.75rem" : "0.85rem",
            }}
          >
            {p?.row?.isBanned ? "BANNED" : "ACTIVE"}
          </span>
        ),
        width: 130,
        sortable: false,
      },
      {
        field: "createdAt",
        headerName: "Created",
        valueGetter: (v, r) =>
          r?.createdAt ? new Date(r.createdAt).toLocaleString() : "N/A",
        width: 190,
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 260,
        sortable: false,
        renderCell: (p) => {
          const row = p.row;
          const protectedUser = isProtectedUser(row);
          const isBanned = !!row.isBanned;
          return (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => openWallet(row)}
              >
                Wallet
              </Button>
              <Button
                size="small"
                variant="contained"
                color={isBanned ? "success" : "warning"}
                disabled={protectedUser}
                onClick={() =>
                  confirmAction({
                    title: isBanned ? "Unban User" : "Ban User",
                    content: isBanned
                      ? "Are you sure you want to unban this account?"
                      : "Provide a reason for banning this account (optional)",
                    showReason: !isBanned,
                    defaultReason: "Violation of terms",
                    confirmLabel: isBanned ? "Unban" : "Ban",
                    confirmColor: isBanned ? "success" : "error",
                    onConfirm: (reason) => handleBanUnban(row, reason),
                  })
                }
              >
                {isBanned ? "Unban" : "Ban"}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="error"
                disabled={protectedUser}
                onClick={() =>
                  confirmAction({
                    title: "Delete User",
                    content:
                      "This action is permanent. The user and related data may be removed. Continue?",
                    confirmLabel: "Delete",
                    confirmColor: "error",
                    onConfirm: () => handleDeleteUser(row._id),
                  })
                }
              >
                Delete
              </Button>
            </Box>
          );
        },
      },
    ],
    [
      isXS,
      getStatusColor,
      handleDeleteUser,
      handleBanUnban,
      isProtectedUser,
      confirmAction,
    ]
  );

  const fetchRows = useCallback(
    async ({ page, pageSize, sortModel, extraFilters }) => {
      const {
        status = "all",
        startDate = "",
        endDate = "",
      } = extraFilters || {};
      const sortField = sortModel?.[0]?.field || "createdAt";
      const sortOrder = sortModel?.[0]?.sort || "desc";
      const params = new URLSearchParams();
      params.set("page", String(page + 1)); // backend expects 1-based
      params.set("limit", String(pageSize));
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (status && status !== "all") params.set("status", status);
      params.set("sortField", sortField);
      params.set("sortOrder", sortOrder);
      const res = await api.get(`/api/v1/users/all?${params.toString()}`);
      if (res.data?.success) {
        const rows = res.data.users || [];
        const rowCount = res.data.totalUsers || rows.length;
        return { rows, rowCount };
      }
      return { rows: [], rowCount: 0 };
    },
    [search, api]
  );

  // Table styles with 3D effect on rows
  // tableSx removed (not used with SmartDataGrid)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{ p: 2 }}
    >
      <Typography variant="h4" gutterBottom>
        Kesh-Kesh User Management
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          alignItems: "center",
          mb: 1,
        }}
      >
        <TextField
          label="Search by Name, Phone, Referral, Invited By, Telegram ID"
          size="small"
          onChange={(e) => debouncedSearch(e.target.value)}
          sx={{ minWidth: 260 }}
        />
      </Box>
      <SmartDataGrid
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(r) => r._id}
        initialPageSize={10}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        density="compact"
        initialSortModel={[{ field: "createdAt", sort: "desc" }]}
        initialExtraFilters={filters}
        showToolbar={false}
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
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
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
                refresh();
              }}
            >
              Clear
            </Button>
          </Box>
        )}
      />

      {/* Wallet Dialog */}
      <Dialog
        open={walletDialog.open}
        onClose={closeWallet}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Update Wallet for {walletDialog.user?.fullName || "User"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Amount to Add (Birr)"
            type="number"
            value={walletDialog.amount}
            onChange={(e) =>
              setWalletDialog((p) => ({ ...p, amount: e.target.value }))
            }
            fullWidth
            margin="normal"
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeWallet}>Cancel</Button>
          <Button onClick={submitWallet} variant="contained" color="success">
            Add Amount
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onClose={resetConfirm}
        onConfirm={onConfirmProceed}
        title={confirm.title}
        description={confirm.content}
        confirmLabel={confirm.confirmLabel}
        confirmColor={confirm.confirmColor}
        loading={confirm.loading}
        showReason={confirm.showReason}
        reasonValue={confirm.reason}
        onReasonChange={(val) =>
          setConfirm((c) => ({ ...c, reason: val }))
        }
      />
    </motion.div>
  );
};

export default KeshUsersSection;
