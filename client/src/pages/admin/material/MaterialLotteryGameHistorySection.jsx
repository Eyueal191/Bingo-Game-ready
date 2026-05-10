import React, { useState, useMemo, useCallback, useRef } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  useTheme,
} from "@mui/material";
import { motion } from "framer-motion";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";
import { useApi } from "../../../contexts/ApiContext";
import debounce from "lodash.debounce";

const MaterialLotteryGameHistorySection = () => {
  const api = useApi();
  const theme = useTheme();
  // const isXS = useMediaQuery(theme.breakpoints.down("sm"));
  const refreshRef = useRef(() => {});
  const [selectedGame, setSelectedGame] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error",
  });
  const [filters] = useState({ status: "all", startDate: "", endDate: "" });
  const [search, setSearch] = useState("");
  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        setSearch(value);
        setTimeout(() => refreshRef.current?.(), 0);
      }, 400),
    []
  );

  const formatCurrency = (value) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? "N/A" : num.toFixed(2);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

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

  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  const columns = useMemo(
    () => [
      {
        field: "_id",
        headerName: "ID",
        valueGetter: (_, row) => row?._id?.slice(0, 8) || "",
        width: 120,
        sortable: false,
      },
      {
        field: "round",
        headerName: "Round",
        valueGetter: (v, r) => r?.round ?? v ?? 1,
        width: 110,
      },
      {
        field: "bet_amount",
        headerName: "Bet Amount (ETB)",
        valueGetter: (v, r) =>
          r?.bet_amount ? formatCurrency(r.bet_amount) : "N/A",
        width: 160,
      },
      {
        field: "max_players",
        headerName: "Max Players",
        valueGetter: (v, r) => r?.max_players ?? "N/A",
        width: 130,
      },
      {
        field: "status",
        headerName: "Status",
        renderCell: (p) => (
          <span
            style={{ color: getStatusColor(p?.row?.status), fontWeight: 600 }}
          >
            {String(p?.row?.status || "").replace(/_/g, " ")}
          </span>
        ),
        width: 140,
      },
      {
        field: "completed_at",
        headerName: "Completed At",
        valueGetter: (v, r) =>
          r?.completed_at ? formatDate(r.completed_at) : "N/A",
        width: 200,
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 160,
        sortable: false,
        renderCell: (p) => (
          <Button
            size="small"
            variant="contained"
            onClick={() => handleViewDetails(p.row)}
          >
            View Details
          </Button>
        ),
      },
    ],
    [getStatusColor]
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
      params.set("page", String(page + 1));
      params.set("limit", String(pageSize));
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (status && status !== "all") params.set("status", status);
      params.set("sortField", sortField);
      params.set("sortOrder", sortOrder);
      const res = await api.get(
        `/api/v1/material-lottery/history?${params.toString()}`
      );
      if (res.data?.success) {
        const rows = res.data.games || [];
        const rowCount = res.data.totalGames ?? rows.length;
        return { rows, rowCount };
      }
      return { rows: [], rowCount: 0 };
    },
    [search]
  );

  // tableSx removed: SmartDataGrid handles styling

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{ p: 2 }}
    >
      <Typography variant="h4" gutterBottom>
        Material Lottery Game History
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
          label="Search by ID or Bet Amount"
          size="small"
          onChange={(e) => debouncedSearch(e.target.value)}
          sx={{ minWidth: 240 }}
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
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
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
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        aria-labelledby="game-details-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="game-details-dialog-title">
          Game Details — Round {selectedGame?.round ?? 1}
        </DialogTitle>
        <DialogContent>
          {selectedGame && (
            <>
              <DialogContentText>
                <strong>Game ID:</strong> {selectedGame._id}
              </DialogContentText>
              <DialogContentText>
                <strong>Round:</strong> {selectedGame.round ?? 1}
              </DialogContentText>
              <DialogContentText>
                <strong>Bet Amount:</strong>{" "}
                {formatCurrency(selectedGame.bet_amount)} ETB
              </DialogContentText>
              <DialogContentText>
                <strong>Max Players:</strong> {selectedGame.max_players}
              </DialogContentText>
              <DialogContentText>
                <strong>Status:</strong>{" "}
                <span style={{ color: getStatusColor(selectedGame.status) }}>
                  {selectedGame.status.charAt(0).toUpperCase() +
                    selectedGame.status.slice(1)}
                </span>
              </DialogContentText>
              <DialogContentText>
                <strong>Created At:</strong>{" "}
                {formatDate(selectedGame.created_at)}
              </DialogContentText>
              <DialogContentText>
                <strong>Completed At:</strong>{" "}
                {formatDate(selectedGame.completed_at)}
              </DialogContentText>
              <Typography variant="h6" sx={{ mt: 2 }}>
                Participants
              </Typography>
              <TableContainer
                component={Paper}
                sx={{ mt: 1, bgcolor: "rgba(255,255,255,0.1)" }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Numbers</TableCell>
                      <TableCell>Paid Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedGame.participants?.map((participant, idx) => (
                      <TableRow
                        key={
                          ((participant.user_id &&
                            (participant.user_id._id ||
                              String(participant.user_id))) ||
                            "participant") + `-${idx}`
                        }
                      >
                        <TableCell>
                          {participant.full_name || "Unknown"}
                        </TableCell>
                        <TableCell>{participant.numbers.join(", ")}</TableCell>
                        <TableCell>{participant.paid_status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="h6" sx={{ mt: 2 }}>
                Winners
              </Typography>
              <TableContainer
                component={Paper}
                sx={{ mt: 1, bgcolor: "rgba(255,255,255,0.1)" }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Number</TableCell>
                      <TableCell>Rank</TableCell>
                      <TableCell>Prize</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedGame.winners?.map((winner, idx) => (
                      <TableRow
                        key={
                          ((winner.user_id &&
                            (winner.user_id._id || String(winner.user_id))) ||
                            "winner") + `-${idx}`
                        }
                      >
                        <TableCell>{winner.full_name || "Unknown"}</TableCell>
                        <TableCell>{winner.numbers.join(", ")}</TableCell>
                        <TableCell>{winner.rank}</TableCell>
                        <TableCell>{winner.prize}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="h6" sx={{ mt: 2 }}>
                Rewards
              </Typography>
              <TableContainer
                component={Paper}
                sx={{ mt: 1, bgcolor: "rgba(255,255,255,0.1)" }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Amount (ETB)</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedGame.rewards?.map((reward) => (
                      <TableRow key={reward.rank}>
                        <TableCell>{reward.rank}</TableCell>
                        <TableCell>{reward.type}</TableCell>
                        <TableCell>
                          {reward.type === "monetary"
                            ? formatCurrency(reward.amount)
                            : "N/A"}
                        </TableCell>
                        <TableCell>{reward.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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

export default MaterialLotteryGameHistorySection;