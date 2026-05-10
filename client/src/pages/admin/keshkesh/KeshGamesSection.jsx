import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { motion } from "framer-motion";
import { useApi } from "../../../contexts/ApiContext";
import { toast } from "sonner";

const KeshGamesSection = ({ games, setGames }) => {
  const api = useApi();
  const theme = useTheme();
  const isXS = useMediaQuery(theme.breakpoints.down("sm"));

  // Create form state
  const [createForm, setCreateForm] = useState({
    bet_amount: "",
    max_players: "",
    system_benefit: "0",
    gameType: "keshkesh",
    prize_tiers: [
      { rank: 1, percent: 70 },
      { rank: 2, percent: 30 },
    ],
  });

  // Update form state
  const [updateForm, setUpdateForm] = useState({
    id: null,
    bet_amount: "",
    max_players: "",
    status: "",
    system_benefit: "",
    gameType: "keshkesh",
    prize_tiers: [],
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [dialog, setDialog] = useState({
    open: false,
    action: null,
    gameId: null,
  });

  const formatCurrency = (value) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? "N/A" : num.toFixed(2);
  };

  const getStatusColor = (status) => {
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
  };

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const handleOpenDialog = (action, gameId) => {
    if (action === "update" && gameId) {
      const game = games.find((g) => g._id === gameId);
      if (game) {
        setUpdateForm({
          id: game._id,
          bet_amount: String(game.bet_amount ?? ""),
          max_players: String(game.max_players ?? ""),
          status: game.status || "",
          gameType: game.gameType || "keshkesh",
          system_benefit: String(game.system_benefit ?? ""),
          prize_tiers: Array.isArray(game.prize_tiers)
            ? game.prize_tiers.map((t) => ({
                rank: t.rank,
                percent:
                  t.percent !== undefined && t.percent !== null
                    ? Number(t.percent)
                    : game.prize_amount
                    ? Number(
                        ((t.amount || 0) / game.prize_amount) * 100
                      ).toFixed(2)
                    : 0,
              }))
            : [],
        });
      }
    }
    setDialog({ open: true, action, gameId: gameId || null });
  };

  const handleCloseDialog = () => {
    setDialog({ open: false, action: null, gameId: null });
    setCreateForm({ bet_amount: "", max_players: "", prize_tiers: [] });
    setUpdateForm({
      id: null,
      bet_amount: "",
      max_players: "",
      status: "",
      prize_tiers: [],
    });
  };

  const handleCreateGame = async () => {
    try {
      const bet_amount = parseFloat(createForm.bet_amount);
      const max_players = parseInt(createForm.max_players, 10);
      const system_benefit = Number(createForm.system_benefit || 0);
      const prize_tiers = (createForm.prize_tiers || [])
        .filter((t) => t && t.rank && t.percent >= 0)
        .map((t) => ({ rank: Number(t.rank), percent: Number(t.percent) }))
        .sort((a, b) => a.rank - b.rank);
      const sumPercent = prize_tiers.reduce((s, t) => s + (t.percent || 0), 0);
      if (isNaN(bet_amount) || isNaN(max_players))
        throw new Error("Invalid input values");
      if (system_benefit < 0 || system_benefit > 100)
        throw new Error("System benefit must be between 0 and 100");
      if (sumPercent + system_benefit > 100)
        throw new Error(
          "Sum of prize tiers percent and system benefit cannot exceed 100"
        );
      const response = await api.post("/api/v1/keshkesh/create", {
        bet_amount,
        max_players,
        system_benefit,
        gameType: createForm.gameType || "keshkesh",
        prize_tiers,
      });
      setGames([...games, response.data]);
      setSnackbar({
        open: true,
        message: "Kesh-Kesh room created successfully",
        severity: "success",
      });
      toast.success("Kesh-Kesh room created successfully");
      handleCloseDialog();
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Failed to create Kesh-Kesh room";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
      toast.error(errorMessage);
    }
  };

  const handleUpdateGame = async () => {
    if (!updateForm.id) return;
    try {
      const updates = {};
      if (updateForm.bet_amount)
        updates.bet_amount = parseFloat(updateForm.bet_amount);
      if (updateForm.max_players)
        updates.max_players = parseInt(updateForm.max_players, 10);
      if (updateForm.status) updates.status = updateForm.status;
      if (updateForm.gameType) updates.gameType = updateForm.gameType;
      if (
        updateForm.system_benefit !== "" &&
        updateForm.system_benefit !== null
      ) {
        const sb = Number(updateForm.system_benefit);
        if (isNaN(sb) || sb < 0 || sb > 100)
          throw new Error("System benefit must be between 0 and 100");
        updates.system_benefit = sb;
      }
      if (
        Array.isArray(updateForm.prize_tiers) &&
        updateForm.prize_tiers.length > 0
      ) {
        const prize_tiers = updateForm.prize_tiers
          .filter((t) => t && t.rank && t.percent >= 0)
          .map((t) => ({ rank: Number(t.rank), percent: Number(t.percent) }))
          .sort((a, b) => a.rank - b.rank);
        const sumPercent = prize_tiers.reduce(
          (s, t) => s + (t.percent || 0),
          0
        );
        const sb =
          updates.system_benefit !== undefined
            ? updates.system_benefit
            : Number(updateForm.system_benefit || 0);
        if (sumPercent + sb > 100)
          throw new Error(
            "Sum of prize tiers percent and system benefit cannot exceed 100"
          );
        updates.prize_tiers = prize_tiers;
      }
      if (Object.keys(updates).length === 0)
        throw new Error("No valid fields provided for update");
      const response = await api.put(
        `/api/v1/keshkesh/${updateForm.id}`,
        updates
      );
      setGames(
        games.map((game) => (game._id === updateForm.id ? response.data : game))
      );
      setSnackbar({
        open: true,
        message: "Kesh-Kesh room updated successfully",
        severity: "success",
      });
      toast.success("Kesh-Kesh room updated successfully");
      handleCloseDialog();
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Failed to update Kesh-Kesh room";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
      toast.error(errorMessage);
    }
  };

  const handleConfirmAction = async () => {
    if (dialog.action === "create") await handleCreateGame();
    else if (dialog.action === "update") await handleUpdateGame();
  };

  const handleResetGame = async (gameId) => {
    try {
      await api.post(`/api/v1/keshkesh/${gameId}/reset`);
      toast.success("Game reset. New pending room created.");
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to reset game";
      toast.error(errorMessage);
    }
  };

  const handleDeleteGame = async (gameId) => {
    try {
      await api.delete(`/api/v1/keshkesh/${gameId}`);
      setGames(games.filter((g) => g._id !== gameId));
      toast.success("Pending room deleted");
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to delete room";
      toast.error(errorMessage);
    }
  };

  const tableSx = {
    minWidth: { xs: 0, sm: 600 },
    fontSize: { xs: "0.65rem", sm: "0.9rem" },
    borderCollapse: "separate",
    borderSpacing: { xs: "0 6px", sm: "0 8px" },
    "& th, & td": {
      padding: { xs: "4px 2px", sm: "8px 4px" },
      lineHeight: 1.1,
      border: "none",
    },
    "& th": {
      fontWeight: 700,
      fontSize: { xs: "0.65rem", sm: "0.95rem" },
      padding: { xs: "5px 2px", sm: "10px 4px" },
      background: "linear-gradient(145deg, #5a667a, #3e4857)",
      color: "#fff",
      textAlign: "center",
      whiteSpace: "nowrap",
      boxShadow:
        "2px 2px 4px rgba(0, 0, 0, 0.3), -2px -2px 4px rgba(255, 255, 255, 0.1)",
      borderRadius: "4px",
    },
    "& td": {
      color: "#fff",
      background: "transparent",
      textAlign: "center",
      fontSize: { xs: "0.65rem", sm: "0.9rem" },
    },
    "& tr": {
      background: "linear-gradient(145deg, #3a4557, #252f3e)",
      boxShadow:
        "1px 1px 3px rgba(0, 0, 0, 0.2), -1px -1px 3px rgba(255, 255, 255, 0.05)",
      borderRadius: "4px",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
      },
    },
    "& tr:nth-of-type(even)": {
      background: "linear-gradient(145deg, #2e3746, #1c2532)",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{ p: 2 }}
    >
      <Typography variant="h4" gutterBottom>
        Kesh-Kesh Game Management
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => handleOpenDialog("create")}
        sx={{
          mb: 2,
          borderRadius: "16px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.4)",
          },
        }}
      >
        {`Create New ${
          createForm.gameType === "fetan-spin" ? "Fetan-Spin" : "Kesh-Kesh"
        } Room`}
      </Button>
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: "#ffffff",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.4)",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "100vw",
          overflowX: "auto",
          perspective: "1000px",
        }}
      >
        <Table sx={tableSx} aria-label="games table">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Prize Amount (ETB)</TableCell>
              <TableCell>Bet Amount (ETB)</TableCell>
              <TableCell>Max Players</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {games.length > 0 ? (
              games.map((game) => (
                <TableRow key={game._id}>
                  <TableCell>{game._id.slice(0, 8)}</TableCell>
                  <TableCell>{formatCurrency(game.prize_amount)}</TableCell>
                  <TableCell>{formatCurrency(game.bet_amount)}</TableCell>
                  <TableCell>{game.max_players}</TableCell>
                  <TableCell>
                    <span
                      style={{
                        color: getStatusColor(game.status),
                        fontWeight: 600,
                        fontSize: isXS ? "0.6rem" : "0.75rem",
                      }}
                    >
                      {game.status.charAt(0).toUpperCase() +
                        game.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleOpenDialog("update", game._id)}
                      disabled={game.status === "completed"}
                      sx={{
                        minWidth: 0,
                        px: { xs: 0.5, sm: 2 },
                        py: { xs: 0.3, sm: 1 },
                        fontSize: { xs: "0.6rem", sm: "0.85rem" },
                        height: { xs: 20, sm: 36 },
                        borderRadius: "16px",
                        whiteSpace: "nowrap",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.4)",
                        },
                      }}
                    >
                      Update
                    </Button>
                    {game.status === "in_progress" && (
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => handleResetGame(game._id)}
                        sx={{
                          ml: 1,
                          minWidth: 0,
                          px: { xs: 0.5, sm: 2 },
                          py: { xs: 0.3, sm: 1 },
                          fontSize: { xs: "0.6rem", sm: "0.85rem" },
                          height: { xs: 20, sm: 36 },
                          borderRadius: "16px",
                        }}
                      >
                        Reset
                      </Button>
                    )}
                    {game.status === "pending" && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleDeleteGame(game._id)}
                        sx={{
                          ml: 1,
                          minWidth: 0,
                          px: { xs: 0.5, sm: 2 },
                          py: { xs: 0.3, sm: 1 },
                          fontSize: { xs: "0.6rem", sm: "0.85rem" },
                          height: { xs: 20, sm: 36 },
                          borderRadius: "16px",
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  sx={{ textAlign: "center", background: "transparent" }}
                >
                  No games available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialog.open}
        onClose={handleCloseDialog}
        aria-labelledby="game-dialog-title"
        aria-describedby="game-dialog-description"
      >
        <DialogTitle id="game-dialog-title">
          {dialog.action === "create"
            ? `Create New ${
                createForm.gameType === "fetan-spin"
                  ? "Fetan-Spin"
                  : "Kesh-Kesh"
              } Room`
            : `Update ${
                updateForm.gameType === "fetan-spin"
                  ? "Fetan-Spin"
                  : "Kesh-Kesh"
              } Room`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="game-dialog-description">
            {dialog.action === "create"
              ? `Enter details to create a new ${
                  createForm.gameType === "fetan-spin"
                    ? "Fetan-Spin"
                    : "Kesh-Kesh"
                } room. This will allow users to join and participate.`
              : `Modify the ${
                  updateForm.gameType === "fetan-spin"
                    ? "Fetan-Spin"
                    : "Kesh-Kesh"
                } room details. Changes may affect participants and game progress.`}
          </DialogContentText>
          {dialog.action === "create" ? (
            <>
              <TextField
                label="Bet Amount (ETB)"
                type="number"
                value={createForm.bet_amount}
                onChange={(e) =>
                  setCreateForm({ ...createForm, bet_amount: e.target.value })
                }
                fullWidth
                margin="normal"
                inputProps={{ step: "0.01", min: "0" }}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.5)",
                  "& .MuiInputBase-input": { color: "inherit" },
                  "& .MuiInputLabel-root": { color: "inherit" },
                }}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel sx={{ color: "inherit" }}>Game Type</InputLabel>
                <Select
                  value={createForm.gameType}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, gameType: e.target.value })
                  }
                  label="Game Type"
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.5)",
                    color: "inherit",
                    "& .MuiSvgIcon-root": { color: "inherit" },
                  }}
                >
                  <MenuItem value="keshkesh">Kesh-Kesh</MenuItem>
                  <MenuItem value="fetan-spin">Fetan-Spin</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Max Players"
                type="number"
                value={createForm.max_players}
                onChange={(e) =>
                  setCreateForm({ ...createForm, max_players: e.target.value })
                }
                fullWidth
                margin="normal"
                inputProps={{ min: "1" }}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.5)",
                  "& .MuiInputBase-input": { color: "inherit" },
                  "& .MuiInputLabel-root": { color: "inherit" },
                }}
              />
              <TextField
                label="System Benefit (%)"
                type="number"
                value={createForm.system_benefit}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    system_benefit: e.target.value,
                  })
                }
                fullWidth
                margin="normal"
                inputProps={{ step: "1", min: "0", max: "100" }}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.5)",
                  "& .MuiInputBase-input": { color: "inherit" },
                  "& .MuiInputLabel-root": { color: "inherit" },
                }}
              />
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle1">Prize Tiers</Typography>
                {(createForm.prize_tiers || []).map((t, idx) => (
                  <Box key={idx} sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <TextField
                      label="Rank"
                      type="number"
                      value={t.rank}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const arr = [...createForm.prize_tiers];
                        arr[idx] = { ...arr[idx], rank: v };
                        setCreateForm({ ...createForm, prize_tiers: arr });
                      }}
                      sx={{
                        width: 120,
                        backgroundColor: "rgba(255,255,255,0.5)",
                      }}
                    />
                    <TextField
                      label="Percent %"
                      type="number"
                      value={t.percent}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const arr = [...createForm.prize_tiers];
                        arr[idx] = { ...arr[idx], percent: v };
                        setCreateForm({ ...createForm, prize_tiers: arr });
                      }}
                      sx={{
                        width: 160,
                        backgroundColor: "rgba(255,255,255,0.5)",
                      }}
                    />
                    <Button
                      color="error"
                      onClick={() =>
                        setCreateForm({
                          ...createForm,
                          prize_tiers: (createForm.prize_tiers || []).filter(
                            (_, i) => i !== idx
                          ),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
                <Button
                  sx={{ mt: 1 }}
                  onClick={() =>
                    setCreateForm({
                      ...createForm,
                      prize_tiers: [
                        ...(createForm.prize_tiers || []),
                        {
                          rank: (createForm.prize_tiers?.length || 0) + 1,
                          percent: 0,
                        },
                      ],
                    })
                  }
                >
                  Add Tier
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block" }}
                >
                  Sum of prize tiers percent and system benefit should not
                  exceed 100. Payouts are from prize amount after system
                  benefit.
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <TextField
                label="Bet Amount (ETB)"
                type="number"
                value={updateForm.bet_amount}
                onChange={(e) =>
                  setUpdateForm({ ...updateForm, bet_amount: e.target.value })
                }
                fullWidth
                margin="normal"
                inputProps={{ step: "0.01", min: "0" }}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.5)",
                  "& .MuiInputBase-input": { color: "inherit" },
                  "& .MuiInputLabel-root": { color: "inherit" },
                }}
              />
              <TextField
                label="Max Players"
                type="number"
                value={updateForm.max_players}
                onChange={(e) =>
                  setUpdateForm({ ...updateForm, max_players: e.target.value })
                }
                fullWidth
                margin="normal"
                inputProps={{ min: "1" }}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.5)",
                  "& .MuiInputBase-input": { color: "inherit" },
                  "& .MuiInputLabel-root": { color: "inherit" },
                }}
              />
              <TextField
                label="System Benefit (%)"
                type="number"
                value={updateForm.system_benefit}
                onChange={(e) =>
                  setUpdateForm({
                    ...updateForm,
                    system_benefit: e.target.value,
                  })
                }
                fullWidth
                margin="normal"
                inputProps={{ step: "1", min: "0", max: "100" }}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.5)",
                  "& .MuiInputBase-input": { color: "inherit" },
                  "& .MuiInputLabel-root": { color: "inherit" },
                }}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel sx={{ color: "inherit" }}>Status</InputLabel>
                <Select
                  value={updateForm.status}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, status: e.target.value })
                  }
                  label="Status"
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.5)",
                    color: "inherit",
                    "& .MuiSvgIcon-root": { color: "inherit" },
                  }}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle1">Prize Tiers</Typography>
                {(updateForm.prize_tiers || []).map((t, idx) => (
                  <Box key={idx} sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <TextField
                      label="Rank"
                      type="number"
                      value={t.rank}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const arr = [...updateForm.prize_tiers];
                        arr[idx] = { ...arr[idx], rank: v };
                        setUpdateForm({ ...updateForm, prize_tiers: arr });
                      }}
                      sx={{
                        width: 120,
                        backgroundColor: "rgba(255,255,255,0.5)",
                      }}
                    />
                    <TextField
                      label="Percent %"
                      type="number"
                      value={t.percent}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const arr = [...updateForm.prize_tiers];
                        arr[idx] = { ...arr[idx], percent: v };
                        setUpdateForm({ ...updateForm, prize_tiers: arr });
                      }}
                      sx={{
                        width: 160,
                        backgroundColor: "rgba(255,255,255,0.5)",
                      }}
                    />
                    <Button
                      color="error"
                      onClick={() =>
                        setUpdateForm({
                          ...updateForm,
                          prize_tiers: (updateForm.prize_tiers || []).filter(
                            (_, i) => i !== idx
                          ),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
                <Button
                  sx={{ mt: 1 }}
                  onClick={() =>
                    setUpdateForm({
                      ...updateForm,
                      prize_tiers: [
                        ...(updateForm.prize_tiers || []),
                        {
                          rank: (updateForm.prize_tiers?.length || 0) + 1,
                          percent: 0,
                        },
                      ],
                    })
                  }
                >
                  Add Tier
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block" }}
                >
                  Sum of prize tiers percent and system benefit should not
                  exceed 100. Payouts are from prize amount after system
                  benefit.
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            color={dialog.action === "create" ? "success" : "warning"}
            variant="contained"
            sx={{
              borderRadius: "16px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.4)",
              },
            }}
          >
            {dialog.action === "create"
              ? `Create ${
                  createForm.gameType === "fetan-spin"
                    ? "Fetan-Spin"
                    : "Kesh-Kesh"
                }`
              : `Update ${
                  updateForm.gameType === "fetan-spin"
                    ? "Fetan-Spin"
                    : "Kesh-Kesh"
                }`}
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

export default KeshGamesSection;
