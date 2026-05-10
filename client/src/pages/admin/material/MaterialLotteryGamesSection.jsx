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
import MaterialLotteryDialog from "./MaterialLotteryDialog";
import { toast } from "sonner";

const MaterialLotteryGamesSection = ({ games, setGames, setError }) => {
  const api = useApi();
  const theme = useTheme();
  const isXS = useMediaQuery(theme.breakpoints.down("sm"));
  const [createForm, setCreateForm] = useState({
    bet_amount: "",
    max_players: "",
    rewards: [
      { rank: 1, type: "monetary", amount: "", description: "", file: null },
    ],
  });
  const [updateForm, setUpdateForm] = useState({
    id: null,
    bet_amount: "",
    max_players: "",
    status: "",
    rewards: [],
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
  const [createLoading, setCreateLoading] = useState(false);

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

  const handleAddReward = () => {
    setCreateForm({
      ...createForm,
      rewards: [
        ...createForm.rewards,
        {
          rank: createForm.rewards.length + 1,
          type: "monetary",
          amount: "",
          description: "",
          file: null,
        },
      ],
    });
  };

  const handleRemoveReward = (index) => {
    const newRewards = createForm.rewards
      .filter((_, i) => i !== index)
      .map((reward, i) => ({
        ...reward,
        rank: i + 1,
      }));
    setCreateForm({ ...createForm, rewards: newRewards });
  };

  const handleRewardChange = (index, field, value) => {
    const newRewards = [...createForm.rewards];
    newRewards[index] = { ...newRewards[index], [field]: value };
    setCreateForm({ ...createForm, rewards: newRewards });
  };

  // Handle file selection for material rewards
  // Note: signature expects (e, index) to match child component usage
  const handleRewardFileChange = (e, index) => {
    const file = e?.target?.files?.[0] || null;
    if (!file) return;
    const newRewards = createForm.rewards.map((r, i) =>
      i === index ? { ...r, file } : r
    );
    setCreateForm({ ...createForm, rewards: newRewards });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDialog = (action, gameId) => {
    if (action === "update" && gameId) {
      const game = games.find((g) => g._id === gameId);
      if (game) {
        setUpdateForm({
          id: game._id,
          bet_amount: game.bet_amount.toString(),
          max_players: game.max_players.toString(),
          status: game.status,
          rewards:
            (Array.isArray(game.rewards) ? game.rewards : []).map((r, idx) => ({
              rank: r.rank || idx + 1,
              type: r.type,
              amount: r.type === "monetary" ? r.amount : "",
              description: r.description,
              photo: r.photo || "",
              file: null,
            })) || [],
        });
      }
    }
    setDialog({ open: true, action, gameId: gameId || null });
  };

  const handleCloseDialog = () => {
    setDialog({ open: false, action: null, gameId: null });
    setCreateForm({
      bet_amount: "",
      max_players: "",
      rewards: [
        { rank: 1, type: "monetary", amount: "", description: "", file: null },
      ],
    });
    setUpdateForm({ id: null, bet_amount: "", max_players: "", status: "" });
  };

  const handleCreateGame = async () => {
    setCreateLoading(true);
    try {
      const bet_amount = parseFloat(createForm.bet_amount);
      const max_players = parseInt(createForm.max_players, 10);
      const rewards = createForm.rewards.map((r) => ({
        rank: r.rank,
        type: r.type,
        amount: r.type === "monetary" ? parseFloat(r.amount) : 0,
        description: r.description,
      }));

      if (
        isNaN(bet_amount) ||
        isNaN(max_players) ||
        rewards.some(
          (r) => !r.description || (r.type === "monetary" && isNaN(r.amount))
        )
      ) {
        throw new Error("Invalid input values");
      }

      // Build FormData for file upload
      const formData = new FormData();
      formData.append("bet_amount", bet_amount);
      formData.append("max_players", max_players);
      formData.append("gameType", "material_lottery");
      const payload = createForm.rewards.map((r) => ({
        rank: r.rank,
        type: r.type,
        description: r.description,
        amount: r.type === "monetary" ? parseFloat(r.amount) : undefined,
      }));
      formData.append("rewards", JSON.stringify(payload));
      createForm.rewards.forEach((r, i) => {
        if (r.file && r.type === "material") {
          formData.append(`reward_photos_rank_${i + 1}`, r.file);
        }
      });
      const response = await api.post(
        "/api/v1/material-lottery/create",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setGames([...games, response.data.game]);
      setSnackbar({
        open: true,
        message: "Material Lottery room created successfully",
        severity: "success",
      });
      toast.success("Material Lottery room created successfully");
      handleCloseDialog();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to create Material Lottery room";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleUpdateGame = async () => {
    if (!updateForm.id) return;
    try {
      const formData = new FormData();
      if (updateForm.bet_amount)
        formData.append("bet_amount", parseFloat(updateForm.bet_amount));
      if (updateForm.max_players)
        formData.append("max_players", parseInt(updateForm.max_players, 10));
      if (updateForm.status) formData.append("status", updateForm.status);

      // Attach rewards payload and files
      const rewardsPayload = updateForm.rewards.map((r) => ({
        rank: r.rank,
        type: r.type,
        description: r.description,
        amount: r.type === "monetary" ? Number(r.amount || 0) : undefined,
        photo: r.photo || undefined,
      }));
      formData.append("rewards", JSON.stringify(rewardsPayload));
      updateForm.rewards.forEach((r) => {
        if (r.file && r.type === "material") {
          formData.append(`reward_photos_rank_${r.rank}`, r.file);
        }
      });

      const response = await api.put(
        `/api/v1/material-lottery/${updateForm.id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setGames(
        games.map((game) =>
          game._id === updateForm.id ? response.data.game : game
        )
      );
      setSnackbar({
        open: true,
        message: "Material Lottery room updated successfully",
        severity: "success",
      });
      toast.success("Material Lottery room updated successfully");
      handleCloseDialog();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to update Material Lottery room";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleUpdateRewardField = (index, field, value) => {
    const rewards = [...updateForm.rewards];
    rewards[index] = { ...rewards[index], [field]: value };
    setUpdateForm({ ...updateForm, rewards });
  };

  const handleUpdateRewardFile = (e, index) => {
    const file = e?.target?.files?.[0] || null;
    if (!file) return;
    const rewards = [...updateForm.rewards];
    rewards[index] = { ...rewards[index], file };
    setUpdateForm({ ...updateForm, rewards });
  };

  const handleResetGame = async (gameId) => {
    try {
      await api.post(`/api/v1/material-lottery/${gameId}/reset`);
      setGames(
        games.map((g) =>
          g._id === gameId
            ? {
                ...g,
                status: "pending",
                participants: [],
                winners: [],
                round: (g.round ?? 1) + 1,
              }
            : g
        )
      );
      toast.success("Game reset successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset game");
    }
  };

  const handleDeleteGame = async (gameId) => {
    try {
      await api.delete(`/api/v1/material-lottery/${gameId}`);
      setGames(games.filter((g) => g._id !== gameId));
      toast.success("Game deleted successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete game");
    }
  };

  const handleConfirmAction = async () => {
    if (dialog.action === "create") {
      await handleCreateGame();
    } else {
      await handleUpdateGame();
    }
  };
  // Determine if create action should be disabled

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
        Material Lottery Game Management
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
        Create New Material Lottery Room
      </Button>
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: "#2d3748",
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
              <TableCell>Round</TableCell>
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
                  <TableCell>{game.round ?? 1}</TableCell>
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
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={() => handleResetGame(game._id)}
                      sx={{
                        ml: 1,
                        minWidth: 0,
                        px: { xs: 0.5, sm: 2 },
                        py: { xs: 0.3, sm: 1 },
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleDeleteGame(game._id)}
                      sx={{
                        ml: 1,
                        minWidth: 0,
                        px: { xs: 0.5, sm: 2 },
                        py: { xs: 0.3, sm: 1 },
                      }}
                    >
                      Delete
                    </Button>
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
      {/* Reuse common dialog for create flow */}
      {dialog.action === "create" && (
        <MaterialLotteryDialog
          open={dialog.open}
          onClose={handleCloseDialog}
          lotteryForm={createForm}
          onChangeForm={(e) =>
            setCreateForm({ ...createForm, [e.target.name]: e.target.value })
          }
          onChangeReward={(e, idx) =>
            handleRewardChange(idx, e.target.name, e.target.value)
          }
          onChangeRewardFile={handleRewardFileChange}
          addReward={handleAddReward}
          removeReward={handleRemoveReward}
          onSubmit={async () => await handleCreateGame()}
          loading={createLoading}
        />
      )}
      {/* Update dialog remains unchanged */}
      {dialog.action === "update" && (
        <Dialog
          open={dialog.open}
          onClose={handleCloseDialog}
          aria-labelledby="game-dialog-title"
          aria-describedby="game-dialog-description"
        >
          <DialogTitle id="game-dialog-title">
            Update Material Lottery Room
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="game-dialog-description">
              Modify the Material Lottery room details.
            </DialogContentText>
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
            <Typography variant="h6" sx={{ mt: 2 }}>
              Rewards
            </Typography>
            {updateForm.rewards.map((r, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  mb: 1,
                  flexWrap: "wrap",
                }}
              >
                <TextField
                  label={`Rank ${r.rank} Description`}
                  value={r.description}
                  onChange={(e) =>
                    handleUpdateRewardField(idx, "description", e.target.value)
                  }
                  size="small"
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    label="Type"
                    value={r.type}
                    onChange={(e) =>
                      handleUpdateRewardField(idx, "type", e.target.value)
                    }
                  >
                    <MenuItem value="material">Material</MenuItem>
                    <MenuItem value="monetary">Monetary</MenuItem>
                  </Select>
                </FormControl>
                {r.type === "monetary" && (
                  <TextField
                    label="Amount (ETB)"
                    type="number"
                    size="small"
                    value={r.amount}
                    onChange={(e) =>
                      handleUpdateRewardField(idx, "amount", e.target.value)
                    }
                  />
                )}
                {r.type === "material" && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUpdateRewardFile(e, idx)}
                    />
                    {r.photo && (
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Existing: {r.photo.split("/").pop()}
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="primary">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              color="warning"
              variant="contained"
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      )}
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

export default MaterialLotteryGamesSection;