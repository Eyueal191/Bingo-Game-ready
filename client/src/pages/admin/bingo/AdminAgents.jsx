import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddIcon from "@mui/icons-material/Add";
import PaymentIcon from "@mui/icons-material/Payment";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import HistoryIcon from "@mui/icons-material/History";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useApi } from "../../../contexts/ApiContext";
import AgentRegistrationModal from "../../../components/admin/AgentRegistrationModal";
import AgentPaymentModal from "../../../components/admin/AgentPaymentModal";
import ReferredUsersModal from "./ReferredUsersModal";
import PaymentHistoryModal from "./PaymentHistoryModal";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";

const AGENT_REGISTER_API = `/api/v1/auth/admin/register-agent`;
const AGENT_STATS_API = `/api/v1/users/admin/agents-with-stats`;
const AGENT_PAYMENT_API = `/api/v1/agent-payments`;

const AdminAgents = () => {
  const api = useApi();
  const [allAgents, setAllAgents] = useState([]);
  const [pageRows, setPageRows] = useState([]);
  const [fetchingAgents, setFetchingAgents] = useState(false);
  const [registeringAgent, setRegisteringAgent] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [selectedAgentPayments, setSelectedAgentPayments] = useState([]);
  const refreshRef = useRef(null);
  const [openWalletDialog, setOpenWalletDialog] = useState(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletUpdating, setWalletUpdating] = useState(false);
  const theme = useTheme();
  // Compact layout for narrower screens to keep actions visible
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));

  // Fetch agents and their stats
  const fetchAgents = useCallback(async () => {
    setFetchingAgents(true);
    setError("");
    try {
      const response = await api.get(AGENT_STATS_API);
      setAllAgents(response.data.agents || []);
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Error fetching agents";
      setError(message);
    } finally {
      setFetchingAgents(false);
    }
  }, [api]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Handle agent registration from modal
  const handleRegister = async (form) => {
    setRegisteringAgent(true);
    setError("");
    setSuccess("");
    try {
      await api.post(AGENT_REGISTER_API, form);
      setSuccess("Agent registered successfully");
      fetchAgents();
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Error registering agent";
      setError(message);
      throw new Error(message);
    } finally {
      setRegisteringAgent(false);
    }
  };

  const handlePayment = async (form) => {
    setProcessingPayment(true);
    setError("");
    setSuccess("");
    try {
      await api.post(AGENT_PAYMENT_API, {
        ...form,
        agentId: selectedAgent._id,
      });
      setSuccess("Payment made successfully");
      fetchAgents(); // Refresh agent data
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Error making payment";
      setError(message);
      throw new Error(message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const openPaymentModal = useCallback((agent) => {
    setSelectedAgent(agent);
    setPaymentModalOpen(true);
  }, []);

  const openUsersModal = useCallback((agent) => {
    setSelectedAgent(agent);
    setUsersModalOpen(true);
  }, []);

  const openPaymentsModal = useCallback(
    async (agent) => {
      setSelectedAgent(agent);
      setError("");
      setFetchingAgents(true);
      try {
        const response = await api.get(`${AGENT_PAYMENT_API}/${agent._id}`);
        setSelectedAgentPayments(response.data.payments || []);
        setPaymentsModalOpen(true);
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || "Error fetching payment history";
        setError(message);
      } finally {
        setFetchingAgents(false);
      }
    },
    [api]
  );

  const handleWalletClick = useCallback((agent) => {
    setOpenWalletDialog(agent);
    setWalletAmount("");
  }, []);

  const handleAddAmount = async () => {
    if (!walletAmount || isNaN(walletAmount)) {
      setError("Please enter a valid amount");
      return;
    }
    setWalletUpdating(true);
    setError("");
    setSuccess("");
    try {
      await api.put(`/api/v1/users/${openWalletDialog._id}/wallet`, {
        amount: Number(walletAmount),
      });
      setSuccess("Wallet updated successfully");
      setOpenWalletDialog(null);
      setWalletAmount("");
      refreshRef.current?.();
      fetchAgents();
    } catch (e) {
      const message =
        e.response?.data?.message || e.message || "Failed to update wallet";
      setError(message);
    } finally {
      setWalletUpdating(false);
    }
  };

  // DataGrid: client-side paging/filtering over allAgents
  const fetchRows = useCallback(
    async ({ page, pageSize, sortModel, quickFilter }) => {
      // Ensure data loaded
      if (!allAgents || allAgents.length === 0) {
        // If currently loading via fetchAgents, wait for effect; otherwise trigger load
        try {
          await fetchAgents();
        } catch {
          // ignore
        }
      }
      let data = Array.isArray(allAgents) ? allAgents.slice() : [];
      const q = (quickFilter || "").trim().toLowerCase();
      if (q) {
        data = data.filter((a) => {
          const name = (a.fullName || a.telegramId || "").toLowerCase();
          const phone = String(a.phone || "").toLowerCase();
          return name.includes(q) || phone.includes(q);
        });
      }
      // Simple sorting on a single column if provided
      if (Array.isArray(sortModel) && sortModel.length > 0) {
        const { field, sort } = sortModel[0];
        if (field && sort) {
          data.sort((a, b) => {
            const av = a[field];
            const bv = b[field];
            if (av == null && bv == null) return 0;
            if (av == null) return sort === "asc" ? -1 : 1;
            if (bv == null) return sort === "asc" ? 1 : -1;
            if (typeof av === "number" && typeof bv === "number") {
              return sort === "asc" ? av - bv : bv - av;
            }
            return sort === "asc"
              ? String(av).localeCompare(String(bv))
              : String(bv).localeCompare(String(av));
          });
        }
      }
      const rowCount = data.length;
      const start = page * pageSize;
      const end = start + pageSize;
      const rows = data.slice(start, end).map((a) => ({ ...a, id: a._id }));
      setPageRows(rows);
      return { rows, rowCount };
    },
    [allAgents, fetchAgents]
  );

  const toNumber = useCallback((v) => {
    if (v == null) return 0;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const n = Number(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }, []);

  const totals = useMemo(() => {
    const revenue = pageRows.reduce((s, r) => s + toNumber(r.totalRevenue), 0);
    const balance = pageRows.reduce(
      (s, r) => s + toNumber(r.remainingBalance),
      0
    );
    const wallets = pageRows.reduce((s, r) => s + toNumber(r.wallet), 0);
    const count = pageRows.length;
    return { revenue, balance, wallets, count };
  }, [pageRows, toNumber]);

  const columns = useMemo(
    () => [
      {
        field: "fullName",
        headerName: "Full Name",
        flex: 1,
        minWidth: 160,
        renderCell: (p) => p?.row?.fullName || p?.row?.telegramId || "-",
      },
      {
        field: "phone",
        headerName: "Phone",
        minWidth: 140,
        flex: 0.8,
        renderCell: (p) => p?.row?.phone || "-",
      },
      {
        field: "referredCount",
        headerName: "Referred Users",
        minWidth: 130,
        renderCell: (p) => p?.row?.referredUsers?.length || 0,
      },
      {
        field: "wallet",
        headerName: "Wallet",
        minWidth: 130,
        renderCell: (p) => `${toNumber(p?.row?.wallet).toLocaleString()} ETB`,
      },
      {
        field: "totalGames",
        headerName: "Total Games",
        minWidth: 120,
        renderCell: (p) => p?.row?.totalGames || 0,
      },
      {
        field: "totalRevenue",
        headerName: "Total Revenue",
        minWidth: 140,
        renderCell: (params) =>
          toNumber(params.row.totalRevenue).toLocaleString(),
      },
      {
        field: "remainingBalance",
        headerName: "Remaining Balance",
        minWidth: 160,
        renderCell: (params) =>
          toNumber(params.row.remainingBalance).toLocaleString(),
      },
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        minWidth: isNarrow ? 160 : 360,
        renderCell: (params) => (
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: "wrap", rowGap: 0.5, overflow: "visible" }}
          >
            {isNarrow ? (
              <>
                <Tooltip title="Pay">
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={() => openPaymentModal(params.row)}
                  >
                    <PaymentIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="View Users">
                  <IconButton
                    size="small"
                    onClick={() => openUsersModal(params.row)}
                  >
                    <PeopleAltIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="View Payments">
                  <IconButton
                    size="small"
                    onClick={() => openPaymentsModal(params.row)}
                  >
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Wallet">
                  <IconButton
                    size="small"
                    onClick={() => handleWalletClick(params.row)}
                    sx={{ color: "success.main" }}
                  >
                    <AccountBalanceWalletIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => openPaymentModal(params.row)}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Pay
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => openUsersModal(params.row)}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Users
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => openPaymentsModal(params.row)}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Payments
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleWalletClick(params.row)}
                  sx={{
                    bgcolor: "success.main",
                    "&:hover": { bgcolor: "success.dark" },
                    whiteSpace: "nowrap",
                  }}
                >
                  Wallet
                </Button>
              </>
            )}
          </Stack>
        ),
      },
    ],
    [
      toNumber,
      isNarrow,
      openPaymentsModal,
      openPaymentModal,
      openUsersModal,
      handleWalletClick,
    ]
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Agent Management
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setModalOpen(true)}
        >
          Add Agent
        </Button>
      </Box>
      <AgentRegistrationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onRegister={handleRegister}
        loading={registeringAgent}
      />
      <AgentPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onPayment={handlePayment}
        loading={processingPayment}
        agentName={selectedAgent?.fullName}
      />
      <ReferredUsersModal
        open={usersModalOpen}
        onClose={() => setUsersModalOpen(false)}
        users={selectedAgent?.referredUsers || []}
        agentName={selectedAgent?.fullName}
      />
      <PaymentHistoryModal
        open={paymentsModalOpen}
        onClose={() => setPaymentsModalOpen(false)}
        payments={selectedAgentPayments}
        agentName={selectedAgent?.fullName}
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
            sx={{ bgcolor: "primary.main", color: "white", fontWeight: "bold" }}
          >
            Update Wallet for {openWalletDialog?.fullName || "Agent"}
          </DialogTitle>
          <DialogContent
            sx={{ p: { xs: 1, sm: 2 }, bgcolor: "background.default" }}
          >
            <Typography variant="body2" sx={{ mb: 1 }}>
              Current Wallet:{" "}
              {toNumber(openWalletDialog?.wallet).toLocaleString()} Birr
            </Typography>
            <TextField
              label="Amount to Add (Birr)"
              type="number"
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
              fullWidth
              margin="normal"
              inputProps={{ min: 0 }}
            />
          </DialogContent>
          <DialogActions
            sx={{ p: { xs: 1, sm: 2 }, bgcolor: "background.paper" }}
          >
            <Button
              onClick={() => setOpenWalletDialog(null)}
              sx={{ color: "error.main" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAmount}
              variant="contained"
              disabled={walletUpdating}
              sx={{ minWidth: 100 }}
            >
              {walletUpdating ? "Updating..." : "Add Amount"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <Typography variant="h6" gutterBottom>
        All Agents
      </Typography>
  {fetchingAgents && allAgents.length === 0 ? (
        <CircularProgress />
      ) : (
        <SmartDataGrid
          columns={columns}
          fetchRows={fetchRows}
          initialPageSize={10}
          pageSizeOptions={[5, 10, 15, 25, 50, 100]}
          dynamicHeight
          footerSummary={
            <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
              <Typography variant="body2">
                Page: {totals.count} agents
              </Typography>
              <Typography variant="body2">
                Revenue (page): {totals.revenue.toLocaleString()} ETB
              </Typography>
              <Typography variant="body2">
                Balance (page): {totals.balance.toLocaleString()} ETB
              </Typography>
              <Typography variant="body2">
                Wallet (page): {totals.wallets.toLocaleString()} ETB
              </Typography>
            </Stack>
          }
          onReady={({ refresh }) => {
            refreshRef.current = refresh;
          }}
        />
      )}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError("")}
      >
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess("")}
      >
        <Alert severity="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminAgents;
