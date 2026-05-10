import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  CircularProgress,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useApi } from "../../../contexts/ApiContext";
import toast, { Toaster } from "react-hot-toast";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";
import ConfirmDialog from "../../../components/common/ConfirmDialog";

const AdminUsers = () => {
  const api = useApi();
  const [, setTotalUsers] = useState(0);
  const [openWalletDialog, setOpenWalletDialog] = useState(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banMode, setBanMode] = useState("ban"); // 'ban' | 'unban'
  const [banTarget, setBanTarget] = useState(null);
  const [banReason, setBanReason] = useState("");
  const gridRefreshRef = useRef(null);
  const [gridRows, setGridRows] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    user: null,
    loading: false,
  });

  // User summary
  const [summaryUser, setSummaryUser] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const summarySectionRef = useRef(null);
  // Robust numeric parser: handles numbers, numeric strings, commas, currency labels
  const toNumber = useCallback((v) => {
    if (v == null) return 0;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const str = String(v)
      .replace(/[^0-9.,-]/g, "") // keep digits, separators, minus
      .replace(/,(?=\d{3}(\D|$))/g, "") // drop thousands commas
      .replace(/\s+/g, "");
    // Prefer dot as decimal; if multiple separators, last dot/comma is decimal
    const normalized = str.replace(/,(?=\d{1,2}$)/, ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }, []);
  const totals = useMemo(() => {
    const count = gridRows.length;
    const wallet = gridRows.reduce((s, r) => s + toNumber(r.wallet), 0);
    const bonus = gridRows.reduce((s, r) => s + toNumber(r.bonus), 0);
    return { count, wallet, bonus };
  }, [gridRows, toNumber]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const fetchUsers = useCallback(
    async ({ page, pageSize, sortModel, filterModel, quickFilter, extraFilters }) => {
      try {
        const queryParams = new URLSearchParams();
        const startDate = extraFilters?.startDate || "";
        const endDate = extraFilters?.endDate || "";
        const q = (extraFilters?.search ?? quickFilter ?? "").trim();
        if (startDate) queryParams.append("startDate", startDate);
        if (endDate) queryParams.append("endDate", endDate);
        if (q) queryParams.append("search", q);

        // Column filter model (server-side)
        if (filterModel?.items?.length) {
          queryParams.append(
            "filters",
            JSON.stringify({
              items: filterModel.items,
              logicOperator: filterModel.logicOperator,
            })
          );
        }
        // sorting
        if (Array.isArray(sortModel) && sortModel.length > 0) {
          const { field, sort } = sortModel[0];
          if (field && sort) {
            queryParams.append("sortField", field);
            queryParams.append("sortOrder", sort);
          }
        }
        queryParams.append("page", page + 1);
        queryParams.append("limit", pageSize);

        const res = await api.get(
          `/api/v1/users/all?${queryParams.toString()}`
        );
        if (!res.data.success) throw new Error("Failed to fetch users");
        const rows = (res.data.users || []).map((u) => ({
          ...u,
          id: u._id,
          wallet: toNumber(u.wallet),
          bonus: toNumber(u.bonus),
        }));
        setGridRows(rows);
        const rowCount = res.data.totalUsers || rows.length;
        setTotalUsers(rowCount);
        return { rows, rowCount };
      } catch (error) {
        toast.error("Failed to fetch users");
        console.error("Fetch users error:", error);
        return { rows: [], rowCount: 0 };
      }
    },
    [toNumber, api]
  );

  // Filters are managed by SmartDataGrid via renderFilters

  const handleWalletClick = (user) => {
    setOpenWalletDialog(user);
    setWalletAmount("");
  };

  const handleAddAmount = async () => {
    if (!walletAmount || isNaN(walletAmount)) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!openWalletDialog.reason || openWalletDialog.reason.trim().length < 3)
      return toast.error("Please provide a short reason (min 3 chars)");

    try {

      await api.put(`/api/v1/users/${openWalletDialog._id}/wallet`, {
        amount: Number(walletAmount),
        reason: openWalletDialog.reason.trim(),
        source: "manual",
      });
      toast.success("Wallet updated successfully");
      setOpenWalletDialog(null);
      setWalletAmount("");
      // Trigger grid refresh
      gridRefreshRef.current?.();
    } catch (error) {
      toast.error("Failed to update wallet");
      console.error("Update wallet error:", error);
    }
  };

  const openDeleteDialog = (user) => {
    setDeleteDialog({ open: true, user, loading: false });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, user: null, loading: false });
  };

  const confirmDeleteUser = async () => {
    if (!deleteDialog.user?._id) return;
    try {
      setDeleteDialog((d) => ({ ...d, loading: true }));
      await api.delete(`/api/v1/users/delete/${deleteDialog.user._id}`);
      toast.success("User deleted");
      gridRefreshRef.current?.();
    } catch (e) {
      toast.error("Failed to delete user");
      console.error(e);
    } finally {
      closeDeleteDialog();
    }
  };

  // pagination handled by SmartDataGrid

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setRoleModalOpen(false);
    setSelectedUser(null);
    setSelectedRole("");
  };

  const handleRoleSubmit = async () => {
    try {
      await api.put(`/api/v1/users/${selectedUser._id}/role`, {
        role: selectedRole,
      });
      toast.success(`User role updated to ${selectedRole}`);
      // Refresh grid
      gridRefreshRef.current?.();
      closeRoleModal();
    } catch (error) {
      toast.error("Failed to update user role");
      console.error("Update user role error:", error);
    }
  };

  const openUserSummary = useCallback(
    async (user) => {
      if (!user?._id) return;
      toast.loading("Fetching user summary…", { id: "user-summary" });
      setSummaryUser(user);
      setSummaryLoading(true);
      setSummaryData(null);

      // Ensure the section is visible immediately, even before data arrives
      requestAnimationFrame(() => {
        summarySectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });

      try {
        const res = await api.get(`/api/v1/users/${user._id}/summary`);
        if (!res.data?.success) throw new Error("Failed to fetch summary");
        setSummaryData(res.data);
        toast.success("User summary loaded", { id: "user-summary" });
      } catch (e) {
        console.error(e);
        toast.error("Failed to fetch user summary", { id: "user-summary" });
      } finally {
        setSummaryLoading(false);
      }
    },
    [api]
  );

  const summaryTimelineRows = useMemo(() => {
    if (!summaryData) return [];
    const user = summaryData.user;
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
        user: user?.fullName || "",
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
        user: user?.fullName || "",
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
        user: user?.fullName || "",
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
        user: user?.fullName || "",
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
        user: user?.fullName || "",
      });
    });

    // Games (Bingo reservations)
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
        note:
          stake != null || win != null
            ? `Stake: ${Number(stake || 0).toLocaleString()} / Win: ${Number(
                win || 0
              ).toLocaleString()} / Cards: ${(g.cardIds || []).length}`
            : `Cards: ${(g.cardIds || []).length}`,
        user: user?.fullName || "",
      });
    });

    // newest first
    return rows
      .map((r) => ({ ...r, _ts: r.date ? new Date(r.date).getTime() : 0 }))
      .sort((a, b) => (b._ts || 0) - (a._ts || 0));
  }, [summaryData]);

  const fetchSummaryRows = useCallback(
    async ({ page, pageSize, sortModel, quickFilter, extraFilters }) => {
      const f = extraFilters || {};
      const q = (quickFilter || "").trim().toLowerCase();

      const inRange = (d, start, end) => {
        const t = d ? new Date(d).getTime() : 0;
        if (!t) return false;
        const s = start ? new Date(start).getTime() : null;
        const e = end ? new Date(end).getTime() : null;
        const e2 = e != null ? e + 24 * 60 * 60 * 1000 - 1 : null;
        if (s != null && t < s) return false;
        if (e2 != null && t > e2) return false;
        return true;
      };

      let filtered = summaryTimelineRows;
      if (f.category) filtered = filtered.filter((r) => r.category === f.category);
      if (f.method) filtered = filtered.filter((r) => r.method === f.method);
      if (f.startDate || f.endDate) {
        filtered = filtered.filter((r) => inRange(r.date, f.startDate, f.endDate));
      }

      if (q) {
        filtered = filtered.filter((r) => {
          const hay = [
            r.category,
            r.method,
            r.status,
            r.reference,
            r.note,
            String(r.amount ?? ""),
          ]
            .join(" ")
            .toLowerCase();
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
        p: { xs: 1, sm: 2, md: 3 },
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: 3,
        minHeight: "calc(100vh - 64px)",
        overflowX: "auto",
      }}
    >
      <Toaster />
      <Typography
        variant={isMobile ? "h6" : "h5"}
        sx={{
          color: "text.primary",
          mb: 2,
          fontWeight: "bold",
          fontSize: { xs: "1rem", sm: "1.5rem" },
          background: "linear-gradient(90deg, #3f51b5, #9c27b0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        User Management
      </Typography>
      <Box sx={{ mb: 2 }}>
        <SmartDataGrid
          columns={[
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
              field: "fullName",
              headerName: "Name",
              flex: 1,
              minWidth: 120,
              renderCell: (params) => params?.row?.fullName || "Unknown",
            },
            {
              field: "phone",
              headerName: "Phone",
              flex: 1,
              minWidth: 120,
              renderCell: (params) => params?.row?.phone || "N/A",
            },
            {
              field: "referralCode",
              headerName: "Referral",
              flex: 1,
              minWidth: 110,
              renderCell: (params) => params?.row?.referralCode || "N/A",
            },
            {
              field: "invitedBy",
              headerName: "Invited By",
              flex: 1,
              minWidth: 120,
              renderCell: (params) => params?.row?.invitedBy || "None",
            },
            {
              field: "role",
              headerName: "Role",
              minWidth: 100,
              renderCell: (params) => {
                const role = params?.row?.role;
                return (
                  <span
                    style={{ color: role === "admin" ? "#2e7d32" : "inherit" }}
                  >
                    {role || "user"}
                  </span>
                );
              },
            },
            {
              field: "isBanned",
              headerName: "Status",
              minWidth: 110,
              renderCell: (p) => (
                <span
                  style={{ color: p?.row?.isBanned ? "#d32f2f" : "#2e7d32" }}
                >
                  {p?.row?.isBanned ? "Banned" : "Active"}
                </span>
              ),
            },
            {
              field: "wallet",
              headerName: "Wallet",
              minWidth: 110,
              renderCell: (params) => {
                const value = toNumber(params?.row?.wallet);
                return `${value.toLocaleString()} Birr`;
              },
            },
            {
              field: "bonus",
              headerName: "Bonus",
              minWidth: 110,
              renderCell: (params) => {
                const value = toNumber(params?.row?.bonus);
                return `${value.toLocaleString()} Birr`;
              },
            },
            {
              field: "walletAction",
              headerName: "Action",
              sortable: false,
              minWidth: 110,
              renderCell: (params) => (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleWalletClick(params.row)}
                  sx={{
                    bgcolor: "success.main",
                    "&:hover": { bgcolor: "success.dark" },
                    fontSize: { xs: "0.625rem", sm: "0.75rem" },
                    py: { xs: 0.25, sm: 0.5 },
                    px: { xs: 0.5, sm: 1 },
                    minWidth: 60,
                  }}
                >
                  Wallet
                </Button>
              ),
            },
            {
              field: "summaryAction",
              headerName: "Summary",
              sortable: false,
              minWidth: 130,
              renderCell: (params) => (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => openUserSummary(params.row)}
                  sx={{
                    fontSize: { xs: "0.625rem", sm: "0.75rem" },
                    py: { xs: 0.25, sm: 0.5 },
                    px: { xs: 0.5, sm: 1 },
                    minWidth: 80,
                  }}
                >
                  Summary
                </Button>
              ),
            },
            {
              field: "roleAction",
              headerName: "Role Action",
              sortable: false,
              minWidth: 140,
              renderCell: (params) => (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => openRoleModal(params.row)}
                  sx={{
                    fontSize: { xs: "0.625rem", sm: "0.75rem" },
                    py: { xs: 0.25, sm: 0.5 },
                    px: { xs: 0.5, sm: 1 },
                    minWidth: 80,
                  }}
                >
                  Change Role
                </Button>
              ),
            },
            {
              field: "banAction",
              headerName: "Ban/Unban",
              sortable: false,
              minWidth: 130,
              renderCell: (params) => {
                const banned = !!params?.row?.isBanned;
                return (
                  <Button
                    variant={banned ? "outlined" : "contained"}
                    color={banned ? "warning" : "error"}
                    size="small"
                    onClick={() => {
                      setBanMode(banned ? "unban" : "ban");
                      setBanTarget(params.row);
                      setBanReason("");
                      setBanDialogOpen(true);
                    }}
                    sx={{
                      fontSize: { xs: "0.625rem", sm: "0.75rem" },
                      py: { xs: 0.25, sm: 0.5 },
                      px: { xs: 0.5, sm: 1 },
                      minWidth: 90,
                    }}
                  >
                    {banned ? "Unban" : "Ban"}
                  </Button>
                );
              },
            },
            {
              field: "deleteAction",
              headerName: "Delete",
              sortable: false,
              minWidth: 120,
              renderCell: (params) => (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => openDeleteDialog(params.row)}
                  sx={{
                    fontSize: { xs: "0.625rem", sm: "0.75rem" },
                    py: { xs: 0.25, sm: 0.5 },
                    px: { xs: 0.5, sm: 1 },
                    minWidth: 80,
                  }}
                >
                  Delete
                </Button>
              ),
            },
          ]}
          fetchRows={fetchUsers}
          getRowId={(row) => row._id || row.id}
          initialPageSize={5}
          pageSizeOptions={[5, 10, 15, 25, 50, 100, 500, 1000, 1500, 2000]}
          density={isMobile ? "compact" : "standard"}
          initialState={{
            columns: {
              columnVisibilityModel: {
                referralCode: !isMobile,
                invitedBy: !isMobile,
                bonus: !isMobile,
              },
            },
          }}
          onReady={({ refresh }) => {
            gridRefreshRef.current = refresh;
          }}
          dynamicHeight
          maxAutoHeight={520}
          sx={{
            minWidth: 600,
            overflowX: "auto",
          }}
          renderFilters={({
            filters: gridFilters,
            setFilters: setGridFilters,
            refresh,
          }) => (
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <TextField
                label="Search by Name, Phone, Referral, or Invited By"
                value={gridFilters?.search || ""}
                onChange={(e) =>
                  setGridFilters((f) => ({ ...f, search: e.target.value }))
                }
                sx={{
                  flexGrow: 1,
                  bgcolor: "background.default",
                  "& .MuiInputBase-root": { fontSize: "1rem", borderRadius: 1 },
                }}
              />
              <TextField
                name="startDate"
                label="Start Date"
                type="date"
                value={gridFilters?.startDate || ""}
                onChange={(e) =>
                  setGridFilters((f) => ({ ...f, startDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
                sx={{
                  width: 150,
                  bgcolor: "background.default",
                  "& .MuiInputBase-root": { fontSize: "1rem", borderRadius: 1 },
                  "& input[type='date']::-webkit-calendar-picker-indicator": {
                    filter:
                      "invert(40%) sepia(100%) saturate(2000%) hue-rotate(200deg)",
                    transform: "scale(1.5)",
                    cursor: "pointer",
                  },
                }}
              />
              <TextField
                name="endDate"
                label="End Date"
                type="date"
                value={gridFilters?.endDate || ""}
                onChange={(e) =>
                  setGridFilters((f) => ({ ...f, endDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
                sx={{
                  width: 150,
                  bgcolor: "background.default",
                  "& .MuiInputBase-root": { fontSize: "1rem", borderRadius: 1 },
                  "& input[type='date']::-webkit-calendar-picker-indicator": {
                    filter:
                      "invert(40%) sepia(100%) saturate(2000%) hue-rotate(200deg)",
                    transform: "scale(1.5)",
                    cursor: "pointer",
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={() => refresh()}
                size="medium"
                sx={{ fontSize: "0.875rem", px: 2, minWidth: 100 }}
              >
                Apply
              </Button>
              <Button
                variant="outlined"
                onClick={() =>
                  setGridFilters({ startDate: "", endDate: "", search: "" })
                }
                size="medium"
                sx={{ fontSize: "0.875rem", px: 2, minWidth: 100 }}
              >
                Clear
              </Button>
            </Box>
          )}
          footerSummary={
            <Box
              sx={{
                display: "grid",
                gridAutoFlow: "column",
                gap: 2,
                alignItems: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: 13,
                color: "text.secondary",
              }}
            >
              <Box>Users: {totals.count.toLocaleString()}</Box>
              <Box>Wallet: {(totals.wallet || 0).toLocaleString()} Birr</Box>
              <Box>Bonus: {(totals.bonus || 0).toLocaleString()} Birr</Box>
            </Box>
          }
        />
      </Box>

      {/* User Summary Section */}
      {(summaryUser || summaryLoading) && (
        <Box
          ref={summarySectionRef}
          sx={{
            mt: 2,
            p: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "background.default",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
              mb: 1,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              User Summary: {summaryUser?.fullName || ""}
            </Typography>
            <Button
              variant="text"
              onClick={() => {
                setSummaryUser(null);
                setSummaryData(null);
              }}
            >
              Close
            </Button>
          </Box>

          {summaryLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Loading summary…</Typography>
            </Box>
          ) : summaryData ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexWrap: "wrap",
                  color: "text.secondary",
                  fontSize: 13,
                }}
              >
                <Box>Wallet: {Number(summaryData.user?.wallet || 0).toLocaleString()} Birr</Box>
                <Box>Bonus: {Number(summaryData.user?.bonus || 0).toLocaleString()} Birr</Box>
                <Box>Deposits: {Number(summaryData.stats?.totalDeposit || 0).toLocaleString()} Birr</Box>
                <Box>Withdrawals: {Number(summaryData.stats?.totalWithdraw || 0).toLocaleString()} Birr</Box>
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
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={closeDeleteDialog}
        onConfirm={confirmDeleteUser}
        title={`Delete ${deleteDialog.user?.fullName || "user"}?`}
        description="This action is permanent and related data may be removed."
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleteDialog.loading}
      />

      {/* Wallet Dialog */}
      {openWalletDialog && (
        <Dialog
          open={!!openWalletDialog}
          onClose={() => setOpenWalletDialog(null)}
          maxWidth="xs"
          fullWidth
          sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
        >
          <DialogTitle
            sx={{
              bgcolor: "primary.main",
              color: "white",
              fontSize: { xs: "1rem", sm: "1.25rem" },
              fontWeight: "bold",
            }}
          >
            Update Wallet for {openWalletDialog?.fullName || "User"}
          </DialogTitle>
          <DialogContent
            sx={{ p: { xs: 1, sm: 2 }, bgcolor: "background.default" }}
          >
            <TextField
              label="Amount to Add (Birr)"
              type="number"
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
              fullWidth
              margin="normal"
              inputProps={{ min: 0 }}
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  borderRadius: 1,
                },
                "& .MuiInputLabel-root": { color: "text.secondary" },
                "& .MuiInputBase-input": { color: "text.primary" },
              }}
            />

            <TextField
            label="Reason (required)"
            value={openWalletDialog.reason}
            onChange={(e) =>
              setOpenWalletDialog((p) => ({ ...p, reason: e.target.value }))
            }
            fullWidth
            margin="normal"
            multiline
            minRows={2}
            placeholder="e.g., Compensation for failed game, manual correction, etc."
          />
          </DialogContent>
          <DialogActions
            sx={{
              p: { xs: 1, sm: 2 },
              bgcolor: "background.paper",
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Button
              onClick={() => setOpenWalletDialog(null)}
              sx={{
                color: "error.main",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAmount}
              variant="contained"
              sx={{
                bgcolor: "success.main",
                "&:hover": { bgcolor: "success.dark" },
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                minWidth: 100,
              }}
            >
              Add Amount
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Role Change Dialog */}
      <Dialog
        open={roleModalOpen}
        onClose={closeRoleModal}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Change Role for {selectedUser?.fullName}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={selectedRole}
              label="Role"
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="agent">Agent</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="game_manager">Game Manager</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRoleModal}>Cancel</Button>
          <Button variant="contained" onClick={handleRoleSubmit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ban/Unban Confirm Dialog */}
      <Dialog
        open={banDialogOpen}
        onClose={() => setBanDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {banMode === "ban"
            ? `Ban ${banTarget?.fullName || "user"}`
            : `Unban ${banTarget?.fullName || "user"}`}
        </DialogTitle>
        <DialogContent>
          {banMode === "ban" && (
            <TextField
              label="Reason (optional)"
              fullWidth
              margin="normal"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBanDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={banMode === "ban" ? "error" : "warning"}
            onClick={async () => {
              if (!banTarget) return;
              try {
                const url = `/api/v1/users/${banTarget._id}/${banMode}`;
                await api.put(
                  url,
                  banMode === "ban"
                    ? { reason: banReason || "Admin action" }
                    : {}
                );
                toast.success(
                  banMode === "ban" ? "User banned" : "User unbanned"
                );
                setBanDialogOpen(false);
                setBanTarget(null);
                setBanReason("");
                gridRefreshRef.current?.();
              } catch (e) {
                toast.error("Failed to update status");
                console.error(e);
              }
            }}
          >
            {banMode === "ban" ? "Ban" : "Unban"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsers;