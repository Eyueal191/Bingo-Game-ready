import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Switch,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
} from "@mui/material";
import { Edit, Delete, Add } from "@mui/icons-material";
import { useApi } from "../../../contexts/ApiContext";
import { toast } from "sonner";
import { useAuth } from "../../../contexts/AuthContext";

const GameManagerManagement = () => {
  const { isAdmin } = useAuth();
  const api = useApi();

  const [gameManagers, setGameManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openRegisterDialog, setOpenRegisterDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [formData, setFormData] = useState({
    telegramId: "",
    phone: "",
    fullName: "",
    password: "",
    gamePermissions: { bingo: false, keshkesh: false, material_lottery: false },
  });
  const [existingUserInfo, setExistingUserInfo] = useState(null);
  const [checkingTelegram, setCheckingTelegram] = useState(false);

  const normalizePhone = (phone) => {
    let normalized = phone.trim().replace(/[\s-]/g, "");
    if (normalized.startsWith("09") || normalized.startsWith("07")) {
      normalized = `+251${normalized.slice(1)}`;
    } else if (normalized.startsWith("251")) {
      normalized = `+${normalized}`;
    } else if (!normalized.startsWith("+251")) {
      normalized = `+251${normalized}`;
    }
    if (!/^\+251[79]\d{8}$/.test(normalized)) {
      throw new Error("Invalid Ethiopian phone format");
    }
    return normalized;
  };

  const fetchGameManagers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/v1/permissions/game-managers");
      const safeUsers = (response.data.users || []).map((u) => ({
        ...u,
        gamePermissions: u?.gamePermissions ?? {
          bingo: false,
          keshkesh: false,
           material_lottery: false,
        },
      }));
      setGameManagers(safeUsers);
      setError("");
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to fetch game managers";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchGameManagers();
  }, [isAdmin, fetchGameManagers]);

  // moved above into useCallback

  // Explicit lookup for existing player by Telegram ID (triggered manually to avoid noisy 404s)
  const checkUserByTelegramId = async () => {
    const value = (formData.telegramId || "").trim();
    if (!value || value.length < 6) {
      setExistingUserInfo(null);
      return;
    }
    try {
      setCheckingTelegram(true);
      const res = await api.get(`/api/v1/users/by-telegram-id/${value}`);
      if (res?.data) {
        setExistingUserInfo(res.data);
        setFormData((prev) => ({
          ...prev,
          fullName: res.data.fullName || prev.fullName,
          phone: res.data.phone || prev.phone,
        }));
      } else {
        setExistingUserInfo(null);
      }
    } catch {
      // Not found or any other error -> treat as not found without surfacing errors while typing
      setExistingUserInfo(null);
    } finally {
      setCheckingTelegram(false);
    }
  };

  const handleRegisterSubmit = async () => {
    try {
      setLoading(true);
      const normalizedPhone = normalizePhone(formData.phone);
      const telegramId = (formData.telegramId || "").trim();
      const submitData = { ...formData, telegramId, phone: normalizedPhone };

      await api.post("/api/v1/permissions/game-managers/register", submitData);
      toast.success("Game manager registered successfully");
      setOpenRegisterDialog(false);
      setFormData({
        telegramId: "",
        phone: "",
        fullName: "",
        password: "",
        gamePermissions: { bingo: false, keshkesh: false, material_lottery: false },
      });
      setExistingUserInfo(null);
      fetchGameManagers();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to register game manager";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmit = async () => {
    try {
      setLoading(true);
      await api.patch(`/api/v1/permissions/${selectedManager.id}`, {
        gamePermissions: formData.gamePermissions,
        role: "game_manager",
      });
      toast.success("Permissions updated successfully");
      setOpenUpdateDialog(false);
      setSelectedManager(null);
      setFormData({
        ...formData,
        gamePermissions: { bingo: false, keshkesh: false,  material_lottery: false },
      });
      fetchGameManagers();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to update permissions";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      setLoading(true);
      await api.delete(`/api/v1/users/delete/${selectedManager.id}`);
      toast.success("Game manager deleted successfully");
      setOpenDeleteDialog(false);
      setSelectedManager(null);
      fetchGameManagers();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to delete game manager";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes("gamePermissions")) {
      const permission = name.split(".")[1];
      setFormData({
        ...formData,
        gamePermissions: {
          ...formData.gamePermissions,
          [permission]: type === "checkbox" ? checked : value,
        },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  if (!isAdmin) {
    return (
      <Alert severity="error">
        Unauthorized: Only admins can access this section
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Game Manager Management
      </Typography>
      <Button
        variant="contained"
          startIcon={<Add />}
        onClick={() => setOpenRegisterDialog(true)}
        sx={{ mb: 3, mr: 2 }}
      >
        Register New Game Manager
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={3} sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Telegram ID</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Bingo Permission</TableCell>
                <TableCell>Kesh Kesh Permission</TableCell>
                <TableCell>Material Lottery Permission</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gameManagers.map((manager) => (
                <TableRow key={manager.id}>
                  <TableCell>{manager.telegramId}</TableCell>
                  <TableCell>{manager.fullName}</TableCell>
                  <TableCell>{manager.phone}</TableCell>
                  <TableCell>
                    <Switch
                      checked={!!manager?.gamePermissions?.bingo}
                      disabled
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!!manager?.gamePermissions?.keshkesh}
                      disabled
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!!manager?.gamePermissions?.material_lottery}
                      disabled
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => {
                        setSelectedManager(manager);
                        setFormData({
                          ...formData,
                          gamePermissions: {
                            bingo: !!manager?.gamePermissions?.bingo,
                            keshkesh: !!manager?.gamePermissions?.keshkesh,
                                material_lottery: !!manager?.gamePermissions?.material_lottery,

                          },
                        });
                        setOpenUpdateDialog(true);
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setSelectedManager(manager);
                        setOpenDeleteDialog(true);
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Register Game Manager Dialog */}
      <Dialog
        open={openRegisterDialog}
        onClose={() => setOpenRegisterDialog(false)}
      >
        <DialogTitle>Register New Game Manager</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <TextField
              label="Telegram ID"
              name="telegramId"
              value={formData.telegramId}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 15);
                setFormData((prev) => ({ ...prev, telegramId: value }));
                setExistingUserInfo(null);
              }}
              helperText={
                checkingTelegram
                  ? "Checking..."
                  : existingUserInfo
                  ? `Existing user found: ${existingUserInfo.fullName} (${existingUserInfo.phone}). They will be promoted to Game Manager.`
                  : "Enter Telegram ID and click Check to auto-fill if player exists."
              }
              fullWidth
              margin="normal"
              required
            />
            <Button
              variant="outlined"
              sx={{ mt: 2.5 }}
              onClick={checkUserByTelegramId}
              disabled={checkingTelegram || !formData.telegramId}
            >
              {checkingTelegram ? "Checking" : "Check"}
            </Button>
          </Box>
          <TextField
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleFormChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleFormChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleFormChange}
            fullWidth
            margin="normal"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.gamePermissions.bingo}
                onChange={handleFormChange}
                name="gamePermissions.bingo"
              />
            }
            label="Bingo Permission"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.gamePermissions.keshkesh}
                onChange={handleFormChange}
                name="gamePermissions.keshkesh"
              />
            }
            label="Kesh Kesh Permission"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.gamePermissions.material_lottery}
                onChange={handleFormChange}
                name="gamePermissions.material_lottery"
              />
            }
            label="Material Lottery Permission"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRegisterDialog(false)}>Cancel</Button>
          <Button
            onClick={handleRegisterSubmit}
            variant="contained"
            disabled={loading}
          >
            Register
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Permissions Dialog */}
      <Dialog
        open={openUpdateDialog}
        onClose={() => setOpenUpdateDialog(false)}
      >
        <DialogTitle>Update Game Manager Permissions</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Update permissions for {selectedManager?.fullName} (Telegram ID:{" "}
            {selectedManager?.telegramId})
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={formData.gamePermissions.bingo}
                onChange={handleFormChange}
                name="gamePermissions.bingo"
              />
            }
            label="Bingo Permission"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.gamePermissions.keshkesh}
                onChange={handleFormChange}
                name="gamePermissions.keshkesh"
              />
            }
            label="Kesh Kesh Permission"
          />
           <FormControlLabel
            control={
              <Switch
                checked={formData.gamePermissions.material_lottery}
                onChange={handleFormChange}
                name="gamePermissions.material_lottery"
              />
            }
            label="Material Lottery Permission"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpdateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateSubmit}
            variant="contained"
            disabled={loading}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the game manager{" "}
            {selectedManager?.fullName} (Telegram ID:{" "}
            {selectedManager?.telegramId})?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteSubmit}
            variant="contained"
            color="error"
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GameManagerManagement;
