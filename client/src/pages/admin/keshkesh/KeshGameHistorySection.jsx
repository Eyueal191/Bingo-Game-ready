import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { motion } from "framer-motion";
import { useCallback } from "react";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";
import { useApi } from "../../../contexts/ApiContext";

const KeshGameHistorySection = () => {
  const api = useApi();
  const theme = useTheme();
  const isXS = useMediaQuery(theme.breakpoints.down("sm"));
  const [selectedGame, setSelectedGame] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error",
  });
  // Filters are managed inside SmartDataGrid; provide initial values here
  const initialExtraFilters = {
    fromDate: "",
    toDate: "",
    bet: "",
    status: "completed", // show completed by default
  };

  // Helpers
  const toOrdinal = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return "-";
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return `${num}${s[(v - 20) % 10] || s[v] || s[0]}`;
  };
  // Note: Winning number is not persisted server-side; we do not attempt to infer it to avoid confusion.

  // No precomputed unique bet options (server-paged). Use numeric input filter.

  const formatCurrency = (value) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? "N/A" : num.toFixed(2);
  };

  // Status color mapping
  const getStatusColor = useCallback(
    (status) => {
      switch (status) {
        case "pending":
          return theme.palette.primary.main;
        case "in_progress":
          return theme.palette.secondary.main;
        case "completed":
          return theme.palette.success.main;
        default:
          return "#fff";
      }
    },
    [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
    ]
  );

  const handleViewDetails = (game) => {
    setSelectedGame(game);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedGame(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Simple style for dialog tables
  const tableSx = {
    "& th": { fontWeight: 600 },
    "& td, & th": { whiteSpace: "nowrap" },
  };

  // DataGrid columns
  const columns = useMemo(
    () => [
      {
        field: "_id",
        headerName: "ID",
        // MUI v7 valueGetter signature is (value, row); keep backward-friendly fallback
        valueGetter: (value, row) => {
          const id =
            (row && row._id) || (typeof value === "string" ? value : null);
          return id ? id.slice(0, 8) : "";
        },
        width: 120,
        sortable: false,
      },
      {
        field: "prize_amount",
        headerName: "Prize Amount (ETB)",
        valueGetter: (value, row) =>
          formatCurrency((row && row.prize_amount) ?? value),
        width: 170,
      },
      {
        field: "bet_amount",
        headerName: "Bet Amount (ETB)",
        valueGetter: (value, row) =>
          formatCurrency((row && row.bet_amount) ?? value),
        width: 160,
      },
      { field: "max_players", headerName: "Max Players", width: 130 },
      {
        field: "system_benefit",
        headerName: "System Benefit (ETB)",
        valueGetter: (value, row) =>
          formatCurrency((row && row.system_benefit) ?? value),
        width: 190,
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
            {p?.row?.status}
          </span>
        ),
        width: 140,
      },
      {
        field: "created_at",
        headerName: "Completed At",
        valueGetter: (value, row) => {
          const d = (row && row.created_at) ?? value;
          return d ? new Date(d).toLocaleString() : "N/A";
        },
        width: 190,
        sortComparator: (v1, v2, p1, p2) =>
          new Date(p1?.row?.created_at || 0) -
          new Date(p2?.row?.created_at || 0),
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 140,
        sortable: false,
        renderCell: (p) => (
          <Button
            variant="contained"
            size="small"
            onClick={() => handleViewDetails(p.row)}
          >
            View Details
          </Button>
        ),
      },
    ],
    [isXS, getStatusColor]
  );

  const fetchRows = async ({ page, pageSize, sortModel, extraFilters }) => {
    const {
      fromDate = "",
      toDate = "",
      bet = "",
      status = "completed",
    } = extraFilters || {};
    const sortField = sortModel?.[0]?.field || "created_at";
    const sortOrder = sortModel?.[0]?.sort || "desc";
    const params = {
      paged: true,
      page,
      pageSize,
      from: fromDate || undefined,
      to: toDate || undefined,
      bet: bet || undefined,
      status: status || undefined,
      sortField,
      sortOrder,
    };
    const res = await api.get("/api/v1/keshkesh/history", { params });
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
        Kesh-Kesh Game History
      </Typography>
      <SmartDataGrid
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(r) => r._id}
        initialPageSize={10}
        pageSizeOptions={[5, 10, 25, 50]}
        density="compact"
        initialSortModel={[{ field: "created_at", sort: "desc" }]}
        initialExtraFilters={initialExtraFilters}
        renderFilters={({ filters: f, setFilters: setF, refresh }) => (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", p: 1 }}>
            <TextField
              label="Bet Amount"
              type="number"
              size="small"
              value={f.bet || ""}
              onChange={(e) => setF((p) => ({ ...p, bet: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={f.status || "completed"}
                onChange={(e) =>
                  setF((p) => ({ ...p, status: e.target.value }))
                }
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
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
              onClick={() => {
                setF({ bet: "all", fromDate: "", toDate: "" });
                refresh();
              }}
            >
              Clear Filters
            </Button>
          </Box>
        )}
      />
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        aria-labelledby="game-details-dialog-title"
        maxWidth="md"
        fullWidth
        fullScreen={isXS}
      >
        <DialogTitle id="game-details-dialog-title">
          Kesh-Kesh Game Details (ID: {selectedGame?._id.slice(0, 8)})
        </DialogTitle>
        <DialogContent>
          {selectedGame && (
            <>
              <DialogContentText
                component={Box}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 2,
                }}
              >
                <Box>
                  <strong>Prize Amount:</strong>{" "}
                  {formatCurrency(selectedGame.prize_amount)} ETB
                </Box>
                <Box>
                  <strong>Bet Amount:</strong>{" "}
                  {formatCurrency(selectedGame.bet_amount)} ETB
                </Box>
                <Box>
                  <strong>Max Players:</strong> {selectedGame.max_players}
                </Box>
                <Box>
                  <strong>System Benefit:</strong>{" "}
                  {formatCurrency(selectedGame.system_benefit)} ETB
                </Box>
                <Box>
                  <strong>Prize Structure:</strong> 1st:{" "}
                  {formatCurrency(selectedGame.prize_structure?.first)} ETB,
                  2nd: {formatCurrency(selectedGame.prize_structure?.second)}{" "}
                  ETB
                </Box>
                <Box>
                  <strong>Status:</strong>{" "}
                  <span style={{ color: getStatusColor(selectedGame.status) }}>
                    {selectedGame.status}
                  </span>
                </Box>
                <Box>
                  <strong>Completed At:</strong>{" "}
                  {selectedGame.created_at
                    ? new Date(selectedGame.created_at).toLocaleString()
                    : "N/A"}
                </Box>
              </DialogContentText>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Winners
              </Typography>
              {selectedGame.winners?.length > 0 ? (
                <TableContainer sx={{ overflowX: "auto" }}>
                  <Table sx={tableSx}>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Rank</TableCell>
                        <TableCell>Numbers</TableCell>
                        <TableCell>Prize (ETB)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedGame.winners.map((winner, idx) => {
                        const rankLabel = Array.isArray(winner.rank)
                          ? winner.rank.map(toOrdinal).join(", ")
                          : toOrdinal(winner.rank);
                        return (
                          <TableRow key={`${winner.user_id || "win"}-${idx}`}>
                            <TableCell>
                              {winner.full_name || "Unknown"}
                            </TableCell>
                            <TableCell>{rankLabel}</TableCell>
                            <TableCell>
                              {Array.isArray(winner.numbers)
                                ? winner.numbers.join(", ")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(winner.prize)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography>No winners recorded.</Typography>
              )}
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                All Participants
              </Typography>
              {selectedGame.participants?.length > 0 ? (
                <TableContainer sx={{ overflowX: "auto" }}>
                  <Table sx={tableSx}>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Numbers</TableCell>
                        <TableCell>Paid Status</TableCell>
                        <TableCell>Rank</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedGame.participants.map((participant, idx) => (
                        <TableRow
                          key={`${participant.user_id || "part"}-${idx}`}
                        >
                          <TableCell>
                            {participant.full_name || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {Array.isArray(participant.numbers)
                              ? participant.numbers.join(", ")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {participant.paid_status || "-"}
                          </TableCell>
                          <TableCell>
                            {Array.isArray(participant.rank) &&
                            participant.rank.length > 0
                              ? participant.rank.map(toOrdinal).join(", ")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography>No participants recorded.</Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
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

export default KeshGameHistorySection;
