import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Switch,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Tooltip,
  Chip,
  InputAdornment,
  alpha,
  useTheme,
} from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  TrendingUp as ProfitIcon,
  EmojiEvents as TrophyIcon,
  AccountBalanceWallet as WalletIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useApi } from "../../../contexts/ApiContext";
import SmartDataGrid from "../../../components/SmartDataGrid";
import ConfirmDialog from "../../../components/common/ConfirmDialog";

/* ─── Shared card style (matches other admin pages) ──────────────────── */
const cardSx = {
  borderRadius: 4,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 1px 12px rgba(0,0,0,0.04)",
  height: "100%",
};

const iconBoxSx = (color) => ({
  width: 36,
  height: 36,
  borderRadius: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  bgcolor: alpha(color, 0.1),
  color,
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const AdminJackpotSettings = () => {
  const api = useApi();
  const theme = useTheme();

  /* state */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [config, setConfig] = useState(null);
  const [walletAdjustment, setWalletAdjustment] = useState("");

  /* confirm dialog */
  const [confirm, setConfirm] = useState({
    open: false, title: "", message: "",
    onConfirm: () => {}, color: "primary", confirmText: "Confirm",
  });
  const closeConfirm = () => setConfirm((p) => ({ ...p, open: false }));

  /* SmartDataGrid history helpers */
  const historyRefreshRef = useRef(() => {});
  const historyCacheRef = useRef({ key: "", all: [] });

  /* ─── Fetch config ──────────────────────────────────────────────── */
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/jackpot");
      setConfig(res.data.config);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load jackpot settings");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  /* ─── Save all changes ──────────────────────────────────────────── */
  const handleSave = () => {
    setConfirm({
      open: true,
      title: "Save Changes",
      message: "Apply all configuration and level changes to the live system?",
      confirmText: "Save",
      color: "primary",
      onConfirm: async () => {
        closeConfirm();
        setSaving(true);
        try {
          await api.put("/api/v1/jackpot", config);
          setSuccess("Settings saved successfully.");
          setTimeout(() => setSuccess(null), 4000);
        } catch (err) {
          setError(err.response?.data?.message || "Failed to save");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  /* ─── Adjust wallet ─────────────────────────────────────────────── */
  const handleAdjustWallet = () => {
    const amount = parseFloat(walletAdjustment);
    if (isNaN(amount) || amount === 0) return;
    setConfirm({
      open: true,
      title: "Adjust Central Wallet",
      message: `Adjust the central jackpot wallet by ${amount > 0 ? "+" : ""}${amount.toLocaleString()} coins. This is distributed proportionally across all enabled levels.`,
      confirmText: "Apply",
      color: "secondary",
      onConfirm: async () => {
        closeConfirm();
        try {
          const res = await api.post("/api/v1/jackpot/adjust-wallet", { amount });
          setConfig((prev) => ({ ...prev, centralWallet: res.data.centralWallet, levels: res.data.levels }));
          setWalletAdjustment("");
          setSuccess(`Wallet adjusted by ${amount > 0 ? "+" : ""}${amount.toLocaleString()} coins.`);
          setTimeout(() => setSuccess(null), 4000);
        } catch (err) {
          setError(err.response?.data?.message || "Wallet adjustment failed");
        }
      },
    });
  };

  /* ─── Manual allocation ─────────────────────────────────────────── */
  const handleProcessUnallocated = () => {
    setConfirm({
      open: true,
      title: "Process Unallocated Profits",
      message: "Manually sweep all unallocated room profits up to this moment and distribute them to jackpot levels.",
      confirmText: "Process Now",
      color: "warning",
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        try {
          await api.post("/api/v1/jackpot/allocate-daily");
          setSuccess("Allocation completed successfully.");
          await fetchConfig();
          historyCacheRef.current = { key: "", all: [] }; // invalidate cache
          historyRefreshRef.current();
          setTimeout(() => setSuccess(null), 4000);
        } catch (err) {
          setError(err.response?.data?.message || "Allocation failed");
          setLoading(false);
        }
      },
    });
  };

  /* ─── Levels DataGrid ───────────────────────────────────────────── */
  const handleProcessRowUpdate = useCallback((newRow) => {
    setConfig((prev) => ({
      ...prev,
      levels: prev.levels.map((lvl) =>
        lvl.key === newRow.key
          ? {
              ...newRow,
              winConditions: { maxCalls: newRow.maxCalls, maxSeconds: newRow.maxSeconds },
            }
          : lvl
      ),
    }));
    return newRow;
  }, []);

  const handleAddLevel = () => {
    const newLevel = {
      key: `level_${Date.now()}`,
      label: "New Level",
      balance: 0,
      allocationPercent: 0,
      rollbackPercent: 20,
      winConditions: { maxCalls: 10, maxSeconds: 30 },
      color: "#673ab7",
      icon: "✨",
      enabled: true,
      priority: config.levels.length,
      savedBalance: 0,
      awardAmount: 0,
    };
    setConfig((prev) => ({ ...prev, levels: [...prev.levels, newLevel] }));
  };

  const handleDeleteLevel = (key) => {
    setConfirm({
      open: true,
      title: "Remove Level",
      message: "Remove this jackpot level? Changes are not applied until you save.",
      confirmText: "Remove",
      color: "error",
      onConfirm: () => {
        closeConfirm();
        setConfig((prev) => ({ ...prev, levels: prev.levels.filter((l) => l.key !== key) }));
      },
    });
  };
const levelColumns = useMemo(() => [
  { field: "icon", headerName: "Icon", width: 60, editable: true, align: "center", headerAlign: "center" },

  { field: "label", headerName: "Level Name", flex: 1, minWidth: 130, editable: true },

  {
    field: "balance",
    headerName: "Balance (70%)",
    width: 130,
    renderCell: (p) => (
      <Typography fontWeight={700} color="primary.main">
        {p.value?.toLocaleString()}
      </Typography>
    ),
  },

  // ✅ NEW COLUMN ADDED HERE
  {
    field: "awardAmount",
    headerName: "Award (Fixed)",
    width: 140,
    type: "number",
    editable: true,
    renderCell: (p) => (
      <Typography fontWeight={800} color="success.main">
        {p.value?.toLocaleString() || 0}
      </Typography>
    ),
  },

  {
    field: "savedBalance",
    headerName: "Saved (30%)",
    width: 130,
    editable: true,
    renderCell: (p) => (
      <Typography fontWeight={700} color="text.secondary">
        {p.value?.toLocaleString() || 0}
      </Typography>
    ),
  },

  { field: "allocationPercent", headerName: "Alloc %", width: 90, type: "number", editable: true },

  { field: "rollbackPercent", headerName: "Rollback %", width: 100, type: "number", editable: true },

  { field: "maxCalls", headerName: "Max Calls", width: 100, type: "number", editable: true },

  { field: "maxSeconds", headerName: "Max Secs", width: 100, type: "number", editable: true },

  { field: "enabled", headerName: "Active", width: 80, type: "boolean", editable: true },

  {
    field: "actions",
    type: "actions",
    headerName: "",
    width: 50,
    getActions: (p) => [
      <GridActionsCellItem
        key={p.id}
        icon={<DeleteIcon color="error" />}
        label="Delete"
        onClick={() => handleDeleteLevel(p.id)}
      />,
    ],
  },
], []);
  const levelRows = useMemo(() =>
  (config?.levels || []).map((lvl) => ({
      ...lvl,
      id: lvl.key,
      awardAmount: lvl.awardAmount ?? 0,   // ✅ ensure consistency
      maxCalls: lvl.winConditions?.maxCalls || 0,
      maxSeconds: lvl.winConditions?.maxSeconds || 0,
    })),
    [config?.levels]
  );

  /* ─── History SmartDataGrid (client-side paging, same as AdminBonuses) ─ */
  const fetchHistoryRows = useCallback(
    async ({ page, pageSize, quickFilter }) => {
      try {
        const cacheKey = "history";
        if (historyCacheRef.current.key !== cacheKey) {
          const res = await api.get("/api/v1/jackpot/history");
          const all = (res.data?.history || []).map((h, i) => ({ ...h, _id: h._id || `h_${i}` }));
          historyCacheRef.current = { key: cacheKey, all };
        }
        let items = historyCacheRef.current.all;
        // Quick filter
        const q = (quickFilter || "").toLowerCase();
        if (q) {
          items = items.filter((r) =>
            [r.totalProfit, r.allocated, r.date]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          );
        }
        const rowCount = items.length;
        const start = page * pageSize;
        const rows = items.slice(start, start + pageSize);
        return { rows, rowCount };
      } catch {
        return { rows: [], rowCount: 0 };
      }
    },
    [api]
  );

  const historyColumns = useMemo(() => [
    {
      field: "date", headerName: "Date", width: 180,
      renderCell: (p) => {
        try {
          const d = new Date(p.value);
          return (
            <Box>
              <Typography variant="body2" fontWeight={600}>{format(d, "MMM dd, yyyy")}</Typography>
              <Typography variant="caption" color="text.secondary">{format(d, "hh:mm:ss a")}</Typography>
            </Box>
          );
        } catch { return "—"; }
      },
    },
    {
      field: "totalProfit", headerName: "House Revenue", width: 140, type: "number",
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={700}>
          {(p.value || 0).toLocaleString()} <Box component="span" sx={{ fontSize: 11, fontWeight: 400, color: "text.secondary" }}>coins</Box>
        </Typography>
      ),
    },
    {
      field: "pool", headerName: `Pool (${config?.dailyAllocationPercent || 10}% of house Revenue)`, width: 180, type: "number",
      renderCell: (p) => {
        const row = p.row;
        if (!row.totalProfit) return <Typography color="text.disabled">—</Typography>;
        const poolValue = Math.round(row.totalProfit * (config?.dailyAllocationPercent || 10) / 100);
        return (
          <Typography variant="body2" fontWeight={600} color="info.main">
            {poolValue.toLocaleString()} <Box component="span" sx={{ fontSize: 11, fontWeight: 400, color: "text.secondary" }}>coins</Box>
          </Typography>
        );
      },
    },
    {
      field: "allocated", headerName: "Distributed", width: 140, type: "number",
      renderCell: (p) =>
        p.value > 0
          ? <Typography color="success.main" fontWeight={800}>+{p.value?.toLocaleString()}</Typography>
          : <Typography color="text.disabled">—</Typography>,
    },
    {
      field: "saved", headerName: "Saved", width: 130, type: "number",
      renderCell: (p) =>
        p.value > 0
          ? <Typography color="warning.main" fontWeight={700}>+{p.value?.toLocaleString()}</Typography>
          : <Typography color="text.disabled">—</Typography>,
    },
    {
      field: "breakdown", headerName: "Distribution", flex: 1, minWidth: 250, sortable: false,
      renderCell: (p) => {
        const row = p.row;
        if (!row.totalProfit) return <Typography variant="caption" color="text.disabled" fontStyle="italic">No profit in window</Typography>;
        if (!row.allocated) return <Chip size="small" label="Below threshold" color="warning" variant="outlined" sx={{ height: 22, fontSize: 11 }} />;
        return (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", py: 0.5 }}>
            {(row.breakdown || []).map((b, j) => {
              const lvl = config?.levels?.find((l) => l.key === b.key);
              return (
                <Tooltip key={j} title={`${lvl?.label || b.key}: ${b.amount?.toLocaleString()} (Dist) + ${b.savedAmount?.toLocaleString() || 0} (Saved)`}>
                  <Chip
                    size="small"
                    label={
                      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {lvl?.icon || "•"} 
                        <Box component="span">{b.amount?.toLocaleString()}</Box>
                        <Box component="span" sx={{ opacity: 0.6, fontSize: "0.85em", fontWeight: 500 }}>
                          (+{(b.savedAmount || 0).toLocaleString()}s)
                        </Box>
                      </Box>
                    }
                    sx={{
                      fontWeight: 700, height: 24,
                      bgcolor: alpha(lvl?.color || theme.palette.grey[500], 0.12),
                      border: `1px solid ${alpha(lvl?.color || theme.palette.grey[500], 0.3)}`,
                    }}
                  />
                </Tooltip>
              );
            })}
          </Box>
        );
      },
    },
  ], [config?.levels, theme]);

  /* ─── Loading ───────────────────────────────────────────────────── */
  if (loading && !config) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress size={44} />
      </Box>
    );
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  return (
    <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>

        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary" }}>
            Jackpot Settings
          </Typography>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            disableElevation
            sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 700, textTransform: "none" }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Box>

        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Top Row: 3 Metric Cards ──────────────────────────────── */}
        <Grid container spacing={3} sx={{ mb: 3 }}>

          {/* System Status */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={cardSx} elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <Box sx={iconBoxSx(theme.palette.primary.main)}><SettingsIcon fontSize="small" /></Box>
                  <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary">
                    System Status
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
                  <Typography variant="body1" fontWeight={600}>Auto Allocation</Typography>
                  <Switch
                    checked={config?.enabled || false}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    color="success"
                  />
                </Box>

                <Box sx={{ bgcolor: "action.hover", p: 1.5, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Last Processed</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {config?.lastProcessedTimestamp
                      ? format(new Date(config.lastProcessedTimestamp), "MMM dd, yyyy · hh:mm a")
                      : "Never"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Central Wallet */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={cardSx} elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <Box sx={iconBoxSx(theme.palette.warning.main)}><WalletIcon fontSize="small" /></Box>
                  <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary">
                    Central Wallet
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "baseline", mb: 2.5 }}>
                  <Typography variant="h4" fontWeight={900} letterSpacing="-1px">
                    {(config?.centralWallet || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>coins</Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="± amount"
                    type="number"
                    value={walletAdjustment}
                    onChange={(e) => setWalletAdjustment(e.target.value)}
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { bgcolor: "background.paper" } }}
                  />
                  <Button
                    variant="outlined"
                    disabled={!walletAdjustment}
                    onClick={handleAdjustWallet}
                    sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    Apply
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Profit Allocation */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={cardSx} elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <Box sx={iconBoxSx(theme.palette.success.main)}><ProfitIcon fontSize="small" /></Box>
                  <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} color="text.secondary">
                    Profit Allocation
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
                  <Typography variant="body2" color="text.secondary">House profit → Jackpot</Typography>
                  <Typography variant="h5" fontWeight={800} color="success.main">
                    {config?.dailyAllocationPercent || 0}%
                  </Typography>
                </Box>

                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  value={config?.dailyAllocationPercent || 0}
                  onChange={(e) => setConfig({ ...config, dailyAllocationPercent: parseFloat(e.target.value) || 0 })}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  sx={{ mb: 2 }}
                />

                <Button
                  variant="contained"
                  color="warning"
                  disableElevation
                  fullWidth
                  startIcon={<RefreshIcon />}
                  onClick={handleProcessUnallocated}
                  sx={{
                    py: 1,
                    fontWeight: 700,
                    color: "warning.dark",
                    bgcolor: alpha(theme.palette.warning.main, 0.15),
                    "&:hover": { bgcolor: alpha(theme.palette.warning.main, 0.25) },
                  }}
                >
                  Process Unallocated
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Jackpot Levels (standard DataGrid — local config state) ── */}
        <Box sx={{ bgcolor: "background.paper", borderRadius: 4, boxShadow: 3, mb: 3 }}>
          <Box sx={{ px: 3, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid", borderColor: "divider" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <TrophyIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Jackpot Levels</Typography>
            </Box>
            <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={handleAddLevel} sx={{ textTransform: "none" }}>
              Add Level
            </Button>
          </Box>

          <Box sx={{ width: "100%", overflowX: "auto" }}>
            <DataGrid
              rows={levelRows}
              columns={levelColumns}
              processRowUpdate={handleProcessRowUpdate}
              onProcessRowUpdateError={(err) => setError("Row update failed: " + err.message)}
              disableRowSelectionOnClick
              hideFooter
              autoHeight
              sx={{
                border: 0,
                minWidth: 800,
                "& .MuiDataGrid-columnHeaders": { bgcolor: "action.hover" },
                "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "text.secondary" },
                "& .MuiDataGrid-cell": { borderBottom: "1px solid", borderColor: "divider" },
              }}
            />
          </Box>

          <Box sx={{ px: 3, py: 1.5, bgcolor: "action.hover", borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">
              Double-click any cell to edit inline. Changes are saved when you click "Save Changes".
            </Typography>
          </Box>
        </Box>

        {/* ── Allocation History (SmartDataGrid — server-fetched) ────── */}
        <Box sx={{ bgcolor: "background.paper", borderRadius: 4, boxShadow: 3 }}>
          <Box sx={{ px: 3, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid", borderColor: "divider" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <HistoryIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Allocation History</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Last 90 records</Typography>
          </Box>

          <Box sx={{ px: 3, py: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
              How Jackpot Allocation Works:
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              <strong>Step 1:</strong> Calculate Pool = House Revenue × {config?.dailyAllocationPercent || 10}% (e.g., 1,000 coins × {config?.dailyAllocationPercent || 10}% = {1000 * (config?.dailyAllocationPercent || 10) / 100} coins, Math.round → {Math.round(1000 * (config?.dailyAllocationPercent || 10) / 100)} coins)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              <strong>Step 2:</strong> Split Pool → 70% Distributed ({Math.floor(Math.round(1000 * (config?.dailyAllocationPercent || 10) / 100) * 0.7)} coins, Math.floor) / 30% Saved ({Math.round(1000 * (config?.dailyAllocationPercent || 10) / 100) - Math.floor(Math.round(1000 * (config?.dailyAllocationPercent || 10) / 100) * 0.7)} coins, includes remainder)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              <strong>Step 3:</strong> Distribute to each level based on allocation % (Math.floor, remainders → saved):
            </Typography>
            <Box sx={{ pl: 2, display: "flex", flexDirection: "column", gap: 0.25 }}>
              {(() => {
                const examplePool = Math.floor(Math.round(1000 * (config?.dailyAllocationPercent || 10) / 100) * 0.7);
                const enabledLevels = (config?.levels || []).filter(l => l.enabled);
                const totalPercentage = enabledLevels.reduce((sum, l) => sum + l.allocationPercent, 0);
                const levelSumText = enabledLevels.map(l => `${l.icon} ${l.label} (${l.allocationPercent}%)`).join(' + ');
                let totalDistributed = 0;
                const levelCalculations = enabledLevels.map((level) => {
                  const exactShare = examplePool * (level.allocationPercent / totalPercentage);
                  const flooredShare = Math.floor(exactShare);
                  totalDistributed += flooredShare;
                  return { level, exactShare, flooredShare };
                });
                const remainder = examplePool - totalDistributed;
                return (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      Total % for labels = {levelSumText} = {totalPercentage}%
                    </Typography>
                    {levelCalculations.map(({ level, exactShare, flooredShare }) => (
                      <Typography key={level.key} variant="caption" color="text.secondary">
                        • {level.icon} {level.label} ({level.allocationPercent}%): {examplePool} × {level.allocationPercent}/{totalPercentage} = {exactShare.toFixed(2)} → Math.floor → {flooredShare} coins
                      </Typography>
                    ))}
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 2, fontStyle: "italic" }}>
                      Total Distributed = {levelCalculations.map(l => `${l.level.icon} ${l.level.label}: ${l.flooredShare}`).join(' + ')} = {totalDistributed} coins
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 2, fontStyle: "italic" }}>
                      Remainder = {examplePool} - {totalDistributed} = {remainder} coins → added to first level's saved pool
                    </Typography>
                  </>
                );
              })()}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontStyle: "italic" }}>
              Example with remainder: House Revenue = 66, Pool = 6.6 → Math.round → 7. 70% = 4.9 → Math.floor → 4 distributed. Level 1: 2.0 → 2, Level 2: 1.0 → 1, Level 3: 0.6 → 0, Level 4: 0.2 → 0. Remainder = 4 - (2+1) = 1 → saved.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontStyle: "italic" }}>
              Math.round: 6.6 → 7, 6.4 → 6 (nearest whole). Math.floor: 4.9 → 4, 4.1 → 4 (always down). Remainders ensure no coins lost.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, fontStyle: "italic" }}>
              Important: Level allocation % are relative weights. Actual % of pool = (level's % / total of all enabled levels' %) × 100:
            </Typography>
            <Box sx={{ pl: 2, display: "flex", flexDirection: "column", gap: 0.25 }}>
              {(() => {
                const totalPercentage = (config?.levels || []).filter(l => l.enabled).reduce((sum, l) => sum + l.allocationPercent, 0);
                return (config?.levels || []).filter(l => l.enabled).map((level) => {
                  const actualPercent = totalPercentage > 0 ? ((level.allocationPercent / totalPercentage) * 100).toFixed(1) : 0;
                  return (
                    <Typography key={level.key} variant="caption" color="text.secondary">
                      • {level.icon} {level.label}: {level.allocationPercent}% / {totalPercentage}% = {actualPercent}% of distributed pool
                    </Typography>
                  );
                });
              })()}
            </Box>
          </Box>

          <SmartDataGrid
            columns={historyColumns}
            fetchRows={fetchHistoryRows}
            getRowId={(r) => r._id}
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            density="standard"
            initialSortModel={[{ field: "date", sort: "desc" }]}
            dynamicHeight
            onReady={({ refresh }) => { historyRefreshRef.current = refresh; }}
          />
        </Box>

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={confirm.open}
          title={confirm.title}
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={closeConfirm}
          confirmText={confirm.confirmText}
          confirmColor={confirm.color}
        />
      </Box>
    </motion.div>
  );
};

export default AdminJackpotSettings;
